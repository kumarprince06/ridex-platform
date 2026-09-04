/// <reference types="vite/client" />

// Only what the console actually reads. Declaring it keeps import.meta.env typed instead of any.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
