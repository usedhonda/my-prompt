// サービス関連の定数
export const SERVICES = {
  CHAT: 'chat',
  GEMINI: 'gemini',
  GROK: 'grok',
  PERPLEXITY: 'perplexity',
  MANUS: 'manus'
};

// サービスのURLマッピング
export const SERVICE_URLS = {
  [SERVICES.CHAT]: 'https://chatgpt.com/?model=gpt-4o',
  [SERVICES.GEMINI]: 'https://gemini.google.com/app',
  [SERVICES.GROK]: 'https://x.com/i/grok',
  [SERVICES.PERPLEXITY]: 'https://www.perplexity.ai/?q={text}',
  [SERVICES.MANUS]: 'https://manus.im'
};

// サービスのデフォルト設定
export const DEFAULT_SERVICES = {
  [SERVICES.CHAT]: true,
  [SERVICES.GEMINI]: false,
  [SERVICES.GROK]: false,
  [SERVICES.PERPLEXITY]: false,
  [SERVICES.MANUS]: false
};

// サービスのセレクタ
// isContentEditable: 入力要素の種類を指定
// - true: contentEditable要素（innerHTML + InputEventで入力）
// - false: 通常のtextarea要素（value + input/changeイベントで入力）
export const SERVICE_SELECTORS = {
  [SERVICES.CHAT]: {
    input: '#prompt-textarea',
    submit: 'button#composer-submit-button[data-testid="send-button"]',
    isContentEditable: true  // contentEditable div要素を使用
  },
  [SERVICES.GEMINI]: {
    input: 'div[role="textbox"][aria-label="ここにプロンプトを入力してください"]',
    submit: 'button[aria-label*="送信"], button[aria-label*="Send"]',
    isContentEditable: true  // contentEditable div要素を使用
  },
  [SERVICES.GROK]: {
    input: 'textarea[placeholder*="どんなことでもお尋ねください"]',
    submit: 'button[aria-label*="Grokに聞く"], button[aria-label*="Ask Grok"]',
    isContentEditable: false  // 通常のtextarea要素を使用
  },
  [SERVICES.MANUS]: {
    input: 'textarea[placeholder*="Manus にタスクを依頼"]',
    submit: 'button.whitespace-nowrap.text-sm.font-medium:not([disabled])',
    isContentEditable: false
  }
};

// 利用可能な変数の定義
export const AVAILABLE_VARIABLES = {
  pageUrl: '現在のページのURL',
  selectionText: '選択したテキスト（選択時のみ）'
};

// コンテキストメニューの設定
export const CONTEXT_MENUS = [
  {
    id: 'free-text',
    title: '自由テキスト送信',
    contexts: ['page', 'frame', 'link', 'image', 'video', 'audio']
  },
  {
    id: 'send-url',
    title: 'URLのみ送信',
    contexts: ['selection']
  },
  {
    id: 'send-text',
    title: '選択テキスト送信',
    contexts: ['selection']
  },
  {
    id: 'translate-text',
    title: '翻訳',
    contexts: ['selection']
  }
];

// デフォルトのプロンプトテンプレート
export const DEFAULT_PROMPTS = {
  'free-text': `{inputText}`,
  'send-url': `以下のURLを読み込んでください。\n{pageUrl}\n\n以下の見やすいMarkdown形式でまとめてください。\n1. **わかりやすい要約**\n2. **特徴的なキーワードの解説**\n3. **記事を理解するために知っておくべき補足情報**`,
  'send-text': `以下のURLを読み込んでください。\n{pageUrl}\n\nそこに記載されている「{selectionText}」について、一般的な意味合いだけでなく、文章内でどのような意味で使われているか、教えてください。`,
  'translate-text': `次のテキストを翻訳してください。英語なら日本語、日本語なら英語。その他の言語なら日本語に。\n\n翻訳結果を提示する際には、上級レベルの英語学習者にとって役立つ追加情報（語彙のニュアンス、例文、語法のポイントなど）をできるだけ詳しく説明してください。\n{selectionText}`
};

// デフォルトの設定
export const DEFAULT_SETTINGS = {
  services: DEFAULT_SERVICES,
  titles: {
    'free-text': '自由テキスト送信',
    'send-url': 'URLのみ送信',
    'send-text': '選択テキスト送信',
    'translate-text': '翻訳'
  },
  prompts: DEFAULT_PROMPTS
}; 