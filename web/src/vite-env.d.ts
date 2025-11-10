/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CLIENT_BASE_URL: string;
	readonly VITE_API_URL: string;
	readonly VITE_IDENTITY_AUTH_URL: string;
	readonly VITE_IDENTITY_CLIENT_ID: string;
	readonly VITE_IDENTITY_ISSUER: string;
}
interface ImportMeta {
	readonly env: ImportMetaEnv;
	glob<T = unknown>(
		pattern: string,
		options?: {
			as?: 'raw' | 'url' | 'json';
			eager?: boolean;
		}
	): Record<string, T>;
}

declare module '*.csv?raw' {
	const content: string;
	export default content;
}
