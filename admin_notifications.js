(function initializeAdminNotifications() {
    function setup() {
        const button = document.getElementById('notificationBtn');
        const badge = document.getElementById('notifCount');
        if (!button || !badge) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        function setBadge(count) {
            const normalizedCount = Number(count) || 0;
            badge.textContent = normalizedCount > 99 ? '99+' : String(normalizedCount);
            badge.style.display = normalizedCount > 0 ? 'flex' : 'none';
        }

        fetch('/api/admin/notifications/summary', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => {
                if (!response.ok) throw new Error(`Notification summary failed: ${response.status}`);
                return response.json();
            })
            .then(result => {
                const count = Number(result.total) || 0;
                setBadge(sessionStorage.getItem('pawcareAdminNotificationsViewed') ? 0 : count);
            })
            .catch(error => console.error('Unable to load admin notification count:', error));

        button.addEventListener('click', function() {
            sessionStorage.setItem('pawcareAdminNotificationsViewed', 'true');
            setBadge(0);
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup, { once: true });
    } else {
        setup();
    }
})();
