import { useQuery } from '@tanstack/react-query';

import { request } from '@/modules/api/request';
import { type Resource } from '@/modules/resource/model';

/**
 * Fetches all resources. Optionally filters based on project restrictions.
 * @param projectId - Optional project ID to filter resources (e.g., exclude OpenStack for personal projects or projects with active OpenStack allocation)
 */
export const useResourceListQuery = (projectId?: number) =>
	useQuery({
		queryKey: ['resource', projectId],
		queryFn: () => {
			const url = projectId ? `/resource?projectId=${projectId}` : '/resource';
			return request<Resource[]>(url);
		},
		staleTime: 5 * 60 * 1000 // 5 minutes - prevent unnecessary refetches during form filling
	});
