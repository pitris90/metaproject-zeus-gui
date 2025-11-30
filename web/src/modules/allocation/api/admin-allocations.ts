import { useQuery } from '@tanstack/react-query';

import type { Pagination, PaginationResponse } from '@/modules/api/pagination/model';
import { request } from '@/modules/api/request';
import type { AllocationAdmin } from '@/modules/allocation/model';

export const useAllAllocationsQuery = (pagination: Pagination, sortSelector: string, status?: string) =>
	useQuery({
		queryKey: ['allocations', pagination.page, pagination.limit, sortSelector, status],
		queryFn: () => {
			const params = new URLSearchParams({
				page: String(pagination.page),
				limit: String(pagination.limit),
				sort: sortSelector
			});
			if (status) {
				params.set('status', status);
			}
			return request<PaginationResponse<AllocationAdmin>>(`/allocation/all?${params.toString()}`);
		}
	});

export const useAllocationsRequestsQuery = (pagination: Pagination, sortSelector: string) =>
	useQuery({
		queryKey: ['allocations', 'requests', pagination.page, pagination.limit, sortSelector],
		queryFn: () =>
			request<PaginationResponse<AllocationAdmin>>(
				`/allocation/all?page=${pagination.page}&limit=${pagination.limit}&sort=${sortSelector}&status=new`
			)
	});

export const usePendingModificationsQuery = (pagination: Pagination, sortSelector: string) =>
	useQuery({
		queryKey: ['allocations', 'pending-modifications', pagination.page, pagination.limit, sortSelector],
		queryFn: () =>
			request<PaginationResponse<AllocationAdmin>>(
				`/allocation/all?page=${pagination.page}&limit=${pagination.limit}&sort=${sortSelector}&status=pending-modification`
			)
	});
