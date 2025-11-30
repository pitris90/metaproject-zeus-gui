import { Alert, Box, Skeleton } from '@mantine/core';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type UseQueryResult } from '@tanstack/react-query';

import { PAGE_SIZES } from '@/modules/api/pagination/constants';
import { strip } from '@/modules/html/strip';
import { type PaginationResponse } from '@/modules/api/pagination/model';
import { type Project } from '@/modules/project/model';

type ProjectAdminTableProps = {
	useProjectQuery: (
		page: number,
		limit: number,
		sortStatus: DataTableSortStatus<Project>
	) => UseQueryResult<PaginationResponse<Project>, Error>;
	buildLink: (project: Project) => string;
};

const ProjectAdminTable = ({ useProjectQuery, buildLink }: ProjectAdminTableProps) => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(PAGE_SIZES[0]);
	const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Project>>({
		columnAccessor: 'id',
		direction: 'asc'
	});

	const { data: response, isPending, isError, refetch } = useProjectQuery(page, limit, sortStatus);

	if (isError) {
		return (
			<Alert color="red" mt={15} variant="light">
				{t('routes.Dashboard.error.connection')}
			</Alert>
		);
	}

	if (isPending || !response) {
		return <Skeleton w={200} />;
	}

	const metadata = response.metadata ?? { totalRecords: 0, currentPage: 1 };
	const projects = response.data ?? [];

	return (
		<Box mt={15}>
			{projects.length === 0 && (
				<Alert color="blue" variant="light" mt={15}>
					{t('components.projectTable.admin.noProjects')}
				</Alert>
			)}
			{projects.length > 0 && (
				<DataTable
					records={projects}
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
					highlightOnHover
					sortStatus={sortStatus}
					onSortStatusChange={async (sortStatus: DataTableSortStatus<Project>) => {
						setSortStatus(sortStatus);
						await refetch();
					}}
					onRowClick={({ record }) => navigate(buildLink(record))}
					columns={[
						{
							accessor: 'id',
							title: t('routes.Dashboard.table.id'),
							width: 70,
							sortable: true
						},
						{
							accessor: 'title',
							title: t('routes.Dashboard.table.name'),
							sortable: true
						},
						{
							accessor: 'description',
							width: 300,
							title: t('routes.Dashboard.table.description'),
							render: project => {
								const stripped = strip(project.description);
								return stripped.length > 50 ? `${stripped.slice(0, 50)}...` : stripped;
							}
						},
						{
							accessor: 'pi',
							title: t('routes.ProjectRequests.table.pi'),
							render: project => project.user.name
						},
						{
							accessor: 'createdAt',
							title: t('routes.ProjectRequests.table.createdAt'),
							render: project => dayjs(project.createdAt).format('DD.MM.YYYY HH:mm')
						}
					]}
				/>
			)}
		</Box>
	);
};

export default ProjectAdminTable;
