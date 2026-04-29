const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

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

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'summarize-selection' || !info.selectionText) return;

  const apiKey = await getApiKey();

  await ensureContentScript(tab.id);

  if (!apiKey) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_ERROR',
      data: 'API key not set. Click the extension icon and enter your Gemini API key.',
    });
    return;
  }

  await chrome.tabs.sendMessage(tab.id, { type: 'STREAM_START' });

  try {
    await streamSummary(apiKey, info.selectionText, tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'STREAM_END' });
  } catch (error) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_ERROR',
      data: error.message || 'Failed to get summary',
    });
  }
});

async function raceForAvailableModel(apiKey, body) {
  const controllers = MODELS.map(() => new AbortController());

  const checks = MODELS.map(async (model, i) => {
    const url = `${BASE_URL}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controllers[i].signal,
    });

    if (response.status === 400 || response.status === 403) {
      throw new Error('Invalid API key. Please check your key in the extension settings.');
    }

    if (!response.ok) {
      throw new Error(`${model}: ${response.status}`);
    }

    controllers.forEach((c, j) => { if (j !== i) c.abort(); });
    return { model, response };
  });

  return Promise.any(checks);
}

async function readStream(response, tabId) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          await chrome.tabs.sendMessage(tabId, { type: 'STREAM_CHUNK', data: text });
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
}

async function streamSummary(apiKey, text, tabId) {
  const trimmed = text.length > 4000 ? text.slice(0, 4000) : text;
  const prompt = `Summarize concisely in the same language as the text. No intro phrases.\n\n${trimmed}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  });

  let winner;
  try {
    winner = await raceForAvailableModel(apiKey, body);
  } catch (err) {
    if (err instanceof AggregateError) {
      const invalidKey = err.errors.find((e) => e.message?.includes('Invalid API key'));
      if (invalidKey) throw invalidKey;
    }
    if (err.message?.includes('Invalid API key')) throw err;
    throw new Error('Rate limit exceeded. Please wait a minute and try again.');
  }

  await readStream(winner.response, tabId);
}
