const APP_SOURCE = "texwaller";
const EXTENSION_SOURCE = "texwaller-chatgpt-extension";
const PING_TYPE = "TEXWALLER_CHATGPT_EXTENSION_PING";
const PONG_TYPE = "TEXWALLER_CHATGPT_EXTENSION_PONG";
const OAUTH_START_TYPE = "TEXWALLER_CHATGPT_OAUTH_START";
const OAUTH_COMPLETE_TYPE = "TEXWALLER_CHATGPT_OAUTH_COMPLETE";
const extensionApi = globalThis.browser ?? globalThis.chrome;

const PRODUCTION_ORIGINS = new Set(["https://texwaller.com", "https://www.texwaller.com"]);
const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

window.addEventListener("message", (event) => {
  if (event.source !== window || !isAllowedOrigin(event.origin)) {
    return;
  }

  const data = event.data;
  if (!data || typeof data !== "object" || data.source !== APP_SOURCE) {
    return;
  }

  if (data.type === PING_TYPE) {
    window.postMessage(
      {
        source: EXTENSION_SOURCE,
        type: PONG_TYPE,
        version: extensionApi.runtime.getManifest().version,
      },
      event.origin,
    );
    return;
  }

  if (data.type === OAUTH_START_TYPE) {
    if (typeof data.loginUrl !== "string") {
      return;
    }

    extensionApi.runtime
      .sendMessage({
        type: OAUTH_START_TYPE,
        source: APP_SOURCE,
        loginUrl: data.loginUrl,
        appOrigin: event.origin,
      })
      .catch(() => {});
  }
});

extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== OAUTH_COMPLETE_TYPE || typeof message.redirectUrl !== "string") {
    return false;
  }

  window.postMessage(
    {
      source: EXTENSION_SOURCE,
      type: OAUTH_COMPLETE_TYPE,
      redirectUrl: message.redirectUrl,
    },
    window.location.origin,
  );
  sendResponse({ ok: true });
  return false;
});

function isAllowedOrigin(origin) {
  return PRODUCTION_ORIGINS.has(origin) || LOCALHOST_ORIGIN_PATTERN.test(origin);
}
