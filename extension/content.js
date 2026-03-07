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
    // Unwrap each highlight span while preserving any nested markup inside it
    document.querySelectorAll('.roshan-highlight').forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;

      // Move all child nodes out of the span back into the parent, before the span
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }

      // Remove the now-empty span element
      parent.removeChild(span);
    });
  }
  
  function highlightParagraph(paragraph) {
    // Work directly with text nodes to preserve existing markup inside the paragraph
    const sentences = splitIntoSentences(paragraph.textContent);

    for (const sentence of sentences) {
      const labels = detectFlags(sentence);
      if (labels.length === 0) continue;

      const tooltipText = labels.join(", ");

      // Walk text nodes and wrap occurrences of the sentence
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, null, false);
      let node;

      while ((node = walker.nextNode())) {
        // Skip empty nodes
        if (!node.nodeValue || node.nodeValue.trim().length === 0) continue;

        const idx = node.nodeValue.indexOf(sentence);
        if (idx === -1) continue;

        try {
          // Split the text node into: before | match | after
          const after = node.splitText(idx);
          const rest = after.splitText(sentence.length);

          const span = document.createElement("span");
          span.className = "roshan-highlight";
          span.setAttribute("data-tooltip", tooltipText);
          span.textContent = sentence;

          after.parentNode.replaceChild(span, after);

          // Continue searching after the rest node (avoid reprocessing same text)
          walker.currentNode = rest;
        } catch (e) {
          console.warn("Error wrapping sentence in DOM", e);
        }
      }
    }
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
  
  let isHighlighting = false;

  function waitForParagraphs(timeout = 5000, interval = 250) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function check() {
        const paras = extractArticleParagraphs();
        if (paras.length > 0) return resolve(paras);
        if (Date.now() - start > timeout) return resolve(paras);
        setTimeout(check, interval);
      })();
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_ARTICLE") {
      (async () => {
        if (isHighlighting) {
          try { removeOldHighlights(); } catch (e) { console.warn(e); }
        }
        isHighlighting = true;
        if (document.readyState === "loading") {
          await new Promise((res) => document.addEventListener("DOMContentLoaded", res, { once: true }));
        }
        try { removeOldHighlights(); } catch (e) { console.warn(e); }
        await waitForParagraphs(5000, 300);
        runHighlighting();
        isHighlighting = false;
        sendResponse({ success: true });
      })();
  
      return true;
    }
  
    if (message.type === "ANALYZE_SELECTION") {
      (async () => {
        // Immediate visual feedback: remove previous highlights
        try { removeOldHighlights(); } catch (e) { console.warn(e); }
  
        isHighlighting = true;
  
        if (document.readyState === "loading") {
          await new Promise((res) => document.addEventListener("DOMContentLoaded", res, { once: true }));
        }
  
        await waitForParagraphs(3000, 200);
  
        const selectionText = (message.text || "").trim();
        if (!selectionText) {
          isHighlighting = false;
          sendResponse({ success: false, reason: "empty_selection" });
          return;
        }
  
        // Use the existing paragraph/highlight logic: find paragraphs containing the selection
        // and re-run the sentence-level detector for those paragraphs.
        const paragraphs = extractArticleParagraphs();
        let found = false;
  
        for (const p of paragraphs) {
          if (p.textContent.includes(selectionText)) {
            found = true;
            try {
              // Re-highlight that paragraph using existing logic (only flagged sentences will be wrapped)
              highlightParagraph(p);
            } catch (e) {
              console.warn("Error highlighting paragraph for selection", e);
            }
          }
        }
  
        // If nothing matched in our filtered paragraphs, try all <p> elements as a fallback
        if (!found) {
          const allP = Array.from(document.querySelectorAll("p"));
          for (const p of allP) {
            if (p.textContent.includes(selectionText)) {
              found = true;
              try { highlightParagraph(p); } catch (e) { console.warn(e); }
            }
          }
        }
  
        isHighlighting = false;
        sendResponse({ success: true, found });
      })();
  
      return true;
    }
  });