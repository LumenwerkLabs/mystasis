import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Response, Request } from 'express';

/**
 * PrismaExceptionFilter maps Prisma errors to appropriate HTTP responses.
 *
 * Error code mappings:
 * - P2002 (unique constraint) -> 409 Conflict
 * - P2025 (not found) -> 404 Not Found
 * - P2003 (foreign key constraint) -> 400 Bad Request
 * - PrismaClientValidationError -> 400 Bad Request
 * - PrismaClientInitializationError -> 503 Service Unavailable
 * - Unknown Prisma errors -> 500 Internal Server Error
 *
 * Non-Prisma errors are re-thrown to be handled by the default exception filter.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientInitializationError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An unexpected error occurred';

    // Handle PrismaClientKnownRequestError
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          message = 'Resource already exists';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = 'Resource not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'Invalid reference';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          error = 'Internal Server Error';
          message = 'Database error';
      }
    }
    // Handle PrismaClientValidationError
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'Validation error';
    }
    // Handle PrismaClientInitializationError
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = 'Service Unavailable';
      message = 'Database connection error';
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
