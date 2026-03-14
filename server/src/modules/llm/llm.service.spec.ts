import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SummaryType,
  UserRole,
  BiomarkerType,
  BiomarkerValue,
  LLMSummary,
} from '../../generated/prisma/client';
import { of, throwError } from 'rxjs';
import { LlmService } from './llm.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HealthDataService } from '../health-data/health-data.service';
import { OpenMedService } from '../openmed/openmed.service';

/**
 * TDD Tests for LlmService
 *
 * These tests define the expected behavior of LlmService:
 * 1. Generate clinician summaries with safety constraints
 * 2. Generate patient wellness nudges
 * 3. Handle LLM API errors gracefully (fallback responses)
 * 4. Enforce medical safety constraints in all outputs
 * 5. Save summaries to database with correct audience role
 *
 * Safety constraints (MUST be enforced):
 * - All responses include disclaimer about consulting healthcare provider
 * - No diagnosis language allowed
 * - No medication advice allowed
 * - Defer to clinicians for all medical decisions
 */

// Define mock interfaces for dependencies
// HttpService token for DI - matches @nestjs/axios pattern
const HTTP_SERVICE_TOKEN = 'HttpService';

interface MockHttpService {
  post: jest.Mock;
}

interface MockConfigService {
  get: jest.Mock;
}

interface MockHealthDataService {
  findAll: jest.Mock;
  findLatest: jest.Mock;
}

interface MockLLMSummaryDelegate {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
}

interface MockUserDelegate {
  findUnique: jest.Mock;
}

interface MockPrismaService {
  lLMSummary: MockLLMSummaryDelegate;
  user: MockUserDelegate;
}

interface MockOpenMedService {
  deidentifyText: jest.Mock;
  deidentify: jest.Mock;
  isAvailable: jest.Mock;
}

// Mock response type that mirrors Axios structure
interface MockAxiosResponse {
  data: {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: Record<string, unknown>;
}

// Mock error class for HTTP errors
class MockHttpError extends Error {
  code?: string;
  response?: {
    status: number;
    statusText: string;
    data: Record<string, unknown>;
    headers: Record<string, string>;
    config: Record<string, unknown>;
  };

  constructor(message: string) {
    super(message);
    this.name = 'AxiosError';
  }
}

describe('LlmService', () => {
  let service: LlmService;
  let mockHttpService: MockHttpService;
  let mockConfigService: MockConfigService;
  let mockHealthDataService: MockHealthDataService;
  let mockPrismaService: MockPrismaService;
  let mockOpenMedService: MockOpenMedService;

  // Mock user data
  const mockUser = {
    id: 'user-uuid-1',
    email: 'patient@example.com',
    role: UserRole.PATIENT,
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockClinician = {
    id: 'clinician-uuid-1',
    email: 'clinician@example.com',
    role: UserRole.CLINICIAN,
    firstName: 'Dr. Jane',
    lastName: 'Smith',
  };

  // Mock biomarker data for trend analysis
  const mockBiomarkerValues: BiomarkerValue[] = [
    {
      id: 'biomarker-uuid-1',
      userId: 'user-uuid-1',
      type: BiomarkerType.HEART_RATE_VARIABILITY,
      value: 45,
      unit: 'ms',
      timestamp: new Date('2024-01-10T10:00:00Z'),
      source: 'apple_health',
      metadata: null,
      createdAt: new Date('2024-01-10T10:00:00Z'),
    },
    {
      id: 'biomarker-uuid-2',
      userId: 'user-uuid-1',
      type: BiomarkerType.HEART_RATE_VARIABILITY,
      value: 52,
      unit: 'ms',
      timestamp: new Date('2024-01-11T10:00:00Z'),
      source: 'apple_health',
      metadata: null,
      createdAt: new Date('2024-01-11T10:00:00Z'),
    },
    {
      id: 'biomarker-uuid-3',
      userId: 'user-uuid-1',
      type: BiomarkerType.HEART_RATE_VARIABILITY,
      value: 58,
      unit: 'ms',
      timestamp: new Date('2024-01-12T10:00:00Z'),
      source: 'apple_health',
      metadata: null,
      createdAt: new Date('2024-01-12T10:00:00Z'),
    },
  ];

  // Mock LLM summary data
  const mockLLMSummary: LLMSummary = {
    id: 'summary-uuid-1',
    userId: 'user-uuid-1',
    type: SummaryType.WEEKLY_SUMMARY,
    content:
      'Your heart rate variability shows an improving trend over the past week. Consider discussing these findings with your healthcare provider.',
    structuredData: {
      flags: ['HRV improving'],
      recommendations: ['Maintain current sleep schedule'],
      questionsForDoctor: ['Is this HRV trend expected?'],
    },
    audienceRole: UserRole.CLINICIAN,
    modelVersion: 'gpt-4',
    promptHash: 'abc123',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  // Expected disclaimer text
  const EXPECTED_DISCLAIMER =
    'Discuss these findings with your healthcare provider.';

  // Helper to create mock LLM response
  const createMockLlmResponse = (content: object): MockAxiosResponse => ({
    data: {
      choices: [
        {
          message: {
            content: JSON.stringify(content),
          },
        },
      ],
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  });

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockHttpService = {
      post: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string | number> = {
          'llm.apiUrl': 'https://api.openai.com/v1/chat/completions',
          'llm.apiKey': 'test-api-key',
          'llm.timeoutMs': 30000,
          'llm.model': 'gpt-4',
        };
        return config[key];
      }),
    };

    mockHealthDataService = {
      findAll: jest.fn(),
      findLatest: jest.fn(),
    };

    mockPrismaService = {
      lLMSummary: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    mockOpenMedService = {
      deidentifyText: jest
        .fn()
        .mockImplementation((text: string) => Promise.resolve(text)),
      deidentify: jest.fn().mockImplementation((request: { text: string }) =>
        Promise.resolve({
          originalText: request.text,
          deidentifiedText: request.text,
          piiEntities: [],
          method: 'passthrough',
          timestamp: new Date().toISOString(),
          numEntitiesRedacted: 0,
        }),
      ),
      isAvailable: jest.fn().mockResolvedValue(true),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: HTTP_SERVICE_TOKEN,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HealthDataService,
          useValue: mockHealthDataService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OpenMedService,
          useValue: mockOpenMedService,
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });

  describe('module setup', () => {
    it('should export LlmService class', () => {
      expect(LlmService).toBeDefined();
    });
  });

  // ============================================
  // HAPPY PATH TESTS
  // ============================================

  describe('generateSummary', () => {
    describe('happy path', () => {
      it('should return summary with disclaimer when biomarker data exists', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const llmResponse = createMockLlmResponse({
          summary: 'Your HRV shows an improving trend over the past week.',
          flags: ['HRV improving'],
          recommendations: ['Maintain current sleep schedule'],
          questionsForDoctor: ['Is this HRV trend expected?'],
        });
        mockHttpService.post.mockReturnValue(of(llmResponse));
        mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          SummaryType.WEEKLY_SUMMARY,
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
        expect(result.type).toBe(SummaryType.WEEKLY_SUMMARY);
        expect(result.generatedAt).toBeDefined();
      });

      it('should save summary to database with correct audienceRole', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockClinician);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const llmResponse = createMockLlmResponse({
          summary: 'Patient HRV shows improving trend.',
          flags: ['HRV improving'],
          recommendations: [],
          questionsForDoctor: [],
        });
        mockHttpService.post.mockReturnValue(of(llmResponse));
        mockPrismaService.lLMSummary.create.mockResolvedValue({
          ...mockLLMSummary,
          type: SummaryType.CLINICIAN_REPORT,
          audienceRole: UserRole.CLINICIAN,
        });

        // Act
        await service.generateSummary(
          'user-uuid-1',
          SummaryType.CLINICIAN_REPORT,
        );

        // Assert
        expect(mockPrismaService.lLMSummary.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: 'user-uuid-1',
              type: SummaryType.CLINICIAN_REPORT,
              audienceRole: UserRole.CLINICIAN,
            }) as {
              userId: string;
              type: SummaryType;
              audienceRole: UserRole;
            },
          }),
        );
      });

      it('should call LLM API with correct headers and prompt', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const llmResponse = createMockLlmResponse({
          summary: 'Summary content.',
          flags: [],
          recommendations: [],
          questionsForDoctor: [],
        });
        mockHttpService.post.mockReturnValue(of(llmResponse));
        mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

        // Act
        await service.generateSummary(
          'user-uuid-1',
          SummaryType.WEEKLY_SUMMARY,
        );

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          'https://api.openai.com/v1/chat/completions',
          expect.objectContaining({
            model: 'gpt-4',
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: 'system',
              }) as { role: string },
              expect.objectContaining({
                role: 'user',
              }) as { role: string },
            ]) as Array<{ role: string }>,
          }),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            }) as { Authorization: string; 'Content-Type': string },
          }),
        );
      });

      it('should include structured data in summary response', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const llmResponse = createMockLlmResponse({
          summary: 'Your HRV is improving.',
          flags: ['HRV trending up', 'Recovery improving'],
          recommendations: ['Continue current routine'],
          questionsForDoctor: ['Should I adjust my exercise?'],
        });
        mockHttpService.post.mockReturnValue(of(llmResponse));
        mockPrismaService.lLMSummary.create.mockResolvedValue({
          ...mockLLMSummary,
          structuredData: {
            flags: ['HRV trending up', 'Recovery improving'],
            recommendations: ['Continue current routine'],
            questionsForDoctor: ['Should I adjust my exercise?'],
          },
        });

        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          SummaryType.WEEKLY_SUMMARY,
        );

        // Assert
        expect(result.structuredData).toBeDefined();
        expect(result.structuredData?.flags).toContain('HRV trending up');
        expect(result.structuredData?.recommendations).toBeDefined();
        expect(result.structuredData?.questionsForDoctor).toBeDefined();
      });
    });

    // ============================================
    // EDGE CASE TESTS
    // ============================================

    describe('edge cases', () => {
      it('should return insufficient data message when user has no biomarker data', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });

        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          SummaryType.WEEKLY_SUMMARY,
        );

        // Assert
        expect(result.content).toContain('insufficient data');
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
        // LLM should NOT be called when there's no data
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should handle various summary types correctly', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const llmResponse = createMockLlmResponse({
          summary: 'Daily recap of your biomarkers.',
          flags: [],
          recommendations: [],
          questionsForDoctor: [],
        });
        mockHttpService.post.mockReturnValue(of(llmResponse));
        mockPrismaService.lLMSummary.create.mockResolvedValue({
          ...mockLLMSummary,
          type: SummaryType.DAILY_RECAP,
        });

        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          SummaryType.DAILY_RECAP,
        );

        // Assert
        expect(result.type).toBe(SummaryType.DAILY_RECAP);
      });
    });

    // ============================================
    // ERROR CASE TESTS
    // ============================================

    describe('error cases', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.generateSummary(
            'nonexistent-user',
            SummaryType.WEEKLY_SUMMARY,
          ),
        ).rejects.toThrow(NotFoundException);
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should return fallback response when LLM API times out', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const timeoutError = new MockHttpError('timeout of 30000ms exceeded');
        timeoutError.code = 'ECONNABORTED';
        mockHttpService.post.mockReturnValue(throwError(() => timeoutError));

        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          SummaryType.WEEKLY_SUMMARY,
        );

        // Assert - should return graceful fallback, not throw
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
      });

      it('should return fallback response when LLM API returns error', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const apiError = new MockHttpError(
          'Request failed with status code 500',
        );
        apiError.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'LLM service unavailable' },
          headers: {},
          config: {},
        };
        mockHttpService.post.mockReturnValue(throwError(() => apiError));

        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          SummaryType.WEEKLY_SUMMARY,
        );

        // Assert - should return graceful fallback, not throw
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
      });

      it('should handle HTTP error from LLM API gracefully', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const rateLimitError = new MockHttpError('Rate limit exceeded');
        rateLimitError.response = {
          status: 429,
          statusText: 'Too Many Requests',
          data: { error: 'Rate limit exceeded' },
          headers: {},
          config: {},
        };
        mockHttpService.post.mockReturnValue(throwError(() => rateLimitError));

        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          SummaryType.WEEKLY_SUMMARY,
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.content).not.toContain('error');
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
      });
    });
  });

  // ============================================
  // GENERATE NUDGE TESTS
  // ============================================

  describe('generateNudge', () => {
    describe('happy path', () => {
      it('should return valid nudge with disclaimer for patient', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const llmResponse = createMockLlmResponse({
          nudge:
            'Great progress on your HRV! Consider a short walk today to maintain your momentum.',
        });
        mockHttpService.post.mockReturnValue(of(llmResponse));
        mockPrismaService.lLMSummary.create.mockResolvedValue({
          ...mockLLMSummary,
          type: SummaryType.WELLNESS_NUDGE,
          content:
            'Great progress on your HRV! Consider a short walk today to maintain your momentum.',
        });

        // Act
        const result = await service.generateNudge('user-uuid-1');

        // Assert
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.type).toBe(SummaryType.WELLNESS_NUDGE);
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
        expect(result.generatedAt).toBeDefined();
      });

      it('should save nudge to database with PATIENT audience role', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const llmResponse = createMockLlmResponse({
          nudge: 'Remember to stay hydrated today!',
        });
        mockHttpService.post.mockReturnValue(of(llmResponse));
        mockPrismaService.lLMSummary.create.mockResolvedValue({
          ...mockLLMSummary,
          type: SummaryType.WELLNESS_NUDGE,
          audienceRole: UserRole.PATIENT,
        });

        // Act
        await service.generateNudge('user-uuid-1');

        // Assert
        expect(mockPrismaService.lLMSummary.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: SummaryType.WELLNESS_NUDGE,
              audienceRole: UserRole.PATIENT,
            }) as { type: SummaryType; audienceRole: UserRole },
          }),
        );
      });
    });

    describe('edge cases', () => {
      it('should return safe response when trend data is empty', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });

        // Act
        const result = await service.generateNudge('user-uuid-1');

        // Assert - should return generic wellness nudge
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
        expect(result.type).toBe(SummaryType.WELLNESS_NUDGE);
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.generateNudge('nonexistent-user')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should return fallback nudge when LLM API fails', async () => {
        // Arrange
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

        const apiError = new MockHttpError('Service unavailable');
        mockHttpService.post.mockReturnValue(throwError(() => apiError));

        // Act
        const result = await service.generateNudge('user-uuid-1');

        // Assert - graceful degradation
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
      });
    });
  });

  // ============================================
  // MEDICAL SAFETY VALIDATION TESTS
  // ============================================

  describe('medical safety constraints', () => {
    it('should always include disclaimer in all responses', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      const llmResponse = createMockLlmResponse({
        summary: 'Your biomarkers look good.',
        flags: [],
        recommendations: [],
        questionsForDoctor: [],
      });
      mockHttpService.post.mockReturnValue(of(llmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

      // Test for each summary type
      const summaryTypes = [
        SummaryType.DAILY_RECAP,
        SummaryType.WEEKLY_SUMMARY,
        SummaryType.TREND_ANALYSIS,
        SummaryType.RISK_ASSESSMENT,
        SummaryType.CLINICIAN_REPORT,
      ];

      for (const summaryType of summaryTypes) {
        // Act
        const result = await service.generateSummary(
          'user-uuid-1',
          summaryType,
        );

        // Assert
        expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
      }
    });

    it('should sanitize LLM response containing diagnosis keywords', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      // LLM returns unsafe content with diagnosis language
      const unsafeLlmResponse = createMockLlmResponse({
        summary:
          'You have diabetes. Your glucose levels indicate a diagnosis of Type 2 Diabetes.',
        flags: ['Diagnosed with diabetes'],
        recommendations: [],
        questionsForDoctor: [],
      });
      mockHttpService.post.mockReturnValue(of(unsafeLlmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

      // Act
      const result = await service.generateSummary(
        'user-uuid-1',
        SummaryType.WEEKLY_SUMMARY,
      );

      // Assert - diagnosis language should be sanitized
      expect(result.content).not.toMatch(/you have diabetes/i);
      expect(result.content).not.toMatch(/diagnosed with/i);
      expect(result.content).not.toMatch(/diagnosis of/i);
      expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
    });

    it('should sanitize LLM response containing medication advice', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      // LLM returns unsafe content with medication advice
      const unsafeLlmResponse = createMockLlmResponse({
        summary:
          'You should take metformin 500mg twice daily. Stop taking your current medication immediately.',
        flags: [],
        recommendations: ['Start metformin', 'Discontinue aspirin'],
        questionsForDoctor: [],
      });
      mockHttpService.post.mockReturnValue(of(unsafeLlmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

      // Act
      const result = await service.generateSummary(
        'user-uuid-1',
        SummaryType.WEEKLY_SUMMARY,
      );

      // Assert - medication advice should be sanitized
      expect(result.content).not.toMatch(/take metformin/i);
      expect(result.content).not.toMatch(/stop taking/i);
      expect(result.content).not.toMatch(/discontinue/i);
      expect(result.content).not.toMatch(/\d+\s*mg/i); // No dosage information
      expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
    });

    it('should include clinician deferral language in patient-facing responses', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      const llmResponse = createMockLlmResponse({
        nudge: 'Your HRV has been improving. Keep up the good work!',
      });
      mockHttpService.post.mockReturnValue(of(llmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue({
        ...mockLLMSummary,
        type: SummaryType.WELLNESS_NUDGE,
      });

      // Act
      const result = await service.generateNudge('user-uuid-1');

      // Assert - should include reference to healthcare provider
      expect(result.disclaimer).toMatch(
        /healthcare provider|doctor|clinician/i,
      );
    });

    it('should not include treatment recommendations in patient-facing summaries', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      // LLM returns content with treatment recommendations
      const unsafeLlmResponse = createMockLlmResponse({
        summary:
          'Based on your labs, you need insulin therapy. Start a low-carb diet immediately.',
        flags: [],
        recommendations: ['Begin insulin therapy', 'Prescribe statins'],
        questionsForDoctor: [],
      });
      mockHttpService.post.mockReturnValue(of(unsafeLlmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

      // Act
      const result = await service.generateSummary(
        'user-uuid-1',
        SummaryType.WEEKLY_SUMMARY,
      );

      // Assert - treatment language should be removed/sanitized
      expect(result.content).not.toMatch(/you need/i);
      expect(result.content).not.toMatch(/insulin therapy/i);
      expect(result.content).not.toMatch(/prescribe/i);
    });

    it('should frame outputs as observations not diagnoses', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      const safeResponse = createMockLlmResponse({
        summary:
          'Your HRV values have shown improvement over the past week. This trend may be worth discussing with your healthcare provider.',
        flags: ['HRV trending upward'],
        recommendations: [],
        questionsForDoctor: ['What does this HRV trend mean for me?'],
      });
      mockHttpService.post.mockReturnValue(of(safeResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

      // Act
      const result = await service.generateSummary(
        'user-uuid-1',
        SummaryType.WEEKLY_SUMMARY,
      );

      // Assert - content should be observational
      expect(result.content).toMatch(
        /shown|observed|trend|may|consider|discuss/i,
      );
      expect(result.disclaimer).toContain(EXPECTED_DISCLAIMER);
    });
  });

  // ============================================
  // RESPONSE DTO STRUCTURE TESTS
  // ============================================

  describe('response DTO structure', () => {
    it('should return SummaryResponseDto with all required fields', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      const llmResponse = createMockLlmResponse({
        summary: 'Your biomarkers are stable.',
        flags: ['All values normal'],
        recommendations: ['Continue current routine'],
        questionsForDoctor: [],
      });
      mockHttpService.post.mockReturnValue(of(llmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue(mockLLMSummary);

      // Act
      const result = await service.generateSummary(
        'user-uuid-1',
        SummaryType.WEEKLY_SUMMARY,
      );

      // Assert - verify SummaryResponseDto structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('disclaimer');
      expect(typeof result.id).toBe('string');
      expect(typeof result.content).toBe('string');
      expect(typeof result.generatedAt).toBe('string');
    });

    it('should return NudgeResponseDto with all required fields', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      const llmResponse = createMockLlmResponse({
        nudge: 'Stay active today!',
      });
      mockHttpService.post.mockReturnValue(of(llmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue({
        ...mockLLMSummary,
        type: SummaryType.WELLNESS_NUDGE,
      });

      // Act
      const result = await service.generateNudge('user-uuid-1');

      // Assert - verify NudgeResponseDto structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('disclaimer');
      expect(result.type).toBe(SummaryType.WELLNESS_NUDGE);
    });

    it('should include optional structuredData in SummaryResponseDto when available', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHealthDataService.findAll.mockResolvedValue({ data: mockBiomarkerValues, total: mockBiomarkerValues.length, page: 1, limit: 200 });

      const llmResponse = createMockLlmResponse({
        summary: 'Analysis complete.',
        flags: ['Flag 1', 'Flag 2'],
        recommendations: ['Rec 1'],
        questionsForDoctor: ['Question 1'],
      });
      mockHttpService.post.mockReturnValue(of(llmResponse));
      mockPrismaService.lLMSummary.create.mockResolvedValue({
        ...mockLLMSummary,
        structuredData: {
          flags: ['Flag 1', 'Flag 2'],
          recommendations: ['Rec 1'],
          questionsForDoctor: ['Question 1'],
        },
      });

      // Act
      const result = await service.generateSummary(
        'user-uuid-1',
        SummaryType.TREND_ANALYSIS,
      );

      // Assert
      expect(result.structuredData).toBeDefined();
      expect(result.structuredData?.flags).toEqual(['Flag 1', 'Flag 2']);
      expect(result.structuredData?.recommendations).toEqual(['Rec 1']);
      expect(result.structuredData?.questionsForDoctor).toEqual(['Question 1']);
    });
  });
});
