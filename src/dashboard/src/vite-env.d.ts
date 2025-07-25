/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_API_URL: string;
    [key: string]: string | boolean | undefined;
  };
} 