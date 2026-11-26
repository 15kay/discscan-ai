/* Integration test and screen recording of the local development app. */
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFile } = require('node:fs/promises');

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_BIN ?? '/usr/bin/chromium',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
      '--use-file-for-fake-video-capture=' + path.resolve('.recording/camera.y4m')],
  });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
    recordVideo: { dir: '.recording', size: { width: 1500, height: 1000 } },
    timezoneId: 'Africa/Johannesburg',
  });
  try {
    const page = await context.newPage();
    const video = page.video();
    await page.clock.setFixedTime(new Date('2026-11-26T08:00:00Z'));
    const testUrl = process.env.DISCSCAN_TEST_URL ?? 'http://localhost:8080/';
    if (!process.env.DISCSCAN_TEST_URL) {
      const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
        '.png': 'image/png', '.wasm': 'application/wasm', '.css': 'text/css' };
      await context.route(testUrl + '**', async route => {
        const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
        const asset = path.join('dist', relative);
        try {
          await route.fulfill({ body: await readFile(asset),
            contentType: mime[path.extname(asset)] ?? 'application/octet-stream' });
        } catch {
          await route.fulfill({ status: 404, body: 'Missing test asset' });
        }
      });
    }
    await page.goto(testUrl);
    const check = async expected => {
      await page.locator('#classification').getByText(expected, { exact: true }).waitFor();
      await page.waitForTimeout(3200);
    };
    await page.waitForTimeout(3500);
    await page.getByRole('button', { name: 'Open camera' }).click();
    await page.waitForFunction(() => document.querySelector('video').videoWidth > 0);
    await page.waitForTimeout(2800);
    await page.getByRole('button', { name: 'Capture & scan' }).click();
    await check('Expired');
    assert.equal(await page.locator('#expiry').innerText(), '2026-10-12');
    assert.equal(await page.locator('#records tr:first-child td:nth-child(2)').innerText(), 'Camera');
    await page.screenshot({ path: 'media/discscan-camera-result.png' });
    await page.getByRole('button', { name: 'Valid disc' }).click();
    await check('Valid');
    await page.locator('summary').click();
    await page.waitForTimeout(2500);
    await page.locator('summary').click();
    await page.getByRole('button', { name: 'Due soon' }).click();
    await check('Expiring soon');
    await page.getByRole('button', { name: 'Unreadable' }).click();
    await check('Needs review');
    await page.screenshot({ path: 'media/discscan-monitoring-dashboard.png' });
    await page.locator('#file').setInputFiles('dist/samples/valid.png');
    await check('Valid');
    assert.equal(await page.locator('#records tr:first-child td:nth-child(2)').innerText(), 'Upload');
    assert.equal(await page.locator('#total').innerText(), '5');
    await page.getByRole('button', { name: 'Clear history' }).click();
    assert.equal(await page.locator('#total').innerText(), '0');
    await context.close();
    await video.saveAs('.recording/discscan-demo.webm');
    console.log('Passed Chromium integration: synthetic camera, OCR, upload, all four statuses, history and reset.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
