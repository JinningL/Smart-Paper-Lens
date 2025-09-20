// content.js — FULL mode (collect as much as possible)
function getSelectionText() {
    const sel = window.getSelection?.();
    const s = sel && sel.toString ? sel.toString() : '';
    return s ? s.trim() : '';
  }
  
  function visible(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.height > 0 && rect.width > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }
  
  // 几乎不设限制：选区优先；否则抓常见正文节点，短段也纳入，且不设上限
  function collectPageText() {
    const picked = getSelectionText();
    if (picked) return picked; // 只要选了就用选区
  
    const nodes = Array.from(document.querySelectorAll('article, main, section, p, li, blockquote, div'));
    const chunks = [];
    const seen = new Set();
  
    for (const el of nodes) {
      if (!visible(el)) continue;
      const t = (el.innerText || '').trim();
      if (!t) continue;             // 仅跳过空文本
      if (seen.has(t)) continue;    // 简单去重
      seen.add(t);
      chunks.push(t);
      // 不设上限：按你要求“不要防卡”
    }
    return chunks.join('\n\n');
  }
  
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'SPL_GET_TEXT') {
      try {
        const text = collectPageText();
        sendResponse({ ok: true, text, length: text.length });
      } catch (e) {
        console.error(e);
        sendResponse({ ok: false, error: String(e) });
      }
      return true;
    }
  });