import { useQuery } from '@tanstack/react-query';

import { request } from '@/modules/api/request';
import { type AllocationDetail } from '@/modules/allocation/model';

export const useAllocationDetailQuery = (allocationId?: number) =>
	useQuery({
		queryKey: ['allocation', allocationId],
		queryFn: () => request<AllocationDetail>(`/allocation/detail/${allocationId}`),
		enabled: allocationId !== undefined
	});
