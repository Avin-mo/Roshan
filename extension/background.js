// background.js (service worker)

console.log('Roshan background script loaded');

const lastHighlightContext = new Map(); // tabId -> { text, tooltip, ts }

chrome.runtime.onInstalled.addListener(() => {
  console.log('Roshan onInstalled fired (extension installed/updated)');

  chrome.contextMenus.removeAll(() => {

    chrome.contextMenus.create({
      id: "analyzeSelection",
      title: "Analyze selected text",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "analyzePage",
      title: "Analyze entire page",
      contexts: ["page"]
    });

    chrome.contextMenus.create({
      id: "highlightDetails",
      title: "Highlight details",
      contexts: ["all"],
      visible: false
    });

    chrome.contextMenus.create({
      id: "askGemini",
      title: "Ask Gemini",
      contexts: ["all"],
      visible: false
    });

  });

});


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
          text: entry.text
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

    fetch("http://127.0.0.1:8001/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: msg.text || "",
        labels: msg.labels || []
      })
    })
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(err => {
        console.error("Gemini request error:", err);
        sendResponse({ error: err.message });
      });

    return true;
  }

});