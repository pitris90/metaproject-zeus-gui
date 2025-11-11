import { useMutation } from '@tanstack/react-query';

import { Method } from '@/modules/api/model';
import { request } from '@/modules/api/request';
export type AllocationOpenstackRequestPayload = {
	domain: string;
	projectDescription: string;
	disableDate?: string;
	mainTag: string;
	customerKey: string;
	organizationKey: string;
	workplaceKey: string;
	quota: Record<string, number>;
	additionalTags?: string[];
};

export type AllocationRequestPayload = {
	justification: string;
	resourceId: string;
	quantity?: number;
	openstack?: AllocationOpenstackRequestPayload;
};

type RequestAllocationSchema = AllocationRequestPayload & {
	projectId: number;
};

const requestAllocation = async (values: RequestAllocationSchema) => {
	const { projectId, ...data } = values;
	await request(`/allocation/request/${projectId}`, {
		method: Method.POST,
		json: data
	});
};

export const useRequestAllocationMutation = () =>
	useMutation({
		mutationFn: requestAllocation
	});
