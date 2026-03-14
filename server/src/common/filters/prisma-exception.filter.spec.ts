import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

/**
 * TDD Tests for PrismaExceptionFilter
 *
 * These tests define the expected behavior of PrismaExceptionFilter:
 * 1. Maps Prisma error codes to appropriate HTTP status codes
 * 2. P2002 (unique constraint violation) -> 409 Conflict
 * 3. P2025 (record not found) -> 404 Not Found
 * 4. Unknown Prisma errors -> 500 Internal Server Error
 *
 * Note: This filter only catches Prisma-specific errors. Non-Prisma errors
 * are handled by the default NestJS exception filter.
 */

// Define typed mock response interface
interface MockResponse {
  status: jest.Mock<MockResponse>;
  json: jest.Mock<MockResponse>;
}

// Define typed mock request interface
interface MockRequest {
  url: string;
  method: string;
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: MockResponse;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();

    // Create mock response object with chained method returns
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const mockRequest: MockRequest = {
      url: '/test-endpoint',
      method: 'POST',
    };

    // Create mock ArgumentsHost
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ArgumentsHost;
  });

  describe('module setup', () => {
    it('should export PrismaExceptionFilter class', () => {
      expect(PrismaExceptionFilter).toBeDefined();
    });
  });

  describe('catch method', () => {
    it('should map P2002 (unique constraint) to 409 Conflict', () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['email'] },
        },
      );

      // Act
      filter.catch(prismaError, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          error: 'Conflict',
        }),
      );
    });

    it('should map P2025 (not found) to 404 Not Found', () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found.',
        {
          code: 'P2025',
          clientVersion: '5.22.0',
          meta: { cause: 'Record to update not found.' },
        },
      );

      // Act
      filter.catch(prismaError, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          error: 'Not Found',
        }),
      );
    });

    it('should map unknown Prisma errors to 500 Internal Server Error', () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Some unknown database error',
        {
          code: 'P9999', // Unknown error code
          clientVersion: '5.22.0',
        },
      );

      // Act
      filter.catch(prismaError, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Internal Server Error',
        }),
      );
    });

    // Note: Non-Prisma errors are no longer caught by this filter.
    // The filter now only catches Prisma-specific errors via @Catch decorator.
    // HttpExceptions are handled by NestJS default exception filter.

    it('should include timestamp in error response', () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['email'] },
        },
      );

      // Act
      filter.catch(prismaError, mockHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String) as string,
        }),
      );
    });

    it('should include request path in error response', () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['email'] },
        },
      );

      // Act
      filter.catch(prismaError, mockHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test-endpoint',
        }),
      );
    });

    it('should handle P2003 (foreign key constraint) as 400 Bad Request', () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: `userId`',
        {
          code: 'P2003',
          clientVersion: '5.22.0',
          meta: { field_name: 'userId' },
        },
      );

      // Act
      filter.catch(prismaError, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
        }),
      );
    });

    it('should handle PrismaClientValidationError as 400 Bad Request', () => {
      // Arrange
      const validationError = new Prisma.PrismaClientValidationError(
        'Invalid input data',
        { clientVersion: '5.22.0' },
      );

      // Act
      filter.catch(validationError, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle PrismaClientInitializationError as 503 Service Unavailable', () => {
      // Arrange
      const initError = new Prisma.PrismaClientInitializationError(
        'Cannot connect to database',
        '5.22.0',
      );

      // Act
      filter.catch(initError, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          error: 'Service Unavailable',
        }),
      );
    });
  });
});
