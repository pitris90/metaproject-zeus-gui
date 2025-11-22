import { ResourceUsageScopeOption, ResourceUsageSummaryResponse } from './types';

const demoProject: ResourceUsageScopeOption = {
	id: 'demo-project',
	type: 'project',
	label: 'Demo Project'
};

const demoAllocations: ResourceUsageScopeOption[] = [
	{ id: 'alloc-1', type: 'allocation', label: 'Allocation: GPU Training' },
	{ id: 'alloc-2', type: 'allocation', label: 'Allocation: Data Processing' },
	{ id: 'alloc-3', type: 'allocation', label: 'Allocation: Web Server' }
];

const demoUsers: ResourceUsageScopeOption[] = [
	{ id: 'user-1', type: 'user', label: 'User: Alice' },
	{ id: 'user-2', type: 'user', label: 'User: Bob' }
];

export const buildResourceUsageMock = (): ResourceUsageSummaryResponse => {
	const now = new Date();
	const series = Array.from({ length: 12 }).map((_, index) => {
		const pointDate = new Date(now);
		pointDate.setDate(pointDate.getDate() - (11 - index));
		const baseSeconds = 3600 + index * 420;
		return {
			timestamp: pointDate.toISOString(),
			cpuTimeSeconds: baseSeconds,
			cpuPercent: 65 + (index % 4) * 5,
			walltimeSeconds: baseSeconds * 2,
			ramBytesAllocated: 32 * 1024 ** 3,
			ramBytesUsed: 12 * 1024 ** 3 + index * 512 * 1024 ** 2
		};
	});

	return {
		scope: demoProject,
		availableScopes: [demoProject, ...demoAllocations, ...demoUsers],
		totals: {
			totalVcpus: 128,
			storageBytesAllocated: 40 * 1024 ** 4,
			lastUpdated: now.toISOString()
		},
		series
	};
};
