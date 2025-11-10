type OrganizationEntry = {
	key: string;
	label: string;
};

const organizationModules = import.meta.glob<string>(
	'../../../../../api/src/openstack-module/openstack-external/ci/ostack-project-tags-enums/ostack-projects-organizations.csv',
	{ as: 'raw', eager: true }
) as Record<string, string>;

const organizationsCsv = Object.values(organizationModules)[0] as string | undefined;

const parseOrganizations = (raw: string): OrganizationEntry[] => {
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

export const openstackOrganizations: OrganizationEntry[] = organizationsCsv
	? parseOrganizations(organizationsCsv)
	: [];

export const hasOpenstackOrganizationCatalog = openstackOrganizations.length > 0;
