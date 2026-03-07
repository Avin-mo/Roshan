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
      status.textContent = "Error.";
      console.error(chrome.runtime.lastError.message);
      return;
    }

    status.textContent = response?.success ? "Done." : "No response.";
  });
});