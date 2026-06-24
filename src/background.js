import { CONFIG } from "./config.js";

const STORAGE_KEY = "pendingOpenAiOAuthFlows";

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!isTopLevel(details)) {
    return;
  }

  const authUrl = parseUrl(details.url);
  if (!authUrl || !isAllowedAuthUrl(authUrl)) {
    return;
  }

  const authTab = await getTab(details.tabId);
  if (!authTab?.openerTabId) {
    debug("Auth tab ignored: no openerTabId", { tabId: details.tabId, url: authUrl.href });
    return;
  }

  const appTab = await getTab(authTab.openerTabId);
  if (!appTab?.url || !isAllowedAppUrl(parseUrl(appTab.url))) {
    debug("Auth tab ignored: opener is not the configured app", {
      openerTabId: authTab.openerTabId,
      openerUrl: appTab?.url,
    });
    return;
  }

  await rememberFlow({
    authUrl,
    authTabId: details.tabId,
    appTabId: authTab.openerTabId,
  });
});

chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
  if (details.sourceTabId < 0 || details.sourceFrameId !== 0) {
    return;
  }

  const targetUrl = parseUrl(details.url);
  if (!targetUrl || !isAllowedAuthUrl(targetUrl)) {
    debug("Created navigation target ignored: not an allowed auth URL", { url: details.url });
    return;
  }

  const sourceTab = await getTab(details.sourceTabId);
  if (!sourceTab?.url || !isAllowedAppUrl(parseUrl(sourceTab.url))) {
    debug("Created navigation target ignored: source is not the configured app", {
      sourceTabId: details.sourceTabId,
      sourceUrl: sourceTab?.url,
    });
    return;
  }

  await rememberFlow({
    authUrl: targetUrl,
    authTabId: details.tabId,
    appTabId: details.sourceTabId,
  });
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (!isTopLevel(details)) {
    return;
  }

  const redirectUrl = parseUrl(details.url);
  if (!redirectUrl || !isAllowedRedirectUrl(redirectUrl)) {
    return;
  }

  const flow = await findMatchingFlow(redirectUrl, details.tabId);
  if (!flow) {
    debug("Local redirect ignored: no matching pending OAuth flow", {
      tabId: details.tabId,
      url: redirectUrl.href,
      state: getOAuthState(redirectUrl),
      pendingFlows: await readFlows(),
    });
    return;
  }

  await copyToClipboard(redirectUrl.href);
  await removeFlow(flow.id);
  await closeTab(details.tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeFlowsForTab(tabId);
});

function isTopLevel(details) {
  return details.frameId === 0;
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAllowedAppUrl(url) {
  return url?.origin === CONFIG.appOrigin;
}

function isAllowedAuthUrl(url) {
  return CONFIG.authOrigins.includes(url?.origin) && Boolean(getOAuthState(url));
}

function isAllowedRedirectUrl(url) {
  return url.protocol === "http:" && CONFIG.redirectHosts.includes(url.hostname) && Boolean(getOAuthState(url));
}

function getOAuthState(url) {
  return url.searchParams.get("state") || url.hash.match(/[&#]state=([^&]+)/)?.[1] || "";
}

async function rememberFlow({ authUrl, authTabId, appTabId }) {
  const flows = await readFlows();
  const state = getOAuthState(authUrl);
  const now = Date.now();
  const nextFlows = flows
    .filter((flow) => now - flow.createdAt <= CONFIG.flowTtlMs)
    .filter((flow) => flow.state !== state)
    .concat({
      id: crypto.randomUUID(),
      state,
      authTabId,
      appTabId,
      createdAt: now,
    });

  await chrome.storage.session.set({ [STORAGE_KEY]: nextFlows });
  debug("OAuth flow remembered", {
    authOrigin: authUrl.origin,
    authTabId,
    appTabId,
    state,
  });
}

async function findMatchingFlow(redirectUrl, tabId) {
  const state = getOAuthState(redirectUrl);
  const now = Date.now();
  const flows = await readFlows();
  const freshFlows = flows.filter((flow) => now - flow.createdAt <= CONFIG.flowTtlMs);

  if (freshFlows.length !== flows.length) {
    await chrome.storage.session.set({ [STORAGE_KEY]: freshFlows });
  }

  return freshFlows.find((flow) => flow.state === state && flow.authTabId === tabId) || null;
}

async function removeFlow(flowId) {
  const flows = await readFlows();
  await chrome.storage.session.set({
    [STORAGE_KEY]: flows.filter((flow) => flow.id !== flowId),
  });
}

async function removeFlowsForTab(tabId) {
  const flows = await readFlows();
  const nextFlows = flows.filter((flow) => flow.authTabId !== tabId && flow.appTabId !== tabId);
  if (nextFlows.length !== flows.length) {
    await chrome.storage.session.set({ [STORAGE_KEY]: nextFlows });
  }
}

async function readFlows() {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
}

async function copyToClipboard(text) {
  await ensureOffscreenDocument();
  const response = await chrome.runtime.sendMessage({
    type: "copy-to-clipboard",
    text,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Clipboard copy failed");
  }
}

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("src/offscreen.html");
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "src/offscreen.html",
    reasons: ["CLIPBOARD"],
    justification: "Copy the verified OAuth redirect URL to the clipboard.",
  });
}

async function closeTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // The user may have already closed the tab.
  }
}

async function getTab(tabId) {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

function debug(message, data = {}) {
  console.info(`[OAuth Redirect Capture] ${message}`, data);
}
