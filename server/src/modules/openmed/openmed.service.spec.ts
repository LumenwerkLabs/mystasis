import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

/**
 * TDD Tests for OpenMedService
 *
 * These tests define the expected behavior of the OpenMed PII de-identification service:
 * 1. Configuration - default values and ConfigService integration
 * 2. De-identification - multiple methods (mask, remove, replace, hash, shift_dates)
 * 3. Simple interface - deidentifyText() convenience method
 * 4. Health checks - service availability detection
 * 5. Graceful degradation - passthrough when service unavailable
 * 6. HIPAA audit logging - log entity types but not PII values
 *
 * OpenMed API Integration:
 * - POST /deidentify - De-identify clinical text
 * - GET /health - Check service health
 *
 * Safety/Compliance:
 * - Never log actual PII values
 * - Log entity types for audit trail
 * - Graceful fallback when service unavailable
 */

// Import the service - will fail until implemented
let OpenMedService: new (...args: unknown[]) => OpenMedServiceInterface;

// Define the interface for type safety in tests
interface PIIEntity {
  text: string;
  label: string;
  entityType: string;
  start: number;
  end: number;
  confidence: number;
  redactedText?: string;
}

interface DeidentifyResponse {
  originalText: string;
  deidentifiedText: string;
  piiEntities: PIIEntity[];
  method: string;
  timestamp: string;
  numEntitiesRedacted: number;
}

interface DeidentifyRequest {
  text: string;
  method?: 'mask' | 'remove' | 'replace' | 'hash' | 'shift_dates';
  confidenceThreshold?: number;
  useSmartMerging?: boolean;
}

interface OpenMedServiceInterface {
  onModuleInit(): Promise<void>;
  deidentify(request: DeidentifyRequest): Promise<DeidentifyResponse>;
  deidentifyText(text: string, method?: string): Promise<string>;
  isAvailable(): Promise<boolean>;
}

// Mock response type that mirrors Axios structure
interface MockAxiosResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: Record<string, unknown>;
}

// OpenMed API response format (snake_case from Python service)
interface OpenMedApiResponse {
  original_text: string;
  deidentified_text: string;
  pii_entities: Array<{
    text: string;
    label: string;
    entity_type: string;
    start: number;
    end: number;
    confidence: number;
    redacted_text?: string;
  }>;
  method: string;
  timestamp: string;
  num_entities_redacted: number;
}

interface OpenMedHealthResponse {
  status: string;
  openmed_loaded: boolean;
  timestamp: string;
}

// Mock interfaces for dependencies
interface MockHttpService {
  post: jest.Mock;
  get: jest.Mock;
}

interface MockConfigService {
  get: jest.Mock;
}

describe('OpenMedService', () => {
  let service: OpenMedServiceInterface;
  let mockHttpService: MockHttpService;
  let mockConfigService: MockConfigService;
  let loggerSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  // Sample clinical text with PII
  const sampleClinicalText =
    'Patient John Smith (DOB: 01/15/1980, SSN: 123-45-6789) was seen on 03/20/2024 for follow-up. Contact: john.smith@email.com, Phone: (555) 123-4567.';

  // Expected de-identified output (mask method)
  const sampleMaskedText =
    'Patient [NAME] (DOB: [DATE], SSN: [SSN]) was seen on [DATE] for follow-up. Contact: [EMAIL], Phone: [PHONE].';

  // Mock OpenMed API response
  const mockApiResponse: OpenMedApiResponse = {
    original_text: sampleClinicalText,
    deidentified_text: sampleMaskedText,
    pii_entities: [
      {
        text: 'John Smith',
        label: 'PERSON',
        entity_type: 'NAME',
        start: 8,
        end: 18,
        confidence: 0.98,
        redacted_text: '[NAME]',
      },
      {
        text: '01/15/1980',
        label: 'DATE',
        entity_type: 'DATE',
        start: 25,
        end: 35,
        confidence: 0.95,
        redacted_text: '[DATE]',
      },
      {
        text: '123-45-6789',
        label: 'SSN',
        entity_type: 'SSN',
        start: 42,
        end: 53,
        confidence: 0.99,
        redacted_text: '[SSN]',
      },
      {
        text: '03/20/2024',
        label: 'DATE',
        entity_type: 'DATE',
        start: 67,
        end: 77,
        confidence: 0.96,
        redacted_text: '[DATE]',
      },
      {
        text: 'john.smith@email.com',
        label: 'EMAIL',
        entity_type: 'EMAIL',
        start: 105,
        end: 125,
        confidence: 0.97,
        redacted_text: '[EMAIL]',
      },
      {
        text: '(555) 123-4567',
        label: 'PHONE',
        entity_type: 'PHONE',
        start: 134,
        end: 148,
        confidence: 0.94,
        redacted_text: '[PHONE]',
      },
    ],
    method: 'mask',
    timestamp: '2024-03-20T10:30:00Z',
    num_entities_redacted: 6,
  };

  // Helper to create mock Axios response
  const createMockAxiosResponse = <T>(data: T): MockAxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  });

  // Helper to create mock Axios error
  const createMockAxiosError = (message: string, code?: string): AxiosError => {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.code = code;
    error.response = undefined;
    return error;
  };

  beforeAll(async () => {
    try {
      // Dynamic import to allow tests to compile before implementation exists
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require('./openmed.service');
      OpenMedService = module.OpenMedService;
    } catch {
      // Expected to fail until implementation exists
      // Tests will skip with "if (!OpenMedService) return" guards
    }
  });

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockHttpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          const config: Record<string, string | number | boolean> = {
            'openmed.serviceUrl': 'http://localhost:8001',
            'openmed.timeout': 30000,
            'openmed.enabled': true,
            'openmed.confidenceThreshold': 0.7,
            'openmed.healthCheckOnInit': true,
          };
          return config[key] ?? defaultValue;
        }),
    };

    // Set up logger spy
    loggerSpy = {
      log: jest.spyOn(Logger.prototype, 'log').mockImplementation(),
      warn: jest.spyOn(Logger.prototype, 'warn').mockImplementation(),
      error: jest.spyOn(Logger.prototype, 'error').mockImplementation(),
      debug: jest.spyOn(Logger.prototype, 'debug').mockImplementation(),
    };

    jest.clearAllMocks();

    if (!OpenMedService) return;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenMedService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenMedServiceInterface>(OpenMedService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================
  // MODULE SETUP TESTS
  // ============================================

  describe('module setup', () => {
    it('should export OpenMedService class', () => {
      expect(OpenMedService).toBeDefined();
    });

    it('should be defined when module compiles', () => {
      if (!OpenMedService) return;
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // CONFIGURATION TESTS
  // ============================================

  describe('configuration', () => {
    it('should use default serviceUrl when config is not set', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation(
        (key: string, defaultValue?: unknown) => {
          if (key === 'openmed.serviceUrl') return defaultValue;
          return defaultValue;
        },
      );

      // Rebuild service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OpenMedService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const testService = module.get<OpenMedServiceInterface>(OpenMedService);

      // Act
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );
      await testService.deidentify({ text: sampleClinicalText });

      // Assert - should use default URL http://localhost:8001
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('localhost:8001'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should use config values from ConfigService', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string | number | boolean> = {
          'openmed.serviceUrl': 'http://custom-openmed:9000',
          'openmed.timeout': 60000,
          'openmed.enabled': true,
          'openmed.confidenceThreshold': 0.85,
        };
        return config[key];
      });

      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      await service.deidentify({ text: sampleClinicalText });

      // Assert
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('custom-openmed:9000'),
        expect.anything(),
        expect.objectContaining({
          timeout: 60000,
        }),
      );
    });

    it('should check health on module init when enabled', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string | number | boolean> = {
          'openmed.serviceUrl': 'http://localhost:8001',
          'openmed.enabled': true,
          'openmed.healthCheckOnInit': true,
        };
        return config[key];
      });

      const healthResponse: OpenMedHealthResponse = {
        status: 'healthy',
        openmed_loaded: true,
        timestamp: '2024-03-20T10:00:00Z',
      };
      mockHttpService.get.mockReturnValue(
        of(createMockAxiosResponse(healthResponse)),
      );

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.anything(),
      );
    });

    it('should skip health check when disabled', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string | number | boolean> = {
          'openmed.serviceUrl': 'http://localhost:8001',
          'openmed.enabled': true,
          'openmed.healthCheckOnInit': false,
        };
        return config[key];
      });

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('should skip health check when service is disabled', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string | number | boolean> = {
          'openmed.enabled': false,
          'openmed.healthCheckOnInit': true,
        };
        return config[key];
      });

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // DE-IDENTIFICATION TESTS
  // ============================================

  describe('deidentify', () => {
    describe('mask method', () => {
      it('should de-identify text with mask method (replace PII with [NAME], [DATE], etc.)', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(mockApiResponse)),
        );

        // Act
        const result = await service.deidentify({
          text: sampleClinicalText,
          method: 'mask',
        });

        // Assert
        expect(result.deidentifiedText).toBe(sampleMaskedText);
        expect(result.deidentifiedText).toContain('[NAME]');
        expect(result.deidentifiedText).toContain('[DATE]');
        expect(result.deidentifiedText).toContain('[SSN]');
        expect(result.deidentifiedText).toContain('[EMAIL]');
        expect(result.deidentifiedText).toContain('[PHONE]');
        expect(result.deidentifiedText).not.toContain('John Smith');
        expect(result.deidentifiedText).not.toContain('123-45-6789');
      });

      it('should use mask method by default when method not specified', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(mockApiResponse)),
        );

        // Act
        await service.deidentify({ text: sampleClinicalText });

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            method: 'mask',
          }),
          expect.anything(),
        );
      });
    });

    describe('remove method', () => {
      it('should de-identify text with remove method (remove PII entirely)', async () => {
        // Arrange
        if (!OpenMedService) return;
        const removedText =
          'Patient  (DOB: , SSN: ) was seen on  for follow-up. Contact: , Phone: .';
        const removeResponse: OpenMedApiResponse = {
          ...mockApiResponse,
          deidentified_text: removedText,
          method: 'remove',
        };
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(removeResponse)),
        );

        // Act
        const result = await service.deidentify({
          text: sampleClinicalText,
          method: 'remove',
        });

        // Assert
        expect(result.deidentifiedText).not.toContain('John Smith');
        expect(result.deidentifiedText).not.toContain('123-45-6789');
        expect(result.method).toBe('remove');
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            method: 'remove',
          }),
          expect.anything(),
        );
      });
    });

    describe('replace method', () => {
      it('should de-identify text with replace method (fake data)', async () => {
        // Arrange
        if (!OpenMedService) return;
        const replacedText =
          'Patient Jane Doe (DOB: 06/15/1985, SSN: 987-65-4321) was seen on 01/10/2024 for follow-up. Contact: jane.doe@fake.com, Phone: (555) 987-6543.';
        const replaceResponse: OpenMedApiResponse = {
          ...mockApiResponse,
          deidentified_text: replacedText,
          method: 'replace',
        };
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(replaceResponse)),
        );

        // Act
        const result = await service.deidentify({
          text: sampleClinicalText,
          method: 'replace',
        });

        // Assert
        expect(result.deidentifiedText).not.toContain('John Smith');
        expect(result.method).toBe('replace');
      });
    });

    describe('hash method', () => {
      it('should de-identify text with hash method (consistent hashes)', async () => {
        // Arrange
        if (!OpenMedService) return;
        const hashedText =
          'Patient [HASH:a1b2c3] (DOB: [HASH:d4e5f6], SSN: [HASH:g7h8i9]) was seen on [HASH:j0k1l2] for follow-up.';
        const hashResponse: OpenMedApiResponse = {
          ...mockApiResponse,
          deidentified_text: hashedText,
          method: 'hash',
        };
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(hashResponse)),
        );

        // Act
        const result = await service.deidentify({
          text: sampleClinicalText,
          method: 'hash',
        });

        // Assert
        expect(result.method).toBe('hash');
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            method: 'hash',
          }),
          expect.anything(),
        );
      });
    });

    describe('shift_dates method', () => {
      it('should de-identify text with shift_dates method', async () => {
        // Arrange
        if (!OpenMedService) return;
        const shiftedText =
          'Patient [NAME] (DOB: 04/15/1980, SSN: [SSN]) was seen on 06/20/2024 for follow-up.';
        const shiftResponse: OpenMedApiResponse = {
          ...mockApiResponse,
          deidentified_text: shiftedText,
          method: 'shift_dates',
        };
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(shiftResponse)),
        );

        // Act
        const result = await service.deidentify({
          text: sampleClinicalText,
          method: 'shift_dates',
        });

        // Assert
        expect(result.method).toBe('shift_dates');
      });
    });

    describe('passthrough behavior (security: no PHI leakage)', () => {
      it('should return empty passthrough response when service is disabled (allowPassthrough=true)', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'openmed.enabled') return false;
          if (key === 'openmed.allowPassthrough') return true; // Allow passthrough for test
          return undefined;
        });

        // Rebuild service with disabled config
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            OpenMedService,
            { provide: HttpService, useValue: mockHttpService },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile();

        const disabledService =
          module.get<OpenMedServiceInterface>(OpenMedService);

        // Act
        const result = await disabledService.deidentify({
          text: sampleClinicalText,
        });

        // Assert - passthrough: SECURITY - do NOT return original PHI
        expect(result.originalText).toBe(''); // Empty, not original text
        expect(result.deidentifiedText).toBe(''); // Empty, not original text
        expect(result.piiEntities).toEqual([]);
        expect(result.numEntitiesRedacted).toBe(0);
        expect(result.method).toBe('passthrough');
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should return empty passthrough response on service connection error (allowPassthrough=true)', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'openmed.enabled') return true;
          if (key === 'openmed.allowPassthrough') return true;
          if (key === 'openmed.serviceUrl') return 'http://localhost:8001';
          return undefined;
        });
        const connectionError = createMockAxiosError(
          'connect ECONNREFUSED 127.0.0.1:8001',
          'ECONNREFUSED',
        );
        mockHttpService.post.mockReturnValue(throwError(() => connectionError));

        // Act
        const result = await service.deidentify({ text: sampleClinicalText });

        // Assert - SECURITY: graceful fallback does NOT return original PHI
        expect(result.originalText).toBe(''); // Empty for security
        expect(result.deidentifiedText).toBe(''); // Empty for security
        expect(result.piiEntities).toEqual([]);
        expect(result.numEntitiesRedacted).toBe(0);
      });

      it('should return empty passthrough response on service timeout (allowPassthrough=true)', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'openmed.enabled') return true;
          if (key === 'openmed.allowPassthrough') return true;
          if (key === 'openmed.serviceUrl') return 'http://localhost:8001';
          return undefined;
        });
        const timeoutError = createMockAxiosError(
          'timeout of 30000ms exceeded',
          'ECONNABORTED',
        );
        mockHttpService.post.mockReturnValue(throwError(() => timeoutError));

        // Act
        const result = await service.deidentify({ text: sampleClinicalText });

        // Assert - SECURITY: empty, not original
        expect(result.deidentifiedText).toBe('');
        expect(result.numEntitiesRedacted).toBe(0);
      });

      it('should return empty passthrough response on HTTP 500 error (allowPassthrough=true)', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'openmed.enabled') return true;
          if (key === 'openmed.allowPassthrough') return true;
          if (key === 'openmed.serviceUrl') return 'http://localhost:8001';
          return undefined;
        });
        const serverError = createMockAxiosError('Internal Server Error');
        serverError.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Model failed to load' },
          headers: {},
          config: {},
        } as AxiosResponse;
        mockHttpService.post.mockReturnValue(throwError(() => serverError));

        // Act
        const result = await service.deidentify({ text: sampleClinicalText });

        // Assert - SECURITY: empty, not original
        expect(result.deidentifiedText).toBe('');
      });

      it('should throw ServiceUnavailableException when service is disabled and allowPassthrough=false', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'openmed.enabled') return false;
          if (key === 'openmed.allowPassthrough') return false;
          return undefined;
        });

        // Rebuild service with fail-secure config
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            OpenMedService,
            { provide: HttpService, useValue: mockHttpService },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile();

        const failSecureService =
          module.get<OpenMedServiceInterface>(OpenMedService);

        // Act & Assert - should throw, not return passthrough
        await expect(
          failSecureService.deidentify({ text: sampleClinicalText }),
        ).rejects.toThrow('PII de-identification service is unavailable');
      });

      it('should throw ServiceUnavailableException on service error when allowPassthrough=false', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'openmed.enabled') return true;
          if (key === 'openmed.allowPassthrough') return false;
          if (key === 'openmed.serviceUrl') return 'http://localhost:8001';
          return undefined;
        });

        // Rebuild service
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            OpenMedService,
            { provide: HttpService, useValue: mockHttpService },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile();

        const failSecureService =
          module.get<OpenMedServiceInterface>(OpenMedService);

        const connectionError = createMockAxiosError(
          'connect ECONNREFUSED',
          'ECONNREFUSED',
        );
        mockHttpService.post.mockReturnValue(throwError(() => connectionError));

        // Act & Assert - should throw, not return passthrough
        await expect(
          failSecureService.deidentify({ text: sampleClinicalText }),
        ).rejects.toThrow('PII de-identification service is unavailable');
      });
    });

    describe('response transformation', () => {
      it('should transform snake_case response to camelCase DTO', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(mockApiResponse)),
        );

        // Act
        const result = await service.deidentify({ text: sampleClinicalText });

        // Assert - verify camelCase transformation
        expect(result).toHaveProperty('originalText');
        expect(result).toHaveProperty('deidentifiedText');
        expect(result).toHaveProperty('piiEntities');
        expect(result).toHaveProperty('numEntitiesRedacted');

        // Verify nested entity transformation
        expect(result.piiEntities[0]).toHaveProperty('entityType');
        expect(result.piiEntities[0]).toHaveProperty('redactedText');
        expect(result.piiEntities[0]).not.toHaveProperty('entity_type');
        expect(result.piiEntities[0]).not.toHaveProperty('redacted_text');
      });

      it('should include all PII entities in response (with redacted text field)', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(mockApiResponse)),
        );

        // Act
        const result = await service.deidentify({ text: sampleClinicalText });

        // Assert
        expect(result.piiEntities).toHaveLength(6);
        expect(result.numEntitiesRedacted).toBe(6);

        const entityTypes = result.piiEntities.map((e) => e.entityType);
        expect(entityTypes).toContain('NAME');
        expect(entityTypes).toContain('DATE');
        expect(entityTypes).toContain('SSN');
        expect(entityTypes).toContain('EMAIL');
        expect(entityTypes).toContain('PHONE');

        // SECURITY: PII text values are redacted by default
        result.piiEntities.forEach((e) => {
          expect(e.text).toBe('[REDACTED]');
        });
      });

      it('should NOT include original text by default (security)', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(mockApiResponse)),
        );

        // Act
        const result = await service.deidentify({ text: sampleClinicalText });

        // Assert - SECURITY: original text is NOT returned by default
        expect(result.originalText).toBe('');
        expect(result.originalText).not.toContain('John Smith');
      });
    });

    describe('request parameters', () => {
      it('should send correct request body to OpenMed API', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(mockApiResponse)),
        );

        // Act
        await service.deidentify({
          text: sampleClinicalText,
          method: 'mask',
          confidenceThreshold: 0.8,
          useSmartMerging: true,
        });

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.stringContaining('/deidentify'),
          expect.objectContaining({
            text: sampleClinicalText,
            method: 'mask',
            confidence_threshold: 0.8,
            use_smart_merging: true,
          }),
          expect.anything(),
        );
      });

      it('should use default confidence threshold from config', async () => {
        // Arrange
        if (!OpenMedService) return;
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'openmed.confidenceThreshold') return 0.75;
          if (key === 'openmed.enabled') return true;
          if (key === 'openmed.serviceUrl') return 'http://localhost:8001';
          return undefined;
        });
        mockHttpService.post.mockReturnValue(
          of(createMockAxiosResponse(mockApiResponse)),
        );

        // Act
        await service.deidentify({ text: sampleClinicalText });

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            confidence_threshold: 0.75,
          }),
          expect.anything(),
        );
      });
    });
  });

  // ============================================
  // AUDIT LOGGING TESTS
  // ============================================

  describe('HIPAA audit logging', () => {
    it('should log PII entity types for audit (not the actual values)', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      await service.deidentify({ text: sampleClinicalText });

      // Assert - should log entity types
      expect(loggerSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('NAME'),
      );
      expect(loggerSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('DATE'),
      );
      expect(loggerSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('SSN'),
      );

      // Should NOT log actual PII values
      const allLogCalls = loggerSpy.log.mock.calls.flat().join(' ');
      expect(allLogCalls).not.toContain('John Smith');
      expect(allLogCalls).not.toContain('123-45-6789');
      expect(allLogCalls).not.toContain('john.smith@email.com');
    });

    it('should log number of entities redacted', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      await service.deidentify({ text: sampleClinicalText });

      // Assert
      expect(loggerSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/6|redacted|entities/i),
      );
    });

    it('should log warnings when service is unavailable', async () => {
      // Arrange
      if (!OpenMedService) return;
      const connectionError = createMockAxiosError(
        'connect ECONNREFUSED',
        'ECONNREFUSED',
      );
      mockHttpService.post.mockReturnValue(throwError(() => connectionError));

      // Act
      await service.deidentify({ text: sampleClinicalText });

      // Assert
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringMatching(/unavailable|fallback|passthrough/i),
      );
    });

    it('should not log original text content', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      await service.deidentify({ text: sampleClinicalText });

      // Assert - ensure no log contains the full original text
      const allLogs = [
        ...loggerSpy.log.mock.calls,
        ...loggerSpy.debug.mock.calls,
        ...loggerSpy.warn.mock.calls,
      ]
        .flat()
        .join(' ');

      expect(allLogs).not.toContain(sampleClinicalText);
    });
  });

  // ============================================
  // SIMPLE INTERFACE TESTS
  // ============================================

  describe('deidentifyText (simple interface)', () => {
    it('should return just the de-identified string', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      const result = await service.deidentifyText(sampleClinicalText);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe(sampleMaskedText);
    });

    it('should use mask method by default', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      await service.deidentifyText(sampleClinicalText);

      // Assert
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          method: 'mask',
        }),
        expect.anything(),
      );
    });

    it('should accept optional method parameter', async () => {
      // Arrange
      if (!OpenMedService) return;
      const removeResponse: OpenMedApiResponse = {
        ...mockApiResponse,
        method: 'remove',
      };
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(removeResponse)),
      );

      // Act
      await service.deidentifyText(sampleClinicalText, 'remove');

      // Assert
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          method: 'remove',
        }),
        expect.anything(),
      );
    });

    it('should return empty string when service is disabled (security: no PHI leakage)', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'openmed.enabled') return false;
        if (key === 'openmed.allowPassthrough') return true;
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OpenMedService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const disabledService =
        module.get<OpenMedServiceInterface>(OpenMedService);

      // Act
      const result = await disabledService.deidentifyText(sampleClinicalText);

      // Assert - SECURITY: empty, not original
      expect(result).toBe('');
    });

    it('should return empty string on service error (security: no PHI leakage)', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'openmed.enabled') return true;
        if (key === 'openmed.allowPassthrough') return true;
        if (key === 'openmed.serviceUrl') return 'http://localhost:8001';
        return undefined;
      });
      mockHttpService.post.mockReturnValue(
        throwError(() => createMockAxiosError('Connection refused')),
      );

      // Act
      const result = await service.deidentifyText(sampleClinicalText);

      // Assert - SECURITY: empty, not original
      expect(result).toBe('');
    });
  });

  // ============================================
  // HEALTH CHECK TESTS
  // ============================================

  describe('isAvailable', () => {
    it('should return true when service responds with healthy status', async () => {
      // Arrange
      if (!OpenMedService) return;
      const healthResponse: OpenMedHealthResponse = {
        status: 'healthy',
        openmed_loaded: true,
        timestamp: '2024-03-20T10:00:00Z',
      };
      mockHttpService.get.mockReturnValue(
        of(createMockAxiosResponse(healthResponse)),
      );

      // Act
      const result = await service.isAvailable();

      // Assert
      expect(result).toBe(true);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.anything(),
      );
    });

    it('should return false when service is disabled in config', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'openmed.enabled') return false;
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OpenMedService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const disabledService =
        module.get<OpenMedServiceInterface>(OpenMedService);

      // Act
      const result = await disabledService.isAvailable();

      // Assert
      expect(result).toBe(false);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('should return false when service is down', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.get.mockReturnValue(
        throwError(() => createMockAxiosError('ECONNREFUSED', 'ECONNREFUSED')),
      );

      // Act
      const result = await service.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when service returns unhealthy status', async () => {
      // Arrange
      if (!OpenMedService) return;
      const unhealthyResponse: OpenMedHealthResponse = {
        status: 'unhealthy',
        openmed_loaded: false,
        timestamp: '2024-03-20T10:00:00Z',
      };
      mockHttpService.get.mockReturnValue(
        of(createMockAxiosResponse(unhealthyResponse)),
      );

      // Act
      const result = await service.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when health check times out', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.get.mockReturnValue(
        throwError(() =>
          createMockAxiosError('timeout exceeded', 'ECONNABORTED'),
        ),
      );

      // Act
      const result = await service.isAvailable();

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('edge cases', () => {
    it('should handle empty text input', async () => {
      // Arrange
      if (!OpenMedService) return;
      const emptyResponse: OpenMedApiResponse = {
        original_text: '',
        deidentified_text: '',
        pii_entities: [],
        method: 'mask',
        timestamp: '2024-03-20T10:00:00Z',
        num_entities_redacted: 0,
      };
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(emptyResponse)),
      );

      // Act
      const result = await service.deidentify({ text: '' });

      // Assert
      expect(result.deidentifiedText).toBe('');
      expect(result.piiEntities).toEqual([]);
    });

    it('should handle text with no PII', async () => {
      // Arrange
      if (!OpenMedService) return;
      const noPiiText = 'The patient reported feeling better after treatment.';
      const noPiiResponse: OpenMedApiResponse = {
        original_text: noPiiText,
        deidentified_text: noPiiText,
        pii_entities: [],
        method: 'mask',
        timestamp: '2024-03-20T10:00:00Z',
        num_entities_redacted: 0,
      };
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(noPiiResponse)),
      );

      // Act
      const result = await service.deidentify({ text: noPiiText });

      // Assert
      expect(result.deidentifiedText).toBe(noPiiText);
      expect(result.piiEntities).toHaveLength(0);
      expect(result.numEntitiesRedacted).toBe(0);
    });

    it('should handle very long text', async () => {
      // Arrange
      if (!OpenMedService) return;
      const longText = sampleClinicalText.repeat(100);
      const longResponse: OpenMedApiResponse = {
        original_text: longText,
        deidentified_text: sampleMaskedText.repeat(100),
        pii_entities: mockApiResponse.pii_entities,
        method: 'mask',
        timestamp: '2024-03-20T10:00:00Z',
        num_entities_redacted: 600, // 6 entities * 100 repetitions
      };
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(longResponse)),
      );

      // Act
      const result = await service.deidentify({ text: longText });

      // Assert
      expect(result.numEntitiesRedacted).toBe(600);
    });

    it('should handle special characters and unicode in text', async () => {
      // Arrange
      if (!OpenMedService) return;
      const unicodeText =
        'Patient Muller (DOB: 01/15/1980) presented with symptoms.';
      const unicodeResponse: OpenMedApiResponse = {
        original_text: unicodeText,
        deidentified_text:
          'Patient [NAME] (DOB: [DATE]) presented with symptoms.',
        pii_entities: [
          {
            text: 'Muller',
            label: 'PERSON',
            entity_type: 'NAME',
            start: 8,
            end: 14,
            confidence: 0.95,
            redacted_text: '[NAME]',
          },
        ],
        method: 'mask',
        timestamp: '2024-03-20T10:00:00Z',
        num_entities_redacted: 2,
      };
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(unicodeResponse)),
      );

      // Act
      const result = await service.deidentify({ text: unicodeText });

      // Assert
      expect(result.deidentifiedText).not.toContain('Muller');
    });

    it('should handle low confidence threshold', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      await service.deidentify({
        text: sampleClinicalText,
        confidenceThreshold: 0.1,
      });

      // Assert
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          confidence_threshold: 0.1,
        }),
        expect.anything(),
      );
    });

    it('should handle high confidence threshold', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      await service.deidentify({
        text: sampleClinicalText,
        confidenceThreshold: 0.99,
      });

      // Assert
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          confidence_threshold: 0.99,
        }),
        expect.anything(),
      );
    });
  });

  // ============================================
  // RESPONSE DTO STRUCTURE TESTS
  // ============================================

  describe('response DTO structure', () => {
    it('should return DeidentifyResponseDto with all required fields', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      const result = await service.deidentify({ text: sampleClinicalText });

      // Assert
      expect(result).toHaveProperty('originalText');
      expect(result).toHaveProperty('deidentifiedText');
      expect(result).toHaveProperty('piiEntities');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('numEntitiesRedacted');

      expect(typeof result.originalText).toBe('string');
      expect(typeof result.deidentifiedText).toBe('string');
      expect(Array.isArray(result.piiEntities)).toBe(true);
      expect(typeof result.method).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.numEntitiesRedacted).toBe('number');
    });

    it('should return PIIEntityDto with all required fields', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      const result = await service.deidentify({ text: sampleClinicalText });

      // Assert - verify first entity structure
      const entity = result.piiEntities[0];
      expect(entity).toHaveProperty('text');
      expect(entity).toHaveProperty('label');
      expect(entity).toHaveProperty('entityType');
      expect(entity).toHaveProperty('start');
      expect(entity).toHaveProperty('end');
      expect(entity).toHaveProperty('confidence');

      expect(typeof entity.text).toBe('string');
      expect(typeof entity.label).toBe('string');
      expect(typeof entity.entityType).toBe('string');
      expect(typeof entity.start).toBe('number');
      expect(typeof entity.end).toBe('number');
      expect(typeof entity.confidence).toBe('number');
    });

    it('should include optional redactedText in PIIEntityDto when present', async () => {
      // Arrange
      if (!OpenMedService) return;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockApiResponse)),
      );

      // Act
      const result = await service.deidentify({ text: sampleClinicalText });

      // Assert
      const entityWithRedacted = result.piiEntities.find(
        (e) => e.redactedText !== undefined,
      );
      expect(entityWithRedacted).toBeDefined();
      expect(typeof entityWithRedacted?.redactedText).toBe('string');
    });
  });
});
