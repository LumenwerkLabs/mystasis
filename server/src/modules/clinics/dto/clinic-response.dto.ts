/**
 * DTO for clinic response.
 *
 * @description Represents the clinic data returned in API responses.
 */
export class ClinicResponseDto {
  /** Unique identifier of the clinic */
  id: string;

  /** Name of the clinic */
  name: string;

  /** Physical address of the clinic */
  address?: string;

  /** Phone number of the clinic */
  phone?: string;

  /** Timestamp when the clinic was created */
  createdAt: Date;

  /** Timestamp when the clinic was last updated */
  updatedAt: Date;
}
