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

const organizationModules = import.meta.glob<string>(
	'../../../../../api/src/openstack-module/openstack-external/ci/ostack-project-tags-enums/ostack-projects-organizations.csv',
	{ as: 'raw', eager: true }
) as CsvModuleRecord;
const customerModules = import.meta.glob<string>(
	'../../../../../api/src/openstack-module/openstack-external/ci/ostack-project-tags-enums/ostack-projects-customers.csv',
	{ as: 'raw', eager: true }
) as CsvModuleRecord;
const workplaceModules = import.meta.glob<string>(
	'../../../../../api/src/openstack-module/openstack-external/ci/ostack-project-tags-enums/ostack-projects-workplaces.csv',
	{ as: 'raw', eager: true }
) as CsvModuleRecord;

const organizationsCsv = Object.values(organizationModules)[0] as string | undefined;
const customersCsv = Object.values(customerModules)[0] as string | undefined;
const workplacesCsv = Object.values(workplaceModules)[0] as string | undefined;

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
