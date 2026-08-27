(function initializeUserNotifications() {
    const badge = document.getElementById('notifCount');
    const notificationButton = document.getElementById('notificationBtn');
    if (!badge || !notificationButton) return;

    const token = localStorage.getItem('token');
    if (!token) return;

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

    notificationButton.addEventListener('click', async function() {
        localStorage.setItem('pawcareUserNotificationsSeenAt', new Date().toISOString());
        setBadge(0);
        try {
            await request('/api/notifications/read', { method: 'PUT' });
        } catch (error) {
            console.error('Unable to mark user notifications as read:', error);
        }
    }, true);

    refreshBadge();
})();
