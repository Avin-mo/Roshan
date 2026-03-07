// background.js (service worker-style script for MV3)

chrome.runtime.onInstalled.addListener(() => {
  // menu for analyzing selected text
  chrome.contextMenus.create({
    id: "analyzeSelection",
    title: "Analyze selected text",
    contexts: ["selection"]
  });

  // menu for analyzing the whole page (right-click on page background)
  chrome.contextMenus.create({
    id: "analyzePage",
    title: "Analyze entire page",
    contexts: ["page"]
  });

  // Create highlight-specific menu items but keep them hidden until a highlight is right-clicked
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

// Store last right-clicked highlight info per tab
const lastHighlightContext = new Map(); // tabId -> { text, tooltip, ts }

// Receive messages from the content script when a highlight is right-clicked
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "HIGHLIGHT_CONTEXT" && sender?.tab?.id) {
    const tabId = sender.tab.id;
    lastHighlightContext.set(tabId, { text: msg.text, tooltip: msg.tooltip || "", ts: Date.now() });

    // Make the highlight-specific menu items visible for this next context menu
    try {
      chrome.contextMenus.update("askGemini", { visible: true });
      chrome.contextMenus.update("highlightDetails", { visible: true });
    } catch (e) {
      // ignore if update fails
      console.warn("Could not update context menus visibility", e);
    }

    // Clear after 6s to avoid stale state
    setTimeout(() => {
      const entry = lastHighlightContext.get(tabId);
      if (entry && Date.now() - entry.ts > 5000) {
        lastHighlightContext.delete(tabId);
        try {
          chrome.contextMenus.update("askGemini", { visible: false });
          chrome.contextMenus.update("highlightDetails", { visible: false });
        } catch (e) {}
      }
    }, 6000);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "analyzeSelection") {
    chrome.tabs.sendMessage(tab.id, {
      type: "ANALYZE_SELECTION",
      text: info.selectionText
    });

    return;
  }

  if (info.menuItemId === "analyzePage") {
    chrome.tabs.sendMessage(tab.id, {
      type: "ANALYZE_ARTICLE"
    });

    return;
  }

  if (info.menuItemId === "askGemini" || info.menuItemId === "highlightDetails") {
    const entry = lastHighlightContext.get(tab.id);
    if (!entry) return; // nothing to act on

    if (info.menuItemId === "askGemini") {
      chrome.tabs.sendMessage(tab.id, { type: "ASK_GEMINI", text: entry.text });
    } else {
      chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_DETAILS", text: entry.text, tooltip: entry.tooltip });
    }

    // hide the highlight-specific menu items after use
    try {
        chrome.contextMenus.update("highlightDetails", { visible: false });
      chrome.contextMenus.update("askGemini", { visible: false });
    } catch (e) {}

    lastHighlightContext.delete(tab.id);
    return;
  }
});
