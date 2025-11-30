import { Box, SegmentedControl, Stack, Title } from '@mantine/core';
import type { DataTableSortStatus } from 'mantine-datatable';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import AllocationAdminTable from '@/components/project/allocations/allocation-table';
import type { AllocationAdmin } from '@/modules/allocation/model';
import { useAllocationsRequestsQuery, usePendingModificationsQuery } from '@/modules/allocation/api/admin-allocations';
import { getSortQuery } from '@/modules/api/sorting/utils';
import { getCurrentRole } from '@/modules/auth/methods/getCurrentRole';
import { Role } from '@/modules/user/role';

type FilterValue = 'new-requests' | 'pending-modifications';

const AllocationRequestsList = () => {
	const role = getCurrentRole();
	const prefix = role === Role.ADMIN ? '/admin' : '/director';
	const { t } = useTranslation();
	const [filter, setFilter] = useState<FilterValue>('new-requests');

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: t(`components.global.drawerList.links.${role}.title`), href: prefix },
					{
						title: t(`components.global.drawerList.links.${role}.link.allocation_requests`),
						href: `${prefix}/allocation-requests`
					}
				]}
			/>
			<Stack gap="md">
				<Title order={2}>{t('components.global.drawerList.links.admin.link.allocation_requests')}</Title>
				<SegmentedControl
					value={filter}
					onChange={(value) => setFilter(value as FilterValue)}
					data={[
						{
							label: 'New Requests',
							value: 'new-requests'
						},
						{
							label: 'Pending Modifications',
							value: 'pending-modifications'
						}
					]}
				/>
				{filter === 'new-requests' && (
					<AllocationAdminTable
						useAllocationQuery={(page: number, limit: number, sortStatus: DataTableSortStatus<AllocationAdmin>) =>
							useAllocationsRequestsQuery(
								{
									page,
									limit
								},
								getSortQuery(sortStatus.columnAccessor, sortStatus.direction)
							)
						}
						buildLink={(allocation: AllocationAdmin) => `${prefix}/allocations/${allocation.id}`}
					/>
				)}
				{filter === 'pending-modifications' && (
					<AllocationAdminTable
						useAllocationQuery={(page: number, limit: number, sortStatus: DataTableSortStatus<AllocationAdmin>) =>
							usePendingModificationsQuery(
								{
									page,
									limit
								},
								getSortQuery(sortStatus.columnAccessor, sortStatus.direction)
							)
						}
						buildLink={(allocation: AllocationAdmin) => `${prefix}/allocations/${allocation.id}`}
					/>
				)}
			</Stack>
		</Box>
	);
};

export default AllocationRequestsList;
