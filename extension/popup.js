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
      const msg = chrome.runtime.lastError.message || "";
      if (msg.includes("Receiving end does not exist") || msg.includes("message port closed")) {
        status.textContent = "Could not connect to page. Use a normal webpage (not chrome://, New Tab, or extension pages).";
      } else {
        status.textContent = "Could not connect to page. " + (msg ? msg + "." : "Try reloading the page and the extension.");
      }
      console.error(chrome.runtime.lastError.message);
      return;
    }

    if (!response) {
      status.textContent = "No response from content script.";
      return;
    }

    if (response.error) {
      status.textContent = response.error.includes("fetch") || response.error.includes("Failed")
        ? "Backend not reachable. Is it running at http://127.0.0.1:8000?"
        : `Error: ${response.error}`;
        console.log(response.error);
      return;
    }

    const flaggedCount = response.backendData?.sentences?.length || 0;
    status.textContent = `Found ${flaggedCount} flagged sentence(s).`;
    console.log("Popup got response:", response);
  });
});

document.getElementById("header-link").addEventListener("click", () => {
  chrome.tabs.create({
    url: "https://amroshananalyze.tech"
  });
});