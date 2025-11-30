import { useParams } from 'react-router';
import React from 'react';
import { Badge, Box, Divider, Group, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import notFound from '@/components/global/not-found';
import { useAllocationDetailQuery } from '@/modules/allocation/api/allocation-detail';
import ErrorPage from '@/components/global/error-page';
import Loading from '@/components/global/loading';
import AllocationInfo from '@/components/project/allocations/allocation-info';
import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import { getCurrentRole } from '@/modules/auth/methods/getCurrentRole';
import { Role } from '@/modules/user/role';

const AllocationRequestDetail = () => {
	const { t } = useTranslation();
	const role = getCurrentRole();
	const prefix = role === Role.ADMIN ? '/admin' : '/director';
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { allocationId } = useParams();

	const allocationIdNum = allocationId && !isNaN(+allocationId) ? +allocationId : undefined;
	const { data: allocation, isPending, isError } = useAllocationDetailQuery(allocationIdNum);

	if (!allocationIdNum) {
		return notFound();
	}

	if (isError) {
		return <ErrorPage />;
	}

	if (isPending || !allocation) {
		return <Loading />;
	}

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: t(`components.global.drawerList.links.${role}.title`), href: prefix },
					{
						title: t(`components.global.drawerList.links.${role}.link.allocation_requests`),
						href: `${prefix}/allocation-requests`
					},
					{
						title: 'Allocation request detail',
						href: `${prefix}/allocations/${allocation.id}`
					}
				]}
			/>
			<Group justify="space-between">
				<Title>Allocation request detail</Title>
				<Group>
					<Badge variant="light" size="lg">
						{allocation.status}
					</Badge>
				</Group>
			</Group>
			<Divider my={10} />
			<AllocationInfo
				allocation={allocation}
				isApprovePage
				onSuccess={() => {
					// Invalidate allocation queries so lists show updated status
					queryClient.invalidateQueries({ queryKey: ['allocations'] });
					queryClient.invalidateQueries({ queryKey: ['allocation'] });
					notifications.show({
						message: 'Allocation request changed'
					});
					navigate('/admin/allocation-requests');
				}}
			/>
		</Box>
	);
};

export default AllocationRequestDetail;
