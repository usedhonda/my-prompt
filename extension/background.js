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
  chrome.storage.sync.get(['services', 'prompts'], ({ services, prompts }) => {
    const activeServices = services || DEFAULT_SERVICES;
    const activePrompts = prompts || DEFAULT_PROMPTS;

    // free-textの場合はポップアップウィンドウを開く
    if (info.menuItemId === 'free-text') {
      // 有効なサービス名リストを取得
      chrome.storage.sync.get(['services'], ({ services }) => {
        const activeServices = services || DEFAULT_SERVICES;
        const enabledServiceNames = Object.entries(activeServices)
          .filter(([_, isEnabled]) => isEnabled)
          .map(([service]) => {
            switch (service) {
              case SERVICES.CHAT: return 'ChatGPT';
              case SERVICES.GEMINI: return 'Gemini';
              case SERVICES.GROK: return 'Grok';
              case SERVICES.PERPLEXITY: return 'Perplexity';
              case SERVICES.MANUS: return 'Manus';
              default: return service;
            }
          });
        const pageUrl = info.pageUrl || (tab && tab.url) || '';
        chrome.storage.local.set({ popupPageUrl: pageUrl, popupServiceNames: enabledServiceNames }, () => {
          chrome.windows.getCurrent({}, (currentWindow) => {
            const width = 440;
            const height = 620;
            const left = Math.round(currentWindow.left + (currentWindow.width - width) / 2);
            const top = Math.round((currentWindow.height - height) / 2 + currentWindow.top);
            chrome.windows.create({
              url: chrome.runtime.getURL('popup.html'),
              type: 'popup',
              width,
              height,
              left,
              top
            });
          });
        });
      });
      return;
    }

    // 通常のプロンプトテンプレートを取得
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
                
                // Grokの場合は待機時間を延長
                const isGrok = submitSelector.includes('Grok');
                const waitTime = isGrok ? 2000 : 1000;
                
                if (!inputEl) {
                  console.log('Waiting for elements...');
                  return setTimeout(waitForElements, waitTime);
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
                  
                  // 重要: 入力要素の種類によって処理を分岐
                  // - contentEditable=true（ChatGPT, Gemini）: innerHTML + InputEventで入力
                  // - textarea（Grok）: valueプロパティ + input/changeイベントで入力
                  if (isContentEditable) {
                    // contentEditable要素の場合（ChatGPT, Geminiなど）
                    inputEl.innerHTML = `<p>${text}</p>`;
                    const event = new InputEvent('input', {
                      bubbles: true,
                      cancelable: true,
                      inputType: 'insertText',
                      data: text
                    });
                    inputEl.dispatchEvent(event);
                  } else {
                    // 通常のtextarea要素の場合（Grokなど）
                    // valueプロパティでテキストを設定し、input/changeイベントを発火
                    // この処理が必要なサービスでは、SERVICE_SELECTORSのisContentEditableをfalseに設定すること
                    inputEl.value = text;
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  
                  // 入力イベントの発火を確認（要素の種類に応じて確認方法を変更）
                  console.log('Text set, length:', isContentEditable ? inputEl.textContent.length : inputEl.value.length);

                  // テキスト入力後に送信ボタンを探す
                  const buttonWaitTime = isGrok ? 800 : 400;
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
                  }, buttonWaitTime);
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

// ポップアップからのメッセージを受けてAIサービスに送信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_FREE_TEXT') {
    chrome.storage.sync.get(['services', 'prompts'], ({ services, prompts }) => {
      const activeServices = services || DEFAULT_SERVICES;
      const activePrompts = prompts || DEFAULT_PROMPTS;
      let promptTemplate = activePrompts['free-text'] || DEFAULT_PROMPTS['free-text'];
      const variables = {
        pageUrl: message.pageUrl || '',
        inputText: message.inputText || ''
      };
      Object.keys(variables).forEach(key => {
        promptTemplate = promptTemplate.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
      });
      Object.entries(activeServices).forEach(([service, isEnabled]) => {
        if (isEnabled) {
          openServiceWindow(service, promptTemplate);
        }
      });
      sendResponse({ success: true });
    });
    // 非同期レスポンスのためtrueを返す
    return true;
  }
});