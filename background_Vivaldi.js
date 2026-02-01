function injectContentScriptAndSendMessage(tabId, prompt) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['contentScript.js']
  }, () => {
    sendMessageToTab(tabId, prompt);
  });
}

function sendMessageToTab(tabId, prompt) {
  chrome.tabs.sendMessage(tabId, {
    action: "fillPrompt",
    prompt: prompt
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const serviceUrls = {
    "GPT": "https://chatgpt.com/",
    "Gemini": "https://gemini.google.com/app",
    "Claude": "https://claude.ai/new",  // 新規チャットをデフォルトに
    "DeepSeek": "https://chat.deepseek.com/",
    "Qwen": "https://chat.qwen.ai/",
    "Grok": "https://grok.com/"
  };

  const urlsToOpen = message.services.map(service => serviceUrls[service]);

  urlsToOpen.forEach(url => {
    chrome.tabs.query({}, tabs => {
      let foundTab = tabs.find(tab => {
        // Claude.aiの場合、/new または /chats で始まるタブを探す
        if (url.includes('claude.ai')) {
          return tab.url && (
            tab.url.startsWith('https://claude.ai/new') ||
            tab.url.startsWith('https://claude.ai/chat')
          );
        }
        return tab.url && new URL(tab.url).origin === new URL(url).origin;
      });

      if (foundTab) {
        // 既存のタブが見つかった場合
        chrome.tabs.update(foundTab.id, {
          active: true
        }, () => {
          chrome.windows.update(foundTab.windowId, {
            focused: true
          }, () => {
            // コンテンツスクリプトが既に読み込まれている可能性があるため、
            // 再度インジェクトしてからメッセージを送信
            injectContentScriptAndSendMessage(foundTab.id, message.prompt);
          });
        });
      } else {
        // 新しいタブを作成
        chrome.tabs.create({
          url: url
        }, newTab => {
          function tabUpdateListener(tabId, changeInfo) {
            if (tabId === newTab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(tabUpdateListener);
              // ページ読み込み完了後、少し待ってからメッセージ送信
              setTimeout(() => {
                sendMessageToTab(newTab.id, message.prompt);
              }, 1000);
            }
          }
          chrome.tabs.onUpdated.addListener(tabUpdateListener);
        });
      }
    });
  });
});
