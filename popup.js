const switchEl = document.getElementById('enableSwitch');
const statusTextEl = document.getElementById('statusText');
const acceleratorBaseInputEl = document.getElementById('acceleratorBaseInput');
const saveConfigBtnEl = document.getElementById('saveConfigBtn');
const configTipEl = document.getElementById('configTip');
const workerUrlPreviewEl = document.getElementById('workerUrlPreview');

// 读取当前状态并更新 UI
chrome.storage.local.get(['acceleratorEnabled', 'acceleratorBase'], (result) => {
    const enabled = result.acceleratorEnabled === true;
    switchEl.checked = enabled;
    updateUI(enabled);

    const acceleratorBase = result.acceleratorBase || '';
    acceleratorBaseInputEl.value = acceleratorBase;
    updateAddressPreview(acceleratorBase);
});

// 监听开关变化
switchEl.addEventListener('change', () => {
    const enabled = switchEl.checked;
    updateUI(enabled);

    // 保存状态
    chrome.storage.local.set({ acceleratorEnabled: enabled });

    // 通知 background 状态已变（可选，用于广播）
    chrome.runtime.sendMessage({ type: 'toggle', enabled: enabled });
});

saveConfigBtnEl.addEventListener('click', () => {
    const rawValue = acceleratorBaseInputEl.value;
    const normalized = normalizeAcceleratorBase(rawValue);

    if (rawValue.trim() !== '' && normalized === null) {
        configTipEl.textContent = '地址格式无效，请输入域名或 URL';
        configTipEl.className = 'config-tip error';
        return;
    }

    chrome.storage.local.set({ acceleratorBase: normalized || '' }, () => {
        if (chrome.runtime.lastError) {
            configTipEl.textContent = '保存失败：' + chrome.runtime.lastError.message;
            configTipEl.className = 'config-tip error';
            return;
        }

        acceleratorBaseInputEl.value = normalized || '';
        updateAddressPreview(normalized || '');
        configTipEl.textContent = '已保存';
        configTipEl.className = 'config-tip';
    });
});

acceleratorBaseInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveConfigBtnEl.click();
    }
});

function updateUI(enabled) {
    if (enabled) {
        statusTextEl.textContent = '🟢 加速已开启';
        statusTextEl.className = 'status enabled';
    } else {
        statusTextEl.textContent = '⚪ 已关闭';
        statusTextEl.className = 'status disabled';
    }
}

function normalizeAcceleratorBase(value) {
    const trimmed = value.trim();
    if (trimmed === '') return '';

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(withProtocol);
        if (!url.hostname) return null;
        return url.origin + '/';
    } catch (e) {
        return null;
    }
}

function updateAddressPreview(address) {
    if (!address) {
        workerUrlPreviewEl.textContent = '🌐 当前：未配置';
        return;
    }
    workerUrlPreviewEl.textContent = `🌐 当前：${address}`;
}