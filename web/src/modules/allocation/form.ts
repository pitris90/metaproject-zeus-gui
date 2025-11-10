import { z } from 'zod';

export const addResourceSchema = z.object({
	name: z.string().min(3).max(100),
	description: z.string().min(15).max(10000),
	isAvailable: z.boolean(),
	resourceTypeId: z.number(),
	parentResourceId: z.number().optional(),
	attributes: z
		.object({
			key: z.string().min(2).max(100),
			value: z.string().max(100)
		})
		.array()
		.optional()
});

export type AddResourceSchema = z.infer<typeof addResourceSchema>;
export type EditResourceSchema = { id: number } & AddResourceSchema;

const openstackQuotaEntrySchema = z.object({
	key: z.string().min(1),
	value: z.number().min(0)
});

export const openstackAllocationSchema = z.object({
	domain: z.string().min(1),
	projectDescription: z.string().min(5),
	disableDate: z.date().nullable().optional(),
	customerKey: z.string().min(1),
	organizationKey: z.string().min(1),
	workplaceKey: z.string().min(1),
	additionalTags: z.array(z.string().min(1)).optional(),
	quota: z.array(openstackQuotaEntrySchema).min(1)
});

export const addAllocationSchema = z.object({
	justification: z.string().min(3),
	resourceId: z.string().refine((value: string) => parseInt(value, 10) > 0),
	quantity: z.number().min(0).optional(),
	openstack: openstackAllocationSchema.optional()
});

export type AddAllocationSchema = z.infer<typeof addAllocationSchema>;
export type OpenstackAllocationForm = z.infer<typeof openstackAllocationSchema>;
export type OpenstackQuotaEntry = z.infer<typeof openstackQuotaEntrySchema>;

export const approveAllocationSchema = z.object({
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	status: z.string().min(1),
	description: z.string().optional()
});

export type ApproveAllocationSchema = z.infer<typeof approveAllocationSchema>;
