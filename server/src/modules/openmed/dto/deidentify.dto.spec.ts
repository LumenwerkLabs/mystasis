import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * TDD Tests for OpenMed De-identification DTOs
 *
 * These tests define the expected behavior of:
 * 1. DeidentifyRequestDto - validation of incoming de-identification requests
 * 2. DeidentifyResponseDto - structure of de-identification responses
 * 3. PIIEntityDto - structure of detected PII entities
 * 4. DeidentificationMethod enum - valid de-identification methods
 *
 * Validation rules:
 * - text: Required, minimum length 1
 * - method: Optional, must be valid DeidentificationMethod enum value
 * - confidenceThreshold: Optional, must be between 0 and 1
 * - useSmartMerging: Optional boolean
 *
 * RED PHASE: These tests will fail until DTOs are implemented.
 */

// Define the enum for type safety in tests
enum DeidentificationMethod {
  MASK = 'mask',
  REMOVE = 'remove',
  REPLACE = 'replace',
  HASH = 'hash',
  SHIFT_DATES = 'shift_dates',
}

// DTO interfaces for type checking
interface DeidentifyRequestDtoInterface {
  text?: string;
  method?: DeidentificationMethod;
  confidenceThreshold?: number;
  useSmartMerging?: boolean;
}

interface PIIEntityDtoInterface {
  text?: string;
  label?: string;
  entityType?: string;
  start?: number;
  end?: number;
  confidence?: number;
  redactedText?: string;
}

interface DeidentifyResponseDtoInterface {
  originalText?: string;
  deidentifiedText?: string;
  piiEntities?: PIIEntityDtoInterface[];
  method?: string;
  timestamp?: string;
  numEntitiesRedacted?: number;
}

// DTOs will be imported dynamically
let DeidentifyRequestDto: new () => DeidentifyRequestDtoInterface;
let DeidentifyResponseDto: new () => DeidentifyResponseDtoInterface;
let PIIEntityDto: new () => PIIEntityDtoInterface;
let DeidentificationMethodEnum: typeof DeidentificationMethod;

beforeAll(() => {
  try {
    // Dynamic require to allow tests to compile before implementation exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('./deidentify.dto');
    DeidentifyRequestDto = module.DeidentifyRequestDto;
    DeidentifyResponseDto = module.DeidentifyResponseDto;
    PIIEntityDto = module.PIIEntityDto;
    DeidentificationMethodEnum = module.DeidentificationMethod;
  } catch {
    // Expected to fail until implementation exists
    // Tests will skip with "if (!Dto) return" guards
  }
});

describe('DeidentificationMethod enum', () => {
  it('should export DeidentificationMethod enum', () => {
    expect(DeidentificationMethodEnum).toBeDefined();
  });

  it('should have MASK value', () => {
    if (!DeidentificationMethodEnum) return;
    expect(DeidentificationMethodEnum.MASK).toBe('mask');
  });

  it('should have REMOVE value', () => {
    if (!DeidentificationMethodEnum) return;
    expect(DeidentificationMethodEnum.REMOVE).toBe('remove');
  });

  it('should have REPLACE value', () => {
    if (!DeidentificationMethodEnum) return;
    expect(DeidentificationMethodEnum.REPLACE).toBe('replace');
  });

  it('should have HASH value', () => {
    if (!DeidentificationMethodEnum) return;
    expect(DeidentificationMethodEnum.HASH).toBe('hash');
  });

  it('should have SHIFT_DATES value', () => {
    if (!DeidentificationMethodEnum) return;
    expect(DeidentificationMethodEnum.SHIFT_DATES).toBe('shift_dates');
  });

  it('should have exactly 5 methods', () => {
    if (!DeidentificationMethodEnum) return;
    const values = Object.values(DeidentificationMethodEnum);
    expect(values).toHaveLength(5);
  });
});

describe('DeidentifyRequestDto', () => {
  describe('module exports', () => {
    it('should export DeidentifyRequestDto class', () => {
      expect(DeidentifyRequestDto).toBeDefined();
    });
  });

  // ============================================
  // VALID REQUEST TESTS
  // ============================================

  describe('valid de-identification request', () => {
    it('should accept valid request with all fields', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient John Smith was seen on 03/20/2024.',
        method: 'mask',
        confidenceThreshold: 0.8,
        useSmartMerging: true,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept valid request with only required text field', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient information here.',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept request with text and method only', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'remove',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  // ============================================
  // TEXT VALIDATION TESTS
  // ============================================

  describe('text validation', () => {
    it('should reject empty text', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: '',
        method: 'mask',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'text')).toBe(true);
    });

    it('should reject missing text', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        method: 'mask',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'text')).toBe(true);
    });

    it('should reject null text', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: null,
        method: 'mask',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'text')).toBe(true);
    });

    it('should reject undefined text', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: undefined,
        method: 'mask',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'text')).toBe(true);
    });

    it('should accept text with minimum length of 1', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'A',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'text').length).toBe(0);
    });

    it('should accept text with whitespace only (validation passes, service handles)', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: '   ',
      });

      // Act
      const errors = await validate(dto);

      // Assert - whitespace is allowed at DTO level
      // Business logic in service may handle differently
      expect(errors.filter((e) => e.property === 'text').length).toBe(0);
    });

    it('should accept very long text', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const longText = 'Patient data. '.repeat(10000);
      const dto = plainToInstance(DeidentifyRequestDto, {
        text: longText,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'text').length).toBe(0);
    });

    it('should reject non-string text', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 12345,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'text')).toBe(true);
    });
  });

  // ============================================
  // METHOD VALIDATION TESTS
  // ============================================

  describe('method validation', () => {
    it('should accept "mask" as valid method', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'mask',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'method').length).toBe(0);
    });

    it('should accept "remove" as valid method', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'remove',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'method').length).toBe(0);
    });

    it('should accept "replace" as valid method', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'replace',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'method').length).toBe(0);
    });

    it('should accept "hash" as valid method', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'hash',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'method').length).toBe(0);
    });

    it('should accept "shift_dates" as valid method', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'shift_dates',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'method').length).toBe(0);
    });

    it('should reject invalid method', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'invalid_method',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'method')).toBe(true);
    });

    it('should reject uppercase method values', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'MASK',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'method')).toBe(true);
    });

    it('should reject numeric method value', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 123,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'method')).toBe(true);
    });

    it('should allow omitting method (optional field)', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'method').length).toBe(0);
    });
  });

  // ============================================
  // CONFIDENCE THRESHOLD VALIDATION TESTS
  // ============================================

  describe('confidenceThreshold validation', () => {
    it('should accept confidenceThreshold of 0', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: 0,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(
        errors.filter((e) => e.property === 'confidenceThreshold').length,
      ).toBe(0);
    });

    it('should accept confidenceThreshold of 1', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: 1,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(
        errors.filter((e) => e.property === 'confidenceThreshold').length,
      ).toBe(0);
    });

    it('should accept confidenceThreshold of 0.7', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: 0.7,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(
        errors.filter((e) => e.property === 'confidenceThreshold').length,
      ).toBe(0);
    });

    it('should reject confidenceThreshold below 0', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: -0.1,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confidenceThreshold')).toBe(
        true,
      );
    });

    it('should reject confidenceThreshold above 1', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: 1.1,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confidenceThreshold')).toBe(
        true,
      );
    });

    it('should reject confidenceThreshold significantly above 1', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: 5,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confidenceThreshold')).toBe(
        true,
      );
    });

    it('should reject non-numeric confidenceThreshold', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: 'high',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confidenceThreshold')).toBe(
        true,
      );
    });

    it('should allow omitting confidenceThreshold (optional field)', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(
        errors.filter((e) => e.property === 'confidenceThreshold').length,
      ).toBe(0);
    });
  });

  // ============================================
  // USE SMART MERGING VALIDATION TESTS
  // ============================================

  describe('useSmartMerging validation', () => {
    it('should accept useSmartMerging true', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        useSmartMerging: true,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(
        errors.filter((e) => e.property === 'useSmartMerging').length,
      ).toBe(0);
    });

    it('should accept useSmartMerging false', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        useSmartMerging: false,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(
        errors.filter((e) => e.property === 'useSmartMerging').length,
      ).toBe(0);
    });

    it('should allow omitting useSmartMerging (optional field)', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(
        errors.filter((e) => e.property === 'useSmartMerging').length,
      ).toBe(0);
    });
  });

  // ============================================
  // DEFAULT VALUES TESTS
  // ============================================

  describe('default values', () => {
    it('should use default values when optional fields are omitted', () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = new DeidentifyRequestDto();
      dto.text = 'Patient data.';

      // Assert - verify defaults exist or are undefined (to be set by service)
      // method default: 'mask' or undefined (service sets)
      // confidenceThreshold default: 0.7 or undefined (service sets)
      // useSmartMerging default: true or undefined (service sets)
      expect(dto.text).toBe('Patient data.');
    });
  });

  // ============================================
  // DTO STRUCTURE TESTS
  // ============================================

  describe('DTO structure', () => {
    it('should be instantiatable', () => {
      // Arrange & Act
      if (!DeidentifyRequestDto) return;

      const dto = new DeidentifyRequestDto();

      // Assert
      expect(dto).toBeInstanceOf(DeidentifyRequestDto);
    });

    it('should allow setting properties via assignment', () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = new DeidentifyRequestDto();

      // Act
      dto.text = 'Patient John Smith.';
      dto.method = DeidentificationMethod.MASK;
      dto.confidenceThreshold = 0.8;
      dto.useSmartMerging = true;

      // Assert
      expect(dto.text).toBe('Patient John Smith.');
      expect(dto.method).toBe('mask');
      expect(dto.confidenceThreshold).toBe(0.8);
      expect(dto.useSmartMerging).toBe(true);
    });

    it('should correctly transform plain object to DTO instance', () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const plainObject = {
        text: 'Patient John Smith.',
        method: 'mask',
        confidenceThreshold: 0.8,
        useSmartMerging: true,
      };

      // Act
      const dto = plainToInstance(DeidentifyRequestDto, plainObject);

      // Assert
      expect(dto).toBeInstanceOf(DeidentifyRequestDto);
      expect(dto.text).toBe(plainObject.text);
      expect(dto.method).toBe(plainObject.method);
      expect(dto.confidenceThreshold).toBe(plainObject.confidenceThreshold);
      expect(dto.useSmartMerging).toBe(plainObject.useSmartMerging);
    });

    it('should handle extra properties gracefully', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const plainObject = {
        text: 'Patient data.',
        method: 'mask',
        extraField: 'should be ignored',
        anotherExtra: 123,
      };

      // Act
      const dto = plainToInstance(DeidentifyRequestDto, plainObject);
      const errors = await validate(dto);

      // Assert - should still be valid
      expect(errors.length).toBe(0);
    });
  });

  // ============================================
  // VALIDATION ERROR MESSAGES TESTS
  // ============================================

  describe('validation error messages', () => {
    it('should provide meaningful error message for empty text', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: '',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const textError = errors.find((e) => e.property === 'text');
      expect(textError).toBeDefined();
      expect(textError?.constraints).toBeDefined();
    });

    it('should provide meaningful error message for invalid method', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        method: 'invalid',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const methodError = errors.find((e) => e.property === 'method');
      expect(methodError).toBeDefined();
      expect(methodError?.constraints).toBeDefined();
    });

    it('should provide meaningful error message for invalid confidenceThreshold', async () => {
      // Arrange
      if (!DeidentifyRequestDto) return;

      const dto = plainToInstance(DeidentifyRequestDto, {
        text: 'Patient data.',
        confidenceThreshold: 2,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const thresholdError = errors.find(
        (e) => e.property === 'confidenceThreshold',
      );
      expect(thresholdError).toBeDefined();
      expect(thresholdError?.constraints).toBeDefined();
    });
  });
});

describe('PIIEntityDto', () => {
  describe('module exports', () => {
    it('should export PIIEntityDto class', () => {
      expect(PIIEntityDto).toBeDefined();
    });
  });

  describe('DTO structure', () => {
    it('should be instantiatable', () => {
      // Arrange & Act
      if (!PIIEntityDto) return;

      const dto = new PIIEntityDto();

      // Assert
      expect(dto).toBeInstanceOf(PIIEntityDto);
    });

    it('should have all required properties', () => {
      // Arrange
      if (!PIIEntityDto) return;

      const dto = new PIIEntityDto();
      dto.text = 'John Smith';
      dto.label = 'PERSON';
      dto.entityType = 'NAME';
      dto.start = 8;
      dto.end = 18;
      dto.confidence = 0.98;
      dto.redactedText = '[NAME]';

      // Assert
      expect(dto.text).toBe('John Smith');
      expect(dto.label).toBe('PERSON');
      expect(dto.entityType).toBe('NAME');
      expect(dto.start).toBe(8);
      expect(dto.end).toBe(18);
      expect(dto.confidence).toBe(0.98);
      expect(dto.redactedText).toBe('[NAME]');
    });

    it('should allow optional redactedText to be undefined', () => {
      // Arrange
      if (!PIIEntityDto) return;

      const dto = new PIIEntityDto();
      dto.text = 'John Smith';
      dto.label = 'PERSON';
      dto.entityType = 'NAME';
      dto.start = 8;
      dto.end = 18;
      dto.confidence = 0.98;

      // Assert
      expect(dto.redactedText).toBeUndefined();
    });
  });
});

describe('DeidentifyResponseDto', () => {
  describe('module exports', () => {
    it('should export DeidentifyResponseDto class', () => {
      expect(DeidentifyResponseDto).toBeDefined();
    });
  });

  describe('DTO structure', () => {
    it('should be instantiatable', () => {
      // Arrange & Act
      if (!DeidentifyResponseDto) return;

      const dto = new DeidentifyResponseDto();

      // Assert
      expect(dto).toBeInstanceOf(DeidentifyResponseDto);
    });

    it('should have all required properties', () => {
      // Arrange
      if (!DeidentifyResponseDto || !PIIEntityDto) return;

      const entityDto = new PIIEntityDto();
      entityDto.text = 'John Smith';
      entityDto.label = 'PERSON';
      entityDto.entityType = 'NAME';
      entityDto.start = 8;
      entityDto.end = 18;
      entityDto.confidence = 0.98;
      entityDto.redactedText = '[NAME]';

      const dto = new DeidentifyResponseDto();
      dto.originalText = 'Patient John Smith was seen.';
      dto.deidentifiedText = 'Patient [NAME] was seen.';
      dto.piiEntities = [entityDto];
      dto.method = 'mask';
      dto.timestamp = '2024-03-20T10:30:00Z';
      dto.numEntitiesRedacted = 1;

      // Assert
      expect(dto.originalText).toBe('Patient John Smith was seen.');
      expect(dto.deidentifiedText).toBe('Patient [NAME] was seen.');
      expect(dto.piiEntities).toHaveLength(1);
      expect(dto.method).toBe('mask');
      expect(dto.timestamp).toBe('2024-03-20T10:30:00Z');
      expect(dto.numEntitiesRedacted).toBe(1);
    });

    it('should correctly transform plain object to DTO instance', () => {
      // Arrange
      if (!DeidentifyResponseDto) return;

      const plainObject = {
        originalText: 'Patient John Smith was seen.',
        deidentifiedText: 'Patient [NAME] was seen.',
        piiEntities: [
          {
            text: 'John Smith',
            label: 'PERSON',
            entityType: 'NAME',
            start: 8,
            end: 18,
            confidence: 0.98,
            redactedText: '[NAME]',
          },
        ],
        method: 'mask',
        timestamp: '2024-03-20T10:30:00Z',
        numEntitiesRedacted: 1,
      };

      // Act
      const dto = plainToInstance(DeidentifyResponseDto, plainObject);

      // Assert
      expect(dto).toBeInstanceOf(DeidentifyResponseDto);
      expect(dto.originalText).toBe(plainObject.originalText);
      expect(dto.deidentifiedText).toBe(plainObject.deidentifiedText);
      expect(dto.piiEntities).toHaveLength(1);
      expect(dto.method).toBe(plainObject.method);
      expect(dto.timestamp).toBe(plainObject.timestamp);
      expect(dto.numEntitiesRedacted).toBe(plainObject.numEntitiesRedacted);
    });

    it('should handle empty piiEntities array', () => {
      // Arrange
      if (!DeidentifyResponseDto) return;

      const dto = new DeidentifyResponseDto();
      dto.originalText = 'No PII here.';
      dto.deidentifiedText = 'No PII here.';
      dto.piiEntities = [];
      dto.method = 'mask';
      dto.timestamp = '2024-03-20T10:30:00Z';
      dto.numEntitiesRedacted = 0;

      // Assert
      expect(dto.piiEntities).toEqual([]);
      expect(dto.numEntitiesRedacted).toBe(0);
    });
  });
});
