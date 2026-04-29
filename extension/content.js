(() => {
  const HOST_ID = 'text-summary-ai-host';
  let shadowRoot = null;

  function getOrCreateHost() {
    let host = document.getElementById(HOST_ID);
    if (host) {
      shadowRoot = host.shadowRoot;
      return host;
    }

    host = document.createElement('div');
    host.id = HOST_ID;
    shadowRoot = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    return host;
  }

  function injectStyles() {
    if (shadowRoot.querySelector('style')) return;

    const style = document.createElement('style');
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }

      .panel {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 380px;
        height: 480px;
        min-width: 280px;
        min-height: 200px;
        max-width: calc(100vw - 32px);
        max-height: calc(100vh - 32px);
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
        animation: slideIn 0.25s ease-out;
        overflow: hidden;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      .panel.dragging,
      .panel.resizing {
        animation: none;
        user-select: none;
      }

      .resize-handle {
        position: absolute;
        z-index: 1;
        transition: background 0.15s;
      }

      .resize-handle-bottom {
        bottom: 0; left: 16px; right: 16px; height: 12px;
        cursor: s-resize;
        border-radius: 0 0 8px 8px;
      }

      .resize-handle-left {
        top: 16px; bottom: 16px; left: 0; width: 12px;
        cursor: w-resize;
        border-radius: 8px 0 0 8px;
      }

      .resize-handle-right {
        top: 16px; bottom: 16px; right: 0; width: 12px;
        cursor: e-resize;
        border-radius: 0 8px 8px 0;
      }

      .resize-handle-corner-bl {
        bottom: 0; left: 0; width: 24px; height: 24px;
        cursor: sw-resize;
        border-radius: 0 8px 0 16px;
      }

      .resize-handle-corner-br {
        bottom: 0; right: 0; width: 24px; height: 24px;
        cursor: se-resize;
        border-radius: 8px 0 16px 0;
      }

      .resize-handle:hover {
        background: rgba(99, 102, 241, 0.08);
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #f0f0f0;
        flex-shrink: 0;
        cursor: grab;
      }

      .modal-header:active {
        cursor: grabbing;
      }

      .modal-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        color: #1a1a2e;
      }

      .modal-title-icon {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }

      .close-btn {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: none;
        background: #f5f5f5;
        color: #666;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
        line-height: 1;
      }

      .close-btn:hover {
        background: #e8e8e8;
        color: #333;
      }

      .modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }

      .summary-text {
        font-size: 14px;
        line-height: 1.7;
        color: #333;
        word-break: break-word;
      }

      .summary-text p {
        margin: 0 0 10px 0;
      }

      .summary-text p:last-child {
        margin-bottom: 0;
      }

      .summary-text strong {
        font-weight: 600;
        color: #1a1a2e;
      }

      .summary-text em {
        font-style: italic;
      }

      .summary-text ul, .summary-text ol {
        margin: 6px 0 10px 20px;
        padding: 0;
      }

      .summary-text li {
        margin-bottom: 4px;
      }

      .summary-text code {
        background: #f5f5f5;
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 13px;
        font-family: monospace;
      }

      .stream-cursor {
        display: inline-block;
        width: 2px;
        height: 14px;
        background: #6366f1;
        margin-left: 2px;
        vertical-align: text-bottom;
        animation: blink 0.6s infinite;
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 30px 20px;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e8e8f8;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      .loading-text {
        font-size: 13px;
        color: #888;
      }

      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 24px 20px;
        text-align: center;
      }

      .error-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #fef2f2;
        color: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .error-text {
        font-size: 13px;
        color: #666;
        line-height: 1.5;
      }

      .modal-footer {
        padding: 12px 20px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      .copy-btn {
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        background: #fafafa;
        color: #444;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        font-family: inherit;
      }

      .copy-btn:hover {
        background: #f0f0f0;
        border-color: #ccc;
      }

      .copy-btn.copied {
        background: #f0fdf4;
        border-color: #86efac;
        color: #16a34a;
      }
    `;
    shadowRoot.appendChild(style);
  }

  function makeResizable(panel) {
    function addHandle(cls, onDrag) {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${cls}`;

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = panel.offsetWidth;
        const startH = panel.offsetHeight;
        const startLeft = panel.offsetLeft;

        panel.classList.add('resizing');

        const onMove = (ev) => {
          onDrag(ev, startX, startY, startW, startH, startLeft);
        };
        const onUp = () => {
          panel.classList.remove('resizing');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      panel.appendChild(handle);
    }

    addHandle('resize-handle-bottom', (ev, _sx, sy, _sw, sh) => {
      const newH = Math.max(200, sh + (ev.clientY - sy));
      panel.style.height = newH + 'px';
    });

    addHandle('resize-handle-left', (ev, sx, _sy, sw, _sh, sl) => {
      const dx = sx - ev.clientX;
      const newW = Math.max(280, sw + dx);
      panel.style.width = newW + 'px';
      panel.style.right = 'auto';
      panel.style.left = (sl - dx + (sw - newW)) + 'px';
    });

    addHandle('resize-handle-right', (ev, sx, _sy, sw) => {
      const newW = Math.max(280, sw + (ev.clientX - sx));
      panel.style.width = newW + 'px';
    });

    addHandle('resize-handle-corner-bl', (ev, sx, sy, sw, sh, sl) => {
      const dx = sx - ev.clientX;
      const newW = Math.max(280, sw + dx);
      const newH = Math.max(200, sh + (ev.clientY - sy));
      panel.style.width = newW + 'px';
      panel.style.height = newH + 'px';
      panel.style.right = 'auto';
      panel.style.left = (sl - dx + (sw - newW)) + 'px';
    });

    addHandle('resize-handle-corner-br', (ev, sx, sy, sw, sh) => {
      const newW = Math.max(280, sw + (ev.clientX - sx));
      const newH = Math.max(200, sh + (ev.clientY - sy));
      panel.style.width = newW + 'px';
      panel.style.height = newH + 'px';
    });
  }

  function makeDraggable(panel, handle) {
    let startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.close-btn')) return;
      e.preventDefault();

      const rect = panel.getBoundingClientRect();
      const hostRect = panel.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };

      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left - hostRect.left;
      startTop = rect.top - hostRect.top;

      panel.classList.add('dragging');
      panel.style.right = 'auto';
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        panel.style.left = (startLeft + dx) + 'px';
        panel.style.top = (startTop + dy) + 'px';
      };

      const onUp = () => {
        panel.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function renderPanel(contentHTML) {
    getOrCreateHost();
    injectStyles();

    const existing = shadowRoot.querySelector('.panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('div');
    title.className = 'modal-title';

    const titleIcon = document.createElement('div');
    titleIcon.className = 'modal-title-icon';
    titleIcon.textContent = 'S';

    const titleText = document.createElement('span');
    titleText.textContent = 'Text Summary AI';

    title.appendChild(titleIcon);
    title.appendChild(titleText);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', closeModal);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.appendChild(contentHTML);

    panel.appendChild(header);
    panel.appendChild(body);

    shadowRoot.appendChild(panel);

    makeDraggable(panel, header);
    makeResizable(panel);
    document.addEventListener('keydown', onEscape);

    return { modal: panel, body };
  }

  let streamBuffer = '';
  let streamContainer = null;
  let streamPanel = null;

  function renderMarkdown(text) {
    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const lines = text.split('\n');
    const htmlParts = [];
    let inList = false;
    let listType = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (!line) {
        if (inList) { htmlParts.push(`</${listType}>`); inList = false; }
        continue;
      }

      const ulMatch = line.match(/^[\*\-]\s+(.*)/);
      const olMatch = line.match(/^\d+[\.\)]\s+(.*)/);

      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) htmlParts.push(`</${listType}>`);
          htmlParts.push('<ul>'); inList = true; listType = 'ul';
        }
        htmlParts.push(`<li>${inlineFormat(escapeHtml(ulMatch[1]))}</li>`);
        continue;
      }

      if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) htmlParts.push(`</${listType}>`);
          htmlParts.push('<ol>'); inList = true; listType = 'ol';
        }
        htmlParts.push(`<li>${inlineFormat(escapeHtml(olMatch[1]))}</li>`);
        continue;
      }

      if (inList) { htmlParts.push(`</${listType}>`); inList = false; }
      htmlParts.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
    }

    if (inList) htmlParts.push(`</${listType}>`);
    return htmlParts.join('');
  }

  function inlineFormat(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  function streamStart() {
    streamBuffer = '';
    const container = document.createElement('div');
    container.className = 'summary-text';

    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    container.appendChild(cursor);

    streamContainer = container;
    const { modal } = renderPanel(container);
    streamPanel = modal;
  }

  function streamChunk(text) {
    if (!streamContainer) return;
    streamBuffer += text;
    streamContainer.innerHTML = renderMarkdown(streamBuffer);

    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    streamContainer.appendChild(cursor);

    const body = streamContainer.parentElement;
    if (body) body.scrollTop = body.scrollHeight;
  }

  function streamEnd() {
    if (!streamContainer) return;
    streamContainer.innerHTML = renderMarkdown(streamBuffer);

    const cursorEl = streamContainer.querySelector('.stream-cursor');
    if (cursorEl) cursorEl.remove();

    if (streamPanel) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      const fullText = streamBuffer;
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(fullText);
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch {
          copyBtn.textContent = 'Error';
        }
      });

      footer.appendChild(copyBtn);
      streamPanel.appendChild(footer);
    }

    streamContainer = null;
    streamPanel = null;
  }

  function showError(errorMsg) {
    const container = document.createElement('div');
    container.className = 'error-container';

    const icon = document.createElement('div');
    icon.className = 'error-icon';
    icon.textContent = '!';

    const text = document.createElement('div');
    text.className = 'error-text';
    text.textContent = errorMsg;

    container.appendChild(icon);
    container.appendChild(text);

    renderPanel(container);
  }

  function closeModal() {
    if (!shadowRoot) return;
    const panel = shadowRoot.querySelector('.panel');
    if (panel) panel.remove();
    streamContainer = null;
    streamPanel = null;
    streamBuffer = '';
    document.removeEventListener('keydown', onEscape);
  }

  function onEscape(e) {
    if (e.key === 'Escape') closeModal();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'PING':
        break;
      case 'STREAM_START':
        streamStart();
        break;
      case 'STREAM_CHUNK':
        streamChunk(message.data);
        break;
      case 'STREAM_END':
        streamEnd();
        break;
      case 'SHOW_ERROR':
        showError(message.data);
        break;
    }
    sendResponse({ ok: true });
  });
})();
