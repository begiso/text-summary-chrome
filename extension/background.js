const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-3.1-flash-lite-preview',
];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'summarize-selection',
    title: 'Summarize with AI',
    contexts: ['selection'],
  });
});

async function getApiKey() {
  const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
  return geminiApiKey || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_API_KEY') {
    chrome.storage.local.set({ geminiApiKey: message.key }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (message.type === 'GET_API_KEY') {
    getApiKey().then((key) => sendResponse({ key }));
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'summarize-selection' || !info.selectionText) return;

  const apiKey = await getApiKey();
  if (!apiKey) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_ERROR', data: 'API key not set. Click the extension icon and enter your Gemini API key.' });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_ERROR', data: 'API key not set. Click the extension icon and enter your Gemini API key.' });
    }
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_LOADING' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_LOADING' });
  }

  try {
    const summary = await fetchSummary(apiKey, info.selectionText);
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_SUMMARY', data: summary });
  } catch (error) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_ERROR',
      data: error.message || 'Failed to get summary',
    });
  }
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryAllModels(apiKey, body) {
  const errors = [];

  for (const model of MODELS) {
    const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (response.status === 429 || response.status === 404 || response.status === 503) {
      errors.push(`${model}: ${response.status}`);
      continue;
    }

    if (response.status === 400 || response.status === 403) {
      throw new Error('Invalid API key. Please check your key in the extension settings.');
    }

    if (!response.ok) {
      errors.push(`${model}: ${response.status}`);
      continue;
    }

    const result = await response.json();
    const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      errors.push(`${model}: empty response`);
      continue;
    }

    return candidate.trim();
  }

  return { failed: true, errors };
}

async function fetchSummary(apiKey, text) {
  const prompt = `You are a concise summarization assistant. Provide a clear, brief summary of the following text in the same language as the text. Do not add introductions like "Here is a summary". Just output the key points.\n\nText:\n${text}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await delay(RETRY_DELAY_MS);

    const result = await tryAllModels(apiKey, body);
    if (typeof result === 'string') return result;

    if (attempt === MAX_RETRIES) {
      throw new Error('Rate limit exceeded. Please wait a minute and try again.');
    }
  }
}
