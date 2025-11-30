import { Alert, Box, Title } from '@mantine/core';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import classes from '@/routes/project/project.module.css';
import { PAGE_SIZES } from '@/modules/api/pagination/constants';
import { type ProjectStatus } from '@/modules/project/constants';
import { useProjectsQuery } from '@/modules/project/queries';
import type { Project } from '@/modules/project/model';
import { getSortQuery } from '@/modules/api/sorting/utils';
import { strip } from '@/modules/html/strip';
import Loading from '@/components/global/loading';

type ProjectTableProps = {
	title: string;
	status: ProjectStatus;
};

const ProjectTable = ({ status, title }: ProjectTableProps) => {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(PAGE_SIZES[0]);
	const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Project>>({
		columnAccessor: 'id',
		direction: 'asc'
	});

	const { t } = useTranslation();
	const navigate = useNavigate();
	const {
		data: response,
		isPending,
		isError,
		refetch
	} = useProjectsQuery(
		status,
		{
			page,
			limit
		},
		getSortQuery(sortStatus.columnAccessor, sortStatus.direction)
	);

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

	const onPageChange = async (newPage: number) => {
		setPage(newPage);
		await refetch();
	};

	const onRecordsPerPageChange = async (newRecordsPerPage: number) => {
		setLimit(newRecordsPerPage);
		await refetch();
	};

	const onSortStatusChange = async (sortStatus: DataTableSortStatus<Project>) => {
		setSortStatus(sortStatus);
		await refetch();
	};

	const metadata = response.metadata ?? { totalRecords: 0, currentPage: 1 };
	const projects = response.data ?? [];

	return (
		<Box mt={15}>
			<Title order={4}>{title}</Title>
			<Box mt={15}>
				{projects.length === 0 && (
					<Alert color="blue" variant="light" mt={15}>
						{t('routes.Dashboard.error.noActiveProjects')}
					</Alert>
				)}
				{projects.length > 0 && (
					<DataTable
						height="70vh"
						className={classes.table}
						records={projects}
						textSelectionDisabled
						page={page}
						totalRecords={metadata.totalRecords}
						recordsPerPage={limit}
						recordsPerPageOptions={PAGE_SIZES}
						onPageChange={onPageChange}
						onRecordsPerPageChange={onRecordsPerPageChange}
						highlightOnHover
						onRowClick={({ record }) => navigate(`/project/${record.id}`)}
						sortStatus={sortStatus}
						onSortStatusChange={onSortStatusChange}
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
								title: t('routes.Dashboard.table.description'),
								render: project => {
									const stripped = strip(project.description);
									return stripped.length > 100 ? `${stripped.slice(0, 100)}...` : stripped;
								}
							}
						]}
					/>
				)}
			</Box>
		</Box>
	);
};

export default ProjectTable;
