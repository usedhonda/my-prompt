document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('free-text-form');
  const textarea = document.getElementById('inputText');
  const status = document.getElementById('status');
  const sendBtn = document.getElementById('sendBtn');
  const macroBtns = document.querySelectorAll('.macro-btn');
  const popupTitle = document.getElementById('popup-title');
  const openSettings = document.getElementById('open-settings');
  const templateSelect = document.getElementById('template-select');
  const insertTemplateBtn = document.getElementById('insert-template');
  let templateMap = {};

  // タイトルを動的に書き換え
  chrome.storage.local.get('popupServiceNames', (data) => {
    const names = data.popupServiceNames || [];
    if (names.length > 0) {
      popupTitle.textContent = `${names.join(', ')} に以下のプロンプトを送信します`;
    } else {
      popupTitle.textContent = 'プロンプトを送信します';
    }
  });

  // 設定画面リンク
  openSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }, () => {
      window.close();
    });
  });

  // マクロ挿入ボタン（{pageUrl}のみ）
  macroBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const macro = btn.getAttribute('data-macro');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      textarea.value = value.slice(0, start) + macro + value.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + macro.length;
      textarea.focus();
      sendBtn.disabled = textarea.value.trim().length === 0;
    });
  });

  // 入力値が空の時は送信ボタンを無効化
  const updateSendBtn = () => {
    sendBtn.disabled = textarea.value.trim().length === 0;
  };
  textarea.addEventListener('input', updateSendBtn);
  updateSendBtn();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawText = textarea.value;
    status.textContent = '送信中...';
    sendBtn.disabled = true;
    chrome.storage.local.get(['popupPageUrl', 'popupSelectionText'], (data) => {
      const pageUrl = data.popupPageUrl || '';
      const selectionText = data.popupSelectionText || '';
      // textarea内の{pageUrl}や{selectionText}を置換
      let inputText = rawText.replace(/\{pageUrl\}/g, pageUrl).replace(/\{selectionText\}/g, selectionText);
      // backgroundにメッセージ送信
      chrome.runtime.sendMessage({
        type: 'SEND_FREE_TEXT',
        inputText,
        pageUrl
      }, (response) => {
        if (response && response.success) {
          status.textContent = '送信しました！';
          textarea.value = '';
          setTimeout(() => { window.close(); }, 400);
        } else {
          status.textContent = '送信に失敗しました。';
          sendBtn.disabled = false;
        }
      });
    });
  });

  // フォーカスが外れたら自動で閉じる
  window.addEventListener('blur', () => {
    setTimeout(() => {
      window.close();
    }, 100);
  });

  // テンプレート一覧を取得してドロップダウンに反映
  chrome.storage.sync.get(['prompts', 'titles'], (data) => {
    let prompts = data.prompts || {};
    let titles = data.titles || {};
    if (Object.keys(prompts).length === 0 || Object.keys(titles).length === 0) {
      chrome.runtime.sendMessage({ type: 'GET_DEFAULT_PROMPTS' }, (defaults) => {
        prompts = defaults.prompts || {};
        titles = defaults.titles || {};
        populateTemplates(prompts, titles);
      });
    } else {
      populateTemplates(prompts, titles);
    }
  });

  function populateTemplates(prompts, titles) {
    Object.entries(prompts).forEach(([key, value]) => {
      if (key === 'free-text' || key === 'free-text-selection') return;
      const option = document.createElement('option');
      option.value = key;
      option.textContent = titles[key] || key;
      templateMap[key] = value;
      templateSelect.appendChild(option);
    });
  }

  // 挿入ボタンで選択テンプレート内容をテキストエリアに挿入
  templateSelect.addEventListener('change', () => {
    const key = templateSelect.value;
    if (key && templateMap[key]) {
      textarea.value = templateMap[key];
      textarea.focus();
      sendBtn.disabled = textarea.value.trim().length === 0;
    }
  });
}); 