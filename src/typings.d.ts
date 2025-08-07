// src/typings.d.ts
declare global {
  interface Window {
    _env_?: {
      backendCoreUrl?: string;
      backendUserUrl?: string;
      backendUbsUrl?: string;
      backendChatUrl?: string;
      frontendUrl?: string;
      socketUrl?: string;
      chatSocketUrl?: string;
    };
  }
}

export {};
