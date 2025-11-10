import { useQuery } from '@tanstack/react-query';

import { Method } from '@/modules/api/model';
import { request } from '@/modules/api/request';
import { type OpenstackCatalogEntry, type OpenstackWorkplaceEntry } from '@/modules/openstack/organizations';

export type OpenstackCatalogResponse = {
	customers: OpenstackCatalogEntry[];
	organizations: OpenstackCatalogEntry[];
	workplaces: OpenstackWorkplaceEntry[];
};

const fetchOpenstackCatalog = async (): Promise<OpenstackCatalogResponse> =>
	request('/openstack/catalog', { method: Method.GET });

export const useOpenstackCatalogQuery = () =>
	useQuery({
		queryKey: ['openstackCatalog'],
		queryFn: fetchOpenstackCatalog,
		staleTime: Number.POSITIVE_INFINITY
	});
