function extractArticleText() {
    let paragraphs = Array.from(document.querySelectorAll("article p"));
  
    if (paragraphs.length === 0) {
      paragraphs = Array.from(document.querySelectorAll("main p"));
    }
  
    if (paragraphs.length === 0) {
      paragraphs = Array.from(document.querySelectorAll("p"));
    }
  
    const cleaned = paragraphs
      .map((p) => p.innerText.trim())
      .filter((text) => text.length > 40);
  
    return cleaned;
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
  
      console.log("Roshan paragraphs:", paragraphs);
      console.log("Roshan sentences:", sentences);
  
      sendResponse({
        paragraphCount: paragraphs.length,
        sentenceCount: sentences.length,
        paragraphs,
        sentences
      });
    }
  });