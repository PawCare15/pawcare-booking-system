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
        }, 2500);
    }

    function findHighlightTarget(highlightId) {
        const escapedId = typeof CSS !== 'undefined' && CSS.escape
            ? CSS.escape(highlightId)
            : highlightId.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        const selectors = [
            `#review-${escapedId}`, `[data-review-id="${highlightId}"]`,
            `#history-booking-${escapedId}`, `[data-booking-id="${highlightId}"]`,
            `#appointment-${escapedId}`,
            `[data-customer-id="${highlightId}"]`, `#customer-${escapedId}`,
            `[data-pet-id="${highlightId}"]`, `#pet-${escapedId}`,
            `[data-service-id="${highlightId}"]`, `#service-${escapedId}`,
            `[data-id="${highlightId}"]`, `#${escapedId}`
        ];
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (error) {
                // Ignore an invalid data selector and continue with the remaining targets.
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
        const findAndHighlight = () => {
            const element = findHighlightTarget(highlightId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightElement(element);
                return;
            }
            if (attempts < 10) {
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
