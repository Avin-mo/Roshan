const analyzeBtn = document.getElementById("analyzeBtn");
const status = document.getElementById("status");

analyzeBtn.addEventListener("click", async () => {
  status.textContent = "Analyzing...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    status.textContent = "No active tab found.";
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_ARTICLE" }, (response) => {
    if (chrome.runtime.lastError) {
      status.textContent = "Could not connect to page.";
      console.error(chrome.runtime.lastError.message);
      return;
    }

    if (!response) {
      status.textContent = "No response from content script.";
      return;
    }

    if (response.error) {
      status.textContent = `Error: ${response.error}`;
      return;
    }

    const flaggedCount = response.backendData?.sentences?.length || 0;
    status.textContent = `Found ${flaggedCount} flagged sentence(s).`;
    console.log("Popup got response:", response);
  });
});

document.getElementById("header-link").addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("roshan_build/index.html")
  });
});