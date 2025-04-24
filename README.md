# 俺のプロンプト 🚀

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## 📖 概要

選択したテキストや現在のページを各種AIサービスに送信するためのChrome拡張機能です。
シンプルな操作で、複数のAIサービスを同時に活用できます。

## ✨ 主な機能

### 🎯 機能一覧

- 📝 複数のAIサービスに同時にプロンプトを送信可能
- 🖱️ コンテキストメニューから簡単に利用可能
- ⚙️ カスタマイズ可能なプロンプトテンプレート

### 🤖 対応AIサービス

| サービス | ステータス |
|---------|----------|
| ChatGPT | ✅ |
| Google Gemini | ✅ |
| Grok (X.ai) | ✅ |
| Perplexity | ✅ |
| Manus | ✅ |

## 🚀 クイックスタート

### インストール方法

1. このリポジトリをクローンまたはダウンロード
   ```bash
   git clone https://github.com/usedhonda/my-prompt.git
   ```
2. Chromeで `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. クローンしたディレクトリを選択

## 💻 開発環境のセットアップ

### 必要な環境
- Chrome ブラウザ
- テキストエディタ

### プロジェクト構造
```
.
├── 📄 manifest.json      # 拡張機能の設定ファイル
├── 📄 background.js      # バックグラウンドスクリプト
├── 📄 options.html       # オプションページのHTML
├── 📄 options.js        # オプションページのスクリプト
├── 📄 options.css       # オプションページのスタイル
└── 📁 icons/            # 拡張機能のアイコン
```

## 🎮 使用方法

1. ブラウザ上で任意のテキストを選択
2. 右クリックでコンテキストメニューを表示
3. 以下のオプションから選択：
   - 📤 送信: ページのURL
   - 📝 送信: 選択テキスト
   - 🌐 翻訳: 選択テキスト

## ⚙️ カスタマイズ

拡張機能のオプションページで以下の設定が可能：
- 🤖 使用するAIサービスの選択
- �� プロンプトテンプレートのカスタマイズ

## 👩‍💻 開発者向け情報

### プロンプトテンプレート

プロンプトテンプレートでは以下の変数が使用可能：
- `{pageUrl}` - 現在のページのURL
- `{selectionText}` - 選択されたテキスト

### 新しいAIサービスの追加方法

1. `manifest.json` の `host_permissions` に新しいサービスのドメインを追加
2. `background.js` の `serviceUrls` に新しいサービスのURLを追加
3. `background.js` の `openServiceWindow` 関数内にサービス固有の入力処理を実装

## 📜 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 貢献

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ⚠️ 注意事項

- 各AIサービスの利用規約に従って使用してください
- プロンプトの内容は公開される可能性があることを前提に使用してください

---

<div align="center">

Made with ❤️ by usedhonda

</div> 