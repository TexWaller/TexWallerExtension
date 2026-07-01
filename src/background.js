import { CONFIG } from "./config.js";

const STORAGE_KEY = "pendingOpenAiOAuthFlows";
const OAUTH_START_TYPE = "TEXWALLER_CHATGPT_OAUTH_START";
const OAUTH_COMPLETE_TYPE = "TEXWALLER_CHATGPT_OAUTH_COMPLETE";
const extensionApi = globalThis.browser ?? globalThis.chrome;
const flowStorage = extensionApi.storage.session ?? extensionApi.storage.local;

scheduleContentScriptInjection();

extensionApi.runtime.onInstalled.addListener(() => {
  scheduleContentScriptInjection();
});

extensionApi.runtime.onStartup?.addListener(() => {
  scheduleContentScriptInjection();
});

extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== OAUTH_START_TYPE) {
    return false;
  }

  handleOAuthStartMessage(message, sender)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      debug("OAuth start message ignored", { error: error.message });
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});

extensionApi.webNavigation.onCommitted.addListener(async (details) => {
  if (!isTopLevel(details)) {
    return;
  }

  const authUrl = parseUrl(details.url);
  if (!authUrl || !isAllowedAuthUrl(authUrl)) {
    return;
  }

  const pendingTexWallerFlow = await findFlowByState(getOAuthState(authUrl));
  if (pendingTexWallerFlow?.initiatedByTexWaller) {
    await rememberFlow({
      authUrl,
      authTabId: details.tabId,
      appTabId: pendingTexWallerFlow.appTabId,
      initiatedByTexWaller: true,
    });
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
    initiatedByTexWaller: false,
  });
});

extensionApi.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
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
    initiatedByTexWaller: false,
  });
});

extensionApi.webNavigation.onBeforeNavigate.addListener(async (details) => {
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

  await sendRedirectToApp(flow.appTabId, redirectUrl.href);
  await removeFlow(flow.id);
  await closeTab(details.tabId);
  await focusTab(flow.appTabId);
});

extensionApi.tabs.onRemoved.addListener(async (tabId) => {
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
  return CONFIG.appOrigins.includes(url?.origin) || isLocalDevelopmentOrigin(url);
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

async function handleOAuthStartMessage(message, sender) {
  const appUrl = parseUrl(sender.url);
  if (!sender.tab?.id || !isAllowedAppUrl(appUrl) || message.source !== "texwaller") {
    throw new Error("message sender is not an allowed TexWaller page");
  }

  const authUrl = parseUrl(message.loginUrl);
  if (!authUrl || !isAllowedAuthUrl(authUrl)) {
    throw new Error("loginUrl is not an allowed OpenAI OAuth URL");
  }

  await rememberFlow({
    authUrl,
    authTabId: null,
    appTabId: sender.tab.id,
    initiatedByTexWaller: true,
  });
}

async function injectContentScriptsIntoAppTabs() {
  if (!extensionApi.scripting?.executeScript) {
    return;
  }

  const tabs = await extensionApi.tabs.query({ url: CONFIG.appContentScriptMatches });
  await Promise.all(tabs.map((tab) => injectContentScript(tab.id)));
}

async function injectContentScript(tabId) {
  if (tabId === undefined) {
    return;
  }

  try {
    await extensionApi.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"],
    });
  } catch (error) {
    debug("Content script injection skipped", { tabId, error: error.message });
  }
}

function scheduleContentScriptInjection() {
  injectContentScriptsIntoAppTabs().catch((error) => {
    debug("Content script injection failed", { error: error.message });
  });
}

function isLocalDevelopmentOrigin(url) {
  return ["http:", "https:"].includes(url?.protocol) && ["localhost", "127.0.0.1"].includes(url.hostname);
}

async function rememberFlow({ authUrl, authTabId, appTabId, initiatedByTexWaller }) {
  const state = getOAuthState(authUrl);
  const now = Date.now();
  const freshFlows = await readFreshFlows(now);
  const existingFlow = freshFlows.find((flow) => flow.state === state);
  const nextFlow = {
    id: crypto.randomUUID(),
    state,
    authTabId: authTabId ?? existingFlow?.authTabId ?? null,
    appTabId: existingFlow?.initiatedByTexWaller ? existingFlow.appTabId : appTabId,
    initiatedByTexWaller: Boolean(initiatedByTexWaller || existingFlow?.initiatedByTexWaller),
    createdAt: now,
  };
  const nextFlows = freshFlows.filter((flow) => flow.state !== state).concat(nextFlow);

  await writeFlows(nextFlows);
  debug("OAuth flow remembered", {
    authOrigin: authUrl.origin,
    authTabId: nextFlow.authTabId,
    appTabId: nextFlow.appTabId,
    initiatedByTexWaller: nextFlow.initiatedByTexWaller,
    state,
  });
}

async function findMatchingFlow(redirectUrl, tabId) {
  const state = getOAuthState(redirectUrl);
  const freshFlows = await readFreshFlows();

  return freshFlows.find((flow) => {
    const isSameTab = flow.authTabId === tabId;
    const isPendingTexWallerTab = flow.initiatedByTexWaller && flow.authTabId === null;
    return flow.state === state && (isSameTab || isPendingTexWallerTab);
  }) || null;
}

async function findFlowByState(state) {
  return (await readFreshFlows()).find((flow) => flow.state === state) || null;
}

async function removeFlow(flowId) {
  const flows = await readFlows();
  await writeFlows(flows.filter((flow) => flow.id !== flowId));
}

async function removeFlowsForTab(tabId) {
  const flows = await readFlows();
  const nextFlows = flows.filter((flow) => flow.authTabId !== tabId && flow.appTabId !== tabId);
  if (nextFlows.length !== flows.length) {
    await writeFlows(nextFlows);
  }
}

async function readFreshFlows(now = Date.now()) {
  const flows = await readFlows();
  const freshFlows = flows.filter((flow) => now - flow.createdAt <= CONFIG.flowTtlMs);

  if (freshFlows.length !== flows.length) {
    await writeFlows(freshFlows);
  }

  return freshFlows;
}

async function readFlows() {
  const stored = await flowStorage.get(STORAGE_KEY);
  return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
}

async function writeFlows(flows) {
  await flowStorage.set({ [STORAGE_KEY]: flows });
}

async function sendRedirectToApp(tabId, redirectUrl) {
  const response = await extensionApi.tabs.sendMessage(tabId, {
    type: OAUTH_COMPLETE_TYPE,
    redirectUrl,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "TexWaller did not accept the OAuth redirect URL");
  }
}

async function closeTab(tabId) {
  try {
    await extensionApi.tabs.remove(tabId);
  } catch {
    // The user may have already closed the tab.
  }
}

async function focusTab(tabId) {
  const tab = await getTab(tabId);
  if (!tab) {
    return;
  }

  await extensionApi.tabs.update(tabId, { active: true });
  if (tab.windowId !== undefined) {
    await extensionApi.windows.update(tab.windowId, { focused: true });
  }
}

async function getTab(tabId) {
  try {
    return await extensionApi.tabs.get(tabId);
  } catch {
    return null;
  }
}

function debug(message, data = {}) {
  console.info(`[OAuth Redirect Capture] ${message}`, data);
}
