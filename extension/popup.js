document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('free-text-form');
  const textarea = document.getElementById('inputText');
  const status = document.getElementById('status');
  const sendBtn = document.getElementById('sendBtn');

  // 入力値が空の時は送信ボタンを無効化
  const updateSendBtn = () => {
    sendBtn.disabled = textarea.value.trim().length === 0;
  };
  textarea.addEventListener('input', updateSendBtn);
  updateSendBtn();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputText = textarea.value.trim();
    if (!inputText) {
      status.textContent = 'テキストを入力してください。';
      return;
    }
    status.textContent = '送信中...';
    sendBtn.disabled = true;
    // 現在のタブのURLを取得
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const pageUrl = tabs[0]?.url || '';
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