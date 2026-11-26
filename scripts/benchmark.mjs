import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { classify } from '../dist/expiry.mjs';

const require = createRequire(import.meta.url);
const { createWorker } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'tesseract.js') : 'tesseract.js');
const reference = process.argv[2] ?? '2026-11-26';
const inputs = JSON.parse(await readFile('benchmark-inputs/manifest.json', 'utf8'));
const worker = await createWorker('eng', 1, { langPath: resolve('dist/ocr'), cacheMethod: 'none' });
const outcomes = [];
try {
  await worker.setParameters({ tessedit_pageseg_mode: '11' });
  for (const input of inputs) {
    const { data } = await worker.recognize(resolve('benchmark-inputs', input.name + '.png'));
    const actual = classify(data.text, reference);
    outcomes.push({ ...input, actualStatus: actual.status, actualExpiry: actual.expiry ?? null, text: data.text.trim() });
  }
} finally {
  await worker.terminate();
}
await writeFile('benchmark-results.json', JSON.stringify({ reference, outcomes }, null, 2) + '\n');
for (const condition of new Set(inputs.map(input => input.condition))) {
  const rows = outcomes.filter(input => input.condition === condition);
  console.log(condition, 'status', rows.filter(row => row.status === row.actualStatus).length,
    '/', rows.length, 'exact date', rows.filter(row => row.expiry === row.actualExpiry).length);
}
