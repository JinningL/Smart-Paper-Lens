// popup.js — Smart Paper Lens + 内置 AI 分析
import { extractPdfText } from './pdf-extract.js';

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function guessPdfUrl(rawUrl) {
  let url = rawUrl || '';
  try {
    const u = new URL(url);
    if (u.origin.startsWith('chrome-extension://') && u.searchParams.get('file')) {
      url = decodeURIComponent(u.searchParams.get('file'));
    }
  } catch {}
  return url;
}

// ===== AI 初始化 =====
async function initAI(out) {
  out.textContent = "⚙️ 内置 AI 检查中…";

  const status = await LanguageModel.availability({ outputLanguage: "en" });

  if (status === "unavailable") {
    out.textContent = "❌ 当前设备不支持内置 AI";
    return null;
  }
  if (status === "downloadable") {
    out.textContent = "📥 需要下载 AI 模型，准备中…";
  }
  if (status === "downloading") {
    out.textContent = "⏳ 模型下载中，请耐心等待…";
  }

  if (status === "available") {
    const session = await LanguageModel.create({
      outputLanguage: "en",
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          out.textContent = `⏳ 模型下载进度: ${(e.loaded * 100).toFixed(1)}%`;
        });
      },
    });
    out.textContent = "✅ 内置 AI 就绪";
    return session;
  }
  return null;
}

// ===== 主逻辑 =====
document.getElementById('analyze').addEventListener('click', async () => {
  const out = document.getElementById('out');
  const query = (document.getElementById('query').value || '').trim();
  out.textContent = '提取中…';

  const tab = await getActiveTab();
  let text = '';

  // ① 从 content.js 获取正文
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'SPL_GET_TEXT' });
    if (resp?.ok) text = resp.text || '';
  } catch {}

  // ② 如果正文太少，尝试 PDF 提取
  if (!text || text.length < 50) {
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
    out.textContent = '❌ 没取到正文。试试选中一段文字再点按钮，或者直接打开 PDF 链接。';
    return;
  }

  // ③ 初始化 AI
  const session = await initAI(out);
  if (!session) return;

  out.textContent = "🤖 AI 分析中…";

  // ④ 拼接 prompt
  let prompt;
  if (!query) {
    prompt = `请总结下面论文的主要论点，保持简洁准确：\n\n${text}`;
  } else {
    prompt = `论文全文如下：\n\n${text}\n\n问题：请帮我查找和“${query}”相关的论点，返回相关的原文或段落。如果没有，请明确说“未找到相关内容”。`;
  }

  try {
    const result = await session.prompt(prompt);
    out.textContent = "✅ AI 分析完成\n\n" + result;
  } catch (err) {
    out.textContent = "❌ AI 调用失败: " + err;
  }
});