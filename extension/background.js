// background.js

import {
  SERVICES,
  SERVICE_URLS,
  SERVICE_SELECTORS,
  DEFAULT_SERVICES,
  DEFAULT_PROMPTS,
  CONTEXT_MENUS
} from './constants.js';

// コンテキストメニューの登録と更新
function updateContextMenus() {
  chrome.storage.sync.get(['titles'], ({ titles }) => {
    // 既存のメニューをクリア
    chrome.contextMenus.removeAll(() => {
      // メニューを順番に作成（タイトルが設定されている場合はそれを使用）
      CONTEXT_MENUS.forEach(menu => {
        const menuTitle = titles && titles[menu.id] ? titles[menu.id] : menu.title;
        chrome.contextMenus.create({
          ...menu,
          title: menuTitle
        });
      });
    });
  });
}

// 拡張機能インストール時にメニューを作成
chrome.runtime.onInstalled.addListener(updateContextMenus);

// ストレージの変更を監視し、タイトルが変更されたらメニューを更新
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.titles) {
    updateContextMenus();
  }
});

// メニュークリック処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // 設定を読み込んでプロンプトを処理
  chrome.storage.sync.get(['services', 'prompts'], ({ services, prompts }) => {
    // 設定が存在しない場合はデフォルト値を使用
    const activeServices = services || DEFAULT_SERVICES;
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
  const url = SERVICE_URLS[service];
  if (url) {
    chrome.tabs.create({ url: url, active: false }, tab => {
      const onUpdated = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          
          // Perplexityの場合は特別な処理
          if (service === SERVICES.PERPLEXITY) {
            const encodedPayload = encodeURIComponent(prompt);
            const finalUrl = encodedPayload.length > 1500 
              ? `${SERVICE_URLS[SERVICES.PERPLEXITY].replace('{text}', encodeURIComponent(prompt.slice(0, 700) + '...'))}`
              : `${SERVICE_URLS[SERVICES.PERPLEXITY].replace('{text}', encodedPayload)}`;
            
            chrome.tabs.update(tab.id, { url: finalUrl });
            return;
          }

          // サービスのセレクタ情報を取得
          const selector = SERVICE_SELECTORS[service];
          if (!selector) return;

          // プロンプト注入スクリプトを実行
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text, inputSelector, submitSelector, isContentEditable) => {
              console.log('Injecting prompt with selectors:', { inputSelector, submitSelector, isContentEditable });
              
              const waitForElements = () => {
                const inputEl = document.querySelector(inputSelector);
                
                console.log('Found elements:', { 
                  input: inputEl ? 'yes' : 'no'
                });
                
                if (!inputEl) {
                  console.log('Waiting for elements...');
                  return setTimeout(waitForElements, 1000);
                }
                
                // テキストの入力準備
                console.log('Preparing input element');
                
                // 初期状態の場合は、クリックしてエディタを有効化
                if (inputEl.getAttribute('data-placeholder') === '質問してみましょう') {
                  console.log('Activating editor');
                  inputEl.click();
                  return setTimeout(waitForElements, 500);
                }
                
                // テキストの入力
                console.log('Focusing input element');
                inputEl.focus();
                
                // 少し待ってからテキストを入力
                setTimeout(() => {
                  console.log('Setting text value');
                  if (isContentEditable) {
                    inputEl.innerHTML = `<p>${text}</p>`;
                    const event = new InputEvent('input', {
                      bubbles: true,
                      cancelable: true,
                      inputType: 'insertText',
                      data: text
                    });
                    inputEl.dispatchEvent(event);
                  }
                  
                  // 入力イベントの発火を確認
                  console.log('Text set, length:', inputEl.textContent.length);

                  // テキスト入力後に送信ボタンを探す（400ms待機）
                  setTimeout(() => {
                    const submitBtn = document.querySelector(submitSelector);
                    console.log('Looking for submit button:', submitBtn ? 'found' : 'not found');
                    
                    if (submitBtn && !submitBtn.disabled) {
                      console.log('Clicking submit button');
                      submitBtn.click();
                    } else if (submitBtn) {
                      console.log('Submit button is disabled');
                    } else {
                      console.log('Submit button not found');
                    }
                  }, 400);
                }, 500);
              };
              
              // 初回実行
              console.log('Starting element wait cycle');
              setTimeout(waitForElements, 1000);
            },
            args: [prompt, selector.input, selector.submit, selector.isContentEditable]
          });
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  }
}