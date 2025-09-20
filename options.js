const $ = s => document.querySelector(s);

chrome.storage.sync.get(['openai_key'], ({ openai_key }) => {
  if (openai_key) $('#key').value = openai_key;
});

$('#save').addEventListener('click', async () => {
  const key = $('#key').value.trim();
  await chrome.storage.sync.set({ openai_key: key });
  $('#status').textContent = '保存成功 ✓';
  setTimeout(() => $('#status').textContent = '', 1500);
});