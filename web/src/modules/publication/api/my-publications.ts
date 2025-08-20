import { Method } from '@/modules/api/model';
import { request } from '@/modules/api/request';
import type { PaginationResponse } from '@/modules/api/pagination/model';
import type { Publication } from '@/modules/publication/model';

export type CreateMyPublicationRequest = {
  title: string;
  authors: string;
  year: number;
  journal: string;
  source: 'doi' | 'manual';
  uniqueId?: string;
};

export const listMyPublications = async (
  page: number,
  limit: number,
  sortSelector: string
) =>
  request<PaginationResponse<Publication>>(
    `/my/publications?page=${page}&limit=${limit}&sort=${encodeURIComponent(sortSelector)}`
  );

export const createMyPublication = async (data: CreateMyPublicationRequest) =>
  request(`/my/publications`, {
    method: Method.POST,
    json: data
  });

export const assignMyPublicationToProject = async (publicationId: number, projectId: number) =>
  request(`/my/publications/${publicationId}/assign`, {
    method: Method.POST,
    json: { projectId }
  });

export const deleteMyPublication = async (publicationId: number) =>
  request(`/my/publications/${publicationId}`, {
    method: Method.DELETE
  });
