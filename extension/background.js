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
});
