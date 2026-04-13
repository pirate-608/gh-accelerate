// 需要加速的域名正则
const TARGET_HOSTS = ['github.com', 'raw.githubusercontent.com', 'gist.github.com'];

let isEnabled = false;
let proxyBase = '';

// 从 storage 读取初始状态
chrome.storage.local.get(['acceleratorEnabled', 'acceleratorBase'], (result) => {
    isEnabled = result.acceleratorEnabled === true;
    proxyBase = normalizeAcceleratorBase(result.acceleratorBase || '');
    console.log('[加速器] 初始状态:', isEnabled ? '开启' : '关闭');
});

// 监听 storage 变化（当 popup 切换开关时）
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.acceleratorEnabled) {
            isEnabled = changes.acceleratorEnabled.newValue === true;
            console.log('[加速器] 状态已更新:', isEnabled ? '开启' : '关闭');
        }
        if (changes.acceleratorBase) {
            proxyBase = normalizeAcceleratorBase(changes.acceleratorBase.newValue || '');
            console.log('[加速器] 地址已更新:', proxyBase || '未配置');
        }
    }
});

// 监听来自 background 的实时通知（可选，和 storage 监听二选一即可）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'stateChanged') {
        isEnabled = message.enabled;
        console.log('[加速器] 收到实时状态:', isEnabled ? '开启' : '关闭');
    }
});

function normalizeAcceleratorBase(value) {
    const trimmed = String(value || '').trim();
    if (trimmed === '') return '';

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(withProtocol);
        if (!url.hostname) return '';
        return url.origin + '/';
    } catch (e) {
        return '';
    }
}

function findAnchorFromTarget(target) {
    let current = target;
    while (current && current.tagName !== 'A') {
        current = current.parentElement;
    }
    if (!current || current.tagName !== 'A') {
        return null;
    }
    return current;
}

function toAcceleratedUrl(anchor) {
    if (!proxyBase) return null;

    const href = anchor.getAttribute('href');
    if (!href) return null;

    let fullUrl;
    try {
        fullUrl = new URL(href, window.location.href);
    } catch (e) {
        return null;
    }

    const hostname = fullUrl.hostname;
    const shouldAccelerate = TARGET_HOSTS.some(host => hostname === host || hostname.endsWith('.' + host));
    if (!shouldAccelerate) return null;

    const originalPath = fullUrl.href.replace(/^https?:\/\//i, '');
    return {
        originalUrl: fullUrl.href,
        acceleratedUrl: proxyBase + originalPath
    };
}

// 劫持点击事件（捕获阶段，优先于页面默认行为）
document.addEventListener('click', (event) => {
    if (!isEnabled) return; // 未开启加速，直接放行

    const anchor = findAnchorFromTarget(event.target);
    if (!anchor) return;

    const result = toAcceleratedUrl(anchor);
    if (!result) return;

    // 阻止原始跳转
    event.preventDefault();
    event.stopPropagation();

    console.log(`[加速器] 拦截跳转: ${result.originalUrl} → ${result.acceleratedUrl}`);
    window.location.href = result.acceleratedUrl;
}, true); // 使用捕获阶段确保优先拦截

// 劫持中键点击（auxclick），并保持在新标签页打开
document.addEventListener('auxclick', (event) => {
    if (!isEnabled) return;
    if (event.button !== 1) return;

    const anchor = findAnchorFromTarget(event.target);
    if (!anchor) return;

    const result = toAcceleratedUrl(anchor);
    if (!result) return;

    event.preventDefault();
    event.stopPropagation();

    console.log(`[加速器] 拦截中键跳转: ${result.originalUrl} → ${result.acceleratedUrl}`);
    window.open(result.acceleratedUrl, '_blank', 'noopener');
}, true);