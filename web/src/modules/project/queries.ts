import { useQuery } from '@tanstack/react-query';

import { type Pagination, type PaginationResponse } from '@/modules/api/pagination/model';
import { type ProjectStatus } from '@/modules/project/constants';
import type {
	ArchivalInfo,
	Project,
	ProjectFailedStage,
	ProjectMember,
	RejectedComment
} from '@/modules/project/model';
import { request } from '@/modules/api/request';

type ProjectDetailResponse = {
	project: Project;
	permissions: string[];
	archivalInfo?: ArchivalInfo;
	rejectedComments?: RejectedComment[];
};

export const useProjectsQuery = (status: ProjectStatus, pagination: Pagination, sortQuery: string) =>
	useQuery({
		queryKey: ['project', status.toLowerCase(), pagination.limit, pagination.page, sortQuery],
		queryFn: () =>
			request<PaginationResponse<Project>>(
				`/project?status=${status.toLowerCase()}&page=${pagination.page}&limit=${pagination.limit}&sort=${sortQuery}`
			)
	});

/**
 * Fetches all active projects for dropdown selection.
 * This is a separate query from useProjectsQuery because:
 * 1. It needs ALL projects (no pagination limit concerns)
 * 2. Different cache key pattern (no pagination params in key)
 * 3. Simpler return value (just the array) for Select components
 */
export const useMyActiveProjectsQuery = () =>
	useQuery({
		queryKey: ['project', 'active', 'dropdown'],
		queryFn: async () => {
			// Fetch all active projects - uses high limit to get everything
			// For users with many projects, backend pagination would be needed
			const response = await request<PaginationResponse<Project>>(
				'/project?status=active&page=1&limit=1000&sort=title:asc'
			);
			return response?.data ?? [];
		}
	});

export const useProjectRequestsQuery = (pagination: Pagination, sortSelector: string) =>
	useQuery({
		queryKey: ['project', 'requests', pagination.page, pagination.limit, sortSelector],
		queryFn: () =>
			request<PaginationResponse<Project>>(
				`/project/all?page=${pagination.page}&limit=${pagination.limit}&status=new&sort=${sortSelector}`
			)
	});

export const useAllProjectsQuery = (pagination: Pagination, sortSelector: string) =>
	useQuery({
		queryKey: ['project', 'all', pagination.page, pagination.limit, sortSelector],
		queryFn: () =>
			request<PaginationResponse<Project>>(
				`/project/all?page=${pagination.page}&limit=${pagination.limit}&sort=${sortSelector}`
			)
	});

export const useProjectDetailQuery = (id?: string) =>
	useQuery({
		queryKey: ['project', id],
		queryFn: () => request<ProjectDetailResponse>(`/project/${id}`),
		retry: false,
		enabled: !!id && !isNaN(+id)
	});

export const useProjectMembersQuery = (id: number, pagination: Pagination, sortSelector: string) =>
	useQuery({
		queryKey: ['project', id, 'members', pagination.page, pagination.limit, sortSelector],
		queryFn: () =>
			request<PaginationResponse<ProjectMember>>(
				`/project/${id}/members?page=${pagination.page}&limit=${pagination.limit}&sort=${sortSelector}`
			)
	});

export const useProjectFailedStagesQuery = () =>
	useQuery({
		queryKey: ['stages'],
		queryFn: () => request<ProjectFailedStage[]>('/project/failed-stages')
	});
