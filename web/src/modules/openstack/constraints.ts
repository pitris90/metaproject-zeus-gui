import { type OpenstackFlavorEntry, type OpenstackNetworkEntry } from './api/catalog';

const defaultDomains = ['einfra_cz'];
const defaultQuotaKeys = [
	// Nova
	'instances',
	'cores',
	'ram',
	'metadata_items',
	'key_pairs',
	'server_groups',
	'server_group_members',
	'injected_file_size',
	'injected_files',
	'injected_path_size',
	// Glance
	'properties',
	'image_storage',
	// Cinder
	'gigabytes',
	'snapshots',
	'volumes',
	'per_volume_gigabytes',
	'backup_gigabytes',
	'backups',
	'groups',
	'consistencygroups',
	// Neutron
	'network',
	'subnet',
	'floatingip',
	'port',
	'router',
	'security_group',
	'security_group_rule',
	// Octavia
	'loadbalancer',
	'listeners',
	'members',
	'pool',
	'health_monitors',
	// Barbican
	'secrets',
	'orders',
	'containers',
	'consumers',
	'cas',
	// RADOS
	'object'
];

const domainSet = new Set<string>(defaultDomains);
const quotaKeySet = new Set<string>(defaultQuotaKeys);
const flavorMap = new Map<string, OpenstackFlavorEntry>();
const networkSet = new Set<string>();

const normalizeList = (items: string[]): string[] =>
	items
		.map((item) => item.trim())
		.filter((item) => item.length > 0)
		.sort((a, b) => a.localeCompare(b));

export const syncOpenstackDomains = (domains: string[] | undefined): void => {
	if (!domains || domains.length === 0) {
		return;
	}

	domainSet.clear();
	for (const domain of normalizeList(domains)) {
		domainSet.add(domain);
	}
};

export const syncOpenstackQuotaKeys = (quotaKeys: string[] | undefined): void => {
	if (!quotaKeys || quotaKeys.length === 0) {
		return;
	}

	quotaKeySet.clear();
	for (const key of normalizeList(quotaKeys)) {
		quotaKeySet.add(key);
	}
};

/**
 * Syncs the available flavors from the catalog.
 */
export const syncOpenstackFlavors = (flavors: OpenstackFlavorEntry[] | undefined): void => {
	flavorMap.clear();
	if (!flavors || flavors.length === 0) {
		return;
	}

	for (const flavor of flavors) {
		flavorMap.set(flavor.name, flavor);
	}
};

/**
 * Syncs the available networks from the catalog.
 */
export const syncOpenstackNetworks = (networks: OpenstackNetworkEntry[] | undefined): void => {
	networkSet.clear();
	if (!networks || networks.length === 0) {
		return;
	}

	for (const network of networks) {
		networkSet.add(network.name);
	}
};

export const getOpenstackDomainOptions = (): string[] => Array.from(domainSet).sort((a, b) => a.localeCompare(b));

export const getOpenstackQuotaOptions = (): string[] => Array.from(quotaKeySet).sort((a, b) => a.localeCompare(b));

/**
 * Returns all available flavors (non-public only).
 */
export const getOpenstackFlavorOptions = (): OpenstackFlavorEntry[] =>
	Array.from(flavorMap.values()).sort((a, b) => a.name.localeCompare(b.name));

/**
 * Returns all available network names (non-shared only).
 */
export const getOpenstackNetworkOptions = (): string[] => Array.from(networkSet).sort((a, b) => a.localeCompare(b));

/**
 * Gets flavor details by name.
 */
export const getFlavorDetails = (flavorName: string): OpenstackFlavorEntry | undefined => flavorMap.get(flavorName);

export const isSupportedOpenstackDomain = (domain: string): boolean => domainSet.has(domain);

export const isSupportedOpenstackQuotaKey = (key: string): boolean => quotaKeySet.has(key);

/**
 * Checks if a flavor name is valid and assignable.
 */
export const isSupportedOpenstackFlavor = (flavorName: string): boolean => flavorMap.has(flavorName);

/**
 * Checks if a network name is valid and assignable.
 */
export const isSupportedOpenstackNetwork = (networkName: string): boolean => networkSet.has(networkName);
