// ================================================================
// SECTION 1: CONSTANTS & DEFAULT DATA
// ================================================================
const DEFAULT_ADMIN = {
    categories: [
        { id: 'macro_policy', name: 'Macro / Policy', sort: 1, description: 'Fed policy, economic data, rates, and geopolitical events' },
        { id: 'market_technicals', name: 'Market / Technicals', sort: 2, description: 'Index levels, volatility, breadth, sector flows, and technical signals' },
        { id: 'company_earnings', name: 'Company / Earnings', sort: 3, description: 'Earnings reports, insider activity, IPOs, and individual stock catalysts' }
    ],
    topics: [
        { id: 'fed_policy', name: 'Fed Policy & Rate Expectations', category: 'macro_policy', prompt_hint: 'Include CME FedWatch probabilities, next FOMC date, and recent Fed speaker commentary' },
        { id: 'economic_calendar', name: 'Economic Calendar & Data Releases', category: 'macro_policy', prompt_hint: 'List upcoming releases this week with expected vs prior values' },
        { id: 'geopolitical', name: 'Geopolitical Events', category: 'macro_policy', prompt_hint: 'Major geopolitical developments affecting global markets' },
        { id: 'bonds', name: 'Treasury/Bond Market', category: 'macro_policy', prompt_hint: '10Y yield level, yield curve shape, recent auction results' },
        { id: 'sp500_technicals', name: 'S&P 500 Technical Levels', category: 'market_technicals', prompt_hint: 'Current level, key support/resistance, moving averages, recent breakouts or breakdowns' },
        { id: 'vix_sentiment', name: 'VIX / Sentiment Indicators', category: 'market_technicals', prompt_hint: 'VIX level and trend, put/call ratio, AAII sentiment survey, fear/greed index' },
        { id: 'sector_rotation', name: 'Sector Rotation / Fund Flows', category: 'market_technicals', prompt_hint: 'Leading/lagging sectors, notable ETF inflows/outflows, rotation trends' },
        { id: 'market_breadth', name: 'Market Breadth', category: 'market_technicals', prompt_hint: 'Advance/decline ratio, new highs vs new lows, percentage of stocks above 200-day MA' },
        { id: 'earnings_notable', name: 'Notable Earnings (upcoming & recent)', category: 'company_earnings', prompt_hint: 'Major earnings reports this week with consensus estimates and recent notable beats/misses' },
        { id: 'insider_trading', name: 'Insider Trading / Buybacks', category: 'company_earnings', prompt_hint: 'Notable insider buys/sells and major corporate buyback announcements' },
        { id: 'ipo_calendar', name: 'IPO Calendar', category: 'company_earnings', prompt_hint: 'Upcoming IPOs and recent IPO performance' }
    ],
    coverage_types: [
        { id: 'price_moving_news', name: 'Price-moving news', prompt: 'Breaking news likely to move share price >2% for these tickers' },
        { id: 'upcoming_earnings', name: 'Upcoming earnings dates', prompt: 'Next earnings date and consensus EPS estimate' },
        { id: 'analyst_ratings', name: 'Analyst rating changes', prompt: 'Recent analyst upgrades/downgrades and price target changes' },
        { id: 'options_unusual', name: 'Options unusual activity', prompt: 'Notable unusual options activity or volume spikes' }
    ],
    styles: [
        { id: 'concise', name: 'Concise', word_target: 500, max_tokens: 1000, description: 'Bullet-style key points' },
        { id: 'standard', name: 'Standard', word_target: 1000, max_tokens: 2000, description: 'Structured sections' },
        { id: 'deep_dive', name: 'Deep Dive', word_target: 2000, max_tokens: 3000, description: 'Full analysis' }
    ],
    models: [
        { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet', provider: 'anthropic', cost_note: 'Fast, ~$0.05/run' },
        { id: 'claude-opus-4-6', name: 'Opus', provider: 'anthropic', cost_note: 'Deep synthesis, ~$0.30/run' },
        { id: 'gemini-2.5-flash', name: 'Gemini Flash', provider: 'google', cost_note: 'Free tier, fast' }
    ],
    system_prompt: 'You are a senior macro strategist preparing a daily market briefing for a trader focused on S&P 500 and AI infrastructure equities.\n\nRules:\n- Distinguish confirmed data from forecasts/estimates\n- Include probability estimates where available (e.g., CME FedWatch)\n- Prioritize actionable catalysts\n- Note source for key data points\n- Flag anything that changed since yesterday',
    user_prompt_template: 'Generate market briefing for {date}.\nCover the following topics:\n{enabled_topics}\nWatchlist: {watchlist}\nWatchlist coverage: {coverage_types}\nStyle: {briefing_style}\n{custom_instructions}',
    defaults: {
        system_prompt: 'You are a senior macro strategist preparing a daily market briefing for a trader focused on S&P 500 and AI infrastructure equities.\n\nRules:\n- Distinguish confirmed data from forecasts/estimates\n- Include probability estimates where available (e.g., CME FedWatch)\n- Prioritize actionable catalysts\n- Note source for key data points\n- Flag anything that changed since yesterday',
        user_prompt_template: 'Generate market briefing for {date}.\nCover the following topics:\n{enabled_topics}\nWatchlist: {watchlist}\nWatchlist coverage: {coverage_types}\nStyle: {briefing_style}\n{custom_instructions}'
    }
};

const DEFAULT_SETTINGS = {
    default_model: 'claude-sonnet-4-5-20250929',
    enabled_topics: ['fed_policy', 'economic_calendar', 'sp500_technicals', 'vix_sentiment', 'sector_rotation', 'earnings_notable'],
    watchlist: ['NVDA', 'PLTR', 'AMD', 'MRVL', 'VST'],
    enabled_coverage: ['price_moving_news', 'upcoming_earnings'],
    active_style: 'concise',
    custom_instructions: 'Focus on actionable catalysts. Distinguish confirmed data from forecasts. Include probability estimates where available.',
    theme: 'dark'
};

// ================================================================
// SECTION 2: STATE MANAGEMENT & LOCALSTORAGE
// ================================================================
function loadApiKey() { return localStorage.getItem('mb_api_key') || null; }
function saveApiKey(key) { localStorage.setItem('mb_api_key', key); }
function loadGeminiApiKey() { return localStorage.getItem('mb_gemini_api_key') || null; }
function saveGeminiApiKey(key) { localStorage.setItem('mb_gemini_api_key', key); }

function getApiKeyForProvider(provider) {
    if (provider === 'google') return loadGeminiApiKey();
    return loadApiKey();
}

function getProviderForModel(modelId) {
    const admin = loadAdmin();
    if (!admin) return 'anthropic';
    const model = admin.models.find(m => m.id === modelId);
    return model?.provider || 'anthropic';
}

function loadSettings() {
    try { const s = localStorage.getItem('mb_settings'); return s ? JSON.parse(s) : null; }
    catch(e) { console.error('Error loading settings:', e); return null; }
}
function saveSettings(obj) { localStorage.setItem('mb_settings', JSON.stringify(obj)); }

function loadAdmin() {
    try { const a = localStorage.getItem('mb_admin'); return a ? JSON.parse(a) : null; }
    catch(e) { console.error('Error loading admin:', e); return null; }
}
function saveAdmin(obj) { localStorage.setItem('mb_admin', JSON.stringify(obj)); }

function loadHistory() {
    try { const h = localStorage.getItem('mb_history'); return h ? JSON.parse(h) : []; }
    catch(e) { console.error('Error loading history:', e); return []; }
}
function saveHistory(arr) {
    try { localStorage.setItem('mb_history', JSON.stringify(arr)); }
    catch(e) {
        if (e.name === 'QuotaExceededError') {
            showToast('Storage full. Export and clear old history.', 'error');
        }
    }
}

// ================================================================
// SECTION 2B: THEME MANAGEMENT
// ================================================================
function applyTheme(theme) {
    const valid = ['light', 'dark', 'umich'];
    if (!valid.includes(theme)) theme = 'light';
    if (theme === 'light') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    // Update swatch selection UI if rendered
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === theme);
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = (opt.dataset.theme === theme);
    });
}

function initThemeSelector() {
    const container = document.getElementById('theme-options');
    if (!container) return;
    container.addEventListener('click', function(e) {
        const option = e.target.closest('.theme-option');
        if (!option) return;
        const theme = option.dataset.theme;
        applyTheme(theme);
    });
}

// ================================================================
// SECTION 3: INITIALIZATION & FIRST-RUN
// ================================================================
function initializeApp() {
    if (!loadAdmin()) saveAdmin(JSON.parse(JSON.stringify(DEFAULT_ADMIN)));
    if (!loadSettings()) saveSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    if (!localStorage.getItem('mb_history')) saveHistory([]);

    // Migration: add description field to existing categories that lack it
    const admin = loadAdmin();
    let needsSave = false;
    const defaultCatDescs = {
        'macro_policy': 'Fed policy, economic data, rates, and geopolitical events',
        'market_technicals': 'Index levels, volatility, breadth, sector flows, and technical signals',
        'company_earnings': 'Earnings reports, insider activity, IPOs, and individual stock catalysts'
    };
    if (admin && admin.categories) {
        for (const c of admin.categories) {
            if (!c.description && defaultCatDescs[c.id]) {
                c.description = defaultCatDescs[c.id];
                needsSave = true;
            }
        }
    }

    // Migration: add provider field to existing models that lack it
    if (admin && admin.models) {
        for (const m of admin.models) {
            if (!m.provider) {
                if (m.id.startsWith('gemini-')) { m.provider = 'google'; }
                else { m.provider = 'anthropic'; }
                needsSave = true;
            }
        }
        // Add Gemini Flash if no Google models exist
        if (!admin.models.some(m => m.provider === 'google')) {
            admin.models.push({ id: 'gemini-2.5-flash', name: 'Gemini Flash', provider: 'google', cost_note: 'Free tier, fast' });
            needsSave = true;
        }
        if (needsSave) saveAdmin(admin);
    }

    // Apply saved theme immediately
    const settings = loadSettings();
    applyTheme(settings.theme || 'light');
    initThemeSelector();

    switchTab('dashboard');

    if (!loadApiKey() && !loadGeminiApiKey()) {
        document.getElementById('dashboard-banner').innerHTML = '<div class="banner banner-warning"><strong>No API Key</strong> — Go to <a href="#" onclick="switchTab(\'settings\');return false" style="font-weight:700;text-decoration:underline">Settings</a> to add your API key.</div>';
    }
}

// ================================================================
// SECTION 4: TAB NAVIGATION
// ================================================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');

    if (tabName === 'dashboard') renderDashboard();
    else if (tabName === 'history') renderHistory();
    else if (tabName === 'settings') renderSettings();
    else if (tabName === 'admin') renderAdmin();
}

// ================================================================
// SECTION 5: UTILITY FUNCTIONS
// ================================================================
function generateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function formatDate(d) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(iso) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function todayISO() { return new Date().toISOString().split('T')[0]; }

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(fn, ms) {
    let timer;
    return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard', 'success'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        showToast('Copied to clipboard', 'success');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

let modalConfirmCallback = null;
function showConfirm(message, onConfirm) {
    document.getElementById('modal-title').textContent = 'Confirm';
    document.getElementById('modal-body').innerHTML = '<p>' + escapeHtml(message) + '</p>';
    document.getElementById('modal-confirm').style.display = '';
    modalConfirmCallback = onConfirm;
    document.getElementById('modal-overlay').classList.add('visible');
}
function showModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-confirm').style.display = 'none';
    modalConfirmCallback = null;
    document.getElementById('modal-overlay').classList.add('visible');
}
function hideModal() { document.getElementById('modal-overlay').classList.remove('visible'); }
function closeModal(e) { if (e.target === document.getElementById('modal-overlay')) hideModal(); }
function confirmModal() { if (modalConfirmCallback) modalConfirmCallback(); hideModal(); }

function promptFileUpload(accept, callback) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => callback(ev.target.result);
        reader.readAsText(file);
    };
    input.click();
}

function renderMarkdown(text) {
    let html = escapeHtml(text);
    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');
    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Bullet lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    // Clean up
    html = html.replace(/<p><(h[234]|ul|ol|hr|blockquote)/g, '<$1');
    html = html.replace(/<\/(h[234]|ul|ol|hr|blockquote)><\/p>/g, '</$1>');
    html = html.replace(/<p>\s*<\/p>/g, '');
    return html;
}

// ================================================================
// SECTION 6: API INTEGRATION
// ================================================================
async function callAnthropicAPI(systemPrompt, userPrompt, modelId, maxTokens) {
    const apiKey = loadApiKey();
    if (!apiKey) throw new Error('API key not configured');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            system: systemPrompt,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) throw new Error('Rate limited. Please wait a moment and try again.');
        throw new Error(err.error?.message || 'API error: ' + response.status);
    }
    return response.json();
}

function parseAPIResponse(apiResponse) {
    const textParts = [];
    const citations = [];
    if (apiResponse.content) {
        for (const block of apiResponse.content) {
            if (block.type === 'text') textParts.push(block.text);
        }
    }
    return { text: textParts.join('\n'), model: apiResponse.model, usage: apiResponse.usage, citations };
}

async function callGeminiAPI(systemPrompt, userPrompt, modelId, maxTokens) {
    const apiKey = loadGeminiApiKey();
    if (!apiKey) throw new Error('Google Gemini API key not configured');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId + ':generateContent';

    const body = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: maxTokens }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) throw new Error('Rate limited. Please wait a moment and try again.');
        throw new Error(err.error?.message || 'Gemini API error: ' + response.status);
    }
    return response.json();
}

function parseGeminiResponse(apiResponse) {
    const textParts = [];
    if (apiResponse.candidates && apiResponse.candidates.length > 0) {
        const content = apiResponse.candidates[0].content;
        if (content && content.parts) {
            for (const part of content.parts) {
                if (part.text) textParts.push(part.text);
            }
        }
    }
    return { text: textParts.join('\n'), model: '', usage: null, citations: [] };
}

async function callAPI(systemPrompt, userPrompt, modelId, maxTokens) {
    const provider = getProviderForModel(modelId);
    if (provider === 'google') {
        const raw = await callGeminiAPI(systemPrompt, userPrompt, modelId, maxTokens);
        return parseGeminiResponse(raw);
    } else {
        const raw = await callAnthropicAPI(systemPrompt, userPrompt, modelId, maxTokens);
        return parseAPIResponse(raw);
    }
}

async function validateApiKey(key, provider) {
    try {
        if (provider === 'google') {
            const response = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Hi' }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                }
            );
            return response.ok;
        } else {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }]
                })
            });
            return response.ok || response.status === 200;
        }
    } catch(e) { return false; }
}

// ================================================================
// SECTION 7: PROMPT ASSEMBLY
// ================================================================
function assemblePrompt() {
    const admin = loadAdmin();
    const settings = loadSettings();
    if (!admin || !settings) return '';

    let prompt = admin.user_prompt_template;
    prompt = prompt.replace('{date}', formatDate(new Date()));
    prompt = prompt.replace('{enabled_topics}', assembleTopicsBlock(admin, settings));
    prompt = prompt.replace('{watchlist}', settings.watchlist.join(', '));
    prompt = prompt.replace('{coverage_types}', assembleCoverageBlock(admin, settings));
    prompt = prompt.replace('{briefing_style}', assembleStyleBlock(admin, settings));
    prompt = prompt.replace('{custom_instructions}', settings.custom_instructions || '');
    prompt = prompt.replace('{topic_hints}', assembleTopicHints(admin, settings));
    return prompt;
}

function assembleTopicsBlock(admin, settings) {
    const cats = [...admin.categories].sort((a, b) => a.sort - b.sort);
    let lines = [];
    for (const cat of cats) {
        const topics = admin.topics.filter(t => t.category === cat.id && settings.enabled_topics.includes(t.id));
        if (topics.length === 0) continue;
        for (const t of topics) {
            lines.push('- ' + t.name + (t.prompt_hint ? ':\n  ' + t.prompt_hint : ''));
        }
    }
    return lines.join('\n');
}

function assembleCoverageBlock(admin, settings) {
    return admin.coverage_types
        .filter(c => settings.enabled_coverage.includes(c.id))
        .map(c => '- ' + c.name + ': ' + c.prompt)
        .join('\n');
}

function assembleStyleBlock(admin, settings) {
    const style = admin.styles.find(s => s.id === settings.active_style);
    if (!style) return settings.active_style;
    return style.name + ' (~' + style.word_target + ' words) - ' + style.description;
}

function assembleTopicHints(admin, settings) {
    return admin.topics
        .filter(t => settings.enabled_topics.includes(t.id))
        .map(t => t.prompt_hint)
        .join('\n');
}

// ================================================================
// SECTION 8: DASHBOARD LOGIC
// ================================================================
let originalPrompt = '';
let currentBriefing = null;

function renderDashboard() {
    const admin = loadAdmin();
    const settings = loadSettings();
    if (!admin || !settings) return;

    const select = document.getElementById('dashboard-model');
    select.innerHTML = admin.models.map(m =>
        '<option value="' + m.id + '"' + (m.id === settings.default_model ? ' selected' : '') + '>' + escapeHtml(m.name) + ' — ' + escapeHtml(m.cost_note) + '</option>'
    ).join('');

    if (currentBriefing) {
        displayBriefing(currentBriefing);
    }
}

function buildPrompt() {
    const selectedModelId = document.getElementById('dashboard-model').value;
    const provider = getProviderForModel(selectedModelId);
    const key = getApiKeyForProvider(provider);
    if (!key) {
        const providerName = provider === 'google' ? 'Google Gemini' : 'Anthropic';
        showToast(providerName + ' API key required — go to Settings to add your key', 'error');
        return;
    }
    try {
        const prompt = assemblePrompt();
        if (!prompt) {
            showToast('Could not assemble prompt — check Admin settings', 'error');
            return;
        }
        originalPrompt = prompt;
        document.getElementById('prompt-textarea').value = prompt;
        document.getElementById('prompt-section').style.display = '';
        document.getElementById('briefing-section').style.display = 'none';
        document.getElementById('status-section').style.display = 'none';
    } catch (e) {
        console.error('buildPrompt error:', e);
        showToast('Error building prompt: ' + e.message, 'error');
    }
}

function resetPrompt() {
    const prompt = assemblePrompt();
    originalPrompt = prompt;
    document.getElementById('prompt-textarea').value = prompt;
}

async function runBriefing() {
    const admin = loadAdmin();
    const settings = loadSettings();
    if (!admin || !settings) return;

    const selectedModelId = document.getElementById('dashboard-model').value;
    const provider = getProviderForModel(selectedModelId);
    const key = getApiKeyForProvider(provider);
    if (!key) {
        const providerName = provider === 'google' ? 'Google Gemini' : 'Anthropic';
        showToast(providerName + ' API key required — go to Settings to add your key', 'error');
        return;
    }

    const userPrompt = document.getElementById('prompt-textarea').value;
    const isModified = userPrompt !== originalPrompt;
    const selectedModel = admin.models.find(m => m.id === selectedModelId);
    const activeStyle = admin.styles.find(s => s.id === settings.active_style);
    const maxTokens = activeStyle ? activeStyle.max_tokens : 2000;

    document.getElementById('status-section').style.display = '';
    document.getElementById('status-text').textContent = 'Generating briefing...';
    document.getElementById('briefing-section').style.display = 'none';
    document.getElementById('btn-run').disabled = true;

    try {
        const parsed = await callAPI(admin.system_prompt, userPrompt, selectedModelId, maxTokens);

        const record = {
            id: generateId(),
            date: todayISO(),
            model: selectedModelId,
            model_label: selectedModel ? selectedModel.name : selectedModelId,
            prompt_sent: userPrompt,
            prompt_modified: isModified,
            system_prompt_sent: admin.system_prompt,
            response: parsed.text,
            generated_at: new Date().toISOString(),
            style: settings.active_style,
            topics_enabled: [...settings.enabled_topics]
        };

        const history = loadHistory();
        history.unshift(record);
        saveHistory(history);

        currentBriefing = record;
        displayBriefing(record);
        document.getElementById('status-section').style.display = 'none';
        showToast('Briefing generated successfully', 'success');
    } catch (error) {
        document.getElementById('status-text').innerHTML = '<span style="color:#dc2626">Error: ' + escapeHtml(error.message) + '</span>';
        document.querySelector('#status-section .spinner')?.remove();
    } finally {
        document.getElementById('btn-run').disabled = false;
    }
}

function displayBriefing(record) {
    document.getElementById('briefing-section').style.display = '';
    document.getElementById('briefing-date').textContent = formatDate(new Date(record.date + 'T12:00:00')) + ' — Market Briefing';
    document.getElementById('briefing-model').textContent = 'Model: ' + record.model_label;
    document.getElementById('briefing-time').textContent = 'Generated: ' + formatTimestamp(record.generated_at);

    const modFlag = document.getElementById('briefing-modified');
    if (record.prompt_modified) { modFlag.style.display = ''; } else { modFlag.style.display = 'none'; }

    document.getElementById('briefing-content').innerHTML = renderMarkdown(record.response);
}

function viewSentPrompt() {
    if (!currentBriefing) return;
    showModal('Prompt Sent', '<pre>' + escapeHtml(currentBriefing.prompt_sent) + '</pre>');
}

function regenerateBriefing() {
    if (!currentBriefing) return;
    document.getElementById('prompt-textarea').value = currentBriefing.prompt_sent;
    originalPrompt = currentBriefing.prompt_sent;
    document.getElementById('prompt-section').style.display = '';
    runBriefing();
}

function copyBriefing() {
    if (!currentBriefing) return;
    let text = currentBriefing.response;
    if (document.getElementById('chk-snapshot').checked) {
        text += '\n\n' + buildSettingsSnapshotText();
    }
    copyToClipboard(text);
}

function exportBriefingHTML() {
    if (!currentBriefing) return;
    const includeSnapshot = document.getElementById('chk-snapshot').checked;
    const html = buildExportHTML(currentBriefing, includeSnapshot);
    downloadFile('market-briefing-' + currentBriefing.date + '.html', html, 'text/html');
}

function printBriefing() { window.print(); }

function buildSettingsSnapshotText() {
    const admin = loadAdmin();
    const settings = loadSettings();
    if (!admin || !settings) return '';
    const model = admin.models.find(m => m.id === (currentBriefing ? currentBriefing.model : settings.default_model));
    const style = admin.styles.find(s => s.id === (currentBriefing ? currentBriefing.style : settings.active_style));
    const enabledTopicNames = admin.topics.filter(t => settings.enabled_topics.includes(t.id)).map(t => t.name);
    const enabledCovNames = admin.coverage_types.filter(c => settings.enabled_coverage.includes(c.id)).map(c => c.name);

    let text = '--- Settings Snapshot ---\n';
    text += 'Model: ' + (model ? model.name : 'Unknown') + '\n';
    text += 'Style: ' + (style ? style.name + ' (~' + style.word_target + ' words)' : 'Unknown') + '\n';
    text += 'Topics: ' + enabledTopicNames.join(', ') + '\n';
    text += 'Watchlist: ' + settings.watchlist.join(', ') + '\n';
    text += 'Coverage: ' + enabledCovNames.join(', ') + '\n';
    if (settings.custom_instructions) text += 'Custom Instructions: ' + settings.custom_instructions + '\n';
    if (currentBriefing) text += 'Prompt Sent:\n' + currentBriefing.prompt_sent + '\n';
    return text;
}

function buildExportHTML(record, includeSnapshot) {
    let snapshotHtml = '';
    if (includeSnapshot) {
        snapshotHtml = '<details style="margin-top:24px;padding:16px;background:#f9fafb;border:1px solid #e2e5ea;border-radius:6px"><summary style="cursor:pointer;font-weight:600;font-size:14px">Settings Snapshot</summary><pre style="margin-top:12px;white-space:pre-wrap;font-size:13px">' + escapeHtml(buildSettingsSnapshotText()) + '</pre></details>';
    }
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Market Briefing - ${record.date}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1a1a2e;line-height:1.7}h1{font-size:1.3rem;border-bottom:2px solid #e2e5ea;padding-bottom:8px}h2{font-size:1.05rem;margin-top:20px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e5ea;padding-bottom:4px}.meta{color:#666;font-size:0.85rem;margin-bottom:16px}ul{margin:8px 0 12px 20px}li{margin-bottom:4px}hr{border:none;border-top:1px solid #e2e5ea;margin:16px 0}strong{color:#1a1a2e}</style></head><body><h1>Market Briefing — ${formatDate(new Date(record.date + 'T12:00:00'))}</h1><div class="meta">Model: ${escapeHtml(record.model_label)} | Generated: ${formatTimestamp(record.generated_at)}${record.prompt_modified ? ' | <em>Modified from template</em>' : ''}</div>${renderMarkdown(record.response)}${snapshotHtml}</body></html>`;
}

// ================================================================
// SECTION 9: HISTORY LOGIC
// ================================================================
let historyCompareIds = [];
let viewingHistoryEntry = null;

function renderHistory() {
    const history = loadHistory();
    const searchTerm = (document.getElementById('history-search')?.value || '').toLowerCase();
    const listEl = document.getElementById('history-list');
    document.getElementById('history-view').style.display = 'none';
    document.getElementById('history-compare').style.display = 'none';
    historyCompareIds = [];
    document.getElementById('history-compare-row').style.display = 'none';

    const filtered = searchTerm
        ? history.filter(h => h.response.toLowerCase().includes(searchTerm) || h.date.includes(searchTerm) || h.model_label.toLowerCase().includes(searchTerm))
        : history;

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="no-history">' + (searchTerm ? 'No matching briefings found.' : 'No briefings generated yet. Go to Dashboard to create your first briefing.') + '</div>';
        return;
    }

    listEl.innerHTML = '<div class="history-list">' + filtered.map(h => {
        const preview = h.response.substring(0, 80).replace(/[#*\-\n]/g, ' ').trim() + '...';
        const d = new Date(h.date + 'T12:00:00');
        return '<div class="history-item" data-id="' + h.id + '"><input type="checkbox" class="history-compare-cb" data-id="' + h.id + '" onclick="toggleCompare(event)"><span class="history-date">' + formatDateShort(d) + '</span><span class="history-model"><span class="status-dot ' + (h.model_label === 'Opus' ? 'orange' : 'green') + '"></span>' + escapeHtml(h.model_label) + '</span><span class="history-preview">' + escapeHtml(preview) + '</span></div>';
    }).join('') + '</div>';

    listEl.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-compare-cb')) return;
            viewHistoryEntry(item.dataset.id);
        });
    });
}

function toggleCompare(e) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    if (e.target.checked) {
        historyCompareIds.push(id);
        if (historyCompareIds.length > 2) {
            const removeId = historyCompareIds.shift();
            const cb = document.querySelector('.history-compare-cb[data-id="' + removeId + '"]');
            if (cb) cb.checked = false;
        }
    } else {
        historyCompareIds = historyCompareIds.filter(i => i !== id);
    }
    document.getElementById('history-compare-row').style.display = historyCompareIds.length === 2 ? '' : 'none';
}

function viewHistoryEntry(id) {
    const history = loadHistory();
    const entry = history.find(h => h.id === id);
    if (!entry) return;
    viewingHistoryEntry = entry;

    document.querySelector('#tab-history > .card').style.display = 'none';
    document.getElementById('history-view').style.display = '';

    const d = new Date(entry.date + 'T12:00:00');
    document.getElementById('history-briefing-header').innerHTML = '<h3>' + formatDate(d) + ' — Market Briefing</h3><div class="briefing-meta"><span>Model: ' + escapeHtml(entry.model_label) + '</span><span>Generated: ' + formatTimestamp(entry.generated_at) + '</span>' + (entry.prompt_modified ? '<span class="modified-flag">[modified from template]</span>' : '') + '</div>';
    document.getElementById('history-briefing-content').innerHTML = renderMarkdown(entry.response);
}

function viewHistoryPrompt() {
    if (!viewingHistoryEntry) return;
    let body = '<h4>User Prompt</h4><pre>' + escapeHtml(viewingHistoryEntry.prompt_sent) + '</pre>';
    if (viewingHistoryEntry.system_prompt_sent) {
        body += '<h4 style="margin-top:12px">System Prompt</h4><pre>' + escapeHtml(viewingHistoryEntry.system_prompt_sent) + '</pre>';
    }
    showModal('Prompt Sent', body);
}

function compareSelected() {
    if (historyCompareIds.length !== 2) return;
    const history = loadHistory();
    const a = history.find(h => h.id === historyCompareIds[0]);
    const b = history.find(h => h.id === historyCompareIds[1]);
    if (!a || !b) return;

    document.querySelector('#tab-history > .card').style.display = 'none';
    document.getElementById('history-compare').style.display = '';

    const renderSide = (entry) => {
        const d = new Date(entry.date + 'T12:00:00');
        return '<h4>' + formatDate(d) + ' — ' + escapeHtml(entry.model_label) + '</h4>' + renderMarkdown(entry.response);
    };
    document.getElementById('compare-left').innerHTML = renderSide(a);
    document.getElementById('compare-right').innerHTML = renderSide(b);
}

function backToHistoryList() {
    document.querySelector('#tab-history > .card').style.display = '';
    document.getElementById('history-view').style.display = 'none';
    document.getElementById('history-compare').style.display = 'none';
    viewingHistoryEntry = null;
    renderHistory();
}

// ================================================================
// SECTION 10: SETTINGS LOGIC
// ================================================================
let settingsWatchlist = [];

function renderSettings() {
    const admin = loadAdmin();
    const settings = loadSettings();
    if (!admin || !settings) return;

    // API Keys
    const key = loadApiKey();
    const keyInput = document.getElementById('settings-apikey');
    if (key) keyInput.value = key;
    updateApiKeyStatus(!!key, 'apikey-status');

    const geminiKey = loadGeminiApiKey();
    const geminiKeyInput = document.getElementById('settings-gemini-key');
    if (geminiKey) geminiKeyInput.value = geminiKey;
    updateApiKeyStatus(!!geminiKey, 'gemini-key-status');

    // Models
    document.getElementById('settings-models').innerHTML = admin.models.map(m => {
        const providerLabel = (m.provider === 'google') ? 'Google' : 'Anthropic';
        return '<label class="radio-option"><input type="radio" name="settings-model" value="' + m.id + '"' + (m.id === settings.default_model ? ' checked' : '') + '><div class="option-info"><div class="option-label">' + escapeHtml(m.name) + ' <span style="font-size:0.72rem;color:var(--text-faint)">(' + providerLabel + ')</span></div><div class="option-desc">' + escapeHtml(m.cost_note) + '</div></div></label>';
    }).join('');

    // Topics grouped by category
    const cats = [...admin.categories].sort((a, b) => a.sort - b.sort);
    let topicsHtml = '';
    for (const cat of cats) {
        const topics = admin.topics.filter(t => t.category === cat.id);
        if (topics.length === 0) continue;
        topicsHtml += '<div class="topic-group-label">' + escapeHtml(cat.name) + (cat.description ? '<span class="topic-group-desc">' + escapeHtml(cat.description) + '</span>' : '') + '</div><div class="checkbox-group">';
        topicsHtml += topics.map(t =>
            '<label class="checkbox-option"><input type="checkbox" name="settings-topic" value="' + t.id + '"' + (settings.enabled_topics.includes(t.id) ? ' checked' : '') + '><div class="option-info"><div class="option-label">' + escapeHtml(t.name) + '</div></div></label>'
        ).join('');
        topicsHtml += '</div>';
    }
    document.getElementById('settings-topics').innerHTML = topicsHtml;

    // Watchlist
    settingsWatchlist = [...settings.watchlist];
    renderWatchlistTags();

    // Coverage
    document.getElementById('settings-coverage').innerHTML = admin.coverage_types.map(c =>
        '<label class="checkbox-option"><input type="checkbox" name="settings-coverage" value="' + c.id + '"' + (settings.enabled_coverage.includes(c.id) ? ' checked' : '') + '><div class="option-info"><div class="option-label">' + escapeHtml(c.name) + '</div><div class="option-desc">' + escapeHtml(c.prompt) + '</div></div></label>'
    ).join('');

    // Styles
    document.getElementById('settings-styles').innerHTML = admin.styles.map(s =>
        '<label class="radio-option"><input type="radio" name="settings-style" value="' + s.id + '"' + (s.id === settings.active_style ? ' checked' : '') + '><div class="option-info"><div class="option-label">' + escapeHtml(s.name) + ' (~' + s.word_target + ' words)</div><div class="option-desc">' + escapeHtml(s.description) + '</div></div></label>'
    ).join('');

    // Custom Instructions
    document.getElementById('settings-instructions').value = settings.custom_instructions || '';

    // Theme
    applyTheme(settings.theme || 'light');
}

function renderWatchlistTags() {
    const container = document.getElementById('watchlist-tags');
    container.innerHTML = settingsWatchlist.map(t =>
        '<span class="tag">' + escapeHtml(t) + ' <span class="tag-remove" onclick="removeWatchlistTicker(\'' + t + '\')">&times;</span></span>'
    ).join('');
}

function addWatchlistTicker() {
    const input = document.getElementById('watchlist-input');
    const ticker = input.value.trim().toUpperCase();
    if (!ticker || ticker.length > 5 || !/^[A-Z0-9]+$/.test(ticker)) { showToast('Enter a valid ticker (1-5 alphanumeric)', 'error'); return; }
    if (settingsWatchlist.includes(ticker)) { showToast('Ticker already in watchlist', 'error'); return; }
    settingsWatchlist.push(ticker);
    renderWatchlistTags();
    input.value = '';
}

function removeWatchlistTicker(ticker) {
    settingsWatchlist = settingsWatchlist.filter(t => t !== ticker);
    renderWatchlistTags();
}

function updateApiKeyStatus(valid, elementId) {
    const el = document.getElementById(elementId || 'apikey-status');
    if (!el) return;
    if (valid) {
        el.innerHTML = '<span class="status-dot green"></span> Connected';
    } else {
        el.innerHTML = '<span class="status-dot gray"></span> Not Set';
    }
}

function toggleApiKeyVis(inputId) {
    const input = document.getElementById(inputId || 'settings-apikey');
    const btn = input.nextElementSibling;
    if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Hide'; }
    else { input.type = 'password'; btn.textContent = 'Show'; }
}

async function saveAllSettings() {
    const apiKey = document.getElementById('settings-apikey').value.trim();
    if (apiKey) {
        saveApiKey(apiKey);
        const valid = await validateApiKey(apiKey, 'anthropic');
        updateApiKeyStatus(valid, 'apikey-status');
        if (!valid) showToast('Anthropic API key could not be validated. It was saved but may not work.', 'error');
    }

    const geminiKey = document.getElementById('settings-gemini-key').value.trim();
    if (geminiKey) {
        saveGeminiApiKey(geminiKey);
        const valid = await validateApiKey(geminiKey, 'google');
        updateApiKeyStatus(valid, 'gemini-key-status');
        if (!valid) showToast('Gemini API key could not be validated. It was saved but may not work.', 'error');
    }

    if (apiKey || geminiKey) {
        document.getElementById('settings-banner').innerHTML = '';
        document.getElementById('dashboard-banner').innerHTML = '';
    }

    const modelRadio = document.querySelector('input[name="settings-model"]:checked');
    const styleRadio = document.querySelector('input[name="settings-style"]:checked');
    const themeRadio = document.querySelector('input[name="settings-theme"]:checked');
    const enabledTopics = Array.from(document.querySelectorAll('input[name="settings-topic"]:checked')).map(cb => cb.value);
    const enabledCoverage = Array.from(document.querySelectorAll('input[name="settings-coverage"]:checked')).map(cb => cb.value);

    const settings = {
        default_model: modelRadio ? modelRadio.value : 'claude-sonnet-4-5-20250929',
        enabled_topics: enabledTopics,
        watchlist: [...settingsWatchlist],
        enabled_coverage: enabledCoverage,
        active_style: styleRadio ? styleRadio.value : 'concise',
        custom_instructions: document.getElementById('settings-instructions').value,
        theme: themeRadio ? themeRadio.value : 'light'
    };
    saveSettings(settings);
    showToast('Settings saved', 'success');
}

// ================================================================
// SECTION 11: ADMIN LOGIC
// ================================================================
function renderAdmin() {
    renderTopicManagement();
    renderCategoryManagement();
    renderCoverageTypeManagement();
    renderPromptEditor();
    renderStyleManagement();
    renderModelManagement();
}

// --- Inline Edit Helper ---
function toggleInlineEdit(itemId, type) {
    const wrapper = document.getElementById('admin-wrapper-' + itemId);
    if (!wrapper) return;
    const form = wrapper.querySelector('.admin-inline-form');
    const arrow = wrapper.querySelector('.admin-expand-arrow');
    if (form.classList.contains('visible')) {
        form.classList.remove('visible');
        arrow.textContent = '▸';
    } else {
        // Close any other open forms in same list
        wrapper.closest('.admin-section').querySelectorAll('.admin-inline-form.visible').forEach(f => {
            f.classList.remove('visible');
            const a = f.closest('.admin-item-wrapper').querySelector('.admin-expand-arrow');
            if (a) a.textContent = '▸';
        });
        form.classList.add('visible');
        arrow.textContent = '▾';
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function toggleAdminForm(formId) {
    const form = document.getElementById(formId);
    form.classList.toggle('visible');
    if (form.classList.contains('visible')) {
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// --- Topics ---
function renderTopicManagement() {
    const admin = loadAdmin();
    if (!admin) return;

    const filterSelect = document.getElementById('admin-topic-filter');
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">All Categories</option>' + admin.categories.sort((a,b) => a.sort - b.sort).map(c => '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>').join('');
    filterSelect.value = currentFilter || 'all';

    const topics = currentFilter && currentFilter !== 'all'
        ? admin.topics.filter(t => t.category === currentFilter)
        : admin.topics;

    const catOptions = admin.categories.sort((a,b) => a.sort - b.sort).map(c => '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>').join('');

    document.getElementById('admin-topic-list').innerHTML = topics.map(t => {
        const cat = admin.categories.find(c => c.id === t.category);
        return '<div class="admin-item-wrapper" id="admin-wrapper-' + t.id + '">' +
            '<div class="admin-item">' +
                '<div class="admin-item-info">' +
                    '<div class="admin-item-name">' + escapeHtml(t.name) + '</div>' +
                    '<div class="admin-item-meta">Key: ' + escapeHtml(t.id) + (cat ? ' | Category: ' + escapeHtml(cat.name) : '') + '</div>' +
                    (t.prompt_hint ? '<div class="admin-item-hint">' + escapeHtml(t.prompt_hint) + '</div>' : '') +
                '</div>' +
                '<div class="admin-item-actions">' +
                    '<button class="btn btn-icon btn-sm admin-expand-arrow" onclick="toggleInlineEdit(\'' + t.id + '\',\'topic\')" title="Edit">▸</button>' +
                    '<button class="btn btn-icon btn-sm btn-danger" onclick="deleteTopic(\'' + t.id + '\')" title="Delete">🗑</button>' +
                '</div>' +
            '</div>' +
            '<div class="admin-inline-form">' +
                '<div class="field"><label>Category</label><select class="inline-topic-category">' + catOptions.replace('value="' + t.category + '"', 'value="' + t.category + '" selected') + '</select></div>' +
                '<div class="field"><label>Display Name</label><input type="text" class="inline-topic-name" value="' + escapeHtml(t.name) + '"></div>' +
                '<div class="field"><label>Key</label><input type="text" class="inline-topic-key" value="' + escapeHtml(t.id) + '"></div>' +
                '<div class="field"><label>Prompt Hint</label><textarea class="inline-topic-hint" rows="2">' + escapeHtml(t.prompt_hint || '') + '</textarea></div>' +
                '<div class="button-row"><button class="btn btn-primary btn-sm" onclick="saveTopicInline(\'' + t.id + '\')">Save</button><button class="btn btn-sm" onclick="toggleInlineEdit(\'' + t.id + '\')">Cancel</button></div>' +
            '</div>' +
        '</div>';
    }).join('');

    // Update the add-new form's category dropdown
    const addCatSelect = document.getElementById('topic-form-category');
    if (addCatSelect) addCatSelect.innerHTML = catOptions;
}

function autoGenerateKey() {
    const name = document.getElementById('topic-form-name').value;
    document.getElementById('topic-form-key').value = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);
}

function saveTopicInline(originalId) {
    const wrapper = document.getElementById('admin-wrapper-' + originalId);
    if (!wrapper) return;
    const admin = loadAdmin();
    const category = wrapper.querySelector('.inline-topic-category').value;
    const name = wrapper.querySelector('.inline-topic-name').value.trim();
    const key = wrapper.querySelector('.inline-topic-key').value.trim();
    const hint = wrapper.querySelector('.inline-topic-hint').value.trim();

    if (!name || !key) { showToast('Name and key are required', 'error'); return; }

    const idx = admin.topics.findIndex(t => t.id === originalId);
    if (idx !== -1) {
        if (originalId !== key) {
            const settings = loadSettings();
            const si = settings.enabled_topics.indexOf(originalId);
            if (si !== -1) settings.enabled_topics[si] = key;
            saveSettings(settings);
        }
        admin.topics[idx] = { id: key, name, category, prompt_hint: hint };
    }
    saveAdmin(admin);
    renderTopicManagement();
    showToast('Topic saved', 'success');
}

function saveTopic() {
    const admin = loadAdmin();
    const category = document.getElementById('topic-form-category').value;
    const name = document.getElementById('topic-form-name').value.trim();
    const key = document.getElementById('topic-form-key').value.trim();
    const hint = document.getElementById('topic-form-hint').value.trim();

    if (!name || !key) { showToast('Name and key are required', 'error'); return; }
    if (admin.topics.find(t => t.id === key)) { showToast('Topic key already exists', 'error'); return; }
    admin.topics.push({ id: key, name, category, prompt_hint: hint });
    saveAdmin(admin);
    cancelTopicForm();
    renderTopicManagement();
    showToast('Topic saved', 'success');
}

function deleteTopic(id) {
    showConfirm('Delete this topic?', () => {
        const admin = loadAdmin();
        admin.topics = admin.topics.filter(t => t.id !== id);
        saveAdmin(admin);
        const settings = loadSettings();
        settings.enabled_topics = settings.enabled_topics.filter(t => t !== id);
        saveSettings(settings);
        renderTopicManagement();
        showToast('Topic deleted', 'success');
    });
}

function cancelTopicForm() {
    document.getElementById('topic-form').classList.remove('visible');
    document.getElementById('topic-form-name').value = '';
    document.getElementById('topic-form-key').value = '';
    document.getElementById('topic-form-hint').value = '';
    document.getElementById('btn-add-topic').textContent = '+ Add Topic';
}

// --- Categories ---
function renderCategoryManagement() {
    const admin = loadAdmin();
    if (!admin) return;
    document.getElementById('admin-category-list').innerHTML = admin.categories.sort((a,b) => a.sort - b.sort).map(c =>
        '<div class="admin-item-wrapper" id="admin-wrapper-' + c.id + '">' +
            '<div class="admin-item">' +
                '<div class="admin-item-info"><div class="admin-item-name">' + escapeHtml(c.name) + '</div><div class="admin-item-meta">Sort: ' + c.sort + '</div>' + (c.description ? '<div class="admin-item-hint">' + escapeHtml(c.description) + '</div>' : '') + '</div>' +
                '<div class="admin-item-actions">' +
                    '<button class="btn btn-icon btn-sm admin-expand-arrow" onclick="toggleInlineEdit(\'' + c.id + '\',\'category\')" title="Edit">▸</button>' +
                    '<button class="btn btn-icon btn-sm btn-danger" onclick="deleteCategory(\'' + c.id + '\')" title="Delete">🗑</button>' +
                '</div>' +
            '</div>' +
            '<div class="admin-inline-form">' +
                '<div class="input-row"><div class="field"><label>Name</label><input type="text" class="inline-cat-name" value="' + escapeHtml(c.name) + '"></div><div class="field" style="max-width:80px"><label>Sort</label><input type="number" class="inline-cat-sort" value="' + c.sort + '" min="1"></div></div>' +
                '<div class="field"><label>Description</label><input type="text" class="inline-cat-desc" value="' + escapeHtml(c.description || '') + '" placeholder="Short explanation of this category"></div>' +
                '<div class="button-row"><button class="btn btn-primary btn-sm" onclick="saveCategoryInline(\'' + c.id + '\')">Save</button><button class="btn btn-sm" onclick="toggleInlineEdit(\'' + c.id + '\')">Cancel</button></div>' +
            '</div>' +
        '</div>'
    ).join('');
}

function saveCategoryInline(originalId) {
    const wrapper = document.getElementById('admin-wrapper-' + originalId);
    if (!wrapper) return;
    const admin = loadAdmin();
    const name = wrapper.querySelector('.inline-cat-name').value.trim();
    const sort = parseInt(wrapper.querySelector('.inline-cat-sort').value) || 1;
    const description = wrapper.querySelector('.inline-cat-desc').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }

    const idx = admin.categories.findIndex(c => c.id === originalId);
    if (idx !== -1) {
        admin.categories[idx].name = name;
        admin.categories[idx].sort = sort;
        admin.categories[idx].description = description;
    }
    saveAdmin(admin);
    renderCategoryManagement();
    renderTopicManagement();
    showToast('Category saved', 'success');
}

function saveCategory() {
    const admin = loadAdmin();
    const name = document.getElementById('category-form-name').value.trim();
    const sort = parseInt(document.getElementById('category-form-sort').value) || 1;
    const description = document.getElementById('category-form-desc').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    const key = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);

    if (admin.categories.find(c => c.id === key)) { showToast('Category already exists', 'error'); return; }
    admin.categories.push({ id: key, name, sort, description });
    saveAdmin(admin);
    cancelCategoryForm();
    renderCategoryManagement();
    renderTopicManagement();
    showToast('Category saved', 'success');
}

function deleteCategory(id) {
    const admin = loadAdmin();
    const topicsInCat = admin.topics.filter(t => t.category === id);
    if (topicsInCat.length > 0) {
        showToast('Cannot delete — ' + topicsInCat.length + ' topic(s) in this category. Remove or reassign them first.', 'error');
        return;
    }
    showConfirm('Delete this category?', () => {
        admin.categories = admin.categories.filter(c => c.id !== id);
        saveAdmin(admin);
        renderCategoryManagement();
        showToast('Category deleted', 'success');
    });
}

function cancelCategoryForm() {
    document.getElementById('category-form').classList.remove('visible');
    document.getElementById('category-form-name').value = '';
    document.getElementById('category-form-sort').value = '1';
    document.getElementById('category-form-desc').value = '';
}

// --- Coverage Types ---
function renderCoverageTypeManagement() {
    const admin = loadAdmin();
    if (!admin) return;
    document.getElementById('admin-coverage-list').innerHTML = admin.coverage_types.map(c =>
        '<div class="admin-item-wrapper" id="admin-wrapper-' + c.id + '">' +
            '<div class="admin-item">' +
                '<div class="admin-item-info"><div class="admin-item-name">' + escapeHtml(c.name) + '</div><div class="admin-item-hint">' + escapeHtml(c.prompt) + '</div></div>' +
                '<div class="admin-item-actions">' +
                    '<button class="btn btn-icon btn-sm admin-expand-arrow" onclick="toggleInlineEdit(\'' + c.id + '\',\'coverage\')" title="Edit">▸</button>' +
                    '<button class="btn btn-icon btn-sm btn-danger" onclick="deleteCoverageType(\'' + c.id + '\')" title="Delete">🗑</button>' +
                '</div>' +
            '</div>' +
            '<div class="admin-inline-form">' +
                '<div class="field"><label>Name</label><input type="text" class="inline-coverage-name" value="' + escapeHtml(c.name) + '"></div>' +
                '<div class="field"><label>Prompt Instruction</label><textarea class="inline-coverage-prompt" rows="2">' + escapeHtml(c.prompt) + '</textarea></div>' +
                '<div class="button-row"><button class="btn btn-primary btn-sm" onclick="saveCoverageInline(\'' + c.id + '\')">Save</button><button class="btn btn-sm" onclick="toggleInlineEdit(\'' + c.id + '\')">Cancel</button></div>' +
            '</div>' +
        '</div>'
    ).join('');
}

function saveCoverageInline(originalId) {
    const wrapper = document.getElementById('admin-wrapper-' + originalId);
    if (!wrapper) return;
    const admin = loadAdmin();
    const name = wrapper.querySelector('.inline-coverage-name').value.trim();
    const prompt = wrapper.querySelector('.inline-coverage-prompt').value.trim();
    if (!name || !prompt) { showToast('Name and prompt are required', 'error'); return; }

    const idx = admin.coverage_types.findIndex(c => c.id === originalId);
    if (idx !== -1) { admin.coverage_types[idx].name = name; admin.coverage_types[idx].prompt = prompt; }
    saveAdmin(admin);
    renderCoverageTypeManagement();
    showToast('Coverage type saved', 'success');
}

function saveCoverageType() {
    const admin = loadAdmin();
    const name = document.getElementById('coverage-form-name').value.trim();
    const prompt = document.getElementById('coverage-form-prompt').value.trim();
    if (!name || !prompt) { showToast('Name and prompt are required', 'error'); return; }
    const key = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);

    if (admin.coverage_types.find(c => c.id === key)) { showToast('Coverage type already exists', 'error'); return; }
    admin.coverage_types.push({ id: key, name, prompt });
    saveAdmin(admin);
    cancelCoverageForm();
    renderCoverageTypeManagement();
    showToast('Coverage type saved', 'success');
}

function deleteCoverageType(id) {
    showConfirm('Delete this coverage type?', () => {
        const admin = loadAdmin();
        admin.coverage_types = admin.coverage_types.filter(c => c.id !== id);
        saveAdmin(admin);
        const settings = loadSettings();
        settings.enabled_coverage = settings.enabled_coverage.filter(c => c !== id);
        saveSettings(settings);
        renderCoverageTypeManagement();
        showToast('Coverage type deleted', 'success');
    });
}

function cancelCoverageForm() {
    document.getElementById('coverage-form').classList.remove('visible');
    document.getElementById('coverage-form-name').value = '';
    document.getElementById('coverage-form-prompt').value = '';
}

// --- Prompt Editor ---
function renderPromptEditor() {
    const admin = loadAdmin();
    if (!admin) return;
    document.getElementById('admin-system-prompt').value = admin.system_prompt;
    document.getElementById('admin-user-template').value = admin.user_prompt_template;
    document.getElementById('prompt-preview').style.display = 'none';
}

function saveSystemPrompt() {
    const admin = loadAdmin();
    admin.system_prompt = document.getElementById('admin-system-prompt').value;
    saveAdmin(admin);
    showToast('System prompt saved', 'success');
}

function saveUserTemplate() {
    const admin = loadAdmin();
    admin.user_prompt_template = document.getElementById('admin-user-template').value;
    saveAdmin(admin);
    showToast('User prompt template saved', 'success');
}

function resetSystemPrompt() {
    const admin = loadAdmin();
    document.getElementById('admin-system-prompt').value = admin.defaults.system_prompt;
    admin.system_prompt = admin.defaults.system_prompt;
    saveAdmin(admin);
    showToast('System prompt reset to default', 'success');
}

function resetUserTemplate() {
    const admin = loadAdmin();
    document.getElementById('admin-user-template').value = admin.defaults.user_prompt_template;
    admin.user_prompt_template = admin.defaults.user_prompt_template;
    saveAdmin(admin);
    showToast('User prompt template reset to default', 'success');
}

function previewFullPrompt() {
    const preview = document.getElementById('prompt-preview');
    const isVisible = preview.style.display === 'block';
    if (isVisible) { preview.style.display = 'none'; return; }
    const prompt = assemblePrompt();
    preview.textContent = prompt || '(No prompt assembled — check settings and admin configuration)';
    preview.style.display = 'block';
    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// --- Styles ---
function renderStyleManagement() {
    const admin = loadAdmin();
    if (!admin) return;
    document.getElementById('admin-style-list').innerHTML = admin.styles.map(s =>
        '<div class="admin-item-wrapper" id="admin-wrapper-' + s.id + '">' +
            '<div class="admin-item">' +
                '<div class="admin-item-info"><div class="admin-item-name">' + escapeHtml(s.name) + '</div><div class="admin-item-meta">~' + s.word_target + ' words | ' + s.max_tokens + ' max tokens | ' + escapeHtml(s.description) + '</div></div>' +
                '<div class="admin-item-actions">' +
                    '<button class="btn btn-icon btn-sm admin-expand-arrow" onclick="toggleInlineEdit(\'' + s.id + '\',\'style\')" title="Edit">▸</button>' +
                    '<button class="btn btn-icon btn-sm btn-danger" onclick="deleteStyle(\'' + s.id + '\')" title="Delete">🗑</button>' +
                '</div>' +
            '</div>' +
            '<div class="admin-inline-form">' +
                '<div class="input-row"><div class="field"><label>Name</label><input type="text" class="inline-style-name" value="' + escapeHtml(s.name) + '"></div><div class="field" style="max-width:120px"><label>Word Target</label><input type="number" class="inline-style-words" value="' + s.word_target + '"></div><div class="field" style="max-width:120px"><label>Max Tokens</label><input type="number" class="inline-style-tokens" value="' + s.max_tokens + '"></div></div>' +
                '<div class="field"><label>Description</label><input type="text" class="inline-style-desc" value="' + escapeHtml(s.description || '') + '"></div>' +
                '<div class="button-row"><button class="btn btn-primary btn-sm" onclick="saveStyleInline(\'' + s.id + '\')">Save</button><button class="btn btn-sm" onclick="toggleInlineEdit(\'' + s.id + '\')">Cancel</button></div>' +
            '</div>' +
        '</div>'
    ).join('');
}

function saveStyleInline(originalId) {
    const wrapper = document.getElementById('admin-wrapper-' + originalId);
    if (!wrapper) return;
    const admin = loadAdmin();
    const name = wrapper.querySelector('.inline-style-name').value.trim();
    const wordTarget = parseInt(wrapper.querySelector('.inline-style-words').value) || 500;
    const maxTokens = parseInt(wrapper.querySelector('.inline-style-tokens').value) || 1000;
    const description = wrapper.querySelector('.inline-style-desc').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }

    const idx = admin.styles.findIndex(s => s.id === originalId);
    if (idx !== -1) {
        admin.styles[idx].name = name;
        admin.styles[idx].word_target = wordTarget;
        admin.styles[idx].max_tokens = maxTokens;
        admin.styles[idx].description = description;
    }
    saveAdmin(admin);
    renderStyleManagement();
    showToast('Style saved', 'success');
}

function saveStyle() {
    const admin = loadAdmin();
    const name = document.getElementById('style-form-name').value.trim();
    const wordTarget = parseInt(document.getElementById('style-form-words').value) || 500;
    const maxTokens = parseInt(document.getElementById('style-form-tokens').value) || 1000;
    const description = document.getElementById('style-form-desc').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    const key = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);

    if (admin.styles.find(s => s.id === key)) { showToast('Style already exists', 'error'); return; }
    admin.styles.push({ id: key, name, word_target: wordTarget, max_tokens: maxTokens, description });
    saveAdmin(admin);
    cancelStyleForm();
    renderStyleManagement();
    showToast('Style saved', 'success');
}

function deleteStyle(id) {
    showConfirm('Delete this style?', () => {
        const admin = loadAdmin();
        admin.styles = admin.styles.filter(s => s.id !== id);
        saveAdmin(admin);
        const settings = loadSettings();
        if (settings.active_style === id) {
            settings.active_style = admin.styles.length > 0 ? admin.styles[0].id : 'concise';
            saveSettings(settings);
        }
        renderStyleManagement();
        showToast('Style deleted', 'success');
    });
}

function cancelStyleForm() {
    document.getElementById('style-form').classList.remove('visible');
    document.getElementById('style-form-name').value = '';
    document.getElementById('style-form-words').value = '500';
    document.getElementById('style-form-tokens').value = '1000';
    document.getElementById('style-form-desc').value = '';
}

// --- Models ---
function renderModelManagement() {
    const admin = loadAdmin();
    if (!admin) return;
    document.getElementById('admin-model-list').innerHTML = admin.models.map(m => {
        const provider = m.provider || 'anthropic';
        const providerLabel = provider === 'google' ? 'Google' : 'Anthropic';
        return '<div class="admin-item-wrapper" id="admin-wrapper-' + m.id + '">' +
            '<div class="admin-item">' +
                '<div class="admin-item-info"><div class="admin-item-name">' + escapeHtml(m.name) + ' <span style="font-size:0.72rem;color:var(--text-faint);font-weight:400">(' + providerLabel + ')</span></div><div class="admin-item-meta">' + escapeHtml(m.id) + ' | ' + escapeHtml(m.cost_note) + '</div></div>' +
                '<div class="admin-item-actions">' +
                    '<button class="btn btn-icon btn-sm admin-expand-arrow" onclick="toggleInlineEdit(\'' + m.id + '\',\'model\')" title="Edit">▸</button>' +
                    '<button class="btn btn-icon btn-sm btn-danger" onclick="deleteModel(\'' + m.id + '\')" title="Delete">🗑</button>' +
                '</div>' +
            '</div>' +
            '<div class="admin-inline-form">' +
                '<div class="input-row"><div class="field"><label>Provider</label><select class="inline-model-provider"><option value="anthropic"' + (provider === 'anthropic' ? ' selected' : '') + '>Anthropic</option><option value="google"' + (provider === 'google' ? ' selected' : '') + '>Google Gemini</option></select></div><div class="field"><label>API Model ID</label><input type="text" class="inline-model-id" value="' + escapeHtml(m.id) + '"></div></div>' +
                '<div class="input-row"><div class="field"><label>Display Name</label><input type="text" class="inline-model-name" value="' + escapeHtml(m.name) + '"></div><div class="field"><label>Cost Note</label><input type="text" class="inline-model-cost" value="' + escapeHtml(m.cost_note || '') + '"></div></div>' +
                '<div class="button-row"><button class="btn btn-primary btn-sm" onclick="saveModelInline(\'' + m.id + '\')">Save</button><button class="btn btn-sm" onclick="toggleInlineEdit(\'' + m.id + '\')">Cancel</button></div>' +
            '</div>' +
        '</div>';
    }).join('');
}

function saveModelInline(originalId) {
    const wrapper = document.getElementById('admin-wrapper-' + originalId);
    if (!wrapper) return;
    const admin = loadAdmin();
    const apiId = wrapper.querySelector('.inline-model-id').value.trim();
    const name = wrapper.querySelector('.inline-model-name').value.trim();
    const costNote = wrapper.querySelector('.inline-model-cost').value.trim();
    const provider = wrapper.querySelector('.inline-model-provider').value;
    if (!apiId || !name) { showToast('API Model ID and name are required', 'error'); return; }

    const idx = admin.models.findIndex(m => m.id === originalId);
    if (idx !== -1) {
        if (originalId !== apiId) {
            const settings = loadSettings();
            if (settings.default_model === originalId) {
                settings.default_model = apiId;
                saveSettings(settings);
            }
        }
        admin.models[idx] = { id: apiId, name, provider, cost_note: costNote };
    }
    saveAdmin(admin);
    renderModelManagement();
    showToast('Model saved', 'success');
}

function saveModel() {
    const admin = loadAdmin();
    const apiId = document.getElementById('model-form-id').value.trim();
    const name = document.getElementById('model-form-name').value.trim();
    const costNote = document.getElementById('model-form-cost').value.trim();
    const provider = document.getElementById('model-form-provider').value;
    if (!apiId || !name) { showToast('API Model ID and name are required', 'error'); return; }

    if (admin.models.find(m => m.id === apiId)) { showToast('Model ID already exists', 'error'); return; }
    admin.models.push({ id: apiId, name, provider, cost_note: costNote });
    saveAdmin(admin);
    cancelModelForm();
    renderModelManagement();
    showToast('Model saved', 'success');
}

function deleteModel(id) {
    showConfirm('Delete this model?', () => {
        const admin = loadAdmin();
        admin.models = admin.models.filter(m => m.id !== id);
        saveAdmin(admin);
        const settings = loadSettings();
        if (settings.default_model === id) {
            settings.default_model = admin.models.length > 0 ? admin.models[0].id : '';
            saveSettings(settings);
        }
        renderModelManagement();
        showToast('Model deleted', 'success');
    });
}

function cancelModelForm() {
    document.getElementById('model-form').classList.remove('visible');
    document.getElementById('model-form-provider').value = 'anthropic';
    document.getElementById('model-form-id').value = '';
    document.getElementById('model-form-name').value = '';
    document.getElementById('model-form-cost').value = '';
}

// ================================================================
// SECTION 12: EXPORT / IMPORT / DATA MANAGEMENT
// ================================================================
function exportSettings() {
    const data = { mb_settings: loadSettings(), mb_api_key: loadApiKey(), mb_gemini_api_key: loadGeminiApiKey() };
    downloadFile('market-briefing-settings-' + todayISO() + '.json', JSON.stringify(data, null, 2), 'application/json');
    showToast('Settings exported', 'success');
}

function importSettings() {
    promptFileUpload('.json', (content) => {
        try {
            const data = JSON.parse(content);
            if (data.mb_settings) saveSettings(data.mb_settings);
            if (data.mb_api_key) saveApiKey(data.mb_api_key);
            if (data.mb_gemini_api_key) saveGeminiApiKey(data.mb_gemini_api_key);
            renderSettings();
            showToast('Settings imported', 'success');
        } catch(e) { showToast('Invalid file format', 'error'); }
    });
}

function exportHistory() {
    const history = loadHistory();
    downloadFile('market-briefing-history-' + todayISO() + '.json', JSON.stringify(history, null, 2), 'application/json');
    showToast('History exported', 'success');
}

function importHistory() {
    promptFileUpload('.json', (content) => {
        try {
            const imported = JSON.parse(content);
            if (!Array.isArray(imported)) throw new Error('Invalid');
            const existing = loadHistory();
            const existingIds = new Set(existing.map(h => h.id));
            const newEntries = imported.filter(h => h.id && !existingIds.has(h.id));
            const merged = [...existing, ...newEntries].sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
            saveHistory(merged);
            renderHistory();
            showToast('History imported (' + newEntries.length + ' new entries)', 'success');
        } catch(e) { showToast('Invalid file format', 'error'); }
    });
}

function exportEverything() {
    const data = {
        mb_api_key: loadApiKey(),
        mb_gemini_api_key: loadGeminiApiKey(),
        mb_settings: loadSettings(),
        mb_admin: loadAdmin(),
        mb_history: loadHistory()
    };
    downloadFile('market-briefing-backup-' + todayISO() + '.json', JSON.stringify(data, null, 2), 'application/json');
    showToast('Full backup exported', 'success');
}

function importEverything() {
    promptFileUpload('.json', (content) => {
        try {
            const data = JSON.parse(content);
            if (data.mb_api_key) saveApiKey(data.mb_api_key);
            if (data.mb_gemini_api_key) saveGeminiApiKey(data.mb_gemini_api_key);
            if (data.mb_settings) saveSettings(data.mb_settings);
            if (data.mb_admin) saveAdmin(data.mb_admin);
            if (data.mb_history) saveHistory(data.mb_history);
            renderSettings();
            showToast('Full backup restored', 'success');
        } catch(e) { showToast('Invalid file format', 'error'); }
    });
}

function clearHistoryOnly() {
    showConfirm('Delete all briefing history? This cannot be undone.', () => {
        saveHistory([]);
        currentBriefing = null;
        showToast('History cleared', 'success');
    });
}

function resetEverything() {
    showConfirm('Reset everything to factory defaults? All settings, history, and admin config will be erased.', () => {
        localStorage.removeItem('mb_api_key');
        localStorage.removeItem('mb_gemini_api_key');
        localStorage.removeItem('mb_settings');
        localStorage.removeItem('mb_admin');
        localStorage.removeItem('mb_history');
        currentBriefing = null;
        initializeApp();
        showToast('Reset to defaults', 'success');
    });
}

// ================================================================
// SECTION 13: EVENT LISTENERS & STARTUP
// ================================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.getElementById('watchlist-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addWatchlistTicker(); }
});

document.getElementById('history-search').addEventListener('input', debounce(renderHistory, 300));

function scrollGuide(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Start the app
initializeApp();
