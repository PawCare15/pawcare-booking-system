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
        const safeCount = Math.max(0, Number(count) || 0);
        badge.dataset.unreadCount = String(safeCount);
        badge.textContent = safeCount > 99 ? '99+' : String(safeCount);
        badge.style.display = safeCount > 0 ? 'flex' : 'none';
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
        return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function getPageLink() {
        return {
            dashboard: 'dashboard.html',
            booking: 'booking.html',
            history: 'history.html',
            pets: 'mypet.html',
            profile: 'profile.html',
            review: 'review.html'
        }[context] || '#';
    }

    function getItemLink(item) {
        if (item.type === 'review') {
            return item.review_id ? `review.html#review-${encodeURIComponent(item.review_id)}` : 'review.html';
        }
        if (item.type === 'pet') return 'mypet.html';
        if (item.type === 'profile' || item.type === 'security') return 'profile.html';
        if (item.type === 'reschedule') {
            if (item.action_url) return item.action_url;
            return item.booking_id ? `dashboard.html?highlight=${encodeURIComponent(item.booking_id)}` : 'dashboard.html';
        }
        if (item.type === 'booking') return context === 'booking' ? 'booking.html' : 'history.html';
        return getPageLink();
    }

    function getNotificationTone(type) {
        return {
            booking: ['#FFF1DE', '#B56616'],
            reschedule: ['#F1EAFE', '#7654B8'],
            payment: ['#EAF4FF', '#3173B8'],
            pet: ['#FFF1DE', '#B56616'],
            profile: ['#EAF5EE', '#247A4A'],
            security: ['#FDECEC', '#B33A3A'],
            review: ['#FCECF1', '#B33F68']
        }[type] || ['#F2F0ED', '#6B625B'];
    }

    function getNotificationIcon(type) {
        return {
            booking: 'fa-calendar-check',
            reschedule: 'fa-calendar-days',
            payment: 'fa-receipt',
            pet: 'fa-paw',
            profile: 'fa-user-pen',
            security: 'fa-shield-halved',
            review: 'fa-heart'
        }[type] || 'fa-bell';
    }

    function getEmptyState() {
        return {
            dashboard: ['All caught up', 'Your appointments, pet updates, and review activity will appear here.'],
            pets: ['Pet care at a glance', 'Profile reminders and upcoming appointments for your pets will appear here.'],
            booking: ['Booking updates are clear', 'Submission, confirmation, and availability changes will appear here.'],
            history: ['Your booking history is up to date', 'Status changes and reschedule decisions will appear here.'],
            profile: ['Your account is up to date', 'Profile, password, photo, and security updates will appear here.'],
            review: ['No review activity yet', 'Likes and replies to your reviews will appear here.']
        }[context] || ['No notifications yet', 'New updates will appear here.'];
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
        const includeBookingReminder = ['dashboard', 'booking', 'history', 'pets'].includes(context);
        const notifiedBookingIds = new Set(relevant.filter(item => item.booking_id).map(item => String(item.booking_id)));
        const upcoming = includeBookingReminder
            ? getUpcomingBookings(bookings, null).filter(booking => !notifiedBookingIds.has(String(booking.booking_id)))
            : [];
        let html = `<div style="padding:4px 0 14px; color:#5A361A; font-weight:700; font-size:15px;">${getContextLabel()}<span style="display:block; color:#A08F80; font-size:11px; font-weight:400; margin-top:3px;">Updates chosen for this page</span></div>`;

        relevant.forEach(item => {
            const tone = getNotificationTone(item.type);
            const senderInitial = escapeHtml(String(item.title || 'N').trim().charAt(0).toUpperCase());
            html += `<div style="display:block; padding:13px 12px; margin:8px 0; border:1px solid ${tone[1]}22; border-left:4px solid ${tone[1]}; border-radius:13px; box-shadow:0 5px 14px rgba(74,51,39,0.06); text-align:left; ${item.is_read ? 'background:#FFFFFF;' : 'background:#FFFCF5;'}">
                <div style="display:flex; gap:10px; align-items:flex-start;">
                    <span title="${senderInitial}" style="display:grid; place-items:center; flex:0 0 34px; height:34px; border-radius:50%; background:${tone[0]}; color:${tone[1]}; box-shadow:inset 0 0 0 1px ${tone[1]}22;"><i class="fa-solid ${getNotificationIcon(item.type)}"></i></span>
                    <span style="min-width:0; flex:1;"><strong style="display:block; color:#333; font-size:13px;">${escapeHtml(item.title)}</strong>
                    <small style="display:block; color:#A08F80; margin-top:4px;">${formatNotificationDate(item.created_at)}</small>
                    <span style="display:block; color:#7A7A7A; font-size:12px; line-height:1.5; margin-top:5px;">${escapeHtml(item.message)}</span>
                    <span style="display:flex; gap:8px; margin-top:9px;">
                      <a href="${getItemLink(item)}" style="color:#8A4F1D; font-size:12px; font-weight:600; text-decoration:none;">${item.type === 'reschedule' ? 'Review Reschedule' : 'View'}</a>
                      ${!item.is_read ? `<button type="button" data-notification-read="${escapeHtml(item.notification_id)}" style="border:0; background:none; padding:0; color:#7A7A7A; font:inherit; font-size:12px; cursor:pointer;">Mark read</button>` : ''}
                    </span></span>
                </div>
                ${!item.is_read ? `<span style="display:block; width:6px; height:6px; margin:7px 0 0 44px; border-radius:50%; background:#C5221F;"></span>` : ''}
            </div>`;
        });

        upcoming.forEach(booking => {
            const petName = booking.pet?.name ? ` for ${booking.pet.name}` : '';
            const serviceName = booking.services?.[0]?.service_name ? ` · ${booking.services[0].service_name}` : '';
            const time = String(booking.booking_time || 'the scheduled time').replace(/:00$/, '');
            const updatedAt = booking.updated_at || booking.created_at;
            html += `<a href="history.html" style="display:block; padding:13px 0; border-bottom:1px solid #EFECE6; text-align:left; text-decoration:none;">
                <div style="display:flex; gap:10px; align-items:flex-start;"><span style="display:grid; place-items:center; flex:0 0 30px; height:30px; border-radius:9px; background:#EAF5EE; color:#247A4A;"><i class="fa-solid fa-clock"></i></span><span><strong style="display:block; color:#333; font-size:13px;">Upcoming appointment${escapeHtml(petName)}</strong><small style="display:block; color:#A08F80; margin-top:4px;">Updated ${escapeHtml(formatNotificationDate(updatedAt))}</small><span style="display:block; color:#7A7A7A; font-size:12px; line-height:1.5; margin-top:5px;">${escapeHtml(booking.booking_date)} at ${escapeHtml(time)}${escapeHtml(serviceName)}</span></span></div>
            </a>`;
        });

        if (!relevant.length && !upcoming.length) {
            const emptyState = getEmptyState();
            html += `<div style="margin:18px 0 8px; padding:22px 16px; border:1px dashed #E6D8C9; border-radius:14px; background:linear-gradient(135deg,#FFFDF9,#FAF3EA); text-align:center;"><span style="display:grid; place-items:center; width:42px; height:42px; margin:0 auto 10px; border-radius:13px; background:#FFF1DE; color:#B56616;"><i class="fa-regular fa-bell"></i></span><strong style="display:block; color:#5A361A; font-size:14px;">${emptyState[0]}</strong><span style="display:block; margin-top:5px; color:#8F8175; font-size:12px; line-height:1.5;">${emptyState[1]}</span></div>`;
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

    async function getPageReminders() {
        const reminders = [];
        const needsPets = ['dashboard', 'pets'].includes(context);
        const needsProfile = ['dashboard', 'profile'].includes(context);
        const requests = [];
        if (needsPets) requests.push(request('/api/pets').then(result => ({ kind: 'pets', result })));
        if (needsProfile) requests.push(request('/api/profile').then(result => ({ kind: 'profile', result })));

        const results = await Promise.allSettled(requests);
        results.forEach(entry => {
            if (entry.status !== 'fulfilled') return;
            const { kind, result } = entry.value;
            if (kind === 'pets') {
                (result.data || []).filter(pet => !pet.name || !pet.breed || !pet.gender || !pet.dob || !pet.weight || !pet.photo_url).forEach(pet => {
                    reminders.push({
                        title: `${pet.name || 'Pet'} profile needs attention`,
                        message: 'Add the missing photo, birthday, weight, or basic details to keep this profile complete.',
                        type: 'pet',
                        created_at: new Date().toISOString(),
                        is_read: false
                    });
                });
            }
            if (kind === 'profile' && (!result.data?.full_name || !result.data?.phone_number || !result.data?.address)) {
                reminders.push({
                    title: 'Complete your profile',
                    message: 'Add your phone number and address so PawCare can keep your account and bookings up to date.',
                    type: 'profile',
                    created_at: new Date().toISOString(),
                    is_read: false
                });
            }
        });
        return reminders;
    }

    async function refreshBadge() {
        try {
            const [notificationEntry, bookingEntry, remindersEntry] = await Promise.allSettled([
                request(`/api/notifications?context=${encodeURIComponent(context)}`),
                request('/api/bookings'),
                getPageReminders()
            ]);
            const notificationData = notificationEntry.status === 'fulfilled' ? notificationEntry.value.data || [] : [];
            const bookingData = bookingEntry.status === 'fulfilled' ? bookingEntry.value.data || [] : [];
            const reminders = remindersEntry.status === 'fulfilled' ? remindersEntry.value : [];
            const relevant = relevantNotifications(notificationData);
            const unreadNotifications = relevant.filter(item => !item.is_read).length + reminders.length;
            const seenAtValue = localStorage.getItem('pawcareUserNotificationsSeenAt');
            const seenAt = seenAtValue ? new Date(seenAtValue) : null;
            const notifiedBookingIds = new Set(relevant.filter(item => item.booking_id).map(item => String(item.booking_id)));
            const upcoming = getUpcomingBookings(bookingData, seenAt).filter(booking => !notifiedBookingIds.has(String(booking.booking_id)));
            setBadge(unreadNotifications + upcoming.length);
        } catch (error) {
            console.error('Unable to load user notification count:', error);
        }
    }

    document.addEventListener('click', async function(event) {
        const markReadButton = event.target.closest('[data-notification-read]');
        if (markReadButton) {
            event.preventDefault();
            event.stopPropagation();
            try {
                await request('/api/notifications/read', {
                    method: 'PUT',
                    body: JSON.stringify({ notification_id: markReadButton.dataset.notificationRead })
                });
                markReadButton.remove();
                setBadge(Math.max(0, Number(badge.dataset.unreadCount || 0) - 1));
            } catch (error) {
                console.error('Unable to mark notification as read:', error);
            }
            return;
        }
        if (!event.target.closest('#notificationBtn')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
            const [notificationResult, bookingResult, reminders] = await Promise.all([
                request(`/api/notifications?context=${encodeURIComponent(context)}`),
                request('/api/bookings'),
                getPageReminders()
            ]);
            renderNotificationPanel([...(notificationResult.data || []), ...reminders], bookingResult.data || []);
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
