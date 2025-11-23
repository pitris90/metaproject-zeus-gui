import { useQuery } from '@tanstack/react-query';
import { fetchResourceUsageSummary, ResourceUsageSummaryParams } from '../api';
import { ResourceUsageSummaryResponse } from '../types';

export const useResourceUsageSummary = (params?: ResourceUsageSummaryParams) =>
	useQuery<ResourceUsageSummaryResponse>({
		queryKey: ['resource-usage-summary', params?.scopeId, params?.scopeType, params?.source],
		queryFn: () => fetchResourceUsageSummary(params)
	});
