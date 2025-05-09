document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('free-text-form');
  const textarea = document.getElementById('inputText');
  const status = document.getElementById('status');
  const sendBtn = document.getElementById('sendBtn');
  const macroBtns = document.querySelectorAll('.macro-btn');

  // マクロ挿入ボタン
  macroBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const macro = btn.getAttribute('data-macro');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      textarea.value = value.slice(0, start) + macro + value.slice(end);
      // カーソルをマクロの後ろに移動
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
    // chrome.storage.localからpageUrlを取得
    chrome.storage.local.get('popupPageUrl', (data) => {
      const pageUrl = data.popupPageUrl || '';
      // textarea内の{pageUrl}や{inputText}を置換
      const inputText = rawText.replace(/\{pageUrl\}/g, pageUrl).replace(/\{inputText\}/g, rawText);
      console.log('送信内容:', inputText); // デバッグ用
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
}); 