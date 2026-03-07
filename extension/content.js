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
  
      fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: window.location.href,
          title: document.title,
          sentences: sentences
        })
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Backend response:", data);
  
          sendResponse({
            paragraphCount: paragraphs.length,
            sentenceCount: sentences.length,
            backendData: data
          });
        })
        .catch((error) => {
          console.error("Backend error:", error);
  
          sendResponse({
            error: error.message
          });
        });
  
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