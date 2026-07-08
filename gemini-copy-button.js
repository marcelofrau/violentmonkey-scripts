// ==UserScript==
// @name         Gemini Chat Exporter
// @namespace    marcelofrau.gemini-exporter
// @version      1.0.0
// @description  Exporta a conversa inteira do Gemini para Markdown (clipboard + download .md), contornando o corte de seleção manual.
// @author       marcelofrau
// @match        https://gemini.google.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'gemini-exporter-btn';
    const STATUS_ID = 'gemini-exporter-status';

    GM_addStyle(`
        #${BUTTON_ID}-wrapper {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
        }
        #${BUTTON_ID} {
            background: #1a73e8;
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 18px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transition: background 0.2s ease;
        }
        #${BUTTON_ID}:hover { background: #1558b0; }
        #${BUTTON_ID}:disabled { background: #888; cursor: wait; }
        #${STATUS_ID} {
            background: #202124;
            color: #e8eaed;
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 10px;
            opacity: 0.9;
            max-width: 260px;
            text-align: right;
        }
    `);

    function injectButton() {
        if (document.getElementById(BUTTON_ID)) return;

        const wrapper = document.createElement('div');
        wrapper.id = `${BUTTON_ID}-wrapper`;

        const status = document.createElement('div');
        status.id = STATUS_ID;
        status.style.display = 'none';

        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.textContent = '⬇ Export chat (.md)';
        btn.addEventListener('click', () => runExport(btn, status));

        wrapper.appendChild(status);
        wrapper.appendChild(btn);
        document.body.appendChild(wrapper);
    }

    function setStatus(status, text, show = true) {
        status.textContent = text;
        status.style.display = show ? 'block' : 'none';
    }

    async function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    // Rola o scroller virtualizado até o topo, forçando o Gemini a montar
    // no DOM os turnos antigos que ainda não foram renderizados.
    async function scrollToLoadFullHistory(status) {
        const scroller =
            document.querySelector('infinite-scroller') ||
            document.querySelector('[data-test-id="chat-history"]') ||
            document.querySelector('#chat-history');

        if (!scroller) return;

        let lastHeight = -1;
        let stableCount = 0;
        const maxIterations = 200;

        for (let i = 0; i < maxIterations && stableCount < 3; i++) {
            scroller.scrollTop = 0;
            setStatus(status, `Carregando histórico... (${i + 1})`);
            await sleep(350);

            const currentHeight = scroller.scrollHeight;
            if (currentHeight === lastHeight) {
                stableCount++;
            } else {
                stableCount = 0;
            }
            lastHeight = currentHeight;
        }
    }

    // Converte um nó de markdown renderizado (HTML) de volta para texto Markdown.
    function nodeToMarkdown(node) {
        let out = '';

        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                out += child.textContent;
                continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) continue;

            const tag = child.tagName.toLowerCase();

            switch (tag) {
                case 'h1': out += `\n# ${child.textContent.trim()}\n\n`; break;
                case 'h2': out += `\n## ${child.textContent.trim()}\n\n`; break;
                case 'h3': out += `\n### ${child.textContent.trim()}\n\n`; break;
                case 'h4': out += `\n#### ${child.textContent.trim()}\n\n`; break;
                case 'strong': case 'b': out += `**${nodeToMarkdown(child)}**`; break;
                case 'em': case 'i': out += `*${nodeToMarkdown(child)}*`; break;
                case 'code':
                    if (child.closest('pre')) {
                        out += child.textContent;
                    } else {
                        out += `\`${child.textContent}\``;
                    }
                    break;
                case 'pre': {
                    const codeEl = child.querySelector('code');
                    const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || '';
                    const codeText = (codeEl || child).textContent.replace(/\n$/, '');
                    out += `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
                    break;
                }
                case 'ul':
                    out += '\n';
                    child.querySelectorAll(':scope > li').forEach((li) => {
                        out += `- ${nodeToMarkdown(li).trim()}\n`;
                    });
                    out += '\n';
                    break;
                case 'ol':
                    out += '\n';
                    Array.from(child.querySelectorAll(':scope > li')).forEach((li, idx) => {
                        out += `${idx + 1}. ${nodeToMarkdown(li).trim()}\n`;
                    });
                    out += '\n';
                    break;
                case 'a':
                    out += `[${child.textContent.trim()}](${child.getAttribute('href') || ''})`;
                    break;
                case 'p':
                    out += `${nodeToMarkdown(child).trim()}\n\n`;
                    break;
                case 'br':
                    out += '\n';
                    break;
                case 'table': {
                    const rows = Array.from(child.querySelectorAll('tr'));
                    rows.forEach((row, ri) => {
                        const cells = Array.from(row.querySelectorAll('th, td'))
                            .map((c) => c.textContent.trim());
                        out += `| ${cells.join(' | ')} |\n`;
                        if (ri === 0) {
                            out += `| ${cells.map(() => '---').join(' | ')} |\n`;
                        }
                    });
                    out += '\n';
                    break;
                }
                default:
                    out += nodeToMarkdown(child);
            }
        }
        return out;
    }

    function extractConversation() {
        // Seletores atuais observados no DOM do Gemini (jul/2026).
        // Se o Google mudar o markup, ajustar aqui.
        const turnContainers = document.querySelectorAll(
            'user-query, model-response'
        );

        const parts = [];

        turnContainers.forEach((el) => {
            const tag = el.tagName.toLowerCase();

            if (tag === 'user-query') {
                const queryEl = el.querySelector('.query-text') || el;
                const text = queryEl.innerText?.trim();
                if (text) parts.push(`## 🧑 User\n\n${text}\n`);
            } else if (tag === 'model-response') {
                const panel =
                    el.querySelector('message-content div.markdown.markdown-main-panel') ||
                    el.querySelector('message-content .model-response-text') ||
                    el.querySelector('message-content');

                if (panel) {
                    const md = nodeToMarkdown(panel).trim();
                    if (md) parts.push(`## 🤖 Gemini\n\n${md}\n`);
                }
            }
        });

        return parts.join('\n---\n\n');
    }

    function downloadMarkdown(content) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `gemini-chat-${timestamp}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function runExport(btn, status) {
        btn.disabled = true;
        setStatus(status, 'Iniciando...');

        try {
            await scrollToLoadFullHistory(status);
            setStatus(status, 'Extraindo conteúdo...');
            await sleep(150);

            const markdown = extractConversation();

            if (!markdown) {
                setStatus(status, 'Nada encontrado — seletores podem ter mudado.');
                btn.disabled = false;
                return;
            }

            GM_setClipboard(markdown, 'text');
            downloadMarkdown(markdown);

            setStatus(status, `Copiado + baixado (${markdown.length} chars)`);
        } catch (err) {
            console.error('[Gemini Exporter] erro:', err);
            setStatus(status, `Erro: ${err.message}`);
        } finally {
            btn.disabled = false;
            setTimeout(() => setStatus(status, '', false), 5000);
        }
    }

    // O Gemini é uma SPA — o botão precisa sobreviver a navegações internas.
    const observer = new MutationObserver(() => injectButton());
    observer.observe(document.body, { childList: true, subtree: true });

    injectButton();
})();