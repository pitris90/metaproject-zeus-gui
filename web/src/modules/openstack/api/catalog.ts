import { useQuery } from '@tanstack/react-query';

import { Method } from '@/modules/api/model';
import { request } from '@/modules/api/request';
import { type OpenstackCatalogEntry, type OpenstackWorkplaceEntry } from '@/modules/openstack/organizations';

/**
 * Flavor entry from the OpenStack catalog.
 * Only non-public flavors are returned.
 */
export type OpenstackFlavorEntry = {
	name: string;
	ram: number;
	vcpus: number;
};

/**
 * Network entry from the OpenStack catalog.
 * Only non-shared networks are returned.
 */
export type OpenstackNetworkEntry = {
	name: string;
};

export type OpenstackCatalogResponse = {
	customers: OpenstackCatalogEntry[];
	organizations: OpenstackCatalogEntry[];
	workplaces: OpenstackWorkplaceEntry[];
	domains: string[];
	quotaKeys: string[];
	flavors: OpenstackFlavorEntry[];
	networks: OpenstackNetworkEntry[];
};

const fetchOpenstackCatalog = async (): Promise<OpenstackCatalogResponse> =>
	request('/openstack/catalog', { method: Method.GET });

export const useOpenstackCatalogQuery = () =>
	useQuery({
		queryKey: ['openstackCatalog'],
		queryFn: fetchOpenstackCatalog,
		staleTime: Number.POSITIVE_INFINITY
	});
