// 只负责持久化开关状态，content script 通过 storage.onChanged 自动同步。
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggle') {
        chrome.storage.local.set({ acceleratorEnabled: message.enabled }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            sendResponse({ success: true });
        });

        return true;
    }
    return false;
});