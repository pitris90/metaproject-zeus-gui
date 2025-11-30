import { useTranslation } from 'react-i18next';
import { Badge, Box, Group, SegmentedControl, Title } from '@mantine/core';
import type { DataTableSortStatus } from 'mantine-datatable';
import React, { useState } from 'react';

import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import { getSortQuery } from '@/modules/api/sorting/utils';
import { useAllAllocationsQuery, usePendingModificationsQuery } from '@/modules/allocation/api/admin-allocations';
import { type AllocationAdmin } from '@/modules/allocation/model';
import AllocationAdminTable from '@/components/project/allocations/allocation-table';
import { getCurrentRole } from '@/modules/auth/methods/getCurrentRole';
import { Role } from '@/modules/user/role';

type FilterValue = 'all' | 'pending-modifications';

const AdminAllocations = () => {
	const { t } = useTranslation();
	const role = getCurrentRole();
	const prefix = role === Role.ADMIN ? '/admin' : '/director';
	const [filter, setFilter] = useState<FilterValue>('all');

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: t(`components.global.drawerList.links.${role}.title`), href: prefix },
					{
						title: t(`components.global.drawerList.links.${role}.link.allocations`),
						href: `${prefix}/allocations`
					}
				]}
			/>
			<Group justify="space-between" align="center" mb="md">
				<Title order={2}>{t('components.global.drawerList.links.admin.link.allocations')}</Title>
				<SegmentedControl
					value={filter}
					onChange={(value) => setFilter(value as FilterValue)}
					data={[
						{ label: 'All Allocations', value: 'all' },
						{
							label: (
								<Group gap={4}>
									<span>Pending Modifications</span>
									<Badge size="xs" color="yellow" variant="filled">
										OpenStack
									</Badge>
								</Group>
							),
							value: 'pending-modifications'
						}
					]}
				/>
			</Group>
			{filter === 'all' && (
				<AllocationAdminTable
					useAllocationQuery={(page: number, limit: number, sortStatus: DataTableSortStatus<AllocationAdmin>) =>
						useAllAllocationsQuery(
							{
								page,
								limit
							},
							getSortQuery(sortStatus.columnAccessor, sortStatus.direction)
						)
					}
					buildLink={(allocation: AllocationAdmin) =>
						`/project/${allocation.project.id}/allocation/${allocation.id}`
					}
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
					buildLink={(allocation: AllocationAdmin) =>
						`/project/${allocation.project.id}/allocation/${allocation.id}`
					}
				/>
			)}
		</Box>
	);
};

export default AdminAllocations;
