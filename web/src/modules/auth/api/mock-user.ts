import { Method } from '@/modules/api/model';
import { request } from '@/modules/api/request';
import { type UserInfo } from '@/modules/user/model';

export type EnsureMockUserPayload = {
	id?: number;
	externalId?: string;
	email?: string;
	role?: 'admin' | 'director' | 'user';
	name?: string;
	username?: string;
	locale?: string;
};

export const ensureMockUser = (payload: EnsureMockUserPayload = {}): Promise<UserInfo> =>
	request<UserInfo>('/auth/mock-user', {
		method: Method.POST,
		json: payload
	});
