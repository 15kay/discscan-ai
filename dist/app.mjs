import { classify, sastDate } from './expiry.mjs';
import { readText } from './ocr.mjs';

const byId = id => document.getElementById(id);
const labels = { valid: 'Valid', expiring: 'Expiring soon', expired: 'Expired', review: 'Needs review' };
const camera = byId('camera');
const preview = byId('preview');
const placeholder = byId('placeholder');
const rows = [];
let busy = false;
let stream;
let previewUrl;
let sequence = 0;
byId('today').textContent = `${sastDate()} · SAST`;

function stopCamera() {
  stream?.getTracks().forEach(track => track.stop());
  stream = undefined;
  camera.srcObject = null;
  camera.hidden = true;
  byId('capture').hidden = true;
  byId('stop').hidden = true;
  byId('start-camera').hidden = false;
  preview.hidden = !previewUrl;
  placeholder.hidden = Boolean(previewUrl);
}

function showStatus(label, detail, status = 'review', expiry = '—') {
  byId('classification').className = `badge ${status}`;
  byId('classification').textContent = label;
  byId('expiry').textContent = expiry;
  byId('detail').textContent = detail;
}

function renderHistory() {
  byId('total').textContent = rows.length;
  for (const key of Object.keys(labels)) byId(key).textContent = rows.filter(row => row.status === key).length;
  byId('clear').disabled = !rows.length;
  const records = byId('records');
  records.replaceChildren();
  if (!rows.length) {
    const cell = records.insertRow().insertCell();
    cell.colSpan = 5;
    cell.textContent = 'Scan a disc to start your history.';
  }
  for (const row of rows) {
    const tr = records.insertRow();
    for (const value of [row.id, row.source, row.expiry ?? '—', labels[row.status], row.time]) {
      tr.insertCell().textContent = value;
    }
    tr.cells[3].className = row.status;
  }
}

function setBusy(value) {
  busy = value;
  for (const button of document.querySelectorAll('.actions button, .samples button')) button.disabled = value;
}

async function scan(blob, source) {
  if (busy) return;
  stopCamera();
  setBusy(true);
  if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  previewUrl = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
  preview.src = previewUrl;
  preview.hidden = false;
  placeholder.hidden = true;
  byId('raw').textContent = 'Reading image…';
  showStatus('Scanning', 'Reading the image with on-device OCR.');
  try {
    const text = await readText(previewUrl);
    const result = classify(text);
    byId('raw').textContent = text.trim() || 'No text recognised.';
    const detail = result.days === undefined ? 'A single labelled expiry date could not be read. Try a clearer, upright image.'
      : result.days === 0 ? 'Expires today.' : result.days < 0 ? `Expired ${-result.days} day(s) ago.` : `Expires in ${result.days} day(s).`;
    showStatus(labels[result.status], detail, result.status, result.expiry);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Johannesburg', timeStyle: 'medium' }).format();
    rows.unshift({ ...result, id: ++sequence, source, time });
    renderHistory();
  } catch {
    byId('raw').textContent = 'No text available.';
    showStatus('Scan failed', 'The OCR engine could not read this image. Try a built-in sample or reload the page.');
  } finally {
    setBusy(false);
  }
}

byId('start-camera').onclick = async () => {
  setBusy(true);
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    camera.srcObject = stream;
    camera.hidden = false;
    preview.hidden = true;
    placeholder.hidden = true;
    byId('capture').hidden = false;
    byId('stop').hidden = false;
    byId('start-camera').hidden = true;
  } catch {
    stopCamera();
    showStatus('Camera unavailable', 'Allow camera access on HTTPS or upload a synthetic image instead.');
  } finally {
    setBusy(false);
  }
};
byId('capture').onclick = () => {
  if (!camera.videoWidth || busy) return;
  const canvas = document.createElement('canvas');
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  canvas.getContext('2d').drawImage(camera, 0, 0);
  setBusy(true);
  canvas.toBlob(blob => {
    setBusy(false);
    if (blob) scan(blob, 'Camera');
    else showStatus('Capture failed', 'Try capturing the frame again.');
  }, 'image/png');
};
byId('stop').onclick = stopCamera;
window.addEventListener('pagehide', stopCamera);
byId('upload').onclick = () => byId('file').click();
byId('file').onchange = event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
    showStatus('Unsupported image', 'Choose a PNG, JPEG or WebP image under 15 MB.');
    return;
  }
  scan(file, 'Upload');
};
for (const button of document.querySelectorAll('[data-sample]')) {
  button.onclick = () => scan(`samples/${button.dataset.sample}.png`, button.textContent);
}
byId('clear').onclick = () => { rows.length = 0; renderHistory(); };
