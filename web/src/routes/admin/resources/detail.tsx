import { useParams } from 'react-router';
import { Anchor, Badge, Box, Button, Group, Stack, Text, Title } from '@mantine/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { IconPencil } from '@tabler/icons-react';

import NotFound from '@/components/global/not-found';
import Loading from '@/components/global/loading';
import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import { useResourceDetailQuery } from '@/modules/resource/api/resource-detail';
import { type ResourceDetailAttribute } from '@/modules/resource/model';
import { getCurrentRole } from '@/modules/auth/methods/getCurrentRole';
import { Role } from '@/modules/user/role';

const ResourceDetailPage = () => {
	const { t } = useTranslation();
	const currentRole = getCurrentRole();
	const prefix = currentRole === Role.ADMIN ? '/admin' : '/director';
	const { id } = useParams();

	const idNum = id && !isNaN(+id) ? +id : null;
	const { data, isPending, isError } = useResourceDetailQuery(idNum);

	if (!idNum) {
		return <NotFound />;
	}

	if (isPending) {
		return <Loading />;
	}

	if (isError || !data) {
		return <NotFound />;
	}

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: t(`components.global.drawerList.links.${currentRole}.title`), href: prefix },
					{
						title: t(`components.global.drawerList.links.${currentRole}.link.resources`),
						href: `${prefix}/resources`
					},
					{ title: data.name, href: `${prefix}/resources/${id}` }
				]}
			/>
			<Stack gap={1}>
				<Group justify="space-between">
					<Title>{t('routes.ResourceDetailPage.title')}</Title>
					{currentRole === Role.ADMIN && (
						<Button component={Link} to="edit" variant="light" leftSection={<IconPencil size={16} />}>
							{t('routes.ResourceDetailPage.edit_button')}
						</Button>
					)}
				</Group>
				<Badge color={data.isAvailable ? 'green' : 'red'}>
					{data.isAvailable
						? t('routes.ResourceDetailPage.info.available')
						: t('routes.ResourceDetailPage.info.not_available')}
				</Badge>
			</Stack>

			<Stack my={20}>
				<Stack>
					<Group justify="space-between">
						<Title order={3}>{t('routes.ResourceDetailPage.info.title')}</Title>
					</Group>
					<Group>
						<Text fw={500}>{t('routes.ResourceDetailPage.info.name')}:</Text>
						<Text>{data.name}</Text>
					</Group>
					<Group>
						<Text fw={500}>{t('routes.ResourceDetailPage.info.description')}:</Text>
						<Text>{data.description}</Text>
					</Group>
					<Group>
						<Text fw={500}>{t('routes.ResourceDetailPage.info.type')}:</Text>
						<Text>{data.resourceType.name}</Text>
					</Group>
					<Group>
						<Text fw={500}>{t('routes.ResourceDetailPage.info.parent')}:</Text>
						<Text>
							{data.parentResource ? (
								<Anchor component={Link} to={`/admin/resources/${data.parentResource.id}`}>
									{data.parentResource.name}
								</Anchor>
							) : (
								t('routes.ResourceDetailPage.info.parent_none')
							)}
						</Text>
					</Group>
				</Stack>
				{data.attributes && (
					<Stack>
						<Title order={3}>{t('routes.ResourceDetailPage.attributes.title')}</Title>
						{data.attributes.map((attribute: ResourceDetailAttribute) => (
							<Group key={attribute.key}>
								<Text fw={500}>{t(attribute.key)}:</Text>
								<Text>{attribute.value}</Text>
							</Group>
						))}
					</Stack>
				)}
			</Stack>
		</Box>
	);
};

export default ResourceDetailPage;
