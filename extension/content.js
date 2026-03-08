// content.js

try {
  console.log("Roshan content script loaded");
} catch (e) {}

// expose helper to open ChatGPT widget from browser console for testing
window.roshanOpenChatGPT = function (text) {
  try {
    ensureChatWidget();
    appendToChatBody("Manual: " + (text || "test"));
  } catch (e) {
    console.warn("roshanOpenChatGPT error", e);
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

    /* Chat typing indicator */
    .roshan-typing {
      color: #444;
      font-style: italic;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .roshan-typing .dots {
      display: inline-block;
      width: 24px;
      text-align: left;
    }

    .roshan-typing .dot {
      display: inline-block;
      animation: roshan-dot 1s steps(1,end) infinite;
      opacity: 0.2;
      margin-left: 2px;
    }

    .roshan-typing .dot:nth-child(1) { animation-delay: 0s; }
    .roshan-typing .dot:nth-child(2) { animation-delay: 0.2s; }
    .roshan-typing .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes roshan-dot {
      0% { opacity: 0.2; }
      50% { opacity: 1; }
      100% { opacity: 0.2; }
    }

    #roshan-chat-widget strong {
  font-weight: 700 !important;
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
   ChatGPT popup widget
------------------------- */

// Store the current context for follow-up questions
let currentChatContext = { text: "", labels: [] };

function ensureChatWidget() {
  if (document.getElementById("roshan-chat-widget")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "roshan-chat-widget";

  wrapper.style.position = "fixed";
  wrapper.style.right = "16px";
  wrapper.style.bottom = "16px";
  wrapper.style.width = "360px";
  wrapper.style.maxWidth = "calc(100% - 32px)";
  wrapper.style.zIndex = "2147483647";
  wrapper.style.fontFamily = "Arial, sans-serif";

  // Insert a close button in the header and keep the rest of the widget markup
  wrapper.innerHTML = `
    <div style="background:#111;color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;position:relative;">
      <div style="font-weight:600">Roshan — <strong>ChatGPT</strong></div>
      <button id="roshan-chat-close" title="Close" 
        style="position:absolute;right:8px;top:6px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;">×</button>
    </div>

    <div id="roshan-chat-body"
      style="background:#fff;border:1px solid #ddd;padding:12px;max-height:240px;overflow:auto;color:#111;font-size:13px;">
    </div>

    <div style="display:flex;border:1px solid #ddd;border-top:none;background:#fff;border-radius:0 0 8px 8px;">
      <input id="roshan-chat-input"
        placeholder="Ask for more details..."
        style="flex:1;padding:8px;border:none;outline:none;" />

      <button id="roshan-chat-send"
        style="border:none;background:#1a73e8;color:white;padding:8px 12px;cursor:pointer;">
        Send
      </button>
    </div>
  `;

  document.body.appendChild(wrapper);

  // Hook up the close button to remove the widget and clear context
  const closeBtn = document.getElementById("roshan-chat-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const w = document.getElementById("roshan-chat-widget");
      if (w) w.remove();
      // clear stored follow-up context
      currentChatContext = { text: "", labels: [] };
    });
  }

  const input = document.getElementById("roshan-chat-input");
  const send = document.getElementById("roshan-chat-send");

  send.addEventListener("click", () => {
    const q = (input.value || "").trim();
    if (!q) return;

    appendToChatBody("You: " + q);
    input.value = "";

    // show typing indicator
    showTyping();

    // Use followup endpoint with the stored context
    chrome.runtime.sendMessage(
      { 
        type: "ASK_GPT_FOLLOWUP",
        text: currentChatContext.text,
        labels: currentChatContext.labels,
        question: q
      },
      (resp) => {

        // hide typing indicator
        hideTyping();

        // Normalize response into a user-friendly string
        let answer = "No response";
        if (resp) {
          if (resp.data && typeof resp.data === 'object') {
            if (resp.data.answer) {
              answer = String(resp.data.answer);
            } else if (resp.data.explanation) {
              answer = String(resp.data.explanation);
            } else if (resp.data.error) {
              answer = String(resp.data.error);
            } else {
              answer = JSON.stringify(resp.data);
            }
          } else if (typeof resp.data === 'string') {
            answer = resp.data;
          } else if (resp.error) {
            answer = String(resp.error);
          }
        }

        appendToChatBody("ChatGPT: " + answer);
      }
    );
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showTyping() {
  const body = document.getElementById("roshan-chat-body");
  if (!body) return;
  // Avoid duplicate
  if (document.getElementById("roshan-chat-typing")) return;

  const div = document.createElement("div");
  div.id = "roshan-chat-typing";
  div.className = "roshan-typing";
  div.innerHTML = `<strong>ChatGPT</strong>: <span class="dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>`;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById("roshan-chat-typing");
  if (t) t.remove();
}

function appendToChatBody(text) {
  const body = document.getElementById("roshan-chat-body");
  if (!body) return;

  hideTyping();

  const div = document.createElement("div");
  div.style.marginBottom = "8px";

  const str = String(text || '');

  const prefixes = ["ChatGPT:", "You:", "Selected:"];

  for (const p of prefixes) {
    if (str.startsWith(p)) {

      const strong = document.createElement("strong");
      strong.textContent = p.replace(":", "");

      div.appendChild(strong);
      div.appendChild(document.createTextNode(": " + str.slice(p.length).trim()));

      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return;
    }
  }

  div.textContent = str;

  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

/* -------------------------
   Messaging
------------------------- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ASK_GPT") {
        console.log("ASK_GPT received");

        const text = message.text || "";
        const labels = message.labels || [];

        // Store context for follow-up questions
        currentChatContext = { text, labels };

        ensureChatWidget();
        appendToChatBody("Selected: " + text.slice(0, 300));

        // show typing indicator
        showTyping();

        chrome.runtime.sendMessage(
            { type: "ASK_GPT_REQUEST", text, labels },
            (resp) => {
            if (chrome.runtime.lastError) {
                appendToChatBody("Error: " + chrome.runtime.lastError.message);
                sendResponse({ ok: false });
                return;
            }

            // hide typing indicator
            hideTyping();

            // Normalize response into a user-friendly string
            let explanation = "No response";
            if (resp) {
              if (resp.data && typeof resp.data === 'object') {
                if (resp.data.explanation) {
                  explanation = String(resp.data.explanation);
                } else if (resp.data.error) {
                  explanation = String(resp.data.error);
                } else {
                  explanation = JSON.stringify(resp.data);
                }
              } else if (typeof resp.data === 'string') {
                explanation = resp.data;
              } else if (resp.error) {
                explanation = String(resp.error);
              }
            }

            appendToChatBody("ChatGPT: " + explanation);
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