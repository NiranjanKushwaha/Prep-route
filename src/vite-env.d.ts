/// <reference types="vite/client" />

declare module "*.svg?raw" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  /** Base URL of the backend API, without a trailing slash. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
