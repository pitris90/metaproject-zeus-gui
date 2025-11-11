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

export const getOpenstackDomainOptions = (): string[] => Array.from(domainSet).sort((a, b) => a.localeCompare(b));

export const getOpenstackQuotaOptions = (): string[] => Array.from(quotaKeySet).sort((a, b) => a.localeCompare(b));

export const isSupportedOpenstackDomain = (domain: string): boolean => domainSet.has(domain);

export const isSupportedOpenstackQuotaKey = (key: string): boolean => quotaKeySet.has(key);
