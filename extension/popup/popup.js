const input = document.getElementById('api-key-input');
const saveBtn = document.getElementById('save-btn');
const statusMsg = document.getElementById('status-msg');
const toggleBtn = document.getElementById('toggle-visibility');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
  if (chrome.runtime.lastError) return;
  if (response?.key) {
    input.value = response.key;
    setStatus('active', 'Готово к работе');
  } else {
    setStatus('inactive', 'Введите API ключ');
  }
});

saveBtn.addEventListener('click', () => {
  const key = input.value.trim();
  if (!key) {
    showMsg('Введите ключ', 'error');
    return;
  }
  if (!key.startsWith('AIza')) {
    showMsg('Ключ должен начинаться с AIza...', 'error');
    return;
  }

  saveBtn.disabled = true;
  chrome.runtime.sendMessage({ type: 'SAVE_API_KEY', key }, (response) => {
    saveBtn.disabled = false;
    if (chrome.runtime.lastError) {
      showMsg('Ошибка сохранения', 'error');
      return;
    }
    showMsg('Ключ сохранён!', 'success');
    setStatus('active', 'Готово к работе');
  });
});

toggleBtn.addEventListener('click', () => {
  input.type = input.type === 'password' ? 'text' : 'password';
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

function showMsg(text, type) {
  statusMsg.textContent = text;
  statusMsg.className = `status-msg ${type}`;
  setTimeout(() => { statusMsg.textContent = ''; }, 3000);
}

function setStatus(state, text) {
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = text;
}
