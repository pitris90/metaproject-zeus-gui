import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Method } from '@/modules/api/model';
import { request } from '@/modules/api/request';

export type OpenstackModifyPayload = {
	disableDate?: string;
	customerKey: string;
	organizationKey: string;
	workplaceKey: string;
	quota: Record<string, number>;
	additionalTags?: string[];
	flavors?: string[];
	networks?: {
		accessAsExternal?: string[];
		accessAsShared?: string[];
	};
};

type ModifyOpenstackAllocationSchema = OpenstackModifyPayload & {
	allocationId: number;
};

const modifyOpenstackAllocation = async (values: ModifyOpenstackAllocationSchema) => {
	const { allocationId, ...data } = values;
	await request(`/allocation/detail/${allocationId}/openstack/modify`, {
		method: Method.POST,
		json: data
	});
};

export const useModifyOpenstackAllocationMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: modifyOpenstackAllocation,
		onSuccess: (_data, variables) => {
			// Invalidate allocation detail to refresh with new pending request
			void queryClient.invalidateQueries({
				queryKey: ['allocation', variables.allocationId]
			});
		}
	});
};
