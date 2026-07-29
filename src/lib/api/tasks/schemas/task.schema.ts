import { z } from "zod";

export const taskStatusSchema = z.enum([
	"not_started",
	"in_progress",
	"blocked",
	"done",
]);

export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const taskLinkedEntityTypeSchema = z.enum([
	"contract",
	"license",
	"audit",
	"calendar_event",
	"none",
]);

export const taskCreateSchema = z.object({
	title: z.string().min(1).max(255),
	description: z.string().max(4000).optional(),
	status: taskStatusSchema.optional().default("not_started"),
	priority: taskPrioritySchema.optional().default("medium"),
	assigneeId: z.string().max(64).optional(),
	dueDate: z.string().datetime().optional().or(z.string().min(1).optional()),
	department: z.string().max(128).optional(),
	linkedEntityType: taskLinkedEntityTypeSchema.optional(),
	linkedEntityId: z.string().max(64).optional(),
});

export const taskUpdateSchema = z.object({
	title: z.string().min(1).max(255).optional(),
	description: z.string().max(4000).optional().nullable(),
	status: taskStatusSchema.optional(),
	priority: taskPrioritySchema.optional(),
	assigneeId: z.string().max(64).optional().nullable(),
	dueDate: z.string().optional().nullable(),
	department: z.string().max(128).optional().nullable(),
	linkedEntityType: taskLinkedEntityTypeSchema.optional().nullable(),
	linkedEntityId: z.string().max(64).optional().nullable(),
});

export const taskListQuerySchema = z.object({
	limit: z.coerce.number().min(1).max(200).optional().default(50),
	offset: z.coerce.number().min(0).optional().default(0),
	status: taskStatusSchema.optional(),
	assigneeId: z.string().optional(),
	department: z.string().optional(),
	priority: taskPrioritySchema.optional(),
	search: z.string().optional(),
	dueBefore: z.string().optional(),
	dueAfter: z.string().optional(),
});
