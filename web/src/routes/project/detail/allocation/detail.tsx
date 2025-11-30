import { useParams } from 'react-router';
import { Badge, Box, Divider, Group, Title } from '@mantine/core';
import React from 'react';

import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import { useProjectOutletContext } from '@/modules/auth/guards/project-detail-guard';
import { useAllocationDetailQuery } from '@/modules/allocation/api/allocation-detail';
import notFound from '@/components/global/not-found';
import ErrorPage from '@/components/global/error-page';
import Loading from '@/components/global/loading';
import AllocationInfo from '@/components/project/allocations/allocation-info';

const AllocationDetail = () => {
	const { project } = useProjectOutletContext();
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
					{ title: 'Projects', href: '/project' },
					{ title: project.title, href: `/project/${project.id}` },
					{ title: 'Request allocation', href: `/project/${project.id}/allocation` }
				]}
			/>
			<Group justify="space-between">
				<Title>Allocation detail</Title>
				<Group>
					<Badge variant="light" size="lg">
						{allocation.status}
					</Badge>
				</Group>
			</Group>
			<Divider my={10} />
			<AllocationInfo allocation={allocation} isApprovePage={false} />
		</Box>
	);
};

export default AllocationDetail;
