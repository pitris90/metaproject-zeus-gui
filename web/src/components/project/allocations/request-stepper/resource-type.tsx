import { Alert, Group, rem } from '@mantine/core';
import {
	IconCloud,
	IconComponents,
	IconCpu,
	IconDatabase,
	IconDevices2,
	IconLicense,
	IconServer,
	IconCloudComputing
} from '@tabler/icons-react';
import React from 'react';

import Loading from '@/components/global/loading';
import ErrorAlert from '@/components/global/error-alert';
import SelectCard from '@/components/global/select-card';
import { useResourceTypesQuery } from '@/modules/resource/api/resource-types';
import { OPENSTACK_RESOURCE_TYPE_NAME } from '@/modules/openstack/constants';
import { type ResourceType } from '@/modules/resource/model';

// TODO will be type in the future
const getResourceTypeIcon = (name: string) => {
	const style = { width: rem(64), height: rem(64) };

	if (name === OPENSTACK_RESOURCE_TYPE_NAME) {
		return <IconCloudComputing style={style} />;
	}

	if (name === 'Server') {
		return <IconServer style={style} />;
	}

	if (name === 'Software licence') {
		return <IconLicense style={style} />;
	}

	if (name === 'Storage') {
		return <IconDatabase style={style} />;
	}

	if (name === 'Cluster partition') {
		return <IconComponents style={style} />;
	}

	if (name === 'Cluster') {
		return <IconCpu style={style} />;
	}

	if (name === 'Compute node') {
		return <IconDevices2 style={style} />;
	}
};

type ResourceTypeStepProps = {
	resourceTypeId: number | null;
	setResourceType: (id: number) => void;
	setComplete: () => void;
};

const ResourceTypeStep = ({ setComplete, resourceTypeId, setResourceType }: ResourceTypeStepProps) => {
	const { data, isError, isPending } = useResourceTypesQuery();

	if (isPending) {
		return <Loading />;
	}

	if (isError) {
		return <ErrorAlert />;
	}

	const onClick = (id: number) => {
		setResourceType(id);
		setComplete();
	};

	const resourceTypes: ResourceType[] =
		data?.filter((resourceType: ResourceType) => resourceType.hasResources) ?? [];

	return (
		<Group justify="center">
			{resourceTypes.length === 0 && (
				<Alert color="blue" variant="light" mt={15}>
					No resources added yet. Please wait for admin to add some resources.
				</Alert>
			)}
			{resourceTypes.length > 0 &&
				resourceTypes.map((resourceType: ResourceType) => (
					<SelectCard
						key={resourceType.id}
						selected={resourceTypeId === resourceType.id}
						onClick={() => onClick(resourceType.id)}
						size={200}
						icon={getResourceTypeIcon(resourceType.name)}
						label={resourceType.name}
						description={resourceType.description}
					/>
				))}
		</Group>
	);
};

export default ResourceTypeStep;
