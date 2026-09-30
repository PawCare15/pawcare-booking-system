// universal_highlight.js
// Robust notification target highlighting with auto-cleanup.
(function () {
    'use strict';

    const HIGHLIGHT_PARAM = 'highlight';
    const HIGHLIGHT_CLASS = 'universal-highlight-target';
    const STYLE_ID = 'universal-highlight-style';
    const MAX_WAIT_MS = 15000;
    const AUTO_CLEAR_MS = 3500;

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${HIGHLIGHT_CLASS} {
                position: relative !important;
                box-shadow: 0 0 0 3px #D97706, 0 12px 30px rgba(74, 51, 39, 0.18) !important;
                background-color: #FFF7E6 !important;
                transition: box-shadow 0.3s ease, background-color 0.3s ease !important;
                animation: universalHighlightPulse 1.4s ease-in-out 2 !important;
                z-index: 5;
            }
            @keyframes universalHighlightPulse {
                0%, 100% { box-shadow: 0 0 0 3px #D97706, 0 12px 30px rgba(74, 51, 39, 0.18); }
                50%      { box-shadow: 0 0 0 6px #F59E0B, 0 14px 34px rgba(74, 51, 39, 0.26); }
            }
        `;
        document.head.appendChild(style);
    }

    function clearHighlightParam() {
        try {
            const url = new URL(window.location.href);
            if (!url.searchParams.has(HIGHLIGHT_PARAM)) return;
            url.searchParams.delete(HIGHLIGHT_PARAM);
            url.searchParams.delete('open');
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            /* ignore */
        }
    }

    function escapeSelector(value) {
        if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(String(value));
        return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    }

    function findHighlightTarget(highlightId) {
        if (!highlightId) return null;
        const raw = String(highlightId).trim();
        const escaped = escapeSelector(raw);
        const selectors = [
            `#review-${escaped}`,
            `[data-review-id="${escaped}"]`,
            `#history-booking-${escaped}`,
            `#appointment-${escaped}`,
            `[data-booking-id="${escaped}"]`,
            `[data-customer-id="${escaped}"]`,
            `#customer-${escaped}`,
            `[data-pet-id="${escaped}"]`,
            `#pet-${escaped}`,
            `[data-actual-service-id="${escaped}"]`,
            `[data-service-id="${escaped}"]`,
            `#service-${escaped}`,
            `[data-id="${escaped}"]`,
            `#${escaped}`
        ];

        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (_) {
                /* skip invalid selector */
            }
        }

        const tables = document.querySelectorAll('table');
        for (const table of tables) {
            for (const row of table.querySelectorAll('tbody tr')) {
                for (const cell of row.querySelectorAll('td')) {
                    const text = (cell.textContent || '').trim();
                    if (text === raw || text === `#${raw}`) return row;
                }
            }
        }
        return null;
    }

    function applyHighlightClass(element) {
        if (!element) return;
        ensureStyles();
        element.classList.add(HIGHLIGHT_CLASS);

        const removeOnClick = () => {
            element.classList.remove(HIGHLIGHT_CLASS);
            element.removeEventListener('click', removeOnClick);
        };
        element.addEventListener('click', removeOnClick);

        clearTimeout(element.__highlightTimer);
        element.__highlightTimer = setTimeout(() => {
            element.classList.remove(HIGHLIGHT_CLASS);
        }, AUTO_CLEAR_MS);
    }

    function highlightAndScroll(element) {
        if (!element) return;
        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {
            element.scrollIntoView();
        }
        applyHighlightClass(element);
    }

    function waitForElement(selector, callback, timeoutMs = MAX_WAIT_MS) {
        const started = Date.now();
        const tryOnce = () => {
            const el = document.querySelector(selector);
            if (el) {
                callback(el);
                return true;
            }
            return false;
        };

        if (tryOnce()) return;

        const observer = new MutationObserver(() => {
            if (tryOnce()) {
                try { observer.disconnect(); } catch (_) {}
            } else if (Date.now() - started > timeoutMs) {
                try { observer.disconnect(); } catch (_) {}
            }
        });

        try {
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (_) {}

        const id = setInterval(() => {
            if (tryOnce()) {
                clearInterval(id);
                try { observer.disconnect(); } catch (_) {}
            } else if (Date.now() - started > timeoutMs) {
                clearInterval(id);
                try { observer.disconnect(); } catch (_) {}
            }
        }, 300);
    }

    function applyUniversalHighlight() {
        ensureStyles();

        const params = new URLSearchParams(window.location.search);
        const highlightId = params.get(HIGHLIGHT_PARAM);
        const openTarget = params.get('open');

        if (openTarget === '2fa' && typeof window.openModal === 'function') {
            setTimeout(() => {
                try {
                    window.openModal('twoFactorModal');
                    const card = document.querySelector('.security-card');
                    if (card) {
                        highlightAndScroll(card);
                        clearHighlightParam();
                    }
                } catch (e) {
                    /* ignore */
                }
            }, 600);
            return;
        }

        if (highlightId === 'profile-info') {
            waitForElement('.profile-overview', (el) => {
                highlightAndScroll(el);
                clearHighlightParam();
            });
            return;
        }

        if (highlightId === 'security-section') {
            waitForElement('.security-card', (el) => {
                highlightAndScroll(el);
                clearHighlightParam();
            });
            return;
        }

        if (highlightId === 'activity-summary') {
            waitForElement('#activity-summary', (el) => {
                highlightAndScroll(el);
                clearHighlightParam();
            });
            return;
        }

        if (!highlightId) return;

        const startedAt = Date.now();
        let observer = null;
        let intervalId = null;
        let done = false;

        const finish = () => {
            done = true;
            if (observer) { try { observer.disconnect(); } catch (_) {} }
            if (intervalId) { clearInterval(intervalId); }
        };

        const tryFind = () => {
            if (done) return true;
            const el = findHighlightTarget(highlightId);
            if (el) {
                highlightAndScroll(el);
                clearHighlightParam();
                finish();
                return true;
            }
            return false;
        };

        if (tryFind()) return;

        try {
            observer = new MutationObserver(() => {
                tryFind();
                if (Date.now() - startedAt > MAX_WAIT_MS) finish();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (_) {
            /* older browsers */
        }

        intervalId = setInterval(() => {
            if (tryFind()) return;
            if (Date.now() - startedAt > MAX_WAIT_MS) {
                finish();
                clearHighlightParam();
            }
        }, 300);
    }

    window.applyUniversalHighlight = applyUniversalHighlight;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyUniversalHighlight, { once: true });
    } else {
        applyUniversalHighlight();
    }

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) applyUniversalHighlight();
    });
})();
