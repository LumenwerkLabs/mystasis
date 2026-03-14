import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, Clinic } from '../../generated/prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateClinicDto, UpdateClinicDto } from './dto';

/**
 * User type without sensitive password field.
 * Used for returning user data safely to API consumers.
 */
export interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  clinicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prisma select object for safe user fields (excludes password).
 */
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true,
  // password is explicitly NOT selected
} as const;

/**
 * Response for clinic creation including new access token.
 */
export interface CreateClinicResponse {
  clinic: Clinic;
  accessToken: string;
  tokenType: string;
}

/**
 * Service for managing clinics in the Mystasis platform.
 *
 * @description
 * Handles all clinic-related operations including:
 * - CRUD operations for clinics
 * - Patient enrollment and unenrollment
 * - Listing patients by clinic
 *
 * All operations require CLINICIAN role (enforced at controller level).
 * Clinic-specific operations validate ownership before proceeding.
 */
@Injectable()
export class ClinicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Creates a new clinic and associates the creating clinician with it.
   *
   * @param createClinicDto - The clinic creation data
   * @param clinicianId - The ID of the clinician creating the clinic
   * @returns The created clinic and a new access token with updated clinicId
   */
  async create(
    createClinicDto: CreateClinicDto,
    clinicianId: string,
  ): Promise<CreateClinicResponse> {
    const { clinic, user } = await this.prisma.$transaction(async (tx) => {
      const createdClinic = await tx.clinic.create({
        data: {
          name: createClinicDto.name,
          address: createClinicDto.address,
          phone: createClinicDto.phone,
        },
      });

      // Associate the creating clinician with this clinic and return updated user
      const updatedUser = await tx.user.update({
        where: { id: clinicianId },
        data: { clinicId: createdClinic.id },
        select: {
          id: true,
          email: true,
          role: true,
          clinicId: true,
        },
      });

      return { clinic: createdClinic, user: updatedUser };
    });

    // Generate new JWT with updated clinicId so client has immediate access
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      clinic,
      accessToken,
      tokenType: 'Bearer',
    };
  }

  /**
   * Retrieves all clinics ordered by creation date descending.
   *
   * @returns Array of all clinics
   */
  async findAll(): Promise<Clinic[]> {
    return this.prisma.clinic.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single clinic by its ID.
   *
   * @param id - UUID of the clinic
   * @returns The clinic
   * @throws {NotFoundException} When clinic is not found
   */
  async findOne(id: string): Promise<Clinic> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    return clinic;
  }

  /**
   * Updates a clinic by its ID.
   *
   * @param id - UUID of the clinic
   * @param updateClinicDto - The clinic update data
   * @returns The updated clinic
   * @throws {NotFoundException} When clinic is not found
   */
  async update(id: string, updateClinicDto: UpdateClinicDto): Promise<Clinic> {
    // First verify the clinic exists
    const existingClinic = await this.prisma.clinic.findUnique({
      where: { id },
    });

    if (!existingClinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    return this.prisma.clinic.update({
      where: { id },
      data: updateClinicDto,
    });
  }

  /**
   * Deletes a clinic by its ID.
   *
   * @param id - UUID of the clinic
   * @returns The deleted clinic
   * @throws {NotFoundException} When clinic is not found
   */
  async remove(id: string): Promise<Clinic> {
    // First verify the clinic exists
    const existingClinic = await this.prisma.clinic.findUnique({
      where: { id },
    });

    if (!existingClinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    return this.prisma.clinic.delete({
      where: { id },
    });
  }

  /**
   * Enrolls a patient in a clinic.
   *
   * @param clinicId - UUID of the clinic
   * @param patientId - UUID of the patient to enroll
   * @param clinicianClinicId - The clinician's clinic ID for authorization
   * @returns The updated patient user (without password)
   * @throws {NotFoundException} When clinic or patient is not found
   * @throws {ForbiddenException} When clinician tries to modify another clinic's patients
   * @throws {BadRequestException} When trying to enroll a non-PATIENT user
   */
  async enrollPatient(
    clinicId: string,
    patientId: string,
    clinicianClinicId: string,
  ): Promise<SafeUser> {
    // Verify clinic exists
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }

    // Verify clinician owns this clinic
    if (clinicianClinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only enroll patients in your own clinic',
      );
    }

    // Verify patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // Verify user is a PATIENT
    if (patient.role !== UserRole.PATIENT) {
      throw new BadRequestException(
        'Only users with PATIENT role can be enrolled',
      );
    }

    // Check if patient is already enrolled in another clinic
    if (patient.clinicId && patient.clinicId !== clinicId) {
      throw new ConflictException(
        'Patient is already enrolled in another clinic. Unenroll them first.',
      );
    }

    // Update patient's clinicId - select only safe fields (excludes password)
    return this.prisma.user.update({
      where: { id: patientId },
      data: { clinicId },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Unenrolls a patient from a clinic.
   *
   * @param clinicId - UUID of the clinic
   * @param patientId - UUID of the patient to unenroll
   * @param clinicianClinicId - The clinician's clinic ID for authorization
   * @returns The updated patient user (without password)
   * @throws {NotFoundException} When clinic or patient is not found
   * @throws {ForbiddenException} When clinician tries to modify another clinic's patients
   */
  async unenrollPatient(
    clinicId: string,
    patientId: string,
    clinicianClinicId: string,
  ): Promise<SafeUser> {
    // Verify clinic exists
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }

    // Verify clinician owns this clinic
    if (clinicianClinicId !== clinicId) {
      throw new ForbiddenException(
        'You can only unenroll patients from your own clinic',
      );
    }

    // Verify patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // Verify patient is enrolled in THIS clinic
    if (patient.clinicId !== clinicId) {
      throw new BadRequestException('Patient is not enrolled in this clinic');
    }

    // Remove patient's clinicId - select only safe fields (excludes password)
    return this.prisma.user.update({
      where: { id: patientId },
      data: { clinicId: null },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Gets all patients enrolled in a clinic.
   *
   * @param clinicId - UUID of the clinic
   * @returns Array of patient users in the clinic (without passwords)
   * @throws {NotFoundException} When clinic is not found
   */
  async getPatients(clinicId: string): Promise<SafeUser[]> {
    // Verify clinic exists
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${clinicId} not found`);
    }

    // Select only safe fields - explicitly excludes password hash
    return this.prisma.user.findMany({
      where: {
        clinicId,
        role: UserRole.PATIENT,
      },
      select: SAFE_USER_SELECT,
      orderBy: { lastName: 'asc' },
    });
  }
}
