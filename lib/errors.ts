// lib/errors.ts
//
// Centralized error handling with error codes for consistent API responses

export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, message, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(ErrorCode.RATE_LIMITED, message, 429);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.DATABASE_ERROR, message, 500, details);
    this.name = 'DatabaseError';
  }
}

export function toErrorResponse(error: unknown): {
  error: { code: string; message: string; details?: Record<string, unknown> };
  status: number;
} {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      status: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message,
      },
      status: 500,
    };
  }

  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unknown error occurred',
    },
    status: 500,
  };
}
