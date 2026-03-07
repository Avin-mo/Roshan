function extractArticleParagraphs() {
    let paragraphs = Array.from(document.querySelectorAll("article p"));
  
    if (paragraphs.length === 0) {
      paragraphs = Array.from(document.querySelectorAll("main p"));
    }
  
    if (paragraphs.length === 0) {
      paragraphs = Array.from(document.querySelectorAll("p"));
    }
  
    return paragraphs.filter((p) => p.innerText.trim().length > 40);
  }
  
  function splitIntoSentences(text) {
    return text
      .split(/(?<=[.!?؟])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  
  // fake detector for now
  function detectFlags(sentence) {
    const lower = sentence.toLowerCase();
    const labels = [];
  
    if (
      lower.includes("everyone") ||
      lower.includes("always") ||
      lower.includes("never") ||
      lower.includes("definitely")
    ) {
      labels.push("absolutist language");
    }
  
    if (
      lower.includes("experts say") ||
      lower.includes("many believe") ||
      lower.includes("it is said") ||
      lower.includes("sources say")
    ) {
      labels.push("vague or unsupported claim");
    }
  
    if (
      lower.includes("destroy") ||
      lower.includes("crisis") ||
      lower.includes("shocking") ||
      lower.includes("threat")
    ) {
      labels.push("high persuasion / emotional framing");
    }
  
    return labels;
  }
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  
  function removeOldHighlights() {
    document.querySelectorAll(".roshan-highlight").forEach((span) => {
      const textNode = document.createTextNode(span.textContent);
      span.replaceWith(textNode);
    });
  }
  
  function highlightParagraph(paragraph) {
    const originalText = paragraph.textContent;
    const sentences = splitIntoSentences(originalText);
  
    let newHTML = originalText;
  
    for (const sentence of sentences) {
      const labels = detectFlags(sentence);
  
      if (labels.length > 0) {
        console.log("Found bad message...");
        const safeSentence = escapeRegExp(sentence);
  
        const tooltipText = labels.join(", ");
  
        const highlightedSentence = `
          <span class="roshan-highlight" data-tooltip="${tooltipText}">
            ${sentence}
          </span>
        `;
  
        newHTML = newHTML.replace(new RegExp(safeSentence), highlightedSentence);
      }
    }
  
    paragraph.innerHTML = newHTML;
  }
  
  function injectStyles() {
    if (document.getElementById("roshan-styles")) return;
  
    const style = document.createElement("style");
    style.id = "roshan-styles";
    style.textContent = `
      .roshan-highlight {
        background: rgba(255, 230, 0, 0.45);
        cursor: pointer;
        position: relative;
        border-radius: 3px;
        padding: 1px 2px;
      }
  
      .roshan-highlight:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 0;
        top: 100%;
        margin-top: 6px;
        background: #111;
        color: white;
        padding: 6px 8px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 999999;
      }
    `;
  
    document.head.appendChild(style);
  }
  
  function runHighlighting() {
    injectStyles();
    removeOldHighlights();
  
    const paragraphs = extractArticleParagraphs();
  
    for (const paragraph of paragraphs) {
      highlightParagraph(paragraph);
    }
  
    console.log("Roshan highlighting complete");
  }
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_ARTICLE") {
      runHighlighting();
      sendResponse({ success: true });
    }
  });