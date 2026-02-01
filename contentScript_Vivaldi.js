function waitForElement(selector, timeout = 30000) {
  return new Promise((resolve, reject) => {
    let interval = 100;
    let totalTime = 0;

    const checker = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(checker);
        resolve(element);
      } else if (totalTime >= timeout) {
        clearInterval(checker);
        reject(new Error(`Element ${selector} not found within ${timeout} ms`));
      }
      totalTime += interval;
    }, interval);
  });
}

function setElementTextForQuill(element, text) {
  let quillEditor = element.querySelector('.ql-editor');
  if (quillEditor) {
    const p = document.createElement('p');
    p.textContent = text;

    quillEditor.innerHTML = '';
    quillEditor.appendChild(p);

    const event = new Event('input', { bubbles: true });
    quillEditor.dispatchEvent(event);
  }
}

function setElementTextForProseMirror(element, text) {
  if (!element) return;

  console.log('Setting text for ProseMirror element:', text);

  // エディタにフォーカスを設定
  element.focus();

  // 既存の内容をクリア
  element.innerHTML = '';

  // 新しいpタグを作成してテキストを追加
  const p = document.createElement('p');
  p.textContent = text;
  element.appendChild(p);

  // 複数のイベントを発火させてReactの状態を更新させる
  const events = [
    new Event('beforeinput', { bubbles: true, cancelable: true }),
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }),
    new Event('change', { bubbles: true }),
    new Event('blur', { bubbles: true }),
    new Event('focus', { bubbles: true })
  ];

  events.forEach(event => {
    element.dispatchEvent(event);
  });

  // テキストの終わりにカーソルを移動
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);

  console.log('ProseMirror text set and events fired');
}

// Claude専用の改善された入力関数
function setElementTextForClaude(element, text) {
  if (!element) return;

  console.log('Claude: Setting text with improved method');

  // エディタにフォーカス
  element.focus();

  // 既存の内容をクリア
  element.innerHTML = '';

  // pタグを作成してテキストを設定
  const p = document.createElement('p');
  p.textContent = text;
  element.appendChild(p);

  // カーソルをテキストの最後に移動
  const range = document.createRange();
  const sel = window.getSelection();
  const textNode = p.firstChild || p;
  
  try {
    if (p.firstChild) {
      range.setStart(textNode, textNode.length);
    } else {
      range.selectNodeContents(p);
    }
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {
    console.log('Range setting error (non-critical):', e);
  }

  // より確実なイベント発火順序
  // 1. beforeinput
  element.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text
  }));

  // 2. input (最も重要)
  element.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text
  }));

  // 3. textInput
  element.dispatchEvent(new InputEvent('textInput', {
    bubbles: true,
    cancelable: true,
    data: text
  }));

  // 4. React用の追加イベント
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  // 5. フォーカスイベント（React状態更新用）
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  setTimeout(() => {
    element.focus();
    element.dispatchEvent(new Event('focus', { bubbles: true }));
  }, 10);

  console.log('Claude: Text set and all events fired');
}

function setElementTextForChatGPTProseMirror(element, text) {
  if (!element) return;

  element.focus();
  
  // まずエディタをクリア
  element.innerHTML = '';
  
  // 選択をリセット
  const selection = window.getSelection();
  selection.removeAllRanges();

  // テキストを1文字ずつ入力する
  let currentText = '';
  const inputDelay = 10;

  function insertCharacter(index) {
    if (index >= text.length) {
      return;
    }

    const char = text[index];
    currentText += char;

    // DOMを更新
    element.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = currentText;
    element.appendChild(p);

    // 選択をテキストの末尾に移動
    const range = document.createRange();
    const textNode = p.firstChild;
    if (textNode) {
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // inputイベントを発火
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: char
    });
    element.dispatchEvent(inputEvent);

    // 次の文字を入力
    setTimeout(() => {
      insertCharacter(index + 1);
    }, inputDelay);
  }

  // 1文字ずつの入力を開始
  insertCharacter(0);

  // 全文字入力後にイベントを発火
  setTimeout(() => {
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    element.focus();
    element.dispatchEvent(new Event('focus', { bubbles: true }));
  }, text.length * inputDelay + 100);
}

function setElementText(element, text) {
  if (!element) return;

  if (element.tagName.toLowerCase() === 'textarea' ||
    element.tagName.toLowerCase() === 'rich-textarea' ||
    element.tagName.toLowerCase() === 'input') {

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(element, text);

    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    });
    element.dispatchEvent(inputEvent);

    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    if (location.href.includes('chat.qwen.ai') || location.href.includes('chat.deepseek.com')) {
      element.style.height = 'auto';
      element.style.height = element.scrollHeight + 'px';
    }
  } else {
    element.textContent = text;
  }
}

// Claude用の改善された送信関数
function sendClaudeMessage(element) {
  console.log('Claude: Attempting to send message...');
  
  // 方法1: すべての可能な送信ボタンセレクタを試す
  const buttonSelectors = [
    'button[aria-label*="送信"]',
    'button[aria-label*="Send Message"]',
    'button[aria-label*="Send message"]',
    'button[aria-label="Send"]',
    'button[type="submit"]',
    // SVGアイコンを含むボタン
    'button svg[viewBox="0 0 24 24"]',
    // 親要素からボタンを探す
    'div.relative button',
    'form button[type="button"]'
  ];

  let sendButton = null;
  
  for (const selector of buttonSelectors) {
    const btn = document.querySelector(selector);
    if (btn && btn.offsetParent !== null) { // 表示されているボタンのみ
      sendButton = btn;
      console.log('Claude: Found button with selector:', selector);
      break;
    }
  }

  // 方法2: ボタンが見つからない場合、フォーム内の最後のボタンを探す
  if (!sendButton) {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const buttons = form.querySelectorAll('button');
      if (buttons.length > 0) {
        // 最後のボタンが送信ボタンである可能性が高い
        sendButton = buttons[buttons.length - 1];
        console.log('Claude: Using last button in form');
        break;
      }
    }
  }

  // 方法3: ボタンをクリック
  if (sendButton) {
    console.log('Claude: Send button found, attempting click');
    
    // disabled属性を一時的に解除
    const wasDisabled = sendButton.disabled;
    sendButton.disabled = false;
    
    // クリックイベントを複数の方法で発火
    setTimeout(() => {
      // 方法A: 直接クリック
      sendButton.click();
      
      // 方法B: マウスイベントをシミュレート
      setTimeout(() => {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        sendButton.dispatchEvent(clickEvent);
      }, 50);
      
      // 方法C: フォールバック - キーボードショートカット
      setTimeout(() => {
        sendKeyboardShortcut(element);
      }, 100);
      
    }, 100);
    
    return true;
  }

  // 方法4: ボタンが見つからない場合はキーボードショートカット
  console.log('Claude: Button not found, using keyboard shortcut');
  sendKeyboardShortcut(element);
  return false;
}

// キーボードショートカットで送信
function sendKeyboardShortcut(element) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Ctrl/Cmd + Enter
  const enterEvent = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    ctrlKey: !isMac,
    metaKey: isMac,
    shiftKey: false
  });
  
  // 複数の要素に発火
  element.dispatchEvent(enterEvent);
  document.dispatchEvent(enterEvent);
  
  // bodyにも発火
  if (document.body) {
    document.body.dispatchEvent(enterEvent);
  }
  
  console.log('Claude: Keyboard shortcut dispatched');
}

function triggerSendAction(siteURL, element) {
  if (siteURL.includes('gemini.google.com')) {
    const keyboardEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      keyCode: 13
    });
    element.dispatchEvent(keyboardEvent);
  }
  else if (siteURL.includes('chat.deepseek.com')) {
    const sendButton = document.querySelector('div._7436101[role="button"][aria-disabled="false"]');
    if (sendButton) sendButton.click();
  }
  else if (siteURL.includes('chat.qwen.ai')) {
    const sendButton = document.querySelector('button.send-button');
    if (sendButton) sendButton.click();
  }
  else if (siteURL.includes('grok.com')) {
    const sendButton = document.querySelector('button[type="submit"]');
    if (sendButton) sendButton.click();
  }
  else if (siteURL.includes('claude.ai')) {
    // Claude専用の改善された送信関数を使用
    sendClaudeMessage(element);
  }
  else if (siteURL.includes('chatgpt.com')) {
    console.log('ChatGPT: Sending message via keyboard shortcut...');
    
    const keyboardEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      keyCode: 13,
      code: "Enter",
      ctrlKey: false,
      shiftKey: false
    });
    
    element.dispatchEvent(keyboardEvent);
    console.log('ChatGPT: Keyboard shortcut dispatched');
  }
  else {
    const keyboardEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      keyCode: 13
    });
    element.dispatchEvent(keyboardEvent);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillPrompt") {
    const prompt = message.prompt;
    (async () => {
      try {
        let selector;
        let elementType = 'default';

        if (location.href.includes('chatgpt.com')) {
          selector = 'div[contenteditable="true"][role="textbox"]';
          if (!document.querySelector(selector)) {
            selector = 'div[contenteditable="true"]';
          }
          elementType = 'chatgpt';
        } else if (location.href.includes('gemini.google.com')) {
          selector = '.ql-container';
          elementType = 'quill';
        } else if (location.href.includes('claude.ai')) {
          // より広範なセレクタで探す
          const selectors = [
            'div[contenteditable="true"]',
            '.ProseMirror',
            'div.ProseMirror[contenteditable="true"]',
            '[role="textbox"][contenteditable="true"]'
          ];
          
          for (const sel of selectors) {
            const elem = document.querySelector(sel);
            if (elem && elem.offsetParent !== null) {
              selector = sel;
              break;
            }
          }
          
          if (!selector) {
            selector = 'div[contenteditable="true"]';
          }
          
          elementType = 'claude';
        } else if (location.href.includes('chat.deepseek.com')) {
          selector = 'textarea[placeholder*="DeepSeek"]';
          elementType = 'textarea';
        } else if (location.href.includes('chat.qwen.ai')) {
          selector = '#chat-input';
          elementType = 'textarea';
        } else if (location.href.includes('grok.com')) {
          selector = 'div.ProseMirror[contenteditable="true"]';
          elementType = 'prosemirror';
        }

        if (selector) {
          console.log('Waiting for element:', selector);
          const element = await waitForElement(selector);
          console.log('Element found:', element);

          if (elementType === 'chatgpt') {
            setElementTextForChatGPTProseMirror(element, prompt);
          } else if (elementType === 'quill') {
            setElementTextForQuill(element, prompt);
          } else if (elementType === 'claude') {
            // Claude用の改善された関数を使用
            setElementTextForClaude(element, prompt);
          } else if (elementType === 'prosemirror') {
            setElementTextForProseMirror(element, prompt);
          } else if (elementType === 'textarea') {
            setElementText(element, prompt);
          } else {
            setElementText(element, prompt);
          }

          // 適切な遅延時間を設定
          let delayTime = 500;
          if (location.href.includes('claude.ai')) {
            delayTime = 800; // Claudeは少し長めに
          } else if (location.href.includes('chatgpt.com')) {
            delayTime = prompt.length * 10 + 500;
          }
          
          console.log('Waiting for', delayTime, 'ms before sending...');
          await delay(delayTime);
          
          console.log('Triggering send action...');
          triggerSendAction(location.href, element);
        }
      } catch (error) {
        console.error('Error populating element with prompt:', error);
      }
    })();
  }
});
