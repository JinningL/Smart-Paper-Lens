// popup.js — FULL mode (no truncation / no top-K limit)
import { extractPdfText } from './pdf-extract.js';

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function guessPdfUrl(rawUrl) {
  let url = rawUrl || '';
  try {
    const u = new URL(url);
    // Chrome 内置 PDF viewer: viewer.html?file=<encoded>
    if (u.origin.startsWith('chrome-extension://') && u.searchParams.get('file')) {
      url = decodeURIComponent(u.searchParams.get('file'));
    }
  } catch {}
  return url;
}

document.getElementById('analyze').addEventListener('click', async () => {
  const out = document.getElementById('out');
  const query = (document.getElementById('query').value || '').trim();
  out.textContent = '提取中…';

  const tab = await getActiveTab();
  let text = '';

  // 先尝试从网页正文拿文本（content.js）
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'SPL_GET_TEXT' });
    if (resp?.ok) text = resp.text || '';
  } catch {}

  // 不足则尝试当作 PDF
  if (!text || text.length < 1) {
    const pdfUrl = guessPdfUrl(tab?.url || '');
    if (pdfUrl.toLowerCase().includes('pdf')) {
      try {
        text = await extractPdfText(pdfUrl);
      } catch (e) {
        console.warn('PDF 提取失败：', e);
      }
    }
  }

  if (!text) {
    out.textContent = '❌ 没取到正文。试试：在页面上拖选一段文字再点按钮；或打开可直接访问的 .pdf 链接。';
    return;
  }

  // 没填查询词 → 直接输出全文
  if (!query) {
    out.textContent = '✅ 提取成功（全文）\n\n' + text;
    return;
  }

  // 关键词“包含式”匹配：不过滤条数、不截断段落
  const q = query.toLowerCase();
  const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  const hits = paras.filter(t => t.toLowerCase().includes(q));
  out.textContent = hits.length
    ? `✅ 命中 ${hits.length} 段（全文输出）\n\n` + hits.map(t => `• ${t}`).join('\n\n')
    : `提取成功，但没有命中关键词：「${query}」`;
});