(function initializeUserNotifications() {
    const badge = document.getElementById('notifCount');
    const notificationButton = document.getElementById('notificationBtn');
    if (!badge || !notificationButton) return;

    const token = localStorage.getItem('token');
    if (!token) return;
    const context = document.body.dataset.notificationContext || 'dashboard';
    const contextTypes = {
        dashboard: ['booking', 'reschedule', 'review', 'security', 'profile', 'account'],
        pets: ['pet', 'booking'],
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
        if (!response.ok) throw new Error(`Notification request failed: ${response.status}`);
        return response.json();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    }

    function readLocal() {
        try { return JSON.parse(localStorage.getItem('pawcare_user_notification_reads') || '{}'); } catch { return {}; }
    }

    function isLocalRead(key) { return Boolean(readLocal()[key]); }

    function markLocalRead(key) {
        const state = readLocal();
        state[key] = true;
        localStorage.setItem('pawcare_user_notification_reads', JSON.stringify(state));
    }

    function formatDate(value) {
        if (!value) return 'Just now';
        return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function pageTitle() {
        return ({ dashboard: 'Your PawCare updates', pets: 'Pet care updates', booking: 'Booking updates', history: 'Booking history', profile: 'Profile & security', review: 'Review activity' }[context] || 'Notifications');
    }

    function card(item) {
        const read = item.is_read || isLocalRead(item.localKey);
        const colors = {
            booking: ['#FEF7E0', '#D97706', '📅'],
            reschedule: ['#FFF3E0', '#E65100', '🔄'],
            review: ['#E3F2FD', '#2563EB', '💬'],
            pet: ['#E8F5E9', '#2E7D32', '🐾'],
            profile: ['#F3E8FF', '#7C3AED', '👤'],
            security: ['#FCE8E6', '#DC2626', '🛡️'],
            account: ['#F3E8FF', '#7C3AED', '🔐']
        }[item.type] || ['#F5F0EB', '#8B5E34', '🔔'];
        const action = item.href ? `<a href="${item.href}" style="color:#5A361A;font-weight:700;text-decoration:none;font-size:12px;">${escapeHtml(item.action || 'View details')} →</a>` : '<span></span>';
        return `<div data-notification-key="${escapeHtml(item.id)}" style="background:${colors[0]};border-left:4px solid ${colors[1]};border-radius:12px;padding:13px 12px 11px;margin-bottom:10px;${read ? 'opacity:.68;' : ''}">
            <div style="display:flex;gap:10px;align-items:flex-start;">
                <span style="display:inline-flex;width:34px;height:34px;border-radius:50%;background:#fff;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto;">${colors[2]}</span>
                <div style="min-width:0;flex:1;">
                    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;"><strong style="font-size:14px;color:#2d241f;line-height:1.3;">${escapeHtml(item.title)}</strong><small style="color:#8B8179;white-space:nowrap;">${escapeHtml(formatDate(item.created_at))}</small></div>
                    <div style="font-size:12px;color:#5f5248;line-height:1.5;margin-top:5px;">${escapeHtml(item.message)}</div>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:10px 0 0 44px;">${action}<button type="button" class="user-mark-read" data-id="${escapeHtml(item.id)}" data-server="${item.server ? 'true' : 'false'}" style="background:transparent;border:1px solid rgba(90,54,26,.3);color:#5A361A;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;">${read ? 'Read' : 'Mark read'}</button></div>
        </div>`;
    }

    async function buildNotifications() {
        const [notificationResult, bookingResult] = await Promise.all([request('/api/notifications'), request('/api/bookings')]);
        const serverItems = (notificationResult.data || []).filter(item => (contextTypes[context] || []).includes(item.type)).map(item => ({
            ...item, id: item.notification_id, server: true, href: item.type === 'review' ? 'review.html' : item.type === 'profile' || item.type === 'security' ? 'profile.html' : context === 'history' ? 'history.html' : 'dashboard.html', action: item.type === 'review' ? 'View review' : 'View details'
        }));
        const bookings = bookingResult.data || [];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const limit = new Date(today); limit.setDate(limit.getDate() + 3);
        const upcoming = bookings.filter(booking => {
            const date = new Date(booking.booking_date);
            date.setHours(0, 0, 0, 0);
            return booking.status !== 'cancelled' && date >= today && date <= limit;
        });
        const derived = [];

        if (['dashboard', 'booking', 'history'].includes(context)) upcoming.forEach(booking => derived.push({ id: `upcoming-${booking.booking_id}`, localKey: `upcoming-${booking.booking_id}`, type: 'booking', title: 'Upcoming appointment', message: `${booking.pet?.name || 'Your pet'} · ${booking.booking_date} at ${booking.booking_time || 'scheduled time'}`, created_at: booking.updated_at, href: 'history.html', action: 'View booking' }));
        if (['dashboard', 'pets'].includes(context)) {
            const petsResult = await request('/api/pets');
            (petsResult.data || []).forEach(pet => {
                const missing = !pet.name || !pet.breed || !pet.gender || !pet.photo_url || !pet.dob || !pet.weight;
                if (missing) derived.push({ id: `pet-profile-${pet.pet_id}`, localKey: `pet-profile-${pet.pet_id}`, type: 'pet', title: 'Pet profile incomplete', message: `${pet.name || pet.pet_id} needs a profile update.`, href: 'mypet.html', action: 'Complete profile' });
            });
        }
        if (context === 'profile') {
            const profileResult = await request('/api/profile');
            const profile = profileResult.data || {};
            if (!profile.phone_number || !profile.address) derived.push({ id: 'profile-incomplete', localKey: 'profile-incomplete', type: 'profile', title: 'Complete your profile', message: 'Add your phone number and address for smoother booking support.', href: 'profile.html', action: 'Update profile' });
        }
        return [...serverItems, ...derived].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    function setBadge(count) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    async function refreshBadge() {
        try {
            const items = await buildNotifications();
            setBadge(items.filter(item => !(item.is_read || isLocalRead(item.localKey))).length);
        } catch (error) { console.error('Unable to load user notification count:', error); }
    }

    notificationButton.addEventListener('click', async event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const modal = document.getElementById('notificationsModal');
        const content = document.getElementById('notificationsModalContent');
        try {
            const items = await buildNotifications();
            content.innerHTML = `<div style="padding:4px 2px 12px;color:#5A361A;font-weight:700;font-size:15px;">${pageTitle()}</div>${items.length ? items.map(item => card(item)).join('') : '<div style="padding:32px 8px;color:#7A7A7A;text-align:center;">You are all caught up.</div>'}`;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            content.querySelectorAll('.user-mark-read').forEach(button => button.addEventListener('click', async () => {
                const item = items.find(candidate => candidate.id === button.dataset.id);
                if (!item) return;
                if (button.dataset.server === 'true') await request(`/api/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PUT' });
                else markLocalRead(item.localKey);
                button.textContent = 'Read'; button.disabled = true;
                button.closest('[data-notification-key]').style.opacity = '.68';
                refreshBadge();
            }));
            refreshBadge();
        } catch (error) {
            content.innerHTML = '<div style="padding:28px;color:#C5221F;text-align:center;">Unable to load notifications.</div>';
        }
    }, true);

    refreshBadge();
})();
