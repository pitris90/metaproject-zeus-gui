export type OpenstackCatalogEntry = {
	key: string;
	label: string;
};

export type OpenstackWorkplaceEntry = {
	organizationKey: string;
	key: string;
	label: string;
};

export const getOpenstackWorkplacesByOrganization = (
	workplaces: OpenstackWorkplaceEntry[],
	organizationKey: string
): OpenstackWorkplaceEntry[] => workplaces.filter(entry => entry.organizationKey === organizationKey);

export const mergeCustomerOptions = (
	current: OpenstackCatalogEntry[],
	incoming: OpenstackCatalogEntry[]
): OpenstackCatalogEntry[] => {
	const map = new Map<string, OpenstackCatalogEntry>();

	for (const entry of current) {
		map.set(entry.key, entry);
	}

	for (const entry of incoming) {
		map.set(entry.key, entry);
	}

	return Array.from(map.values());
};

export const ensureMetaCustomerOption = (
	customers: OpenstackCatalogEntry[]
): OpenstackCatalogEntry[] => {
	const hasMeta = customers.some(entry => entry.key === 'meta');
	if (hasMeta) {
		return customers;
	}

	return [...customers, { key: 'meta', label: 'meta' }];
};
