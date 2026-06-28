# TexWaller AI Connector

Estensione MV3 che aiuta TexWaller a completare un flusso OAuth con provider AI esterni.

L'estensione intercetta solo redirect OAuth locali validi, verifica che appartengano a un flusso iniziato da TexWaller e invia l'URL finale alla tab TexWaller originale.

## Funzionamento

1. L'utente avvia il login da TexWaller.
2. TexWaller comunica all'estensione l'URL OAuth tramite `TEXWALLER_CHATGPT_OAUTH_START`.
3. Il provider OAuth si apre in una nuova tab.
4. Dopo il login, il provider redirige verso `localhost` o `127.0.0.1`.
5. L'estensione verifica origine, tab e parametro OAuth `state`.
6. Se il redirect è valido, invia l'URL completo a TexWaller con `TEXWALLER_CHATGPT_OAUTH_COMPLETE`.
7. La tab del redirect viene chiusa e TexWaller torna in primo piano.

L'estensione non scambia token, non salva credenziali e non usa la clipboard.

## Sicurezza

L'estensione accetta un redirect solo se:

1. il flusso è stato iniziato da una pagina TexWaller autorizzata;
2. l'URL OAuth proviene da un'origine autorizzata;
3. l'URL OAuth contiene un parametro `state`;
4. il redirect locale contiene lo stesso `state`;
5. il flusso non è scaduto.

I flow in corso sono salvati temporaneamente in `storage.session` quando disponibile, con fallback su `storage.local`. I dati vecchi vengono ignorati dopo `flowTtlMs`.

## Messaggi

TexWaller può rilevare l'estensione con:

```js
window.postMessage({
  source: "texwaller",
  type: "TEXWALLER_CHATGPT_EXTENSION_PING",
});
```

L'estensione risponde con:

```js
{
  source: "texwaller-chatgpt-extension",
  type: "TEXWALLER_CHATGPT_EXTENSION_PONG",
  version: "<extension-version>"
}
```

Prima di aprire il provider OAuth, TexWaller deve inviare:

```js
window.postMessage({
  source: "texwaller",
  type: "TEXWALLER_CHATGPT_OAUTH_START",
  loginUrl,
});
```

Quando il redirect locale è valido, TexWaller riceve:

```js
{
  source: "texwaller-chatgpt-extension",
  type: "TEXWALLER_CHATGPT_OAUTH_COMPLETE",
  redirectUrl: "http://localhost:..."
}
```

## Configurazione

La configurazione principale è in `src/config.js`:

```js
export const CONFIG = Object.freeze({
  appOrigins: ["https://texwaller.com", "https://www.texwaller.com", "http://localhost:5173"],
  authOrigins: ["https://auth.openai.com"],
  redirectHosts: ["localhost", "127.0.0.1"],
  flowTtlMs: 10 * 60 * 1000,
});
```

`appOrigins` deve contenere origini esatte, senza `/*`.

## Compatibilità

Il codice usa `browser` quando disponibile e `chrome` come fallback, così non è legato a un singolo namespace.

Il repository contiene manifest separati per evitare incompatibilità tra loader desktop:

1. `manifest.json` per Chrome, Edge, Brave, Opera e altri browser Chromium moderni.
2. `manifest.firefox.json` per Firefox 142 o superiore e come base per packaging Safari desktop.

Non usa `chrome.offscreen` né permessi clipboard, quindi il flusso è più semplice e più adatto a una futura distribuzione multi-browser.

Browser desktop previsti:

1. Chrome, Edge, Brave, Opera e altri Chromium moderni.
2. Firefox 142 o superiore.
3. Safari desktop tramite conversione/pacchettizzazione Safari Web Extension.

Il manifest Chromium usa `background.service_worker`. Il manifest Firefox/Safari usa `background.scripts`, perché Firefox non supporta ancora i background service worker delle estensioni come Chrome.

## Installazione Locale

Per Chrome/Edge/Chromium:

1. Apri la pagina delle estensioni del browser.
2. Abilita la modalità sviluppatore.
3. Seleziona Load unpacked o equivalente.
4. Scegli questa cartella.

Per Firefox:

1. Copia `manifest.firefox.json` come `manifest.json` in una cartella di build temporanea insieme a `src/` e `icons/`.
2. Apri `about:debugging#/runtime/this-firefox`.
3. Seleziona Carica componente aggiuntivo temporaneo.
4. Scegli il `manifest.json` della cartella temporanea.

Per Safari desktop, usa `manifest.firefox.json` come base della Safari Web Extension e completa conversione e firma tramite Xcode.

## Packaging Release

Genera i pacchetti puliti per gli store con:

```bash
scripts/package-release.sh
```

Lo script crea:

1. `dist/texwaller-ai-connector-chrome-v<version>.zip` con il manifest Chromium.
2. `dist/texwaller-ai-connector-firefox-v<version>.zip` con `manifest.firefox.json` copiato come `manifest.json`.

Prima dell'invio agli store, verifica che la privacy policy pubblicata descriva gli stessi permessi e domini dichiarati nei manifest.

## Test Manuali

1. Verifica che TexWaller riceva `TEXWALLER_CHATGPT_EXTENSION_PONG` dopo il ping.
2. Avvia il login e verifica che TexWaller invii `TEXWALLER_CHATGPT_OAUTH_START`.
3. Completa OAuth e verifica che TexWaller riceva `TEXWALLER_CHATGPT_OAUTH_COMPLETE` con `code` e `state`.
4. Verifica che la tab locale venga chiusa e che TexWaller torni in primo piano.
