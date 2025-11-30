import { useQuery } from '@tanstack/react-query';

import { request } from '@/modules/api/request';
import { type ResourceType } from '@/modules/resource/model';

export const useResourceTypesQuery = () =>
	useQuery({
		queryKey: ['resource-type'],
		queryFn: () => request<ResourceType[]>('/resource-type'),
		staleTime: 5 * 60 * 1000 // 5 minutes - prevent unnecessary refetches during form filling
	});
