const messagesContainer = document.getElementById('messagesContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const clearBtn = document.getElementById('clearBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const chatTitle = document.getElementById('chatTitle');
const chatHistoryList = document.getElementById('chatHistoryList');
const noHistory = document.getElementById('noHistory');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

const STORAGE_KEY = 'kawaiiGPT_chats';
const codeStore = {};

const PREVIEW_LANGS = new Set(['html', 'css', 'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'json']);
const RUN_LANGS = new Set(['html', 'css', 'javascript', 'js']);

let conversationHistory = [];
let displayMessages = [];
let isStreaming = false;
let currentMode = 'chat';
let currentChatId = generateId();

marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: null
});

const renderer = new marked.Renderer();
renderer.code = function(token) {
    const code = typeof token === 'object' ? (token.text || '') : token;
    const language = (typeof token === 'object' ? token.lang : arguments[1]) || 'plaintext';
    const lang = (language || 'plaintext').toLowerCase();
    const id = 'code-' + Math.random().toString(36).substr(2, 9);
    codeStore[id] = code;
    const hasPreview = PREVIEW_LANGS.has(lang);
    const previewBtn = hasPreview
        ? `<button class="preview-btn" onclick="togglePreview('${id}')">▶ Preview</button>`
        : '';
    return `
        <div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-lang">${lang}</span>
                <div class="code-actions">
                    ${previewBtn}
                    <button class="copy-btn" onclick="copyCode('${id}')">Copy</button>
                </div>
            </div>
            <pre><code id="${id}" class="language-${lang}">${escapeHtml(code)}</code></pre>
        </div>
    `;
};

marked.use({ renderer });

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function copyCode(id) {
    const el = document.getElementById(id);
    const btn = el.closest('.code-block-wrapper').querySelector('.copy-btn');
    navigator.clipboard.writeText(el.innerText).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
        }, 2000);
    });
}

function buildPreviewContent(lang, code) {
    if (lang === 'html') {
        return code;
    }
    if (lang === 'css') {
        return `<!DOCTYPE html><html><head><style>
            body { font-family: sans-serif; padding: 24px; background: #fff; }
            h1,h2,h3 { margin: 8px 0; } p { margin: 8px 0; }
            ul { padding-left: 20px; }
        </style><style>${code}</style></head><body>
            <h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>
            <p>Paragraph with <a href="#">a link</a> and <strong>bold</strong> text.</p>
            <button>Button</button> <input placeholder="Input field">
            <ul><li>List item one</li><li>List item two</li></ul>
        </body></html>`;
    }
    if (lang === 'javascript' || lang === 'js') {
        return `<!DOCTYPE html><html><head><style>
            body { background:#0f0f13; color:#f0f0f5; font-family:monospace; padding:16px; margin:0; }
            #output { white-space:pre-wrap; font-size:13px; line-height:1.6; }
            .err { color:#f87171; } .log { color:#f0f0f5; } .info { color:#60a5fa; } .warn { color:#fb923c; }
            .label { color:#a78bfa; font-size:11px; margin-bottom:8px; }
        </style></head><body>
            <div class="label">▶ Console Output</div>
            <div id="output"></div>
            <script>
                const _o = document.getElementById('output');
                const _fmt = (a) => a.map(x => typeof x === 'object' ? JSON.stringify(x,null,2) : String(x)).join(' ');
                console.log = (...a) => _o.innerHTML += '<span class="log">'+_fmt(a)+'</span>\\n';
                console.error = (...a) => _o.innerHTML += '<span class="err">'+_fmt(a)+'</span>\\n';
                console.info = (...a) => _o.innerHTML += '<span class="info">'+_fmt(a)+'</span>\\n';
                console.warn = (...a) => _o.innerHTML += '<span class="warn">'+_fmt(a)+'</span>\\n';
                try { ${code} } catch(e) { _o.innerHTML += '<span class="err">Error: '+e.message+'</span>'; }
            <\/script>
        </body></html>`;
    }
    if (lang === 'json') {
        try {
            const parsed = JSON.parse(code);
            const formatted = JSON.stringify(parsed, null, 2)
                .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/"([^"]+)":/g, '<span style="color:#a78bfa">"$1"</span>:')
                .replace(/: "([^"]*)"/g, ': <span style="color:#34d399">"$1"</span>')
                .replace(/: (-?\d+\.?\d*)/g, ': <span style="color:#fb923c">$1</span>')
                .replace(/: (true|false)/g, ': <span style="color:#60a5fa">$1</span>')
                .replace(/: (null)/g, ': <span style="color:#94a3b8">$1</span>');
            return `<!DOCTYPE html><html><head><style>
                body{background:#0f0f13;color:#f0f0f5;font-family:monospace;padding:16px;margin:0;font-size:13px;line-height:1.6;}
                .label{color:#a78bfa;font-size:11px;margin-bottom:8px;}
            </style></head><body><div class="label">▶ JSON Preview</div><pre>${formatted}</pre></body></html>`;
        } catch (e) {
            return `<!DOCTYPE html><html><body style="background:#0f0f13;color:#f87171;padding:16px;font-family:monospace;">Invalid JSON: ${e.message}</body></html>`;
        }
    }
    if (lang === 'python' || lang === 'py') {
        return `<!DOCTYPE html><html><head><style>
            body{background:#0f0f13;color:#f0f0f5;font-family:monospace;padding:16px;margin:0;font-size:13px;line-height:1.6;}
            .note{color:#a78bfa;font-size:11px;padding:8px 12px;border:1px solid rgba(167,139,250,0.3);border-radius:6px;margin-bottom:12px;}
            pre{margin:0;white-space:pre-wrap;}
        </style></head><body>
            <div class="note">⚠ Python runs server-side — showing read-only preview</div>
            <pre>${escapeHtml(code)}</pre>
        </body></html>`;
    }
    if (lang === 'typescript' || lang === 'ts') {
        return `<!DOCTYPE html><html><head><style>
            body{background:#0f0f13;color:#f0f0f5;font-family:monospace;padding:16px;margin:0;font-size:13px;line-height:1.6;}
            .note{color:#60a5fa;font-size:11px;padding:8px 12px;border:1px solid rgba(96,165,250,0.3);border-radius:6px;margin-bottom:12px;}
            pre{margin:0;white-space:pre-wrap;}
        </style></head><body>
            <div class="note">⚠ TypeScript requires compilation — showing read-only preview</div>
            <pre>${escapeHtml(code)}</pre>
        </body></html>`;
    }
    return `<!DOCTYPE html><html><body style="background:#0f0f13;color:#f0f0f5;padding:16px;font-family:monospace;">${escapeHtml(code)}</body></html>`;
}

function togglePreview(id) {
    const codeEl = document.getElementById(id);
    if (!codeEl) return;
    const wrapper = codeEl.closest('.code-block-wrapper');
    const existing = wrapper.querySelector('.preview-panel');
    const btn = wrapper.querySelector('.preview-btn');

    if (existing) {
        const isHidden = existing.style.display === 'none';
        existing.style.display = isHidden ? 'block' : 'none';
        btn.textContent = isHidden ? '▼ Hide' : '▶ Preview';
        return;
    }

    const lang = codeEl.className.replace('language-', '').toLowerCase();
    const code = codeStore[id] || codeEl.innerText;
    const content = buildPreviewContent(lang, code);

    const panel = document.createElement('div');
    panel.className = 'preview-panel';

    const panelHeader = document.createElement('div');
    panelHeader.className = 'preview-panel-header';
    panelHeader.innerHTML = `
        <span class="preview-panel-title">Preview · ${lang.toUpperCase()}</span>
        <button class="preview-close-btn" onclick="togglePreview('${id}')">✕ Close</button>
    `;

    const iframe = document.createElement('iframe');
    iframe.className = 'preview-iframe';
    iframe.sandbox = 'allow-scripts';
    iframe.srcdoc = content;

    panel.appendChild(panelHeader);
    panel.appendChild(iframe);
    wrapper.appendChild(panel);

    btn.textContent = '▼ Hide';
}

function renderMarkdown(text) {
    return marked.parse(text);
}

function highlightCodeBlocks(container) {
    container.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
    });
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

function getChats() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveChats(chats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function saveCurrentChat() {
    if (conversationHistory.length === 0) return;
    const chats = getChats();
    const title = chatTitle.textContent || 'New Chat';
    const idx = chats.findIndex(c => c.id === currentChatId);
    const chatData = {
        id: currentChatId,
        title,
        timestamp: Date.now(),
        messages: conversationHistory,
        displayMessages
    };
    if (idx >= 0) {
        chats[idx] = chatData;
    } else {
        chats.unshift(chatData);
    }
    saveChats(chats.slice(0, 50));
    renderHistoryList();
}

function renderHistoryList() {
    chatHistoryList.querySelectorAll('.history-item').forEach(el => el.remove());
    const chats = getChats();
    if (chats.length === 0) {
        noHistory.style.display = 'block';
        return;
    }
    noHistory.style.display = 'none';
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item' + (chat.id === currentChatId ? ' active' : '');
        item.innerHTML = `
            <span class="history-item-icon">💬</span>
            <div class="history-item-info">
                <span class="history-item-title">${escapeHtml(chat.title)}</span>
                <span class="history-item-time">${formatTimeAgo(chat.timestamp)}</span>
            </div>
            <button class="history-delete-btn" title="Delete">×</button>
        `;
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('history-delete-btn')) {
                loadChat(chat.id);
            }
        });
        item.querySelector('.history-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        chatHistoryList.appendChild(item);
    });
}

function loadChat(id) {
    const chats = getChats();
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    if (conversationHistory.length > 0 && currentChatId !== id) {
        saveCurrentChat();
    }
    currentChatId = id;
    conversationHistory = chat.messages || [];
    displayMessages = chat.displayMessages || [];
    chatTitle.textContent = chat.title || 'KawaiiGPT';
    messagesContainer.innerHTML = '';
    displayMessages.forEach(msg => {
        addMessage(msg.role, msg.content);
    });
    renderHistoryList();
    scrollToBottom();
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
}

function deleteChat(id) {
    const chats = getChats().filter(c => c.id !== id);
    saveChats(chats);
    if (currentChatId === id) {
        startNewChat();
    } else {
        renderHistoryList();
    }
}

function startNewChat() {
    if (conversationHistory.length > 0) {
        saveCurrentChat();
    }
    currentChatId = generateId();
    conversationHistory = [];
    displayMessages = [];
    clearChatUI();
    renderHistoryList();
}

function hideWelcome() {
    const ws = document.getElementById('welcomeScreen');
    if (ws && ws.parentNode) {
        ws.style.opacity = '0';
        ws.style.transform = 'translateY(-10px)';
        ws.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            if (ws.parentNode) ws.parentNode.removeChild(ws);
        }, 300);
    }
}

function addMessage(role, content) {
    hideWelcome();

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : '✦';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (role === 'bot') {
        bubble.innerHTML = renderMarkdown(content);
        highlightCodeBlocks(bubble);
    } else {
        bubble.textContent = content;
    }

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = formatTime(new Date());

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(meta);
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(contentDiv);

    messagesContainer.appendChild(msgDiv);
    scrollToBottom();

    return { bubble, contentDiv };
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '✦';

    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    indicator.appendChild(avatar);
    indicator.appendChild(dots);
    messagesContainer.appendChild(indicator);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResize() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 160) + 'px';
    sendBtn.disabled = userInput.value.trim() === '' || isStreaming;
}

function getModePrefix() {
    if (currentMode === 'code') {
        return "You are in Code Writer mode. Please provide complete, production-ready code with clear explanations. ";
    }
    return "";
}

async function sendMessage(text) {
    if (!text || isStreaming) return;

    isStreaming = true;
    sendBtn.disabled = true;
    userInput.value = '';
    autoResize();

    const userText = getModePrefix() + text;

    conversationHistory.push({ role: 'user', content: userText });
    displayMessages.push({ role: 'user', content: text });
    addMessage('user', text);
    showTypingIndicator();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory })
        });

        removeTypingIndicator();

        if (!response.ok) throw new Error('Network response was not ok');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        const { bubble, contentDiv } = addMessage('bot', '');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;

            bubble.innerHTML = renderMarkdown(fullText);
            highlightCodeBlocks(bubble);
            scrollToBottom();
        }

        conversationHistory.push({ role: 'assistant', content: fullText });
        displayMessages.push({ role: 'bot', content: fullText });

        if (conversationHistory.length === 2) {
            const title = text.length > 40 ? text.substring(0, 40) + '...' : text;
            chatTitle.textContent = title;
        }

        saveCurrentChat();

    } catch (error) {
        removeTypingIndicator();
        const errMsg = `Sorry, I ran into an error: ${error.message}. Please try again.`;
        addMessage('bot', errMsg);
        displayMessages.push({ role: 'bot', content: errMsg });
    } finally {
        isStreaming = false;
        sendBtn.disabled = userInput.value.trim() === '';
    }
}

function clearChatUI() {
    conversationHistory = [];
    displayMessages = [];
    chatTitle.textContent = 'KawaiiGPT';
    messagesContainer.innerHTML = '';

    const welcome = document.createElement('div');
    welcome.className = 'welcome-screen';
    welcome.id = 'welcomeScreen';
    welcome.innerHTML = `
        <div class="welcome-logo">✦</div>
        <h2>Welcome to KawaiiGPT</h2>
        <p>Your AI chatbot and code writing assistant. Ask me anything or pick a quick prompt to get started!</p>
        <div class="welcome-features">
            <div class="feature-card">
                <span>💬</span>
                <h3>Smart Chat</h3>
                <p>Natural conversation with context memory</p>
            </div>
            <div class="feature-card">
                <span>💻</span>
                <h3>Code Writer</h3>
                <p>Generate clean, commented code in any language</p>
            </div>
            <div class="feature-card">
                <span>🔍</span>
                <h3>Code Review</h3>
                <p>Debug and improve your existing code</p>
            </div>
        </div>
    `;
    messagesContainer.appendChild(welcome);
}

sendBtn.addEventListener('click', () => {
    const text = userInput.value.trim();
    if (text) sendMessage(text);
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = userInput.value.trim();
        if (text) sendMessage(text);
    }
});

userInput.addEventListener('input', autoResize);

newChatBtn.addEventListener('click', () => {
    startNewChat();
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
});

clearBtn.addEventListener('click', startNewChat);

clearHistoryBtn.addEventListener('click', () => {
    saveChats([]);
    currentChatId = generateId();
    conversationHistory = [];
    displayMessages = [];
    clearChatUI();
    renderHistoryList();
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== menuToggle) {
        sidebar.classList.remove('open');
    }
});

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
    });
});

document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        userInput.value = prompt;
        autoResize();
        sendMessage(prompt);
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
});

renderHistoryList();
userInput.focus();
