/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_LOGIN_EMAIL?: string;
	readonly VITE_LOGIN_PASSWORD?: string;
	readonly VITE_LOGIN_TENANT_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
