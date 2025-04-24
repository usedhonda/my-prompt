// options.js

// 利用可能な変数の定義
const AVAILABLE_VARIABLES = {
  pageUrl: '現在のページのURL',
  selectionText: '選択したテキスト（選択時のみ）'
};

// デフォルトの設定
const DEFAULT_SETTINGS = {
  services: {
    chat: true,      // ChatGPTはデフォルトで有効
    gemini: false,
    grok: false,
    perplexity: false,
    manus: false
  },
  prompts: {
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
  }
};

// 初期表示：保存済み設定をチェックボックスに反映
document.addEventListener('DOMContentLoaded', () => {
  // 利用可能な変数の説明を表示
  const variablesContainer = document.getElementById('available-variables');
  if (variablesContainer) {
    Object.entries(AVAILABLE_VARIABLES).forEach(([variable, description]) => {
      const p = document.createElement('p');
      p.innerHTML = `<code>{${variable}}</code> - ${description}`;
      variablesContainer.appendChild(p);
    });
  }

  // サービスの設定を読み込む
  chrome.storage.sync.get(['services', 'prompts'], (result) => {
    // デフォルト設定とマージ
    const settings = {
      services: { ...DEFAULT_SETTINGS.services, ...result.services },
      prompts: { ...DEFAULT_SETTINGS.prompts, ...result.prompts }
    };

    // サービスのチェックボックスを設定し、changeイベントでトグル処理
    document.querySelectorAll('.service-card input[type="checkbox"]').forEach(checkbox => {
      const service = checkbox.value;
      checkbox.checked = settings.services[service];
      
      // カードの状態を更新
      const card = checkbox.closest('.service-card');
      if (checkbox.checked) {
        card.classList.add('active');
        card.classList.add('saved');
      }

      // 状態が変わったときに処理（エラー時は警告のみ）
      checkbox.addEventListener('change', (e) => {
        const newState = e.target.checked;
        const otherChecked = Array.from(document.querySelectorAll('.service-card input[type="checkbox"]'))
          .filter(cb => cb !== checkbox && cb.checked);
        if (!newState && otherChecked.length === 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          checkbox.checked = true;
          showWarningToast('少なくとも1つのサービスを選択してください');
          return;
        }
        handleCheckboxChange(checkbox, newState);
      });
    });

    // プロンプトテンプレートを設定
    Object.entries(settings.prompts).forEach(([key, value]) => {
      const textarea = document.getElementById(`${key}-prompt`);
      if (textarea) {
        textarea.value = value;
        textarea.addEventListener('input', () => {
          settings.prompts[key] = textarea.value;
          saveSettings(settings);
        });
      }
    });

    // 初期設定を保存
    saveSettings(settings);
  });

  // サービスカードのクリックイベント（カードクリックでチェックボックスをクリック）
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.toggle')) return;
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.click();
    });
  });

  // リセットボタンのイベントリスナー
  document.getElementById('reset').addEventListener('click', resetOptions);
});

// チェックボックスの変更を処理
function handleCheckboxChange(checkbox, newState) {
  // UIの保存アニメーションを開始
  const card = checkbox.closest('.service-card');
  card.classList.add('saving');
  // カードの状態を更新
  if (newState) {
    card.classList.add('active');
  } else {
    card.classList.remove('active');
    card.classList.remove('saved');
  }
  // 現在のサービス設定を収集して保存
  const services = {};
  document.querySelectorAll('.service-card input[type="checkbox"]').forEach(cb => {
    services[cb.value] = cb.checked;
  });
  chrome.storage.sync.set({ services }, () => {
    // 保存完了時の処理
    if (newState) {
      setTimeout(() => {
        card.classList.add('saved');
      }, 300);
    }
    setTimeout(() => {
      card.classList.remove('saving');
    }, 600);
    showToast('設定を保存しました');
  });
}

// 選択されているサービスの数を取得
function getSelectedCount() {
  return document.querySelectorAll('.service-card input[type="checkbox"]:checked').length;
}

// トースト表示用関数
function showToast(message, isWarning = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  // 既存のトーストを非表示
  toast.classList.remove('show');
  toast.classList.remove('warning');
  
  // 新しいトーストを表示
  setTimeout(() => {
    toast.textContent = message;
    toast.classList.add('show');
    if (isWarning) {
      toast.classList.add('warning');
    }
    
    // 一定時間後に非表示
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.remove('warning');
    }, 2000);
  }, 100);
}

// 警告用トースト表示
function showWarningToast(message) {
  showToast(message, true);
}

// 設定の保存
function saveSettings(settings) {
  chrome.storage.sync.set(settings, () => {
    console.log('設定を保存しました:', settings);
  });
}

// デフォルト設定に戻す
function resetOptions() {
  const settings = { ...DEFAULT_SETTINGS };
  
  // サービスをデフォルト設定に戻す
  document.querySelectorAll('.service-card input[type="checkbox"]').forEach(checkbox => {
    const service = checkbox.value;
    checkbox.checked = settings.services[service];
    const card = checkbox.closest('.service-card');
    
    if (checkbox.checked) {
      card.classList.add('active');
      card.classList.add('saved');
    } else {
      card.classList.remove('active');
      card.classList.remove('saved');
    }
  });

  // プロンプトをデフォルトに戻す
  Object.entries(settings.prompts).forEach(([key, value]) => {
    const textarea = document.getElementById(`${key}-prompt`);
    if (textarea) {
      textarea.value = value;
    }
  });

  // 保存
  saveSettings(settings);
  showToast('設定をデフォルトに戻しました');
}