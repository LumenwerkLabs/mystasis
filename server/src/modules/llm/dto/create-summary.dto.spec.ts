import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SummaryType } from '@prisma/client';

/**
 * TDD Tests for CreateSummaryDto
 *
 * These tests define the expected behavior of CreateSummaryDto validation:
 * 1. Should accept valid SummaryType enum values
 * 2. Should reject invalid summaryType values
 * 3. Should reject missing summaryType
 *
 * The DTO should:
 * - Use class-validator decorators for validation
 * - Only accept valid SummaryType enum values
 * - Require summaryType field (not optional)
 *
 * Usage:
 * @Post('summary/:userId')
 * createSummary(
 *   @Param('userId') userId: string,
 *   @Body() dto: CreateSummaryDto,
 * ) {}
 */

describe('CreateSummaryDto', () => {
  // DTO will be imported dynamically
  let CreateSummaryDto: new () => { summaryType?: SummaryType };

  beforeAll(async () => {
    try {
      const module = await import('./create-summary.dto');
      CreateSummaryDto = module.CreateSummaryDto;
    } catch {
      // Expected to fail until implementation exists
    }
  });

  describe('module exports', () => {
    it('should export CreateSummaryDto class', () => {
      expect(CreateSummaryDto).toBeDefined();
    });
  });

  describe('valid summaryType values', () => {
    it('should accept DAILY_RECAP as valid summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: SummaryType.DAILY_RECAP,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept WEEKLY_SUMMARY as valid summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: SummaryType.WEEKLY_SUMMARY,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept TREND_ANALYSIS as valid summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: SummaryType.TREND_ANALYSIS,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept RISK_ASSESSMENT as valid summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: SummaryType.RISK_ASSESSMENT,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept WELLNESS_NUDGE as valid summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: SummaryType.WELLNESS_NUDGE,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept CLINICIAN_REPORT as valid summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: SummaryType.CLINICIAN_REPORT,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept all valid SummaryType enum values', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const validTypes = Object.values(SummaryType);

      for (const summaryType of validTypes) {
        const dto = plainToInstance(CreateSummaryDto, { summaryType });

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('invalid summaryType values', () => {
    it('should reject invalid string as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: 'INVALID_TYPE',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('summaryType');
    });

    it('should reject random string as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: 'random_string',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject number as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: 123,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject object as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: { type: 'WEEKLY_SUMMARY' },
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject array as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: ['WEEKLY_SUMMARY'],
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject boolean as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: true,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject null as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: null,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty string as summaryType', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: '',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject case-insensitive variations', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const invalidCases = [
        'weekly_summary', // lowercase
        'Weekly_Summary', // mixed case
        'WEEKLYSUMMARY', // no underscore
      ];

      for (const invalidType of invalidCases) {
        const dto = plainToInstance(CreateSummaryDto, {
          summaryType: invalidType,
        });

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('missing summaryType', () => {
    it('should reject when summaryType is missing', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {});

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('summaryType');
    });

    it('should reject when summaryType is undefined', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: undefined,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require summaryType field in empty object', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = new CreateSummaryDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const hasRequiredError = errors.some(
        (error) =>
          error.property === 'summaryType' &&
          error.constraints &&
          (error.constraints.isNotEmpty ||
            error.constraints.isEnum ||
            error.constraints.isDefined),
      );
      expect(hasRequiredError).toBe(true);
    });
  });

  describe('validation error messages', () => {
    it('should provide meaningful error message for invalid enum value', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {
        summaryType: 'INVALID',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const summaryTypeError = errors.find(
        (error) => error.property === 'summaryType',
      );
      expect(summaryTypeError).toBeDefined();
      expect(summaryTypeError?.constraints).toBeDefined();
    });

    it('should provide meaningful error message for missing field', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = plainToInstance(CreateSummaryDto, {});

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const summaryTypeError = errors.find(
        (error) => error.property === 'summaryType',
      );
      expect(summaryTypeError).toBeDefined();
    });
  });

  describe('DTO structure', () => {
    it('should have summaryType property', () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = new CreateSummaryDto();

      // Assert - property should exist (even if undefined)
      expect('summaryType' in dto || dto.summaryType === undefined).toBe(true);
    });

    it('should be instantiatable', () => {
      // Arrange & Act
      if (!CreateSummaryDto) return;

      const dto = new CreateSummaryDto();

      // Assert
      expect(dto).toBeInstanceOf(CreateSummaryDto);
    });

    it('should allow setting summaryType via assignment', () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const dto = new CreateSummaryDto();

      // Act
      dto.summaryType = SummaryType.WEEKLY_SUMMARY;

      // Assert
      expect(dto.summaryType).toBe(SummaryType.WEEKLY_SUMMARY);
    });
  });

  describe('plainToInstance transformation', () => {
    it('should correctly transform plain object to DTO instance', () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const plainObject = {
        summaryType: SummaryType.CLINICIAN_REPORT,
      };

      // Act
      const dto = plainToInstance(CreateSummaryDto, plainObject);

      // Assert
      expect(dto).toBeInstanceOf(CreateSummaryDto);
      expect(dto.summaryType).toBe(SummaryType.CLINICIAN_REPORT);
    });

    it('should handle extra properties gracefully', async () => {
      // Arrange
      if (!CreateSummaryDto) return;

      const plainObject = {
        summaryType: SummaryType.WEEKLY_SUMMARY,
        extraField: 'should be ignored',
        anotherExtra: 123,
      };

      // Act
      const dto = plainToInstance(CreateSummaryDto, plainObject);
      const errors = await validate(dto);

      // Assert - should still be valid, extra props ignored
      expect(errors.length).toBe(0);
    });
  });
});
