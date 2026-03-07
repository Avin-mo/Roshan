const analyzeBtn = document.getElementById("analyzeBtn");
const status = document.getElementById("status");

analyzeBtn.addEventListener("click", async () => {
  status.textContent = "Running...";

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

    status.textContent = `Found ${response.paragraphCount} paragraphs, ${response.sentenceCount} sentences. Check console.`;
  });
});