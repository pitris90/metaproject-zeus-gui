type CsvModuleRecord = Record<string, string>;

export type OpenstackCatalogEntry = {
	key: string;
	label: string;
};

export type OpenstackWorkplaceEntry = {
	organizationKey: string;
	key: string;
	label: string;
};

const importCsv = (pattern: string): string | undefined => {
	const modules = import.meta.glob<string>(pattern, { as: 'raw', eager: true }) as CsvModuleRecord;
	return Object.values(modules)[0] as string | undefined;
};

const parseKeyLabelCsv = (raw: string): OpenstackCatalogEntry[] => {
	const lines = raw
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	if (lines.length <= 1) {
		return [];
	}

	const [, ...rows] = lines;

	return rows
		.map(row => {
			const [key, label] = row.split(',');
			return {
				key: key?.trim() ?? '',
				label: label?.trim() ?? ''
			};
		})
		.filter(entry => entry.key.length > 0 && entry.label.length > 0);
};

const parseWorkplacesCsv = (raw: string): OpenstackWorkplaceEntry[] => {
	const lines = raw
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	if (lines.length <= 1) {
		return [];
	}

	const [, ...rows] = lines;

	return rows
		.map(row => {
			const [organizationKey, key, label] = row.split(',');
			return {
				organizationKey: organizationKey?.trim() ?? '',
				key: key?.trim() ?? '',
				label: label?.trim() ?? ''
			};
		})
		.filter(entry =>
			entry.organizationKey.length > 0 && entry.key.length > 0 && entry.label.length > 0
		);
};

const organizationsCsv = importCsv(
	'../../../../../api/src/openstack-module/openstack-external/ci/ostack-project-tags-enums/ostack-projects-organizations.csv'
);
const customersCsv = importCsv(
	'../../../../../api/src/openstack-module/openstack-external/ci/ostack-project-tags-enums/ostack-projects-customers.csv'
);
const workplacesCsv = importCsv(
	'../../../../../api/src/openstack-module/openstack-external/ci/ostack-project-tags-enums/ostack-projects-workplaces.csv'
);

export const openstackOrganizations: OpenstackCatalogEntry[] = organizationsCsv
	? parseKeyLabelCsv(organizationsCsv)
	: [];

export const openstackCustomers: OpenstackCatalogEntry[] = customersCsv
	? parseKeyLabelCsv(customersCsv)
	: [];

export const openstackWorkplaces: OpenstackWorkplaceEntry[] = workplacesCsv
	? parseWorkplacesCsv(workplacesCsv)
	: [];

export const hasOpenstackOrganizationCatalog = openstackOrganizations.length > 0;
export const hasOpenstackCustomerCatalog = openstackCustomers.length > 0;
export const hasOpenstackWorkplaceCatalog = openstackWorkplaces.length > 0;

export const getOpenstackWorkplacesByOrganization = (organizationKey: string): OpenstackWorkplaceEntry[] =>
	openstackWorkplaces.filter(entry => entry.organizationKey === organizationKey);
