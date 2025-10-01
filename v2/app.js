// 第2课优化版 app.js - 搜索体验优化
// 主要改进：更友好的用户提示、更好的错误处理、代码注释

let raw = [], view = [], activeSource = 'all';
let searchEl, sourcesEl;

// 常用DOM选择器函数
const $ = sel => document.querySelector(sel);

// 获取主要DOM元素
const listEl = $('#list');
const emptyEl = $('#empty');
const controlsEl = $('#controls');

// 全局数据存储，用于语言切换
window.currentData = null;
window.renderWithLanguage = renderWithLanguage;

// 从URL参数获取当前语言，默认为中文
const urlParams = new URLSearchParams(location.search);
window.currentLang = urlParams.get('lang') || 'zh';

// 初始化应用
init();

async function init() {
    try {
        // 挂载控制组件
        mountControls();

        // 加载数据
        raw = await loadData();
        window.currentData = raw;

        // 渲染数据源选择器
        renderSources(['all', ...new Set(raw.map(x => x.source))]);

        // 绑定事件监听器
        bind();

        // 应用筛选并渲染
        applyAndRender();

        console.log('✅ 应用初始化成功，加载了', raw.length, '篇文章');
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        showError('应用加载失败，请刷新页面重试');
    }
}

/**
 * 加载数据文件
 * 支持GitHub Pages和本地开发环境
 */
async function loadData() {
    // 构建data.json的URL，确保在不同环境下正确工作
    let dataUrl;
    if (window.location.pathname.includes('/curated-gems/')) {
        // GitHub Pages环境
        dataUrl = window.location.origin + '/curated-gems/data.json';
    } else {
        // 本地开发环境
        dataUrl = './data.json';
    }

    // 添加时间戳防止缓存
    const response = await fetch(dataUrl + '?_=' + Date.now(), {
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`数据加载失败: ${response.status}`);
    }

    return await response.json();
}

/**
 * 挂载控制组件（搜索框和筛选器）
 */
function mountControls() {
    const lang = window.currentLang || 'zh';

    // 🔍 优化后的搜索框提示文字 - 更友好、更直观
    const placeholder = lang === 'zh'
        ? '🔍 这里可以搜索...'
        : '🔍 you can search here...';

    controlsEl.innerHTML = `
        <div class="controls">
            <input id="search" placeholder="${placeholder}" autocomplete="off"/>
            <div id="sources" class="tags"></div>
        </div>
    `;

    // 获取新创建的元素引用
    searchEl = $('#search');
    sourcesEl = $('#sources');
}

/**
 * 绑定事件监听器
 */
function bind() {
    // 搜索输入事件
    searchEl.addEventListener('input', applyAndRender);

    // 数据源筛选点击事件
    sourcesEl.addEventListener('click', e => {
        const target = e.target.closest('.tag');
        if (!target) return;

        // 更新激活状态
        [...sourcesEl.children].forEach(node => node.classList.remove('active'));
        target.classList.add('active');

        // 更新激活的数据源
        activeSource = target.dataset.source;

        // 重新筛选和渲染
        applyAndRender();
    });
}

/**
 * 应用筛选条件并渲染结果
 */
function applyAndRender() {
    const query = (searchEl.value || '').trim().toLowerCase();
    const lang = window.currentLang || 'zh';

    // 统计：当前搜索条件下，各数据源可见数量
    const counts = { all: 0 };
    for (const item of raw) {
      const summaryField = (lang === 'zh' ? item.summary_zh : item.summary_en) || '';
      const quoteField   = (lang === 'zh' ? item.best_quote_zh : item.best_quote_en) || '';
      const titleField   = (lang === 'zh' ? (item.title_zh || item.title) : item.title) || '';
      const tagsArr      = item.tags || [];
    
      const matchesQuery = !query ||
        titleField.toLowerCase().includes(query) ||
        summaryField.toLowerCase().includes(query) ||
        quoteField.toLowerCase().includes(query) ||
        tagsArr.some(tag => tag.toLowerCase().includes(query));
    
      if (matchesQuery) {
        counts.all += 1;
        const s = item.source || 'unknown';
        counts[s] = (counts[s] || 0) + 1;
      }
    }
    
    window.__countsForCurrentQuery = counts;
    // 统计：当前搜索条件下，各数据源可见数量

    // 筛选数据
    view = raw.filter(item => {
        // 根据语言选择对应字段
        const summaryField = lang === 'zh' ? item.summary_zh : item.summary_en;
        const quoteField = lang === 'zh' ? item.best_quote_zh : item.best_quote_en;
        const titleField = lang === 'zh' ? (item.title_zh || item.title) : item.title;

        // 搜索匹配检查
        const matchesQuery = !query ||
            titleField?.toLowerCase().includes(query) ||
            summaryField?.toLowerCase().includes(query) ||
            quoteField?.toLowerCase().includes(query) ||
            (item.tags || []).some(tag => tag.toLowerCase().includes(query));

        // 数据源匹配检查
        const matchesSource = activeSource === 'all' || item.source === activeSource;

        return matchesQuery && matchesSource;
    });

    // 渲染结果
    render(view);
    renderSources(['all', ...new Set(raw.map(x => x.source))]);
    // 彩蛋：输入 magic 试试看
    if (query === 'magic') {
      alert('✨ 哇！你发现了隐藏功能！');
    }
}

/**
 * 渲染数据源选择器
 */
function renderSources(list) {
    const counts = window.__countsForCurrentQuery || { all: raw.length };
    const lang = window.currentLang || 'zh';

    sourcesEl.innerHTML = list.map(source => {
        // 🌟 优化数据源显示文字
        const n = counts[source] || 0;
const displayText = source === 'all'
    ? (lang === 'zh'
        ? `📚 全部 (${n})`
        : `📚 All (${n})`)
    : `✨ ${source} (${n})`;

        const isActive = source === activeSource ? 'active' : '';

        return `<span class="tag ${isActive}" data-source="${source}">${esc(displayText)}</span>`;
    }).join('');
}

/**
 * 渲染文章列表
 */
function render(items) {
    const lang = window.currentLang || 'zh';

    // 处理空结果情况
    if (!items.length) {
        const counts = window.__countsForCurrentQuery || { all: raw.length };
        listEl.innerHTML = '';

        // 😅 优化后的空结果提示 - 更友好、提供建议
        const emptyTexts = {
            zh: '🤔 暂时没找到，换个词试试？或许有惊喜',
            en: '😅 No content found, try another keyword',
        };

        emptyEl.textContent = emptyTexts[lang];
        emptyEl.classList.remove('hidden');
        return;
    }

    // 隐藏空结果提示，显示文章列表
    emptyEl.classList.add('hidden');
    listEl.innerHTML = items.map(item => card(item, lang)).join('');
}

/**
 * 语言切换时重新渲染
 */
function renderWithLanguage(items, lang) {
    // 更新当前语言
    window.currentLang = lang;

    // 更新搜索框提示文字
    const placeholder = lang === 'zh'
        ? '👋 想找什么好东西？'
        : '👋 What are you looking for?';

    if (searchEl) {
        searchEl.placeholder = placeholder;
    }

    // 重新应用当前筛选条件
    applyAndRender();
}

/**
 * 生成文章卡片HTML
 */
function card(item, lang = 'zh') {
    // 根据语言选择对应字段
    const tagsArray = lang === 'zh' ? (item.tags_zh || item.tags || []) : (item.tags || []);
    const tags = tagsArray.join(', ');
    const title = lang === 'zh' ? (item.title_zh || item.title) : item.title;
    const desc = lang === 'zh' ? (item.summary_zh || '') : (item.summary_en || '');
    const quote = lang === 'zh' ? (item.best_quote_zh || '') : (item.best_quote_en || '');

    // 引号样式
    const quoteWrapper = lang === 'zh' ? '「」' : '""';
    const aiSummaryLabel = lang === 'zh' ? 'AI总结：' : 'AI Summary: ';

    return `
        <article class="card">
            <h3>
                <a href="${item.link}" target="_blank" rel="noopener">
                    ${esc(title)}
                </a>
            </h3>
            ${desc ? `
                <p>
                    <span class="ai-label">${aiSummaryLabel}</span>
                    ${esc(desc)}
                </p>
            ` : ''}
            ${quote ? `
                <blockquote>
                    ${quoteWrapper[0]}${esc(quote)}${quoteWrapper[1]}
                </blockquote>
            ` : ''}
            <div class="meta">
                ${esc(item.source)} · ${esc(tags)} · ${esc(item.date || '')}
            </div>
        </article>
    `;
}

/**
 * 显示错误信息
 */
function showError(message) {
    const lang = window.currentLang || 'zh';
    const errorPrefix = lang === 'zh' ? '❌ 错误：' : '❌ Error: ';

    if (listEl && emptyEl) {
        listEl.innerHTML = '';
        emptyEl.textContent = errorPrefix + message;
        emptyEl.classList.remove('hidden');
    }
}

/**
 * HTML转义函数，防止XSS攻击
 */
function esc(str) {
    return String(str || '').replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

// 调试信息
console.log('🚀 第2课优化版 app.js 已加载');
console.log('📝 主要改进：');
console.log('   - 🔍 更友好的搜索提示文字');
console.log('   - 😅 更温馨的空结果提示');
console.log('   - ✨ 优化的数据源显示');
console.log('   - 📚 更好的代码注释和错误处理');
