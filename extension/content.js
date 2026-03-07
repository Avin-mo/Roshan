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
        // If an analysis is already running, clear existing highlights so user sees immediate feedback
        if (isHighlighting) {
          try {
            removeOldHighlights();
          } catch (e) {
            console.warn("Error removing old highlights while another run was active", e);
          }
        }

        isHighlighting = true;

        // Ensure DOM is ready
        if (document.readyState === "loading") {
          await new Promise((res) => document.addEventListener("DOMContentLoaded", res, { once: true }));
        }

        // Clear any existing highlights immediately so user sees update
        try {
          removeOldHighlights();
        } catch (e) {
          console.warn("Error removing old highlights", e);
        }

        // Wait briefly for SPA/delayed content to appear
        await waitForParagraphs(5000, 300);

        runHighlighting();

        isHighlighting = false;

        sendResponse({ success: true });
      })();

      // Return true to indicate we'll call sendResponse asynchronously
      return true;
    }

    if (message.type === "ANALYZE_SELECTION") {
      (async () => {
        // Clear existing highlights immediately
        try {
          removeOldHighlights();
        } catch (e) {
          console.warn("Error removing old highlights", e);
        }

        isHighlighting = true;

        // Ensure DOM is ready
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

        const labels = detectFlags(selectionText);
        const tooltipText = labels.length ? labels.join(", ") : "selected text";

        const paras = extractArticleParagraphs();
        let found = false;

        for (const p of paras) {
          if (p.textContent.includes(selectionText)) {
            found = true;
            const safeSel = escapeRegExp(selectionText);
            const highlighted = `<span class="roshan-highlight" data-tooltip="${tooltipText}">${selectionText}</span>`;
            p.innerHTML = p.innerHTML.replace(new RegExp(safeSel, "g"), highlighted);
          }
        }

        isHighlighting = false;
        sendResponse({ success: true, found });
      })();

      return true;
    }
  });