import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LlmService } from './llm.service';
import { CreateSummaryDto } from './dto/create-summary.dto';
import {
  SummaryResponseDto,
  NudgeResponseDto,
} from './dto/summary-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * Controller for LLM-powered health insights and wellness nudges.
 *
 * @description Provides endpoints for generating AI-powered health summaries
 * and wellness nudges. Access is controlled via JWT authentication and
 * role-based access control (RBAC).
 *
 * @remarks
 * All endpoints require authentication via JWT token. Role restrictions:
 * - Summary generation: CLINICIAN only
 * - Wellness nudges: PATIENT only (own data)
 *
 * **Medical Safety:** All LLM outputs are sanitized to remove diagnosis language
 * and medication advice. A disclaimer is always included.
 */
@ApiTags('LLM')
@ApiBearerAuth('JWT-auth')
@Controller('llm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  /**
   * Generate a health summary for a user.
   *
   * @description Creates an LLM-powered health summary based on the user's
   * biomarker data. Only accessible by clinicians.
   *
   * @param userId - The unique identifier of the user to generate summary for
   * @param dto - Request body containing the summary type
   * @returns Promise resolving to the generated summary response
   *
   * @example
   * POST /llm/summary/user-123
   * Body: { "summaryType": "WEEKLY_SUMMARY" }
   */
  @Post('summary/:userId')
  @Roles(UserRole.CLINICIAN)
  @ApiOperation({
    summary: 'Generate a health summary for a user',
    description:
      'Creates an LLM-powered health summary based on the user biomarker data. Only accessible by clinicians. All outputs are sanitized to remove diagnosis language and medication advice.',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the user to generate summary for',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Summary generated successfully',
    type: SummaryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid userId format or summary type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CLINICIAN role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async createSummary(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateSummaryDto,
  ): Promise<SummaryResponseDto> {
    return this.llmService.generateSummary(userId, dto.summaryType);
  }

  /**
   * Get a wellness nudge for a patient.
   *
   * @description Generates a personalized wellness nudge based on the user's
   * recent biomarker trends. Only accessible by patients for their own data.
   *
   * @param userId - The unique identifier of the user to generate nudge for
   * @param user - The authenticated user (from JWT token)
   * @returns Promise resolving to the generated nudge response
   *
   * @throws {ForbiddenException} When userId does not match the authenticated user
   *
   * @example
   * GET /llm/nudge/user-123
   */
  @Get('nudge/:userId')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Get a wellness nudge for a patient',
    description:
      'Generates a personalized wellness nudge based on recent biomarker trends. Only accessible by patients for their own data. Nudges focus on general wellness (sleep, exercise, hydration) and never provide medical advice.',
  })
  @ApiParam({
    name: 'userId',
    description:
      'UUID of the user to generate nudge for (must match authenticated user)',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Wellness nudge generated successfully',
    type: NudgeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid userId format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - PATIENT role required and must be own userId',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getNudge(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<NudgeResponseDto> {
    // Ensure patient can only access their own nudges
    // Use user.sub (JWT subject claim) as the canonical user identifier
    if (userId !== user.sub) {
      throw new ForbiddenException(
        'You can only access your own wellness nudges',
      );
    }

    return this.llmService.generateNudge(userId);
  }
}
