import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/client';
import { UsersService, UserWithoutPassword } from './users.service';
import {
  UpdateUserDto,
  GetUsersQueryDto,
  UserResponseDto,
  PaginatedUsersResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * Controller for user profile management endpoints.
 *
 * @description Provides REST endpoints for user CRUD operations.
 *
 * **Access Control:**
 * - All endpoints require JWT authentication
 * - GET /users - CLINICIAN only, returns users in their clinic
 * - GET /users/:id, PATCH /users/:id, DELETE /users/:id:
 *   - PATIENT: can only access their own profile
 *   - CLINICIAN: can access patients in their clinic
 *
 * **Endpoints:**
 * - `GET /users` - List users (CLINICIAN only, paginated by clinic)
 * - `GET /users/:id` - Get user profile
 * - `PATCH /users/:id` - Update user profile
 * - `DELETE /users/:id` - Delete user account
 */
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Validates patient can only access their own profile.
   * @throws {ForbiddenException} When patient tries to access another user
   */
  private validatePatientSelfAccess(
    targetUserId: string,
    currentUser: UserPayload,
  ): void {
    if (currentUser.sub !== targetUserId && currentUser.id !== targetUserId) {
      throw new ForbiddenException(
        'You do not have permission to access this user',
      );
    }
  }

  /**
   * Validates clinician can only access their own profile or patients in their clinic.
   * @throws {ForbiddenException} When clinician tries to access another clinician or patient from another clinic
   */
  private validateClinicAccess(
    targetUser: UserWithoutPassword,
    currentUser: UserPayload,
  ): void {
    // Allow clinicians to access their own profile
    if (targetUser.id === currentUser.sub || targetUser.id === currentUser.id) {
      return;
    }

    // Clinicians can only access patients, not other clinicians
    if (targetUser.role !== UserRole.PATIENT) {
      throw new ForbiddenException(
        'You do not have permission to access this user',
      );
    }

    if (targetUser.clinicId !== currentUser.clinicId) {
      throw new ForbiddenException(
        'You do not have permission to access this user',
      );
    }
  }

  /**
   * Fetches user and validates access based on current user's role.
   * - Patients: validates self-access before fetching
   * - Clinicians: validates clinic access after fetching
   * @returns The target user without password
   */
  private async fetchUserWithAccessCheck(
    targetUserId: string,
    currentUser: UserPayload,
  ): Promise<UserWithoutPassword> {
    if (currentUser.role === UserRole.PATIENT) {
      this.validatePatientSelfAccess(targetUserId, currentUser);
    }

    const targetUser = await this.usersService.findOne(targetUserId);

    if (currentUser.role === UserRole.CLINICIAN) {
      this.validateClinicAccess(targetUser, currentUser);
    }

    return targetUser;
  }

  /**
   * List all users in the clinician's clinic (paginated).
   *
   * @param query - Pagination and filter parameters
   * @param user - The current authenticated user
   * @returns Paginated list of users
   */
  @Get()
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'List users in clinic',
    description:
      'Returns a paginated list of users in the clinician clinic. Only CLINICIAN role can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    type: PaginatedUsersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  async findAll(
    @Query() query: GetUsersQueryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<PaginatedUsersResponseDto> {
    // Defense-in-depth: verify role (decorator also enforces this)
    if (user.role !== UserRole.CLINICIAN) {
      throw new ForbiddenException('Only clinicians can list users');
    }

    // Ensure clinician is associated with a clinic
    if (!user.clinicId) {
      throw new ForbiddenException(
        'You must be associated with a clinic to list users',
      );
    }

    return this.usersService.findAllPaginated({
      clinicId: user.clinicId,
      role: query.role,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get a user profile by ID.
   *
   * @param id - UUID of the user
   * @param user - The current authenticated user
   * @returns The user profile without password
   */
  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieves user profile by ID. Patients can only access their own profile. Clinicians can access patients in their clinic.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot access this user',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<UserWithoutPassword> {
    return this.fetchUserWithAccessCheck(id, user);
  }

  /**
   * Update a user profile.
   *
   * @param id - UUID of the user to update
   * @param updateUserDto - The update data
   * @param user - The current authenticated user
   * @returns The updated user profile without password
   */
  @Patch(':id')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Updates user profile. Patients can only update their own profile. Clinicians can update patients in their clinic.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to update',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID format or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot update this user',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: UserPayload,
  ): Promise<UserWithoutPassword> {
    await this.fetchUserWithAccessCheck(id, user);
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Delete a user account.
   *
   * @param id - UUID of the user to delete
   * @param user - The current authenticated user
   * @returns The deleted user profile without password
   */
  @Delete(':id')
  @Roles(UserRole.PATIENT, UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Delete user account',
    description:
      'Permanently deletes a user account. Patients can only delete their own account. Clinicians can delete patients in their clinic.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to delete',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot delete this user',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<UserWithoutPassword> {
    await this.fetchUserWithAccessCheck(id, user);
    return this.usersService.remove(id);
  }
}
