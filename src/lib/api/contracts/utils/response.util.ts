import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * Standard API response interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    requestId?: string;
    pagination?: PaginationMeta;
  }
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    requestId: options?.requestId || generateRequestId(),
    meta: {
      timestamp: new Date().toISOString(),
      ...(options?.pagination && { pagination: options.pagination }),
    },
  };

  if (options?.message) {
    response.message = options.message;
  }

  return NextResponse.json(response);
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string | Error,
  status: number = 500,
  options?: {
    requestId?: string;
    details?: unknown;
    errorCode?: ErrorCode;
  }
): NextResponse<ApiResponse> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorCode =
    options?.errorCode ||
    (error instanceof Error && 'code' in error
      ? (error as any).code
      : undefined) ||
    ErrorCode.INTERNAL_ERROR;
  const finalStatus =
    error instanceof Error && 'status' in error
      ? (error as any).status
      : status;

  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    requestId: options?.requestId || generateRequestId(),
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  // Add error code
  (response as any).errorCode = errorCode;

  // Add details in development
  if (options?.details && process.env.NODE_ENV === 'development') {
    (response as any).details = options.details;
  }

  // Add validation details if available
  if (error instanceof ValidationError && error.details) {
    (response as any).validationErrors = error.details;
  }

  // Log error with context
  console.error('API Error:', {
    requestId: response.requestId,
    errorCode,
    status: finalStatus,
    message: errorMessage,
    ...(error instanceof Error && { stack: error.stack }),
    ...(options?.details && { details: options.details }),
  });

  return NextResponse.json(response, { status: finalStatus });
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  errors: Record<string, string[]> | string,
  requestId?: string
): NextResponse<ApiResponse> {
  const errorMessage =
    typeof errors === 'string'
      ? errors
      : Object.entries(errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');

  return errorResponse(`Validation failed: ${errorMessage}`, 400, {
    requestId,
  });
}

/**
 * Create a not found response
 */
export function notFoundResponse(
  resource: string,
  requestId?: string
): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404, {
    requestId,
    errorCode: ErrorCode.NOT_FOUND,
  });
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(
  message: string = 'Authentication required',
  requestId?: string
): NextResponse<ApiResponse> {
  return errorResponse(message, 401, { requestId });
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(
  message: string = 'Access denied',
  requestId?: string
): NextResponse<ApiResponse> {
  return errorResponse(message, 403, {
    requestId,
    errorCode: ErrorCode.FORBIDDEN,
  });
}
