# Text Summary AI

Chrome extension that summarizes any selected text on a webpage using Google Gemini API.

## How it works

1. Select any text on a webpage
2. Right-click and choose **"Сделать саммари с AI"**
3. A side panel appears with a concise summary

The summary is generated in the same language as the selected text.

## Features

- **Context menu integration** — summarize via right-click
- **Side panel UI** — non-blocking, draggable, resizable
- **Multi-model fallback** — tries multiple Gemini models if one is rate-limited
- **Auto-retry** — retries up to 3 times with 5s delay on rate limits
- **Copy to clipboard** — one-click copy of the summary
- **User-provided API key** — stored locally, never sent anywhere except Google's API

## Installation

### From source

1. Clone the repo:
   ```bash
   git clone https://github.com/begiso/text-summary-chrome.git
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **"Load unpacked"** and select the `extension/` folder
5. Click the extension icon and enter your [Gemini API key](https://aistudio.google.com/apikey)

## Getting a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API key"**
4. Copy the key and paste it into the extension popup

The free tier includes 1,500 requests/day — more than enough for personal use.

## Tech stack

- **Manifest V3** — modern Chrome extension standard
- **Gemini API** (gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.0-flash-lite, gemini-2.0-flash)
- **Shadow DOM** — style isolation from host pages
- Vanilla JS, no dependencies

## Project structure

```
extension/
├── manifest.json       # Extension config (MV3)
├── background.js       # Service worker: context menu + Gemini API
├── content.js          # Content script: side panel UI (Shadow DOM)
├── content.css         # Host element styles
├── popup/
│   ├── popup.html      # Popup with API key input
│   ├── popup.js        # Key save/load logic
│   └── popup.css       # Popup styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Privacy

- Your API key is stored in `chrome.storage.local` on your device only
- Selected text is sent directly to Google's Gemini API — no intermediary servers
- No analytics, no tracking, no data collection

## License

MIT
