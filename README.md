# OAuth Redirect Clipboard Capture

Chrome/Chromium MV3 extension that captures a localhost OAuth redirect URL only when the flow was initiated from your configured web app.

## Security Model

The extension does not copy arbitrary localhost URLs. It only copies a redirect when all checks pass:

1. The OAuth tab was opened by `CONFIG.appOrigin`.
2. The opened URL uses `CONFIG.authOrigin`.
3. The auth URL contains an OAuth `state` value.
4. The localhost or `127.0.0.1` HTTP redirect contains the same `state` value.
5. The redirect arrives in the same OAuth tab before `CONFIG.flowTtlMs` expires.

This makes the OAuth `state` value the flow binding between your app, the authorization request, and the localhost redirect.

## Configure

Edit `src/config.js`:

```js
export const CONFIG = Object.freeze({
  appOrigin: "http://localhost:5173",
  authOrigins: ["https://auth.openai.com"],
  redirectHosts: ["localhost", "127.0.0.1"],
  flowTtlMs: 10 * 60 * 1000,
});
```

For localhost development, keep `host_permissions` broad enough for any local port:

```json
"host_permissions": [
  "http://localhost/*",
  "https://auth.openai.com/*",
  "http://127.0.0.1/*"
]
```

For production, narrow `host_permissions` to your exact production app and redirect hosts.

Do not put `/*` in `CONFIG.appOrigin`; it must be an exact origin such as `http://localhost:5173` or `https://app.example.com`.

## App Requirements

Your app should generate a cryptographically random OAuth `state`, include it in the OpenAI authorization URL, and verify it server-side or in your app after the copied redirect URL is pasted or submitted.

The extension is designed for a flow where your app opens the OAuth authorization URL in another tab, for example with `target="_blank"` or `window.open(...)`.

## Install Locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this folder.

## Behavior

After a valid matching localhost redirect is detected, the extension:

1. Copies the full redirect URL to the clipboard.
2. Closes the OAuth redirect tab.

## Notes

The clipboard write is performed from an offscreen extension document because MV3 service workers cannot directly use DOM clipboard APIs.
