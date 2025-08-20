import { useMutation, useQuery } from '@tanstack/react-query';
import type { Pagination } from '@/modules/api/pagination/model';
import type { Publication } from '@/modules/publication/model';
import {
  assignMyPublicationToProject,
  deleteMyPublication,
  listMyPublications
} from '@/modules/publication/api/my-publications';

export const useMyPublicationsQuery = (pagination: Pagination, sortSelector: string) =>
  useQuery({
    queryKey: ['my', 'publications', pagination.page, pagination.limit, sortSelector],
    queryFn: () => listMyPublications(pagination.page, pagination.limit, sortSelector)
  });

export const useAssignMyPublicationMutation = () =>
  useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      assignMyPublicationToProject(id, projectId)
  });

export const useDeleteMyPublicationMutation = () =>
  useMutation({
    mutationFn: (id: number) => deleteMyPublication(id)
  });
