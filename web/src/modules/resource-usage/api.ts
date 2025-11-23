import { request } from '@/modules/api/request';
import { buildResourceUsageMock } from './mock';
import { ResourceUsageScopeType, ResourceUsageSummaryResponse } from './types';

export interface ResourceUsageSummaryParams {
	scopeId?: string;
	scopeType?: ResourceUsageScopeType;
	source?: string;
}

export const fetchResourceUsageSummary = async (
	params?: ResourceUsageSummaryParams
): Promise<ResourceUsageSummaryResponse> => {
	const query = new URLSearchParams();
	if (params?.scopeId) {
		query.set('scopeId', params.scopeId);
	}
	if (params?.scopeType) {
		query.set('scopeType', params.scopeType);
	}
	if (params?.source) {
		query.set('source', params.source);
	}

	const queryString = query.toString();
	const url = `/resource-usage/summary${queryString ? `?${queryString}` : ''}`;

	try {
		return await request<ResourceUsageSummaryResponse>(url);
	} catch (error) {
		console.warn('Falling back to mock resource usage data:', error);
		return buildResourceUsageMock();
	}
};
