// background.js (service worker)

console.log('Roshan background script loaded');

const lastHighlightContext = new Map(); // tabId -> { text, tooltip, ts }

// Create context menus on install AND on service worker startup
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "analyzeSelection",
      title: "Analyze selected text",
      contexts: ["selection"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.log("Menu analyzeSelection:", chrome.runtime.lastError.message);
      }
    });

    chrome.contextMenus.create({
      id: "analyzePage",
      title: "Analyze entire page",
      contexts: ["page"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.log("Menu analyzePage:", chrome.runtime.lastError.message);
      }
    });

    chrome.contextMenus.create({
      id: "highlightDetails",
      title: "Highlight details",
      contexts: ["all"],
      visible: false
    }, () => {
      if (chrome.runtime.lastError) {
        console.log("Menu highlightDetails:", chrome.runtime.lastError.message);
      }
    });

    chrome.contextMenus.create({
      id: "askGemini",
      title: "Ask Gemini",
      contexts: ["all"],
      visible: false
    }, () => {
      if (chrome.runtime.lastError) {
        console.log("Menu askGemini:", chrome.runtime.lastError.message);
      }
    });

    console.log("Roshan context menus created");
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Roshan onInstalled fired (extension installed/updated)');
  createContextMenus();
});

// Also create menus when service worker starts up (handles browser restart)
chrome.runtime.onStartup.addListener(() => {
  console.log('Roshan onStartup fired (browser started)');
  createContextMenus();
});

// Create menus immediately when script loads (covers reload scenarios)
createContextMenus();


/* -------------------------
   Receive highlight context
------------------------- */

chrome.runtime.onMessage.addListener((msg, sender) => {

  const tabId = sender?.tab?.id;
  if (!tabId) return;

  if (msg?.type === "NO_HIGHLIGHT_CONTEXT") {

    lastHighlightContext.delete(tabId);

    try {
      chrome.contextMenus.update("highlightDetails", { visible: false });
      chrome.contextMenus.update("askGemini", { visible: false });
    } catch (e) {}

    return;
  }

  if (msg?.type === "HIGHLIGHT_CONTEXT") {

    lastHighlightContext.set(tabId, {
      text: msg.text,
      tooltip: msg.tooltip || "",
      ts: Date.now()
    });

    try {
      chrome.contextMenus.update("highlightDetails", { visible: true });
      chrome.contextMenus.update("askGemini", { visible: true });
    } catch (e) {}

    // hide again shortly to avoid stale menus
    setTimeout(() => {

      const entry = lastHighlightContext.get(tabId);

      if (entry && Date.now() - entry.ts > 5000) {

        lastHighlightContext.delete(tabId);

        try {
          chrome.contextMenus.update("highlightDetails", { visible: false });
          chrome.contextMenus.update("askGemini", { visible: false });
        } catch (e) {}

      }

    }, 6000);
  }

});


/* -------------------------
   Menu click handler
------------------------- */

chrome.contextMenus.onClicked.addListener((info, tab) => {

  if (!tab?.id) return;

  // analyze selection
  if (info.menuItemId === "analyzeSelection") {

    chrome.tabs.sendMessage(tab.id, {
      type: "ANALYZE_SELECTION",
      text: info.selectionText || ""
    });

    return;
  }

  // analyze page
  if (info.menuItemId === "analyzePage") {

    chrome.tabs.sendMessage(tab.id, {
      type: "ANALYZE_ARTICLE"
    });

    return;
  }

  // highlight actions
  if (info.menuItemId === "askGemini" || info.menuItemId === "highlightDetails") {

    const entry = lastHighlightContext.get(tab.id);
    if (!entry) return;

    // --------------------
    // ASK GEMINI
    // --------------------

    if (info.menuItemId === "askGemini") {

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "ASK_GEMINI",
          text: entry.text,
          labels: entry.tooltip ? entry.tooltip.split(", ").map(s => s.trim()).filter(Boolean) : []
        },
        () => {

          if (chrome.runtime.lastError) {

            // content script missing → inject then retry

            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"]
            }, () => {

              chrome.tabs.sendMessage(tab.id, {
                type: "ASK_GEMINI",
                text: entry.text
              });

            });

          }

        }
      );

    }

    // --------------------
    // HIGHLIGHT DETAILS
    // --------------------

    else {

      chrome.tabs.sendMessage(tab.id, {
        type: "HIGHLIGHT_DETAILS",
        text: entry.text,
        tooltip: entry.tooltip
      });

    }

    try {
      chrome.contextMenus.update("highlightDetails", { visible: false });
      chrome.contextMenus.update("askGemini", { visible: false });
    } catch (e) {}

    lastHighlightContext.delete(tab.id);

  }

});


/* -------------------------
   Backend + Gemini proxy
------------------------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // backend article analysis

  if (msg?.type === "BACKEND_ANALYZE") {

    const payload = msg.payload || {};

    fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: payload.url || "",
        title: payload.title || "",
        sentences: payload.sentences || []
      })
    })
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(err => {
        console.error("Backend analyze error:", err);
        sendResponse({ error: err.message });
      });

    return true;
  }

  // Gemini explanation

  if (msg?.type === "ASK_GEMINI_REQUEST") {

    (async () => {
      const endpoints = [
        "http://127.0.0.1:8001/explain",
        "http://localhost:8001/explain"
      ];

      let lastErr = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg.text || "", labels: msg.labels || [] }),
            mode: 'cors'
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Server at ${url} responded ${res.status} ${res.statusText}: ${txt}`);
          }

          const data = await res.json().catch(() => ({ error: 'Invalid JSON from Gemini server' }));
          sendResponse({ data });
          return;

        } catch (err) {
          console.error("Gemini request attempt failed:", url, err);
          lastErr = err;
        }
      }

      // All attempts failed — return a clear, actionable error message
      const errMsg = lastErr?.message || String(lastErr) || 'Unknown network error';
      const hint = "Could not reach Gemini server at http://127.0.0.1:8001. Ensure the gemini Flask server is running (e.g. `python gemini/gemini.py`) and accessible, and that no local firewall is blocking requests. Try visiting http://127.0.0.1:8001/explain in your browser to verify.";
      sendResponse({ error: `${errMsg}. ${hint}` });

    })();

    return true;
  }

  // Gemini follow-up questions

  if (msg?.type === "ASK_GEMINI_FOLLOWUP") {

    (async () => {
      const endpoints = [
        "http://127.0.0.1:8001/followup",
        "http://localhost:8001/followup"
      ];

      let lastErr = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: msg.text || "",
              labels: msg.labels || [],
              question: msg.question || ""
            }),
            mode: 'cors'
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Server at ${url} responded ${res.status} ${res.statusText}: ${txt}`);
          }

          const data = await res.json().catch(() => ({ error: 'Invalid JSON from Gemini server' }));
          sendResponse({ data });
          return;

        } catch (err) {
          console.error("Gemini followup attempt failed:", url, err);
          lastErr = err;
        }
      }

      const errMsg = lastErr?.message || String(lastErr) || 'Unknown network error';
      sendResponse({ error: `${errMsg}. Could not reach Gemini server.` });

    })();

    return true;
  }

});