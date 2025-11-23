import {
	ActionIcon,
	Alert,
	Badge,
	Box,
	Button,
	Divider,
	Group,
	Loader,
	rem,
	Select,
	SimpleGrid,
	Stack,
	Tabs,
	Text,
	Title,
	Tooltip
} from '@mantine/core';
import { IconArchive, IconBan, IconInfoCircle, IconRepeat } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import ProjectMembers from '@/components/project/members';
import PageBreadcrumbs from '@/components/global/page-breadcrumbs';
import { ProjectStatus } from '@/modules/project/constants';
import FileView from '@/components/project/file';
import { useProjectOutletContext } from '@/modules/auth/guards/project-detail-guard';
import ProjectInfo from '@/components/project/info';
import ProjectPublications from '@/components/project/publications';
import CommentsTimeline from '@/components/project/comments-timeline';
import ProjectAllocationsTable from '@/components/project/allocations';
import UsageChartCard from '@/components/resource-usage/usage-chart-card';
import { useResourceUsageSummary } from '@/modules/resource-usage/hooks/useResourceUsageSummary';

const ProjectDetail = () => {
	const { project, permissions, archivalInfo, rejectedComments } = useProjectOutletContext();
	const { t } = useTranslation();
	const [selectedSource, setSelectedSource] = useState<string | null>(null);

	const { data: usageData, isLoading: isLoadingUsage } = useResourceUsageSummary({
		scopeType: 'project',
		scopeId: project.id.toString(),
		source: selectedSource || undefined
	});

	const iconStyle = { width: rem(16), height: rem(16) };

	const showArchivalInfoTab =
		project.status === ProjectStatus.ARCHIVED && permissions.includes('view_advanced_details') && !!archivalInfo;
	const showRejectedInfoTab =
		project.status === ProjectStatus.REJECTED &&
		permissions.includes('view_advanced_details') &&
		!!rejectedComments;

	return (
		<Box>
			<PageBreadcrumbs
				links={[
					{ title: 'Projects', href: '/project' },
					{ title: project.title, href: `/project/${project.id}` }
				]}
			/>
			<Group justify="space-between">
				<Title>{project.title}</Title>
				<Group>
					<Badge
						variant="light"
						size="lg"
						color={
							project.status === ProjectStatus.ACTIVE
								? 'teal'
								: project.status === ProjectStatus.NEW
									? 'orange'
									: 'red'
						}
					>
						{t(`routes.ProjectDetail.status.${project.status}`)}
					</Badge>
					{permissions.includes('edit_project') && project.status === 'active' && (
						<Tooltip label="Archive project" position="bottom">
							<ActionIcon
								component={Link}
								variant="transparent"
								color="gray"
								size="lg"
								radius="md"
								aria-label="Settings"
								to="archive"
							>
								<IconArchive style={{ width: rem(24), height: rem(24) }} stroke={1.5} />
							</ActionIcon>
						</Tooltip>
					)}
				</Group>
			</Group>
			<Divider my={10} />
			{project.status === ProjectStatus.NEW && (
				<Alert mt={5} variant="light" color="yellow" title="Project is not active" icon={<IconInfoCircle />}>
					Current project, which you are editing is not yet accepted. You can only request allocations,
					changes to publications and members will be possible only when project is active.
				</Alert>
			)}
			{project.status === ProjectStatus.ARCHIVED && (
				<Alert mt={5} variant="light" color="red" title="Project is archived" icon={<IconInfoCircle />}>
					Current project is already archived.
				</Alert>
			)}
			{project.status === ProjectStatus.REJECTED && (
				<Alert mt={5} variant="light" color="red" title="Project is rejected" icon={<IconInfoCircle />}>
					Current project was already rejected. You can view comments from the reviewer and edit project
					accordingly.
				</Alert>
			)}
			<ProjectInfo project={project} showFullDescription={false} />

			<Tabs
				py={20}
				defaultValue={
					showArchivalInfoTab ? 'archivalInfo' : showRejectedInfoTab ? 'rejectedComments' : 'projectInfo'
				}
			>
				<Tabs.List>
					{showArchivalInfoTab && (
						<Tabs.Tab value="archivalInfo" leftSection={<IconArchive style={iconStyle} />}>
							Archival info
						</Tabs.Tab>
					)}
					{showRejectedInfoTab && (
						<Tabs.Tab value="rejectedComments" leftSection={<IconBan style={iconStyle} />}>
							Reasons for rejection
						</Tabs.Tab>
					)}
					<Tabs.Tab value="projectInfo" leftSection={<IconInfoCircle style={iconStyle} />}>
						Project info
					</Tabs.Tab>
					<Tabs.Tab value="resourceUsage" leftSection={<IconInfoCircle style={iconStyle} />}>
						Resource usage
					</Tabs.Tab>
				</Tabs.List>

				{showArchivalInfoTab && (
					<Tabs.Panel value="archivalInfo">
						<Stack mt={20}>
							<Box>
								<Title order={4}>Archival description:</Title>
								<Text>{archivalInfo.description}</Text>
							</Box>

							{archivalInfo.file && (
								<Box mb={40} mt={15}>
									<Title order={4}>Attached file:</Title>
									<FileView downloadType="archival" file={archivalInfo.file} />
								</Box>
							)}
						</Stack>
					</Tabs.Panel>
				)}

				{showRejectedInfoTab && (
					<Tabs.Panel value="rejectedComments">
						<CommentsTimeline rejectedComments={rejectedComments} />
						<Button component={Link} to="request" leftSection={<IconRepeat />}>
							{t('routes.ProjectDetail.rejectedComments.request')}
						</Button>
					</Tabs.Panel>
				)}

				<Tabs.Panel value="projectInfo">
					<ProjectAllocationsTable id={project.id} />
					{project.status === ProjectStatus.ACTIVE && (
						<>
							<ProjectMembers id={project.id} />
							<ProjectPublications id={project.id} />
						</>
					)}
				</Tabs.Panel>

				<Tabs.Panel value="resourceUsage">
					{isLoadingUsage && (
						<Group justify="center" py="xl">
							<Loader size="lg" />
						</Group>
					)}

					{!isLoadingUsage && usageData && (
						<Stack gap="md">
							{usageData.availableSources.length > 1 && (
								<Group>
									<Select
										label="Data source"
										placeholder="All sources"
										data={[
											{ value: '', label: 'All sources' },
											...usageData.availableSources.map((source) => ({
												value: source,
												label: source
											}))
										]}
										value={selectedSource}
										onChange={(value) => setSelectedSource(value || null)}
										clearable
										style={{ minWidth: 200 }}
									/>
								</Group>
							)}

							<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
								<UsageChartCard
									title="CPU time"
									description="Total CPU seconds consumed per window"
									series={usageData.series}
									metrics={[
										{
											key: 'cpuTimeSeconds',
											label: 'CPU time'
										}
									]}
								/>
								<UsageChartCard
									title="CPU usage"
									description="Average CPU utilization percentage"
									series={usageData.series}
									metrics={[
										{
											key: 'cpuPercent',
											label: 'CPU %'
										}
									]}
								/>
								<UsageChartCard
									title="Walltime"
									description="Elapsed time per window"
									series={usageData.series}
									metrics={[
										{
											key: 'walltimeSeconds',
											label: 'Walltime'
										}
									]}
								/>
								<UsageChartCard
									title="Memory"
									description="Allocated vs used RAM"
									series={usageData.series}
									metrics={[
										{
											key: 'ramBytesAllocated',
											label: 'Allocated'
										},
										{
											key: 'ramBytesUsed',
											label: 'Used'
										}
									]}
								/>
							</SimpleGrid>
						</Stack>
					)}

					{!isLoadingUsage && !usageData && (
						<Box py="xl">
							<Text>No usage data available for this project yet.</Text>
						</Box>
					)}
				</Tabs.Panel>
			</Tabs>
		</Box>
	);
};

export default ProjectDetail;
