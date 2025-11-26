import ky, { type KyResponse, type Options } from 'ky';

import { Method } from '@/modules/api/model';
import userManager from '@/modules/auth/config/user-manager';
import { getStepUpAccess } from '@/modules/auth/methods/getStepUpAccess';
import { StepUpAccess } from '@/modules/auth/model';

export const request = async <T>(url: string, init?: Options): Promise<T> => {
	const request = await requestWrapper<T>(url, init);
	const responseText = await request.text();

	if (!responseText) {
		return {} as T;
	}

	return JSON.parse(responseText);
};

export const download = async (url: string, init?: RequestInit) => {
	const request = await requestWrapper<Blob>(url, init);
	return request.blob();
};

const requestWrapper = async <T>(url: string, init?: Options): Promise<KyResponse<T>> => {
	const stepUpAccess = getStepUpAccess();
	const abortController = new AbortController();
	const signal = abortController.signal;

	const defaultHeaders: Record<string, string> = {};

	// Read mock user from localStorage to support switching via headers
	let mock: {
		id?: number;
		externalId?: string;
		email?: string;
		role?: 'user' | 'director' | 'admin';
		stepUp?: boolean;
		name?: string;
		username?: string;
		locale?: string;
	} = {};

	try {
		mock = JSON.parse(localStorage.getItem('mockUser') || '{}');
	} catch {
		// ignore invalid JSON
	}
	if (mock && typeof mock.id === 'string') {
		const parsedId = Number.parseInt(mock.id, 10);
		if (!Number.isNaN(parsedId) && parsedId > 0) {
			mock.id = parsedId;
		} else {
			delete mock.id;
		}
	}

	const user = await userManager.getUser();
	const accessToken = user?.access_token;
	if (accessToken) {
		defaultHeaders.Authorization = `Bearer ${accessToken}`;
	}

	// if user has step up access, mark in request headers
	// if (stepUpAccess === StepUpAccess.LOGGED) {
	

	// Attach mock headers if present (or sensible defaults for dev)
	if (mock.id) {
		defaultHeaders['X-Mock-User-Id'] = String(mock.id);
	}
	if (mock.externalId) {
		defaultHeaders['X-Mock-External-Id'] = mock.externalId;
	}
	if (mock.email) {
		defaultHeaders['X-Mock-Email'] = mock.email;
	}
	if (mock.username) {
		defaultHeaders['X-Mock-Username'] = mock.username;
	}
	if (mock.name) {
		defaultHeaders['X-Mock-Name'] = mock.name;
	}
	if (mock.locale) {
		defaultHeaders['X-Mock-Locale'] = mock.locale;
	}
	if (mock.role) {
		defaultHeaders['X-Mock-Role'] = mock.role;
	}

	// Prefer explicit mock step-up over computed one
	if (mock.stepUp === true) {
		defaultHeaders['X-Step-Up'] = 'true';
	} else if (stepUpAccess === StepUpAccess.LOGGED) {
		defaultHeaders['X-Step-Up'] = 'true';
	}

	return ky<T>(window.Config.VITE_API_URL + url, {
		method: Method.GET,
		signal,
		credentials: 'include',
		...init,
		headers: {
			...defaultHeaders,
			...getHeaders(init?.headers)
		}
	});
};

const getHeaders = (
	headers?: NonNullable<RequestInit['headers']> | Record<string, string | undefined>
): Record<string, string> => {
	if (!headers) {
		return {};
	}

	const headersObject: Record<string, string> = {};

	if (headers instanceof Headers) {
		headers.forEach((value, key) => {
			headersObject[key] = value;
		});
		return headersObject;
	}

	if (Array.isArray(headers)) {
		headers.forEach(header => {
			headersObject[header[0]] = header[1];
		});
		return headersObject;
	}

	for (const key in headers) {
		const value = headers[key];
		if (value !== undefined) {
			headersObject[key] = value;
		}
	}

	return headersObject;
};
