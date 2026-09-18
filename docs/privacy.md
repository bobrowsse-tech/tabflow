# Privacy

TabFlow has no application backend and makes no network requests during organisation. The extension reads only currently open tabs in the active Chrome window, performs deterministic classification in the service worker, and writes only preferences plus the latest compact undo state to Chrome local storage.

TabFlow does not collect, upload, sell, or share browsing data. It does not use analytics, tracking pixels, remote configuration, advertising SDKs, or external AI APIs.

Chrome API limitations mean restoration of recently closed duplicates and exact original positions can vary by browser state. The UI must never claim more restoration than Chrome can provide.
