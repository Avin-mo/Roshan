function extractArticleParagraphs() {
  let paragraphs = Array.from(document.querySelectorAll('article p'));
  if (paragraphs.length === 0) paragraphs = Array.from(document.querySelectorAll('main p'));
  if (paragraphs.length === 0) paragraphs = Array.from(document.querySelectorAll('p'));
  return paragraphs.filter((p) => p.innerText.trim().length > 40);
}

function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?؟])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function detectFlags(sentence) {
  const lower = sentence.toLowerCase();
  const labels = [];
  if (/(\beveryone\b|\balways\b|\bnever\b|\bdefinitely\b)/.test(lower)) labels.push('absolutist language');
  if (/experts say|many believe|it is said|sources say|sources claim/.test(lower)) labels.push('vague or unsupported claim');
  if (/destroy|disaster|crisis|shocking|threat|betrayal/.test(lower)) labels.push('high persuasion / emotional framing');
  return labels;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeOldHighlights() {
  // unwrap .roshan-highlight preserving children
  document.querySelectorAll('.roshan-highlight').forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
}

function highlightParagraph(paragraph) {
  // iterate sentences from the paragraph text and wrap flagged ones inside text nodes
  const sentences = splitIntoSentences(paragraph.textContent || '');
  for (const sentence of sentences) {
    const labels = detectFlags(sentence);
    if (labels.length === 0) continue;
    const tooltip = labels.join(', ');

    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue) continue;
      const idx = node.nodeValue.indexOf(sentence);
      if (idx === -1) continue;
      try {
        const after = node.splitText(idx);
        const rest = after.splitText(sentence.length);
        const span = document.createElement('span');
        span.className = 'roshan-highlight';
        span.setAttribute('data-tooltip', tooltip);
        // preserve markup by moving text into span (textContent fine for the matched plain text)
        span.textContent = sentence;
        after.parentNode.replaceChild(span, after);
        walker.currentNode = rest;
      } catch (e) {
        console.warn('highlightParagraph error', e);
      }
    }
  }
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
      /* outline removed to avoid altering page typography */
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
      z-index: 2147483647;
    }
  `;

  document.head.appendChild(style);
}

function runHighlighting() {
  injectStyles();
  removeOldHighlights();
  const paragraphs = extractArticleParagraphs();
  for (const p of paragraphs) highlightParagraph(p);
  console.log('Roshan highlighting complete —', document.querySelectorAll('.roshan-highlight').length, 'highlights');
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

// message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_ARTICLE') {
    (async () => {
      try {
        if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
        await waitForParagraphs(5000, 250);
        runHighlighting();

        // call backend via background for analysis (keep original behavior)
        chrome.runtime.sendMessage({ type: 'BACKEND_ANALYZE', payload: { url: window.location.href, title: document.title, sentences: splitIntoSentences(document.body.innerText || '') } }, (resp) => {
          if (chrome.runtime.lastError) {
            console.error('Backend message error:', chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }

          // If backend returned flagged sentences, log each one and its labels
          try {
            const flagged = resp?.data?.sentences;
            if (Array.isArray(flagged) && flagged.length > 0) {
              console.log('Backend flagged sentences:');
              for (const s of flagged) {
                console.log('- ', s.text, '| labels:', s.labels);
              }
            } else {
              console.log('Backend returned no flagged sentences');
            }
          } catch (e) {
            console.warn('Error logging backend flagged sentences', e);
          }

          sendResponse({ success: true, backendData: resp?.data });
        });
      } catch (err) {
        console.error(err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true; // async
  }

  if (message.type === 'ANALYZE_SELECTION') {
    (async () => {
      try {
        if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
        const sel = (message.text || '').trim();
        if (!sel) { sendResponse({ success: false, reason: 'empty_selection' }); return; }
        removeOldHighlights();
        const paragraphs = extractArticleParagraphs();
        let found = false;
        for (const p of paragraphs) {
          if (p.textContent.includes(sel)) { highlightParagraph(p); found = true; }
        }
        if (!found) {
          const all = Array.from(document.querySelectorAll('p'));
          for (const p of all) if (p.textContent.includes(sel)) { highlightParagraph(p); found = true; }
        }
        sendResponse({ success: true, found });
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
    chrome.runtime.sendMessage({ type: 'HIGHLIGHT_CONTEXT', text: target.textContent, tooltip: target.getAttribute('data-tooltip') || '' });
  }
});

// Track the currently hovered highlight element (delegated, efficient)
let hoveredHighlight = null;

document.addEventListener('mousemove', (e) => {
  const el = e.target && e.target.closest && e.target.closest('.roshan-highlight');
  hoveredHighlight = el || null;
});