import { z } from 'zod';
import {
	isSupportedOpenstackDomain,
	isSupportedOpenstackQuotaKey,
	isSupportedOpenstackFlavor,
	isSupportedOpenstackNetwork
} from '@/modules/openstack/constraints';

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
	key: z
		.string()
		.min(1)
		.superRefine((value: string, ctx: z.RefinementCtx) => {
			if (!isSupportedOpenstackQuotaKey(value)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Unsupported OpenStack quota key "${value}".`
				});
			}
		}),
	value: z
		.number()
		.min(0, { message: 'Quota value must be zero or positive.' })
		.finite()
});

/**
 * Network entry with access type (external or shared).
 */
const openstackNetworkEntrySchema = z.object({
	name: z
		.string()
		.min(1)
		.superRefine((value: string, ctx: z.RefinementCtx) => {
			if (!isSupportedOpenstackNetwork(value)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Unsupported OpenStack network "${value}".`
				});
			}
		}),
	accessType: z.enum(['external', 'shared'])
});

export const openstackAllocationSchema = z.object({
	domain: z
		.string()
		.min(1)
		.regex(/^[a-z0-9][a-z0-9_.-]*$/)
		.superRefine((value: string, ctx: z.RefinementCtx) => {
			if (!isSupportedOpenstackDomain(value)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Unsupported OpenStack domain "${value}".`
				});
			}
		}),
	projectDescription: z.string().min(5),
	disableDate: z.date().nullable().optional(),
	customerKey: z.string().min(1),
	organizationKey: z.string().min(1),
	workplaceKey: z.string().min(1),
	additionalTags: z
		.array(z.string().min(1).regex(/^[a-z0-9][a-z0-9_.:-]*$/i, 'Invalid OpenStack tag format.'))
		.optional(),
	quota: z
		.array(openstackQuotaEntrySchema)
		.min(1, { message: 'Provide at least one quota definition.' }),
	/** Optional list of flavor names to assign to the project */
	flavors: z
		.array(
			z.string().min(1).superRefine((value: string, ctx: z.RefinementCtx) => {
				if (!isSupportedOpenstackFlavor(value)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Unsupported OpenStack flavor "${value}".`
					});
				}
			})
		)
		.optional(),
	/** Optional network entries with access type */
	networks: z.array(openstackNetworkEntrySchema).optional()
})
	.superRefine((data, ctx: z.RefinementCtx) => {
		// Check for duplicate quota keys
		const quotaKeys = data.quota.map((entry) => entry.key);
		const quotaDuplicates = quotaKeys.filter((key: string, index: number) => quotaKeys.indexOf(key) !== index);
		if (quotaDuplicates.length > 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate OpenStack quota keys: ${Array.from(new Set(quotaDuplicates)).join(', ')}.`,
				path: ['quota']
			});
		}

		// Check for duplicate flavors
		if (data.flavors && data.flavors.length > 0) {
			const flavorDuplicates = data.flavors.filter(
				(flavor: string, index: number) => data.flavors!.indexOf(flavor) !== index
			);
			if (flavorDuplicates.length > 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate OpenStack flavors: ${Array.from(new Set(flavorDuplicates)).join(', ')}.`,
					path: ['flavors']
				});
			}
		}

		// Check for duplicate networks within each access type
		if (data.networks && data.networks.length > 0) {
			const externalNetworks = data.networks
				.filter((n) => n.accessType === 'external')
				.map((n) => n.name);
			const sharedNetworks = data.networks
				.filter((n) => n.accessType === 'shared')
				.map((n) => n.name);

			const externalDuplicates = externalNetworks.filter(
				(name: string, index: number) => externalNetworks.indexOf(name) !== index
			);
			if (externalDuplicates.length > 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate networks in External access: ${Array.from(new Set(externalDuplicates)).join(', ')}.`,
					path: ['networks']
				});
			}

			const sharedDuplicates = sharedNetworks.filter(
				(name: string, index: number) => sharedNetworks.indexOf(name) !== index
			);
			if (sharedDuplicates.length > 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate networks in Shared access: ${Array.from(new Set(sharedDuplicates)).join(', ')}.`,
					path: ['networks']
				});
			}
		}
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
export type OpenstackNetworkEntry = z.infer<typeof openstackNetworkEntrySchema>;

const allocationStatuses = ['new', 'active', 'revoked', 'denied', 'expired'] as const;

const baseApproveAllocationSchema = z.object({
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	status: z.enum(allocationStatuses),
	description: z.string().optional()
});

export const approveAllocationSchema = baseApproveAllocationSchema.refine(
	(data: z.infer<typeof baseApproveAllocationSchema>) => data.status === 'denied' || Boolean(data.endDate),
	{
		message: 'End date is required unless the allocation is denied.',
		path: ['endDate']
	}
);

export type ApproveAllocationSchema = z.infer<typeof approveAllocationSchema>;
