// Shared shape for the Google Identity Services client (sign-in button +
// OAuth token client) — declared once so pages don't conflict.

declare interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: object) => void;
        renderButton: (el: HTMLElement, config: object) => void;
      };
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (resp: { access_token?: string; error?: string }) => void;
        }) => { requestAccessToken: () => void };
      };
    };
  };
}
