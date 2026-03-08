// content.js

try {
  console.log("Roshan content script loaded");
} catch (e) {}

// expose helper to open Gemini widget from browser console for testing
window.roshanOpenGemini = function (text) {
  try {
    ensureChatWidget();
    appendToGeminiBody("Manual: " + (text || "test"));
  } catch (e) {
    console.warn("roshanOpenGemini error", e);
  }
};

function extractArticleParagraphs() {
  let paragraphs = Array.from(document.querySelectorAll("article p"));
  if (paragraphs.length === 0) paragraphs = Array.from(document.querySelectorAll("main p"));
  if (paragraphs.length === 0) paragraphs = Array.from(document.querySelectorAll("p"));

  return paragraphs.filter((p) => {
    const text = (p.innerText || "").trim();
    if (text.length < 40) return false;

    const lower = text.toLowerCase();
    if (lower.includes("advertisement")) return false;
    if (lower === "read more") return false;
    if (/^\d+\s+of\s+\d+/.test(lower)) return false;
    if (lower.startsWith("(ap photo/")) return false;

    return true;
  });
}

function splitIntoSentences(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();

  return normalized
    .split(/(?<=[.!?؟]["'”’\)]?)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function removeOldHighlights() {
  document.querySelectorAll(".roshan-highlight").forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;

    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  });
}

function injectStyles() {
  if (document.getElementById("roshan-styles")) return;

  const style = document.createElement("style");
  style.id = "roshan-styles";

  style.textContent = `
    .roshan-highlight {
      background: rgba(255, 230, 0, 0.45);
      cursor: pointer;
      border-radius: 3px;
      padding: 1px 2px;
    }

    .roshan-tooltip {
      position: fixed;
      background: #111;
      color: white;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 12px;
      max-width: 320px;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      pointer-events: none;
    }
  `;

  document.head.appendChild(style);
}

function runHighlighting() {
  injectStyles();
  removeOldHighlights();
}

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

function getArticleText() {
  return extractArticleParagraphs()
    .map((p) => (p.innerText || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function findTextNodeAtIndex(root, index) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  let node;
  let cum = 0;

  while ((node = walker.nextNode())) {
    const len = node.nodeValue ? node.nodeValue.length : 0;

    if (index <= cum + len - 1) {
      return { node, offset: index - cum };
    }

    cum += len;
  }

  return null;
}

function tryHighlightInParagraph(paragraph, sentence, tooltip) {
  const paragraphText = paragraph.textContent;
  const start = paragraphText.indexOf(sentence);

  if (start === -1) return false;

  const startPos = findTextNodeAtIndex(paragraph, start);
  const endPos = findTextNodeAtIndex(paragraph, start + sentence.length - 1);

  if (!startPos || !endPos) return false;

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset + 1);

  const span = document.createElement("span");
  span.className = "roshan-highlight";

  if (tooltip) span.setAttribute("data-tooltip", tooltip);

  try {
    range.surroundContents(span);
  } catch (err) {
    const content = range.extractContents();
    span.appendChild(content);
    range.insertNode(span);
  }

  return true;
}

function formatLabel(label) {
  return String(label || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function highlightSentence(item) {
  if (!item || !item.text) return false;

  const rawText = String(item.text).trim();
  if (!rawText) return false;

  const tooltip = (item.labels || []).map(formatLabel).join(", ");
  const candidatePieces = splitIntoSentences(rawText);
  const pieces = candidatePieces.length > 1 ? candidatePieces : [rawText];

  const paragraphs = extractArticleParagraphs();

  for (const piece of pieces) {
    for (const p of paragraphs) {
      try {
        if (tryHighlightInParagraph(p, piece, tooltip)) {
          return true;
        }
      } catch {}
    }
  }

  return false;
}

/* -------------------------
   Tooltip logic
------------------------- */

let activeTooltip = null;

document.addEventListener("mouseover", (e) => {
  const el = e.target.closest?.(".roshan-highlight");
  if (!el) return;

  const text = el.getAttribute("data-tooltip");
  if (!text) return;

  const tooltip = document.createElement("div");
  tooltip.className = "roshan-tooltip";
  tooltip.textContent = text;

  document.body.appendChild(tooltip);
  activeTooltip = tooltip;

  const rect = el.getBoundingClientRect();

  tooltip.style.left = rect.left + "px";
  tooltip.style.top = rect.bottom + 6 + "px";
});

document.addEventListener("mouseout", (e) => {
  const el = e.target.closest?.(".roshan-highlight");
  if (!el) return;

  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
});

/* -------------------------
   Gemini popup widget
------------------------- */

function ensureChatWidget() {
  if (document.getElementById("roshan-gemini-widget")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "roshan-gemini-widget";

  wrapper.style.position = "fixed";
  wrapper.style.right = "16px";
  wrapper.style.bottom = "16px";
  wrapper.style.width = "360px";
  wrapper.style.maxWidth = "calc(100% - 32px)";
  wrapper.style.zIndex = "2147483647";
  wrapper.style.fontFamily = "Arial, sans-serif";

  wrapper.innerHTML = `
    <div style="background:#111;color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;">
      Roshan — Gemini
    </div>

    <div id="roshan-gemini-body"
      style="background:#fff;border:1px solid #ddd;padding:12px;max-height:240px;overflow:auto;color:#111;font-size:13px;">
    </div>

    <div style="display:flex;border:1px solid #ddd;border-top:none;background:#fff;border-radius:0 0 8px 8px;">
      <input id="roshan-gemini-input"
        placeholder="Ask for more details..."
        style="flex:1;padding:8px;border:none;outline:none;" />

      <button id="roshan-gemini-send"
        style="border:none;background:#1a73e8;color:white;padding:8px 12px;cursor:pointer;">
        Send
      </button>
    </div>
  `;

  document.body.appendChild(wrapper);

  const input = document.getElementById("roshan-gemini-input");
  const send = document.getElementById("roshan-gemini-send");

  send.addEventListener("click", () => {
    const q = (input.value || "").trim();
    if (!q) return;

    appendToGeminiBody("You: " + q);
    input.value = "";

    chrome.runtime.sendMessage(
      { type: "ASK_GEMINI_REQUEST", text: q },
      (resp) => {

        const explanation =
          resp?.data?.explanation ||
          resp?.data ||
          resp?.error ||
          "No response";

        appendToGeminiBody("Gemini: " + explanation);
      }
    );
  });
}

function appendToGeminiBody(text) {
  const body = document.getElementById("roshan-gemini-body");
  if (!body) return;

  const div = document.createElement("div");
  div.style.marginBottom = "8px";
  div.textContent = text;

  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

/* -------------------------
   Messaging
------------------------- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ASK_GEMINI") {
        console.log("ASK_GEMINI received");

        const text = message.text || "";

        ensureChatWidget();
        appendToGeminiBody("Selected: " + text.slice(0, 300));

        chrome.runtime.sendMessage(
            { type: "ASK_GEMINI_REQUEST", text },
            (resp) => {
            if (chrome.runtime.lastError) {
                appendToGeminiBody("Error: " + chrome.runtime.lastError.message);
                sendResponse({ ok: false });
                return;
            }

            const explanation =
                resp?.data?.explanation || resp?.data || resp?.error || "No response";

            appendToGeminiBody("Gemini: " + explanation);
            sendResponse({ ok: true });
            }
        );

        return true;
    }

  if (message.type === "ANALYZE_ARTICLE") {
    (async () => {

      if (document.readyState === "loading") {
        await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
      }

      await waitForParagraphs();

      runHighlighting();

      const articleText = getArticleText();
      const sentences = splitIntoSentences(articleText);

      chrome.runtime.sendMessage({
        type: "BACKEND_ANALYZE",
        payload: {
          url: window.location.href,
          title: document.title,
          sentences
        }
      }, (resp) => {

        const flagged = resp?.data?.sentences;

        if (Array.isArray(flagged)) {
          for (const s of flagged) {
            highlightSentence(s);
          }
        }

        sendResponse({
          success: !resp?.error,
          backendData: resp?.data,
          error: resp?.error
        });

      });

    })();

    return true;
  }

  if (message.type === "ANALYZE_SELECTION") {
    removeOldHighlights();

    const sentences = splitIntoSentences(message.text || "");

    chrome.runtime.sendMessage({
      type: "BACKEND_ANALYZE",
      payload: {
        url: window.location.href,
        title: document.title,
        sentences
      }
    }, (resp) => {

      const flagged = resp?.data?.sentences;

      if (Array.isArray(flagged)) {
        for (const s of flagged) {
          highlightSentence(s);
        }
      }

      sendResponse({
        success: !resp?.error,
        backendData: resp?.data,
        error: resp?.error
      });

    });

    return true;
  }

  if (message.type === "HIGHLIGHT_DETAILS") {
    alert("Text: " + (message.text || "") + "\n\nReason: " + (message.tooltip || ""));
    sendResponse({ success: true });
    return true;
  }

});

/* -------------------------
   Context menu detection
------------------------- */

document.addEventListener("contextmenu", (e) => {

  const target = e.target && e.target.closest
    ? e.target.closest(".roshan-highlight")
    : null;

  if (target) {

    chrome.runtime.sendMessage({
      type: "HIGHLIGHT_CONTEXT",
      text: target.textContent,
      tooltip: target.getAttribute("data-tooltip") || ""
    });

  } else {

    chrome.runtime.sendMessage({
      type: "NO_HIGHLIGHT_CONTEXT"
    });

  }

});