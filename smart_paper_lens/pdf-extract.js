import * as pdfjsLib from './vendor/pdfjs/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.mjs');

export async function extractPdfText(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;

  let all = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items.map(it => it.str);
    all.push(strings.join(" "));
  }
  return all.join("\n");
}