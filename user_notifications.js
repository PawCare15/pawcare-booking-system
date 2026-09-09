(function initializeUserNotifications() {
    const badge = document.getElementById('notifCount');
    const notificationButton = document.getElementById('notificationBtn');
    if (!badge || !notificationButton) return;

    const token = localStorage.getItem('token');
    if (!token) return;
    const context = document.body.dataset.notificationContext || 'dashboard';
    const contextTypes = {
        dashboard: null,
        pets: ['pet'],
        booking: ['booking', 'payment'],
        history: ['booking', 'reschedule', 'payment'],
        profile: ['profile', 'security', 'account'],
        review: ['review']
    };

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...options.headers
            }
        });
        if (!response.ok) throw new Error(`Notification request failed: ${response.status}`);
        return response.json();
    }

    function setBadge(count) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    function relevantNotifications(notifications) {
        const types = contextTypes[context];
        if (!types) return notifications;
        return notifications.filter(item => types.includes(item.type));
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function formatNotificationDate(value) {
        if (!value) return '';
        return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }

    function getContextLabel() {
        return {
            dashboard: 'Latest updates',
            pets: 'Pet updates',
            booking: 'Booking updates',
            history: 'Booking history updates',
            profile: 'Profile updates',
            review: 'Review updates'
        }[context] || 'Notifications';
    }

    function renderNotificationPanel(notifications, bookings) {
        const content = document.getElementById('notificationsModalContent');
        const modal = document.getElementById('notificationsModal');
        if (!content || !modal) return;

        const relevant = relevantNotifications(notifications).slice(0, 20);
        const includeBookingReminder = ['dashboard', 'booking', 'history'].includes(context);
        const upcoming = includeBookingReminder ? getUpcomingBookings(bookings, null) : [];
        let html = `<div style="padding:4px 2px 12px; color:#5A361A; font-weight:600;">${getContextLabel()}</div>`;

        relevant.forEach(item => {
            html += `<div style="padding:12px 0; border-bottom:1px solid #EFECE6; text-align:left;">
                <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                    <strong style="color:#333; font-size:13px;">${escapeHtml(item.title)}</strong>
                    <small style="color:#A08F80; white-space:nowrap;">${formatNotificationDate(item.created_at)}</small>
                </div>
                <div style="color:#7A7A7A; font-size:12px; line-height:1.5; margin-top:4px;">${escapeHtml(item.message)}</div>
            </div>`;
        });

        upcoming.forEach(booking => {
            html += `<div style="padding:12px 0; border-bottom:1px solid #EFECE6; text-align:left;">
                <strong style="color:#333; font-size:13px;">Upcoming appointment</strong>
                <div style="color:#7A7A7A; font-size:12px; line-height:1.5; margin-top:4px;">Your appointment is on ${escapeHtml(booking.booking_date)} at ${escapeHtml(booking.booking_time || 'the scheduled time')}.</div>
            </div>`;
        });

        if (!relevant.length && !upcoming.length) {
            html += '<div style="padding:28px 8px; color:#7A7A7A; text-align:center;">No notifications for this page.</div>';
        }

        content.innerHTML = html;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function getUpcomingBookings(bookings, seenAt) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limit = new Date(today);
        limit.setDate(limit.getDate() + 3);
        return bookings.filter(booking => {
            if (booking.status === 'cancelled') return false;
            const date = new Date(booking.booking_date);
            date.setHours(0, 0, 0, 0);
            const isUpcoming = date >= today && date <= limit;
            return isUpcoming && (!seenAt || (booking.updated_at && new Date(booking.updated_at) > seenAt));
        });
    }

    async function refreshBadge() {
        try {
            const [notificationResult, bookingResult] = await Promise.all([
                request('/api/notifications'),
                request('/api/bookings')
            ]);
            const unreadNotifications = (notificationResult.data || []).filter(item => !item.is_read).length;
            const seenAtValue = localStorage.getItem('pawcareUserNotificationsSeenAt');
            const seenAt = seenAtValue ? new Date(seenAtValue) : null;
            const upcoming = getUpcomingBookings(bookingResult.data || [], seenAt);
            setBadge(unreadNotifications + upcoming.length);
        } catch (error) {
            console.error('Unable to load user notification count:', error);
        }
    }

    document.addEventListener('click', async function(event) {
        if (!event.target.closest('#notificationBtn')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
            const [notificationResult, bookingResult] = await Promise.all([
                request('/api/notifications'),
                request('/api/bookings')
            ]);
            renderNotificationPanel(notificationResult.data || [], bookingResult.data || []);
            localStorage.setItem('pawcareUserNotificationsSeenAt', new Date().toISOString());
            setBadge(0);
            await request('/api/notifications/read', { method: 'PUT' });
        } catch (error) {
            console.error('Unable to load user notifications:', error);
            const content = document.getElementById('notificationsModalContent');
            if (content) content.innerHTML = '<div style="padding:28px 8px; color:#C5221F; text-align:center;">Unable to load notifications.</div>';
        }
    }, true);

    refreshBadge();
})();
