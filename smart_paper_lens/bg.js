// bg.js
async function callModelJSON({ apiKey, question, text }) {
    const system = `You extract the most relevant passages from a document.
  Return STRICT JSON only. Do not include markdown. No extra keys.`;
  
    // 说明清楚输出结构 & 评分标准
    const user = `
  Question: ${question}
  
  Document (truncated to avoid token limits):
  ${text.slice(0, 140000)}
  
  Return JSON with this exact schema:
  {
    "answerable": true | false,
    "passages": [
      { "quote": "string (<= 300 chars, verbatim from document)",
        "reason": "why it's relevant, short",
        "score": number between 0 and 1 }
    ]
  }
  
  Rules:
  - If the document cannot answer the question, set "answerable": false and return an empty "passages": [].
  - If answerable, include up to 8 passages, sorted by descending score.
  - Keep quotes verbatim from the document (no edits), each <= 300 chars.
  - Output STRICT JSON ONLY (no backticks, no comments, no markdown).`;
  
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        max_tokens: 900,
        response_format: { type: "json_object" } // 要求 JSON
      })
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
  }
  
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      if (msg?.type === "AI_RANK") {
        const { question, text } = msg;
        const { openai_key } = await chrome.storage.sync.get(["openai_key"]);
        if (!openai_key) { sendResponse({ ok: false, error: "NO_KEY" }); return; }
        try {
          const json = await callModelJSON({ apiKey: openai_key, question, text });
          sendResponse({ ok: true, json });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      }
    })();
    return true;
  });