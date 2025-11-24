export type ResourceUsageScopeType = 'user' | 'project' | 'allocation';

export interface ResourceUsageScopeOption {
	id: string;
	type: ResourceUsageScopeType;
	label: string;
	source?: string;
}

export interface ResourceUsageSeriesPoint {
	timestamp: string;
	cpuTimeSeconds: number;
	cpuPercent: number;
	walltimeSeconds: number;
	ramBytesAllocated: number;
	ramBytesUsed: number;
}

export interface ResourceUsageTotals {
	totalVcpus: number;
	storageBytesAllocated: number;
	lastUpdated: string;
}

export interface ResourceUsageAllocationOption {
	id: string;
	label: string;
	source: string;
}

export interface ResourceUsageSummaryResponse {
	scope: ResourceUsageScopeOption;
	availableScopes: ResourceUsageScopeOption[];
	availableSources: string[];
	availableAllocations: ResourceUsageAllocationOption[];
	totals: ResourceUsageTotals;
	series: ResourceUsageSeriesPoint[];
}
