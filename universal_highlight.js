// Universal notification target highlighting and modal opening.
(function () {
    function highlightElement(element) {
        if (!element) return;
        element.style.transition = 'all 0.4s ease';
        element.style.boxShadow = '0 0 0 4px #D97706, 0 12px 30px rgba(74,51,39,0.2)';
        element.style.transform = 'scale(1.02)';
        element.style.zIndex = '10';
        setTimeout(() => {
            element.style.boxShadow = '';
            element.style.transform = 'scale(1)';
            element.style.zIndex = '';
        }, 2800);
    }

    function findHighlightTarget(highlightId) {
        if (!highlightId) return null;
        const escapedId = typeof CSS !== 'undefined' && CSS.escape
            ? CSS.escape(highlightId)
            : String(highlightId).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        const selectors = [
            `#review-${escapedId}`, `[data-review-id="${escapedId}"]`,
            `#history-booking-${escapedId}`, `[data-booking-id="${escapedId}"]`,
            `#appointment-${escapedId}`,
            `[data-customer-id="${escapedId}"]`, `#customer-${escapedId}`,
            `[data-pet-id="${escapedId}"]`, `#pet-${escapedId}`,
            `[data-actual-service-id="${escapedId}"]`,
            `[data-service-id="${escapedId}"]`, `#service-${escapedId}`,
            `[data-id="${escapedId}"]`, `#${escapedId}`
        ];
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (error) {
                // Ignore an invalid data selector and continue with the remaining targets.
            }
        }

        // Fallback: match an exact ID string inside a table cell.
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
            const rows = table.querySelectorAll('tbody tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                for (const cell of cells) {
                    const text = (cell.textContent || '').trim();
                    if (text === highlightId || text === `#${highlightId}`) {
                        return row;
                    }
                }
            }
        }
        return null;
    }

    function applyUniversalHighlight() {
        const urlParams = new URLSearchParams(window.location.search);
        const highlightId = urlParams.get('highlight');
        const openTarget = urlParams.get('open');

        if (openTarget === '2fa' && typeof window.openModal === 'function') {
            setTimeout(() => {
                window.openModal('twoFactorModal');
                highlightElement(document.querySelector('.security-card'));
            }, 600);
            return;
        }

        if (!highlightId) return;

        let attempts = 0;
        const maxAttempts = 40;
        const findAndHighlight = () => {
            const element = findHighlightTarget(highlightId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightElement(element);
                return;
            }
            if (attempts < maxAttempts) {
                attempts += 1;
                setTimeout(findAndHighlight, 250);
            }
        };
        setTimeout(findAndHighlight, 100);
    }

    window.applyUniversalHighlight = applyUniversalHighlight;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyUniversalHighlight, { once: true });
    } else {
        applyUniversalHighlight();
    }
    window.addEventListener('pageshow', event => {
        if (event.persisted) applyUniversalHighlight();
    });
})();
