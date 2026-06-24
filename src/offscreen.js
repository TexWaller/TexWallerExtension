chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "copy-to-clipboard") {
    return false;
  }

  copyText(message.text)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function copyText(text) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("No text supplied");
  }

  try {
    copyTextWithTextarea(text);
    return;
  } catch (execCommandError) {
    if (!navigator.clipboard?.writeText) {
      throw execCommandError;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (clipboardError) {
      throw new Error(`Clipboard copy failed: ${clipboardError.message || execCommandError.message}`);
    }
  }
}

function copyTextWithTextarea(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("document.execCommand copy returned false");
    }
  } finally {
    textarea.remove();
  }
}
