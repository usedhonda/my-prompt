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
                const submitBtn = document.querySelector(submitSelector);
                
                console.log('Found elements:', { 
                  input: inputEl ? 'yes' : 'no',
                  submit: submitBtn ? 'yes' : 'no'
                });
                
                if (!inputEl || !submitBtn) {
                  console.log('Waiting for elements...');
                  return setTimeout(waitForElements, 600);
                }
                
                // テキストの入力
                console.log('Focusing input element');
                inputEl.focus();
                
                // 少し待ってからテキストを入力
                setTimeout(() => {
                  console.log('Setting text value');
                  if (isContentEditable) {
                    // contenteditable要素の場合
                    inputEl.innerHTML = `<p>${text}</p>`;
                    // 新しいイベントを作成して発火
                    const event = new InputEvent('input', {
                      bubbles: true,
                      cancelable: true,
                      inputType: 'insertText',
                      data: text
                    });
                    inputEl.dispatchEvent(event);
                  } else {
                    // 通常のinput/textarea要素の場合
                    if (inputEl.tagName.toLowerCase() === 'textarea') {
                      inputEl.value = text;
                    } else {
                      inputEl.textContent = text;
                    }
                    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
                  }
                  
                  // さらに少し待ってから送信
                  setTimeout(() => {
                    console.log('Checking submit button');
                    if (!submitBtn.disabled) {
                      console.log('Clicking submit button');
                      submitBtn.click();
                    } else {
                      console.log('Submit button is disabled');
                    }
                  }, 500);
                }, 200);
              };
              
              // 初回実行
              console.log('Starting element wait cycle');
              setTimeout(waitForElements, 800);
            },
            args: [prompt, selector.input, selector.submit, selector.isContentEditable]
          });
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  }
}