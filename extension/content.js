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