function extractArticleParagraphs() {
  let paragraphs = Array.from(document.querySelectorAll('article p'));
  if (paragraphs.length === 0) paragraphs = Array.from(document.querySelectorAll('main p'));
  if (paragraphs.length === 0) paragraphs = Array.from(document.querySelectorAll('p'));

  return paragraphs.filter((p) => {
    const text = (p.innerText || '').trim();
    if (text.length < 40) return false;

    const lower = text.toLowerCase();
    if (lower.includes('advertisement')) return false;
    if (lower === 'read more') return false;
    if (/^\d+\s+of\s+\d+/.test(lower)) return false;
    if (lower.startsWith('(ap photo/')) return false;

    return true;
  });
}

function splitIntoSentences(text) {
  const normalized = String(text || '')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();

  const sentences = normalized
    .split(/(?<=[.!?؟]["'”’\)]?)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  try {
    console.log('splitIntoSentences ->', sentences);
  } catch (e) {}

  return sentences;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(str) {
  return String(str || '')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function removeOldHighlights() {
  document.querySelectorAll('.roshan-highlight').forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  });
}

function injectStyles() {
  if (document.getElementById('roshan-styles')) return;

  const style = document.createElement('style');
  style.id = 'roshan-styles';

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
      white-space: normal;
      max-width: 320px;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
  `;

  document.head.appendChild(style);
}

function runHighlighting() {
  injectStyles();
  removeOldHighlights();
  console.log('Roshan: cleared local highlights; backend will provide flagged sentences');
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
    .map((p) => (p.innerText || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

// Helper: find text node and offset for a paragraph-wide index
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
  } catch {
    const content = range.extractContents();
    span.appendChild(content);
    range.insertNode(span);
  }

  return true;
}

// Highlight a single flagged sentence object from backend: { text, labels }
function highlightSentence(item) {
  if (!item || !item.text) return false;

  const rawText = String(item.text).trim();
  if (!rawText) return false;

  const tooltip = (item.labels || []).join(', ');
  const candidatePieces = splitIntoSentences(rawText);

  // If backend sent multiple sentences in one block, try each separately first.
  const pieces = candidatePieces.length > 1 ? candidatePieces : [rawText];

  const paragraphs = extractArticleParagraphs();
  console.log('Trying to highlight...', rawText);

  for (const piece of pieces) {
    for (const p of paragraphs) {
      if (tryHighlightInParagraph(p, piece, tooltip)) {
        console.log('Highlighted:', piece);
        return true;
      }
    }
  }

  console.log("Couldn't find...", rawText);
  return false;
}

// message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_ARTICLE') {
    (async () => {
      try {
        if (document.readyState === 'loading') {
          await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
        }

        await waitForParagraphs(5000, 250);
        runHighlighting();

        const articleText = getArticleText();
        const articleSentences = splitIntoSentences(articleText);

        chrome.runtime.sendMessage(
          {
            type: 'BACKEND_ANALYZE',
            payload: {
              url: window.location.href,
              title: document.title,
              sentences: articleSentences
            }
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              console.error('Backend message error:', chrome.runtime.lastError);
              sendResponse({ error: chrome.runtime.lastError.message });
              return;
            }

            try {
              const flagged = resp?.data?.sentences;
              if (Array.isArray(flagged) && flagged.length > 0) {
                console.log('Backend flagged sentences:');
                for (const s of flagged) {
                  highlightSentence(s);
                  console.log('- ', s.text, '| labels:', s.labels);
                }
              } else {
                console.log('Backend returned no flagged sentences');
              }
            } catch (e) {
              console.warn('Error logging backend flagged sentences', e);
            }

            sendResponse({ success: true, backendData: resp?.data });
          }
        );
      } catch (err) {
        console.error(err);
        sendResponse({ success: false, error: String(err) });
      }
    })();

    return true;
  }

  if (message.type === 'ANALYZE_SELECTION') {
    (async () => {
      try {
        if (document.readyState === 'loading') {
          await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
        }

        const sel = (message.text || '').trim();
        if (!sel) {
          sendResponse({ success: false, reason: 'empty_selection' });
          return;
        }

        removeOldHighlights();

        chrome.runtime.sendMessage(
          {
            type: 'BACKEND_ANALYZE',
            payload: {
              url: window.location.href,
              title: document.title,
              sentences: splitIntoSentences(sel)
            }
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              console.error('Backend message error:', chrome.runtime.lastError);
              sendResponse({ error: chrome.runtime.lastError.message });
              return;
            }

            try {
              const flagged = resp?.data?.sentences;
              if (Array.isArray(flagged) && flagged.length > 0) {
                for (const s of flagged) {
                  highlightSentence(s);
                }
              }
            } catch (e) {
              console.warn('Error highlighting selection results', e);
            }

            sendResponse({ success: true, backendData: resp?.data });
          }
        );
      } catch (err) {
        console.error(err);
        sendResponse({ success: false, error: String(err) });
      }
    })();

    return true;
  }

  if (message.type === 'HIGHLIGHT_DETAILS') {
    alert('Text: ' + (message.text || '') + '\n\nReason: ' + (message.tooltip || ''));
    sendResponse({ success: true });
    return true;
  }
});

// let background know when user right-clicks a highlight
document.addEventListener('contextmenu', (e) => {
  const target = e.target && e.target.closest ? e.target.closest('.roshan-highlight') : null;
  if (target) {
    chrome.runtime.sendMessage({
      type: 'HIGHLIGHT_CONTEXT',
      text: target.textContent,
      tooltip: target.getAttribute('data-tooltip') || ''
    });
  } else {
    chrome.runtime.sendMessage({ type: 'NO_HIGHLIGHT_CONTEXT' });
  }
});

// Track the currently hovered highlight element
let hoveredHighlight = null;

document.addEventListener('mousemove', (e) => {
  const el = e.target && e.target.closest && e.target.closest('.roshan-highlight');
  hoveredHighlight = el || null;
});