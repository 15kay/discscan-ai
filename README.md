# DiscScan AI

**Intelligent Vehicle Licence Compliance System**  
STEM2Connect AI Hackathon 2026 · Community Impact

DiscScan AI reads an expiry date from a synthetic South African vehicle licence disc. Open the camera, upload an image, or select a built-in sample. The dashboard shows the recognised date, date-based status, raw OCR text, and session history. The samples contain invented text and are visibly marked as synthetic.

[Public demo](https://discscan-ai.smmakola.chatgpt.site/)

## Run the demo locally

Requires Python 3 and a browser with WebAssembly and Web Worker support.

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Camera capture requires permission and a secure context (HTTPS or localhost). Try all four sample buttons. Sample dates are fixed and classifications change as time passes. The web app includes its OCR runtime and English model.

## How it works

1. Browser camera frames, uploaded images and built-in samples all go through the same Tesseract.js 7.0.0 worker. The pretrained LSTM recognises text in the image.
2. The parser looks for an expiry label (including **VERVALDATUM**) followed by one valid year-first or day-first numeric date on the same or next nonblank line. Conflicting, missing and impossible dates require review.
3. The status uses the current date in Africa/Johannesburg. **Expired** means the expiry date has passed, **Expiring soon** includes the expiry date and the previous 30 days, and **Valid** means more than 30 days remain.
4. The dashboard aggregates completed scans in memory. Refreshing the page clears them. Images and OCR output are processed locally in the browser. The app has no registry integration or remote data store.

## Measured evaluation

40 synthetic images, eight per condition. The benchmark uses Tesseract.js 7.0.0 with the same English model, LSTM mode, sparse-text setting and expiry parser as the browser. The benchmark runs under Node.js and uses a fixed reference date of 26 November 2026.

| Input condition | Correct status | Exact expiry extracted |
| --- | ---: | ---: |
| Clean | 8/8 | 8/8 |
| Tilted (9–14°) | 0/8 | 0/8 |
| Gaussian blur | 3/8 | 3/8 |
| Simulated glare | 0/8 | 0/8 |
| Date occluded | 8/8 | 0/8 |
| **Total** | **19/40 (47.5%)** | **11/40 (27.5%)** |

On the 32 images with a date present, exact expiry extraction was **11/32 (34.4%)**. The eight occluded specimens were expected to return Needs review. Their ground-truth dates were retained only for reporting. These controlled results describe one fictional layout and do not estimate performance on real discs. See [per-image results](benchmark-results.json).

```sh
python3 -m pip install Pillow
npm install --no-save tesseract.js@7.0.0
python3 scripts/generate_samples.py
node --test scripts/expiry.test.mjs
node scripts/benchmark.mjs
```

The generator expects DejaVu Sans fonts in the Debian/Ubuntu font directory. The browser integration test exercised a simulated camera feed, file upload, the four statuses, scan history and clearing history in Chromium. A public deployment smoke test read the expired sample as 2026-10-12.

To rerun the local browser integration and record it, install Playwright and provide a simulated camera feed:

```sh
mkdir -p .recording media
ffmpeg -loop 1 -i dist/samples/expired.png -t 3 -r 15 -pix_fmt yuv420p .recording/camera.y4m
node scripts/browser-demo.cjs
```

The script defaults to `/usr/bin/chromium`. Set `CHROMIUM_BIN` for another installation and install the Playwright FFmpeg asset if prompted. The harness serves local assets through Playwright route fixtures by default. Set `DISCSCAN_TEST_URL` to target a running copy instead.

## Scope and limitations

The prototype expects a user-framed image and detects expiry information from its text. It has no object detector for locating a disc in a wider scene. It does not verify document authenticity, check vehicle records, or make legal compliance determinations. Glare, rotation and blur frequently cause a review result. Next steps are orientation correction, image-quality guidance and a broader synthetic benchmark with multiple layouts.

## AI and attribution

Tesseract.js and Tesseract's pretrained English LSTM model perform OCR. The status rules are deterministic JavaScript. OpenAI Codex assisted with implementation, synthetic test generation, automated testing, documentation and demo media preparation. Vendor notices are in [dist/ocr](dist/ocr).
