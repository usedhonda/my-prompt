// background.js

// デフォルトのプロンプトテンプレート
const DEFAULT_PROMPTS = {
  'send-url': `以下のURLを読み込んでください。
{pageUrl}

このページの内容を以下の見やすいMarkdown形式でまとめてください。
1. **わかりやすい要約**
2. **特徴的なキーワードの解説**
3. **記事を理解するために知っておくべき補足情報**`,

  'send-text': `以下のURLを読み込んでください。
{pageUrl}

そこに記載されている「{selectionText}」について、一般的な意味合いだけでなく、文章内でどのような意味で使われているか、教えてください。`,

  'translate-text': `次のテキストを翻訳してください。英語なら日本語、日本語なら英語。その他の言語なら日本語に。

翻訳結果を提示する際には、上級レベルの英語学習者にとって役立つ追加情報（語彙のニュアンス、例文、語法のポイントなど）をできるだけ詳しく説明してください。
{selectionText}`
};

// コンテキストメニューの設定
const CONTEXT_MENUS = [
  {
    id: 'send-url',
    title: '送信: ページのURL',
    contexts: ['all']
  },
  {
    id: 'send-text',
    title: '送信: 選択テキスト',
    contexts: ['selection']
  },
  {
    id: 'translate-text',
    title: '翻訳: 選択テキスト',
    contexts: ['selection']
  }
];

// コンテキストメニューの登録
chrome.runtime.onInstalled.addListener(() => {
  // 既存のメニューをクリア
  chrome.contextMenus.removeAll(() => {
    // メニューを順番に作成
    CONTEXT_MENUS.forEach(menu => {
      chrome.contextMenus.create(menu);
    });
  });
});

// メニュークリック処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // 設定を読み込んでプロンプトを処理
  chrome.storage.sync.get(['services', 'prompts'], ({ services, prompts }) => {
    // デフォルト設定
    const defaultServices = {
      chat: true,
      gemini: false,
      grok: false,
      perplexity: false,
      manus: false
    };

    // 設定が存在しない場合はデフォルト値を使用
    const activeServices = services || defaultServices;
    const activePrompts = prompts || DEFAULT_PROMPTS;

    // プロンプトテンプレートを取得
    let promptTemplate = activePrompts[info.menuItemId] || DEFAULT_PROMPTS[info.menuItemId];

    // 変数を置換
    const variables = {
      pageUrl: info.pageUrl || '',
      selectionText: info.selectionText || ''
    };

    Object.keys(variables).forEach(key => {
      promptTemplate = promptTemplate.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
    });

    // 各サービスに対してタブを開く
    Object.entries(activeServices).forEach(([service, isEnabled]) => {
      if (isEnabled) {
        openServiceWindow(service, promptTemplate);
      }
    });
  });
});

// サービスウィンドウを開く関数
function openServiceWindow(service, prompt) {
  const serviceUrls = {
    chat: 'https://chat.openai.com',
    gemini: 'https://gemini.google.com/app',
    grok: 'https://x.com/i/grok',
    perplexity: 'https://www.perplexity.ai',
    manus: 'https://manus.ai'
  };

  const url = serviceUrls[service];
  if (url) {
    chrome.tabs.create({ url: url, active: false }, tab => {
      const onUpdated = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text) => {
              const host = location.host;
              // ChatGPT
              if (host.includes('chat.openai.com') || host.includes('chatgpt.com')) {
                const waitPrompt = () => {
                  const pm = document.getElementById('prompt-textarea');
                  if (!pm) return setTimeout(waitPrompt, 600);
                  pm.focus(); pm.innerHTML = '';
                  document.execCommand('insertText', false, text);
                  pm.dispatchEvent(new InputEvent('input', { bubbles: true }));
                  waitSend();
                };
                const waitSend = () => {
                  const btn = document.getElementById('composer-submit-button') ||
                              document.querySelector('[data-testid="send-button"]');
                  if (!btn) return setTimeout(waitSend, 600);
                  btn.click();
                };
                setTimeout(waitPrompt, 1000);
              }
              // Gemini
              else if (host.includes('gemini.google.com')) {
                const waitGemini = () => {
                  // より具体的なセレクタを使用
                  const inputEl = document.querySelector('[role="textbox"], textarea');
                  const sendBtn = document.querySelector('button[aria-label*="送信"], button[aria-label*="Send"]');
                  
                  if (!inputEl || !sendBtn) return setTimeout(waitGemini, 600);

                  // テキストの入力
                  inputEl.focus();
                  if (inputEl.tagName.toLowerCase() === 'textarea') {
                    inputEl.value = text;
                  } else {
                    inputEl.textContent = text;
                  }
                  inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
                  
                  // 少し待ってから送信（入力が確実に反映されるのを待つ）
                  setTimeout(() => {
                    if (!sendBtn.disabled) {
                      sendBtn.click();
                    }
                  }, 500);
                };
                setTimeout(waitGemini, 800);
              }
              // Grok
              else if (host.includes('x.com')) {
                const waitGrok = () => {
                  // 日本語と英語の両方に対応したセレクタ
                  const inputEl = document.querySelector('textarea[placeholder*="どんなことでも"], textarea[placeholder*="Ask"]');
                  const sendBtn = document.querySelector('button[aria-label*="Grokに聞く"], button[aria-label*="Ask Grok"]');
                  
                  if (!inputEl || !sendBtn) return setTimeout(waitGrok, 600);
                  
                  // テキストの入力
                  inputEl.focus();
                  inputEl.value = text;
                  inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
                  
                  // 送信ボタンが有効な場合のみクリック
                  if (!sendBtn.disabled) {
                    sendBtn.click();
                  }
                };
                setTimeout(waitGrok, 800);
              }
              // Perplexity
              else if (host.includes('perplexity.ai')) {
                const encodedPayload = encodeURIComponent(text);
                if (encodedPayload.length > 1500) {
                  // 長すぎる場合は切り詰める
                  const truncatedPayload = text.slice(0, 700) + '...';
                  location.href = 'https://www.perplexity.ai/search?q=' + encodeURIComponent(truncatedPayload);
                } else {
                  location.href = 'https://www.perplexity.ai/search?q=' + encodedPayload;
                }
              }
              // Manus
              else if (host.includes('manus.ai')) {
                const waitManus = () => {
                  const inputEl = document.querySelector('textarea[placeholder*="Manus にタスクを依頼"]');
                  const sendBtn = document.querySelector('button svg[viewBox="0 0 16 16"]').closest('button');
                  
                  if (!inputEl || !sendBtn) return setTimeout(waitManus, 600);
                  
                  // テキストの入力
                  inputEl.focus();
                  inputEl.value = text;
                  inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
                  
                  // 送信ボタンが有効な場合のみクリック
                  if (!sendBtn.disabled) {
                    sendBtn.click();
                  }
                };
                setTimeout(waitManus, 800);
              }
            },
            args: [prompt]
          });
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  }
}