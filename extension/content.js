function extractArticleText() {
    let paragraphs = Array.from(document.querySelectorAll("article p"));
  
    if (paragraphs.length === 0) {
      paragraphs = Array.from(document.querySelectorAll("main p"));
    }
  
    if (paragraphs.length === 0) {
      paragraphs = Array.from(document.querySelectorAll("p"));
    }
  
    return paragraphs
      .map((p) => p.innerText.trim())
      .filter((text) => text.length > 40);
  }
  
  function splitIntoSentences(paragraphs) {
    return paragraphs
      .join(" ")
      .split(/(?<=[.!?؟])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_ARTICLE") {
      const paragraphs = extractArticleText();
      const sentences = splitIntoSentences(paragraphs);

      // Ask the background script to talk to the backend so we avoid mixed-content
      // issues on HTTPS pages.
      chrome.runtime.sendMessage(
        {
          type: "BACKEND_ANALYZE",
          payload: {
            url: window.location.href,
            title: document.title,
            sentences
          }
        },
        (backendResponse) => {
          if (chrome.runtime.lastError) {
            console.error("Backend message error:", chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }

          if (!backendResponse) {
            sendResponse({ error: "No response from backend." });
            return;
          }

          if (backendResponse.error) {
            sendResponse({ error: backendResponse.error });
            return;
          }

          sendResponse({
            paragraphCount: paragraphs.length,
            sentenceCount: sentences.length,
            backendData: backendResponse.data
          });
        }
      );

      // Keep the message channel open for async response
      return true;
    }
  });

  // Detect right-click on highlights and inform background so highlight-specific context menu items can be shown
  document.addEventListener('contextmenu', (e) => {
    const target = e.target.closest && e.target.closest('.roshan-highlight');
    if (target) {
      chrome.runtime.sendMessage({ type: 'HIGHLIGHT_CONTEXT', text: target.textContent, tooltip: target.getAttribute('data-tooltip') || '' });
    }
  });

  // Handle actions from the background menu
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ASK_GEMINI') {
      // Placeholder: open a prompt or call a backend later
      alert('Ask Gemini: ' + (message.text || ''));
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'HIGHLIGHT_DETAILS') {
      const details = `Text: ${message.text}\nTooltip: ${message.tooltip || ''}`;
      alert(details);
      sendResponse({ success: true });
      return true;
    }
  });

  // Track the currently hovered highlight element (delegated, efficient)
  let hoveredHighlight = null;

  document.addEventListener('mousemove', (e) => {
    const el = e.target && e.target.closest && e.target.closest('.roshan-highlight');
    hoveredHighlight = el || null;
  });