const $ = (id) => document.getElementById(id);

function setStatus(text, isError = false) {
  const el = $('status');
  el.textContent = text;
  el.style.color = isError ? '#b00020' : '#0b6b0b';
}

function load() {
  chrome.storage.local.get(['username', 'password'], (res) => {
    $('username').value = res.username || '';
    $('password').value = res.password || '';
    setStatus('Geladen.');
  });
}

function save() {
  const username = $('username').value.trim();
  const password = $('password').value;

  if (!username || !password) {
    setStatus('Bitte Username und Password ausfüllen.', true);
    return;
  }

  chrome.storage.local.set({ username, password }, () => {
    setStatus('Gespeichert.');
  });
}

function clear() {
  chrome.storage.local.remove(['username', 'password'], () => {
    $('username').value = '';
    $('password').value = '';
    setStatus('Gelöscht.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  $('save').addEventListener('click', save);
  $('clear').addEventListener('click', clear);
});
