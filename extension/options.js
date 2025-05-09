// options.js

import {
  AVAILABLE_VARIABLES,
  DEFAULT_SETTINGS
} from './constants.js';

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
  chrome.storage.sync.get(['services', 'prompts', 'titles'], (result) => {
    // デフォルト設定とマージ
    const settings = {
      services: { ...DEFAULT_SETTINGS.services, ...result.services },
      titles: { ...DEFAULT_SETTINGS.titles, ...result.titles },
      prompts: { ...DEFAULT_SETTINGS.prompts, ...result.prompts }
    };

    // タイトルの設定を読み込む
    Object.entries(settings.titles).forEach(([key, value]) => {
      const titleInput = document.getElementById(`${key}-title`);
      if (titleInput) {
        titleInput.value = value;
        titleInput.addEventListener('input', () => {
          settings.titles[key] = titleInput.value;
          saveSettings(settings);
        });
      }
    });

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

    // free-text用のプロンプト欄も含めて設定
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

// トースト通知を表示
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 警告トーストを表示
function showWarningToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show', 'warning');
  setTimeout(() => {
    toast.classList.remove('show', 'warning');
  }, 3000);
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

  // タイトルをデフォルトに戻す
  Object.entries(settings.titles).forEach(([key, value]) => {
    const titleInput = document.getElementById(`${key}-title`);
    if (titleInput) {
      titleInput.value = value;
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