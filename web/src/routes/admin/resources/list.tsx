import {
	Alert,
	Anchor,
	Box,
	Button,
	Group,
	type RenderTreeNodePayload,
	Stack,
	Text,
	Title,
	Tooltip,
	Tree,
	type TreeNodeData
} from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconLink, IconPlus, IconSettings } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import React, { useMemo } from 'react';

import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import Loading from '@/components/global/loading';
import ErrorAlert from '@/components/global/error-alert';
import { type Resource } from '@/modules/resource/model';
import { useResourceListQuery } from '@/modules/resource/api/resources';
import { getCurrentRole } from '@/modules/auth/methods/getCurrentRole';
import { Role } from '@/modules/user/role';

const getDataTree = (data: Resource[], parentResourceId: number | null): TreeNodeData[] =>
	data
		.filter(item => item.parentResourceId === parentResourceId)
		.map(item => ({
			value: item.id.toString(),
			label: (
				<Stack gap={1}>
					<Group gap={10}>
						<Text fw={400}>{item.name}</Text>
						<Text c="dimmed">({item.resourceType.name})</Text>
					</Group>
					<Group align="center">
						{item.isAvailable && (
							<Text size="sm" c="green">
								Available
							</Text>
						)}
						{!item.isAvailable && (
							<Text size="sm" c="green">
								Not available
							</Text>
						)}
						<Anchor size="sm" component={Link} to={`${item.id}`}>
							Detail <IconLink size={13} />
						</Anchor>
					</Group>
				</Stack>
			),
			children: getDataTree(data, item.id)
		}));

const Leaf = ({ node, expanded, hasChildren, elementProps }: RenderTreeNodePayload) => (
	<Group py={5} align="center" {...elementProps}>
		{hasChildren && (
			<IconChevronDown size={20} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
		)}
		{!hasChildren && <IconChevronRight size={20} style={{ visibility: 'hidden' }} />}
		{node.label}
	</Group>
);

const ResourceList = () => {
	const { t } = useTranslation();
	const currentRole = getCurrentRole();
	const prefix = currentRole === Role.ADMIN ? '/admin' : '/director';
	const { data, isPending, isError } = useResourceListQuery();

	// useMemo must be called before any early returns to maintain consistent hook order
	const dataTree = useMemo(() => (data ? getDataTree(data, null) : []), [data]);

	if (isPending) {
		return <Loading />;
	}

	if (isError) {
		return <ErrorAlert />;
	}

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: t(`components.global.drawerList.links.${currentRole}.title`), href: prefix },
					{
						title: t(`components.global.drawerList.links.${currentRole}.link.resources`),
						href: `${prefix}/resources`
					}
				]}
			/>
			<Group justify="space-between">
				<Title order={2}>{t('routes.ResourceList.title')}</Title>
				<Group>
					<Button component={Link} to="attributes" variant="light" leftSection={<IconSettings />}>
						{t('routes.ResourceList.attributes_button')}
					</Button>
					<Tooltip label={t('routes.ResourceList.director_warning')} disabled={currentRole === Role.ADMIN}>
						<Button
							component={Link}
							to="add"
							leftSection={<IconPlus />}
							disabled={currentRole === Role.DIRECTOR}
						>
							{t('routes.ResourceList.add_button')}
						</Button>
					</Tooltip>
				</Group>
			</Group>
			<Box my={20}>
				{dataTree.length === 0 && (
					<Alert color="blue" variant="light" mt={15}>
						No resources added yet.
					</Alert>
				)}
				{dataTree.length > 0 && <Tree data={dataTree} renderNode={payload => <Leaf {...payload} />} />}
			</Box>
		</Box>
	);
};

export default ResourceList;
