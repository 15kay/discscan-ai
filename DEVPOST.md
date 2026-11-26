# DiscScan AI — Intelligent Vehicle Licence Compliance System

## Elevator pitch

Scan a synthetic South African vehicle licence disc and see its expiry status, recognised text and scan history in one privacy-conscious workspace.

## About the project

**Primary track · Community Impact**

### Inspiration

Vehicle owners and small fleet operators need a quick way to spot upcoming licence-disc renewals. Manually checking dates across vehicles makes it easy to miss one. We built a prototype that turns a disc image into an actionable expiry status.

### What it does

Capture a synthetic disc with the camera, upload a photo, or choose a built-in example. DiscScan AI reads the expiry date and classifies the scan as Valid, Expiring soon, Expired, or Needs review. The dashboard shows each result with the recognised date and keeps a history for the current browser session.

### How we built it

A browser-based Tesseract.js worker uses a pretrained LSTM to read text. JavaScript looks for a labelled expiry date and compares it with the calendar date in South Africa. Synthetic specimens, including intentionally degraded variants, were generated with Python and Pillow. OpenAI Codex assisted with coding, test generation, testing, documentation and demo preparation.

### Challenges and what we learned

Recognising text on a clean sample was easier than reading through tilt, blur or glare. The prototype matched the expected status on **19 of 40 synthetic tests**, including **8 of 8 clean images** and **8 of 8 intentionally occluded images** routed to review. Exact expiry extraction succeeded on **11 of 32 images with a date present**. These results apply to this synthetic set. The browser demonstration uses a simulated camera feed with an invented disc.

### What's next

Add orientation correction and live capture guidance, then evaluate on a wider range of synthetic layouts and lighting conditions. The prototype performs date screening. Authenticity and official records are outside its scope.

## Built with

JavaScript, HTML, CSS, Tesseract.js, WebAssembly, Web Workers, MediaDevices, Canvas, Python, Pillow, Playwright

## Try it out

- Public demonstration: https://discscan-ai.smmakola.chatgpt.site/
- Add the public GitHub URL once the repository is published.
- Add the public or unlisted YouTube or Vimeo URL once the screencast is uploaded.

## Gallery

- discscan-camera-result.png — captured synthetic disc and extracted expiry
- discscan-monitoring-dashboard.png — four completed scan outcomes
