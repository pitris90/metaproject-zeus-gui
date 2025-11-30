import { ActionIcon, Alert, Anchor, Badge, Box, Group, Text, Tooltip } from '@mantine/core';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type UseQueryResult } from '@tanstack/react-query';
import { IconBan, IconCheck, IconClock, IconClockX, IconFolder, IconNews, IconEdit } from '@tabler/icons-react';

import { PAGE_SIZES } from '@/modules/api/pagination/constants';
import { type PaginationResponse } from '@/modules/api/pagination/model';
import { type AllocationAdmin } from '@/modules/allocation/model';
import Loading from '@/components/global/loading';

type AllocationAdminTableProps = {
	useAllocationQuery: (
		page: number,
		limit: number,
		sortStatus: DataTableSortStatus<AllocationAdmin>
	) => UseQueryResult<PaginationResponse<AllocationAdmin>, Error>;
	buildLink: (allocation: AllocationAdmin) => string;
};

const AllocationAdminTable = ({ useAllocationQuery, buildLink }: AllocationAdminTableProps) => {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(PAGE_SIZES[0]);
	const [sortStatus, setSortStatus] = useState<DataTableSortStatus<AllocationAdmin>>({
		columnAccessor: 'id',
		direction: 'asc'
	});

	const { data: response, isPending, isError, refetch } = useAllocationQuery(page, limit, sortStatus);

	if (isError) {
		return (
			<Alert color="red" mt={15} variant="light">
				{t('routes.Dashboard.error.connection')}
			</Alert>
		);
	}

	if (isPending || !response) {
		return <Loading />;
	}

	const metadata = response.metadata ?? { totalRecords: 0, currentPage: 1 };
	const allocations = response.data ?? [];

	return (
		<Box mt={15}>
			{allocations.length === 0 && (
				<Alert color="blue" variant="light" mt={15}>
					{t('components.allocationTable.noAllocations')}
				</Alert>
			)}
			{allocations.length > 0 && (
				<DataTable
					records={allocations}
					textSelectionDisabled
					page={page}
					totalRecords={metadata.totalRecords}
					recordsPerPage={limit}
					recordsPerPageOptions={PAGE_SIZES}
					onPageChange={async newPage => {
						setPage(newPage);
						await refetch();
					}}
					onRecordsPerPageChange={async newRecordsPerPage => {
						setLimit(newRecordsPerPage);
						await refetch();
					}}
					sortStatus={sortStatus}
					onSortStatusChange={async (sortStatus: DataTableSortStatus<AllocationAdmin>) => {
						setSortStatus(sortStatus);
						await refetch();
					}}
					columns={[
						{
							accessor: 'id',
							title: t('components.allocationTable.columns.id'),
							width: 70,
							sortable: true
						},
						{
							accessor: 'project',
							title: t('components.allocationTable.columns.project'),
							sortable: true,
							render: allocation => (
								<Anchor component={Link} to={`/project/${allocation.project.id}`}>
									{allocation.project.title}
								</Anchor>
							)
						},
						{
							accessor: 'pi',
							title: t('components.allocationTable.columns.pi'),
							sortable: true,
							render: allocation => allocation.project.pi.name
						},
						{
							accessor: 'resource',
							title: t('components.allocationTable.columns.resource'),
							sortable: true,
							render: allocation => (
								<Text>
									{allocation.resource.name} ({allocation.resource.type})
								</Text>
							)
						},
						{
							accessor: 'status',
							title: t('components.allocationTable.columns.status'),
							sortable: true,
							render: allocation => {
								const statusElement = (() => {
									if (allocation.status === 'active') {
										return (
											<Group gap={4} c="green">
												<IconCheck size={14} />
												<Text size="sm">Active</Text>
											</Group>
										);
									}
									if (allocation.status === 'pending') {
										return (
											<Group gap={4} c="orange">
												<IconClock size={14} />
												<Text size="sm">Pending</Text>
											</Group>
										);
									}
									if (allocation.status === 'new') {
										return (
											<Group gap={4} c="blue.9">
												<IconNews size={14} />
												<Text size="sm">New</Text>
											</Group>
										);
									}
									if (allocation.status === 'denied') {
										return (
											<Group gap={4} c="red.9">
												<IconBan size={14} />
												<Text size="sm">Denied</Text>
											</Group>
										);
									}
									if (allocation.status === 'revoked') {
										return (
											<Group gap={4} c="red.9">
												<IconBan size={14} />
												<Text size="sm">Revoked</Text>
											</Group>
										);
									}
									if (allocation.status === 'expired') {
										return (
											<Group gap={4} c="orange.9">
												<IconClockX size={14} />
												<Text size="sm">Expired</Text>
											</Group>
										);
									}

									return <Text size="sm">{allocation.status}</Text>;
								})();

								return (
									<Group gap="xs">
										{statusElement}
										{allocation.hasPendingModification && (
											<Tooltip label="Has pending OpenStack modification request">
												<Badge
													size="xs"
													color="yellow"
													variant="light"
													leftSection={<IconEdit size={10} />}
												>
													Mod
												</Badge>
											</Tooltip>
										)}
									</Group>
								);
							}
						},
						{
							accessor: 'endDate',
							title: t('components.allocationTable.columns.endDate'),
							sortable: true,
							render: allocation =>
								allocation.endDate ? dayjs(allocation.endDate).format('DD.MM.YYYY') : 'None'
						},
						{
							accessor: 'actions',
							title: t('components.allocationTable.columns.actions'),
							render: allocation => (
								<ActionIcon variant="subtle" component={Link} to={buildLink(allocation)}>
									<IconFolder />
								</ActionIcon>
							)
						}
					]}
				/>
			)}
		</Box>
	);
};

export default AllocationAdminTable;
