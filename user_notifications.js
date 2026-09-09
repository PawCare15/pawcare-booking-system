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
        booking: ['booking', 'payment', 'reschedule'],
        history: ['booking', 'reschedule', 'payment'],
        profile: ['profile', 'security', 'account'],
        review: ['review']
    };

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers }
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json();
    }

    function setBadge(count) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function formatDate(value) {
        if (!value) return '';
        return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function tone(type) {
        return {
            booking: '#B56616', reschedule: '#7654B8', payment: '#3173B8',
            pet: '#B56616', profile: '#247A4A', security: '#B33A3A', review: '#B33F68'
        }[type] || '#6B625B';
    }

    function icon(type) {
        return {
            booking: 'fa-calendar-check', reschedule: 'fa-calendar-days', payment: 'fa-receipt',
            pet: 'fa-paw', profile: 'fa-user-pen', security: 'fa-shield-halved', review: 'fa-heart'
        }[type] || 'fa-bell';
    }

    function itemLink(item) {
        if (item.type === 'review') return 'review.html';
        if (item.type === 'pet') return 'mypet.html';
        if (item.type === 'profile' || item.type === 'security') return 'profile.html';
        if (item.type === 'booking' || item.type === 'reschedule') return context === 'booking' ? 'booking.html' : 'history.html';
        return '#';
    }

    async function getPageReminders() {
        const reminders = [];
        const requests = [];
        if (['dashboard', 'pets'].includes(context)) requests.push(request('/api/pets').then(result => ({ kind: 'pets', result })));
        if (['dashboard', 'profile'].includes(context)) requests.push(request('/api/profile').then(result => ({ kind: 'profile', result })));
        const results = await Promise.allSettled(requests);
        results.forEach(entry => {
            if (entry.status !== 'fulfilled') return;
            const { kind, result } = entry.value;
            if (kind === 'pets') (result.data || []).forEach(pet => {
                if (!pet.name || !pet.breed || !pet.gender || !pet.dob || !pet.weight || !pet.photo_url) {
                    reminders.push({ notification_id: `reminder-pet-${pet.pet_id}`, title: `${pet.name || 'Pet'} profile needs attention`, message: 'Add missing photo, birthday, weight, or basic details to complete this profile.', type: 'pet', created_at: new Date().toISOString(), is_read: false, dynamic: true });
                }
            });
            if (kind === 'profile' && (!result.data?.full_name || !result.data?.phone_number || !result.data?.address)) {
                reminders.push({ notification_id: 'reminder-profile', title: 'Complete your profile', message: 'Add your phone number and address so PawCare can keep your account up to date.', type: 'profile', created_at: new Date().toISOString(), is_read: false, dynamic: true });
            }
        });
        return reminders;
    }

    function upcomingBookings(bookings) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limit = new Date(today);
        limit.setDate(limit.getDate() + 3);
        return bookings.filter(booking => {
            if (booking.status === 'cancelled') return false;
            const date = new Date(booking.booking_date);
            date.setHours(0, 0, 0, 0);
            return date >= today && date <= limit;
        });
    }

    async function refreshBadge() {
        try {
            const result = await request(`/api/notifications?context=${encodeURIComponent(context)}`);
            const types = contextTypes[context];
            const notifications = (result.data || []).filter(item => !types || types.includes(item.type));
            setBadge(notifications.filter(item => !item.is_read).length);
        } catch (error) {
            console.error('Unable to load notification count:', error);
            setBadge(0);
        }
    }

    async function markRead(id) {
        if (!id || String(id).startsWith('reminder-')) return;
        try {
            await request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' });
            const card = Array.from(document.querySelectorAll('[data-notification-id]')).find(item => item.dataset.notificationId === id);
            if (card) {
                card.style.opacity = '0.58';
                const button = card.querySelector('.mark-read-btn');
                if (button) { button.textContent = 'Read'; button.disabled = true; }
            }
            await refreshBadge();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async function renderPanel() {
        const content = document.getElementById('notificationsModalContent');
        const modal = document.getElementById('notificationsModal');
        if (!content || !modal) return;
        const [notificationResult, bookingResult, reminders] = await Promise.all([
            request(`/api/notifications?context=${encodeURIComponent(context)}`),
            request('/api/bookings'),
            getPageReminders()
        ]);
        const types = contextTypes[context];
        const notifications = [...(notificationResult.data || []), ...reminders]
            .filter(item => !types || types.includes(item.type))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const bookings = ['dashboard', 'booking', 'history', 'pets'].includes(context) ? upcomingBookings(bookingResult.data || []) : [];
        let html = '<div style="margin-bottom:16px;"><h4 style="font-size:15px;font-weight:700;color:#5A361A;margin:0 0 12px;"><i class="fa-regular fa-bell" style="color:#D97706;"></i> Page notifications</h4>';
        if (!notifications.length) {
            html += '<div style="text-align:center;padding:24px 16px;border:1px dashed #E6D8C9;border-radius:14px;background:linear-gradient(135deg,#FFFDF9,#FAF3EA);color:#7A7A7A;"><i class="fa-regular fa-circle-check" style="font-size:25px;display:block;margin-bottom:8px;color:#2E7D32;"></i><strong style="display:block;color:#5A361A;">All caught up</strong><span style="display:block;margin-top:5px;font-size:12px;">New updates for this page will appear here.</span></div>';
        } else notifications.forEach(notification => {
            const color = tone(notification.type);
            const read = notification.is_read;
            html += `<div data-notification-id="${escapeHtml(notification.notification_id)}" style="background:#FFF;border-radius:12px;padding:14px 16px;margin-bottom:10px;border-left:4px solid ${color};box-shadow:0 3px 10px rgba(74,51,39,.06);${read ? 'opacity:.58;' : ''}"><div style="display:flex;align-items:flex-start;gap:12px;"><div style="flex:0 0 34px;height:34px;border-radius:11px;background:${color}18;display:grid;place-items:center;color:${color};"><i class="fa-solid ${icon(notification.type)}"></i></div><div style="flex:1;min-width:0;"><strong style="display:block;font-size:14px;color:#333;">${escapeHtml(notification.title)}</strong><span style="display:block;font-size:13px;color:#555;margin-top:4px;line-height:1.45;">${escapeHtml(notification.message)}</span><small style="display:block;font-size:11px;color:#A08F80;margin-top:6px;">${escapeHtml(formatDate(notification.created_at))}</small></div>${read ? '<span style="font-size:11px;color:#A08F80;">Read</span>' : `<button class="mark-read-btn" data-id="${escapeHtml(notification.notification_id)}" style="background:transparent;border:1px solid ${color};color:#5A361A;border-radius:20px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">Mark read</button>`}</div></div>`;
        });
        html += '</div>';
        if (bookings.length) {
            html += '<div style="border-top:1px solid #EFECE6;padding-top:16px;"><h4 style="font-size:14px;font-weight:700;color:#5A361A;margin:0 0 10px;"><i class="fa-regular fa-calendar" style="color:#D97706;"></i> Upcoming appointments</h4>';
            bookings.forEach(booking => {
                const pet = booking.pet?.name || 'Unknown pet';
                const service = booking.services?.[0]?.service_name || 'Scheduled service';
                html += `<div style="background:#F9F6F0;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;"><div><strong style="font-size:14px;color:#333;">${escapeHtml(pet)}</strong><div style="font-size:12px;color:#7A7A7A;margin-top:3px;">${escapeHtml(booking.booking_date)} at ${escapeHtml(booking.booking_time || 'scheduled time')} · ${escapeHtml(service)}</div></div><a href="history.html" style="font-size:12px;color:#5A361A;font-weight:600;text-decoration:none;">View</a></div>`;
            });
            html += '</div>';
        }
        content.innerHTML = html;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        content.querySelectorAll('.mark-read-btn').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); markRead(button.dataset.id); }));
    }

    document.addEventListener('click', async event => {
        const target = event.target.closest('#notificationBtn');
        if (!target) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        try { await renderPanel(); } catch (error) {
            console.error('Unable to load user notifications:', error);
            const content = document.getElementById('notificationsModalContent');
            if (content) content.innerHTML = '<div style="padding:28px 8px;color:#C5221F;text-align:center;">Unable to load notifications.</div>';
        }
    }, true);

    refreshBadge();
})();
