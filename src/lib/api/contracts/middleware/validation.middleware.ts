import type { NextRequest } from "next/server";
import type { ZodSchema } from "zod";
import {
	generateRequestId,
	validationErrorResponse,
} from "../utils/response.util";

/**
 * Validate request body against a Zod schema
 * Returns null if valid, or an error response if invalid
 */
export function validateBody<T>(
	request: NextRequest,
	schema: ZodSchema<T>,
): Promise<ReturnType<typeof validationErrorResponse> | null> {
	return request
		.json()
		.then((body) => {
			const result = schema.safeParse(body);
			if (!result.success) {
				const requestId = generateRequestId();
				const errors = result.error.errors.reduce(
					(acc, err) => {
						const path = err.path.join(".");
						if (!acc[path]) {
							acc[path] = [];
						}
						acc[path].push(err.message);
						return acc;
					},
					{} as Record<string, string[]>,
				);
				return validationErrorResponse(
					`Validation failed: ${Object.entries(errors)
						.map(([field, messages]) => `${field}: ${messages.join(", ")}`)
						.join("; ")}`,
					requestId,
				);
			}
			return null;
		})
		.catch(() => {
			const requestId = generateRequestId();
			return validationErrorResponse("Invalid JSON in request body", requestId);
		});
}

/**
 * Validate query parameters against a Zod schema
 * Returns null if valid, or an error response if invalid
 */
export function validateQuery<T>(
	request: NextRequest,
	schema: ZodSchema<T>,
): ReturnType<typeof validationErrorResponse> | null {
	const { searchParams } = new URL(request.url);
	const params = Object.fromEntries(searchParams.entries());

	const result = schema.safeParse(params);
	if (!result.success) {
		const requestId = generateRequestId();
		const errors = result.error.errors.reduce(
			(acc, err) => {
				const path = err.path.join(".");
				if (!acc[path]) {
					acc[path] = [];
				}
				acc[path].push(err.message);
				return acc;
			},
			{} as Record<string, string[]>,
		);
		return validationErrorResponse(
			`Validation failed: ${Object.entries(errors)
				.map(([field, messages]) => `${field}: ${messages.join(", ")}`)
				.join("; ")}`,
			requestId,
		);
	}
	return null;
}

/**
 * Validate request body and return parsed data
 * Throws validation error if invalid
 */
export async function parseAndValidateBody<T>(
	request: NextRequest,
	schema: ZodSchema<T>,
): Promise<T> {
	const body = await request.json();
	const result = schema.safeParse(body);
	if (!result.success) {
		const errors = result.error.errors.reduce(
			(acc, err) => {
				const path = err.path.join(".");
				if (!acc[path]) {
					acc[path] = [];
				}
				acc[path].push(err.message);
				return acc;
			},
			{} as Record<string, string[]>,
		);
		throw new Error(
			`Validation failed: ${Object.entries(errors)
				.map(([field, messages]) => `${field}: ${messages.join(", ")}`)
				.join("; ")}`,
		);
	}
	return result.data;
}

/**
 * Validate query parameters and return parsed data
 * Throws validation error if invalid
 */
export function parseAndValidateQuery<T>(
	request: NextRequest,
	schema: ZodSchema<T>,
): T {
	const { searchParams } = new URL(request.url);
	const params = Object.fromEntries(searchParams.entries());

	const result = schema.safeParse(params);
	if (!result.success) {
		const errors = result.error.errors.reduce(
			(acc, err) => {
				const path = err.path.join(".");
				if (!acc[path]) {
					acc[path] = [];
				}
				acc[path].push(err.message);
				return acc;
			},
			{} as Record<string, string[]>,
		);
		throw new Error(
			`Validation failed: ${Object.entries(errors)
				.map(([field, messages]) => `${field}: ${messages.join(", ")}`)
				.join("; ")}`,
		);
	}
	return result.data;
}
