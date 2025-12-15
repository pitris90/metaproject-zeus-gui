import { useEffect, useMemo, useState } from 'react';
import {
	Box,
	Container,
	SimpleGrid,
	Stack,
	Title,
	Select,
	SegmentedControl,
	Group,
	Text,
	Loader
} from '@mantine/core';
import { IconCpu, IconDatabase, IconGauge } from '@tabler/icons-react';

import UsageChartCard from '@/components/resource-usage/usage-chart-card';
import UsageStatCard from '@/components/resource-usage/usage-stat-card';
import { useResourceUsageSummary } from '@/modules/resource-usage/hooks/useResourceUsageSummary';
import { ResourceUsageScopeOption, ResourceUsageScopeType } from '@/modules/resource-usage/types';

const scopeSegments: { label: string; value: ResourceUsageScopeType }[] = [
	{ label: 'Users', value: 'user' },
	{ label: 'Projects', value: 'project' },
	{ label: 'Allocations', value: 'allocation' }
];

const formatBytes = (bytes: number): string => {
	if (!Number.isFinite(bytes)) {
		return '0 B';
	}
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const formatDuration = (seconds: number): string => {
	if (!Number.isFinite(seconds)) {
		return '0s';
	}
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
};

const UsageDashboard = () => {
	const [scopeType, setScopeType] = useState<ResourceUsageScopeType>('project');
	const [scopeId, setScopeId] = useState<string | undefined>(undefined);

	const { data, isLoading } = useResourceUsageSummary({ scopeType, scopeId });

	useEffect(() => {
		if (!data) {
			return;
		}
		const scopedOptions = data.availableScopes.filter(option => option.type === scopeType);
		const currentStillValid = scopedOptions.find(option => option.id === scopeId);
		if (!currentStillValid) {
			setScopeId(scopedOptions[0]?.id);
		}
	}, [data, scopeId, scopeType]);

	const scopeOptions = useMemo(() => {
		return (data?.availableScopes ?? []).filter(option => option.type === scopeType);
	}, [data?.availableScopes, scopeType]);

	const series = data?.series ?? [];

	// Determine if we're showing only OpenStack data (walltime is not relevant for OpenStack)
	const isOpenstackOnly =
		data?.scope?.source === 'openstack' ||
		(data?.availableSources?.length === 1 && data?.availableSources[0] === 'openstack');

	return (
		<Container size="xl" py="lg">
			<Stack gap="xl">
				<div>
					<Title order={2}>Resource usage</Title>
					<Text c="dimmed">Visual overview of CPU, memory and walltime consumption built from collector data.</Text>
				</div>

				<Group align="flex-end" gap="md" wrap="wrap">
					<SegmentedControl
						value={scopeType}
						onChange={value => setScopeType(value as ResourceUsageScopeType)}
						data={scopeSegments}
						fullWidth={false}
					/>
					<Select
						label={scopeType === 'allocation' ? 'Allocation / Job' : scopeType.charAt(0).toUpperCase() + scopeType.slice(1)}
						placeholder={`Select ${scopeType}`}
						data={scopeOptions.map(option => ({ value: option.id, label: option.label }))}
						value={scopeId}
						onChange={value => setScopeId(value ?? undefined)}
						nothingFoundMessage="No entries"
						style={{ minWidth: 240 }}
					/>
				</Group>

				{isLoading && (
					<Group justify="center" py="xl">
						<Loader size="lg" />
					</Group>
				)}

				{!isLoading && data && (
					<Stack gap="xl">
						<SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
							<UsageStatCard
								title="Allocated vCPUs"
								value={new Intl.NumberFormat().format(data.totals.totalVcpus)}
								description={`Scope: ${data.scope.label}`}
								icon={<IconCpu size={20} />}
							/>
							<UsageStatCard
								title="Disk allocation"
								value={formatBytes(data.totals.storageBytesAllocated)}
								description="Static quota reported by ZEUS"
								icon={<IconDatabase size={20} />}
							/>
							<UsageStatCard
								title="Samples tracked"
								value={String(series.length)}
								description={`Last update ${new Date(data.totals.lastUpdated).toLocaleString()}`}
								icon={<IconGauge size={20} />}
							/>
						</SimpleGrid>

						<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
							<UsageChartCard
								title="CPU time"
								description="Total CPU seconds consumed per window"
								series={series}
								unitType="time"
								metrics={[
									{
										key: 'cpuTimeSeconds',
										label: 'CPU time'
									}
								]}
							/>
							<UsageChartCard
								title="CPU usage"
								description="Average CPU utilisation %"
								series={series}
								unitType="percentage"
								metrics={[
									{
										key: 'cpuPercent',
										label: 'CPU %'
									}
								]}
							/>
							{!isOpenstackOnly && (
								<UsageChartCard
									title="Walltime"
									description="Elapsed time per window"
									series={series}
									unitType="time"
									metrics={[
										{
											key: 'walltimeSeconds',
											label: 'Walltime'
										}
									]}
								/>
							)}
							<UsageChartCard
								title="Memory"
								description="Allocated vs used RAM"
								series={series}
								unitType="memory"
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

				{!isLoading && !data && (
					<Box py="xl">
						<Text>No usage data available yet.</Text>
					</Box>
				)}
			</Stack>
		</Container>
	);
};

export default UsageDashboard;
