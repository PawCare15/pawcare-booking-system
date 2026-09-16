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

    const style = document.createElement('style');
    style.textContent = `
        .notif-card {
            background: #ffffff;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid transparent;
            box-shadow: 0 6px 18px rgba(33, 22, 12, 0.06);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            text-align: left;
            animation: notifSlideIn 0.25s ease forwards;
            opacity: 0;
            transform: translateY(8px);
        }
        .notif-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(33, 22, 12, 0.08);
        }
        .notif-card.unread {
            background: #fffaf2;
            border-left-color: #d97706;
        }
        .notif-card.read {
            background: #ffffff;
            border-left-color: #ece6df;
            opacity: 0.9;
        }
        .notif-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .notif-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }
        .notif-icon.booking, .notif-icon.pet { background: #fff1de; color: #b56616; }
        .notif-icon.reschedule { background: #f1eafe; color: #7654b8; }
        .notif-icon.payment { background: #eaf4ff; color: #3173b8; }
        .notif-icon.profile { background: #eaf5ee; color: #247a4a; }
        .notif-icon.security { background: #fdecec; color: #b33a3a; }
        .notif-icon.review { background: #fcecf1; color: #b33f68; }
        .notif-icon.default { background: #f2f0ed; color: #6b625b; }
        .notif-content {
            flex: 1;
            min-width: 0;
        }
        .notif-title {
            font-size: 14px;
            font-weight: 700;
            color: #2f2a27;
            margin-bottom: 4px;
            line-height: 1.4;
            word-break: break-word;
        }
        .notif-time {
            display: block;
            color: #998b7d;
            font-size: 11px;
            margin-bottom: 6px;
        }
        .notif-message {
            font-size: 12px;
            color: #68615d;
            line-height: 1.5;
            word-break: break-word;
        }
        .notif-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-top: 14px;
            padding-top: 12px;
            border-top: 1px dashed #efece6;
        }
        .notif-actions a,
        .notif-actions button {
            font-size: 12px;
            border-radius: 8px;
            transition: all 0.2s ease;
            font-family: 'Poppins', sans-serif;
        }
        .notif-actions a {
            color: #8a4f1d;
            text-decoration: none;
            font-weight: 600;
        }
        .notif-actions a:hover {
            color: #d97706;
            text-decoration: underline;
        }
        .notif-actions button {
            border: 1px solid #d8cab8;
            background: transparent;
            color: #6a5d52;
            padding: 6px 12px;
            cursor: pointer;
        }
        .notif-actions button:hover {
            background: #f7f0ea;
            border-color: #bda995;
            color: #2f2a27;
        }
        .notif-unread-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #d97706;
            box-shadow: 0 0 0 3px rgba(217,119,6,0.12);
            margin-left: 4px;
            vertical-align: middle;
        }
        .notif-empty {
            padding: 28px 16px;
            text-align: center;
            border: 1px dashed #e6d8c9;
            border-radius: 14px;
            background: linear-gradient(135deg, #fffdf9, #faf3ea);
        }
        .notif-empty i {
            display: block;
            font-size: 42px;
            color: #d97706;
            margin-bottom: 10px;
        }
        @keyframes notifSlideIn {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

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
            return `review.html?highlight=${encodeURIComponent(item.review_id || '')}`;
        }
        if (item.type === 'pet') return `mypet.html?highlight=${encodeURIComponent(item.pet_id || '')}`;
        if (item.type === 'profile') return 'profile.html?highlight=profile-info';
        if (item.type === 'security') return 'profile.html?highlight=security-section';
        if (item.type === 'reschedule') {
            return `dashboard.html?highlight=${encodeURIComponent(item.booking_id || '')}`;
        }
        if (item.type === 'booking') return `history.html?highlight=${encodeURIComponent(item.booking_id || '')}`;
        return `${getPageLink()}?highlight=${encodeURIComponent(item.notification_id || '')}`;
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

        let html = `<div style="padding:4px 0 14px; color:#5a361a; font-weight:700; font-size:15px;">${getContextLabel()}<span style="display:block; color:#a08f80; font-size:11px; font-weight:400; margin-top:3px;">Updates chosen for this page</span></div>`;

        relevant.forEach(item => {
            const tone = getNotificationTone(item.type);
            const isUnread = !item.is_read;
            const icon = getNotificationIcon(item.type);
            html += `
                <div class="notif-card ${isUnread ? 'unread' : 'read'}">
                    <div class="notif-header">
                        <div class="notif-icon ${item.type || 'default'}" style="background:${tone[0]}; color:${tone[1]};">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">
                                ${escapeHtml(item.title)}
                                ${isUnread ? '<span class="notif-unread-dot" aria-label="Unread notification"></span>' : ''}
                            </div>
                            <span class="notif-time">${formatNotificationDate(item.created_at)}</span>
                            <div class="notif-message">${escapeHtml(item.message)}</div>
                        </div>
                    </div>
                    <div class="notif-actions">
                        <a href="${getItemLink(item)}">${item.type === 'reschedule' ? 'Review reschedule' : 'View'}</a>
                        ${isUnread ? `<button type="button" data-notification-read="${escapeHtml(item.notification_id)}">Mark read</button>` : ''}
                    </div>
                </div>
            `;
        });

        upcoming.forEach(booking => {
            const petName = booking.pet?.name ? ` for ${booking.pet.name}` : '';
            const serviceName = booking.services?.[0]?.service_name ? ` · ${booking.services[0].service_name}` : '';
            const time = String(booking.booking_time || 'the scheduled time').replace(/:00$/, '');
            const updatedAt = booking.updated_at || booking.created_at;
            const statusMap = {
                pending: '<span style="color:#B56616; font-weight:700;">Pending</span>',
                confirmed: '<span style="color:#146C36; font-weight:700;">Confirmed</span>',
                upcoming: '<span style="color:#146C36; font-weight:700;">Upcoming</span>',
                completed: '<span style="color:#0D47A1; font-weight:700;">Completed</span>',
                cancelled: '<span style="color:#B33A3A; font-weight:700;">Cancelled</span>'
            };
            const statusHtml = statusMap[String(booking.status || '').toLowerCase()]
                || `<span style="color:#B56616; font-weight:700;">${escapeHtml(booking.status || 'Updated')}</span>`;
            const bookingIdStr = booking.booking_id ? `#${escapeHtml(String(booking.booking_id).slice(0, 8))}` : '';
            const bookingLink = booking.booking_id ? `history.html?highlight=${encodeURIComponent(booking.booking_id)}` : 'history.html';

            html += `
                <div class="notif-card unread">
                    <div class="notif-header">
                        <div class="notif-icon booking" style="background:#eaf5ee; color:#247a4a;">
                            <i class="fa-solid fa-clock"></i>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">Upcoming appointment${petName}</div>
                            <span class="notif-time">Updated ${escapeHtml(formatNotificationDate(updatedAt))}</span>
                            <div class="notif-message">
                                Booking ${bookingIdStr} · ${escapeHtml(booking.booking_date)} at ${escapeHtml(time)}${escapeHtml(serviceName)}<br>
                                Status: ${statusHtml}
                            </div>
                        </div>
                    </div>
                    <div class="notif-actions">
                        <a href="${bookingLink}">View booking</a>
                    </div>
                </div>
            `;
        });

        if (!relevant.length && !upcoming.length) {
            const emptyState = getEmptyState();
            html += `
                <div class="notif-empty">
                    <i class="fa-regular fa-bell"></i>
                    <h3 style="font-size:16px; font-weight:700; color:#333; margin:0 0 6px;">${emptyState[0]}</h3>
                    <p style="font-size:13px; max-width:280px; margin:0 auto; color:#7a7a7a; line-height:1.5;">${emptyState[1]}</p>
                </div>
            `;
        }

        content.innerHTML = html;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function getUpcomingBookings(bookings, seenAt) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limit = new Date(today);
        limit.setDate(limit.getDate() + 7);
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
                        pet_id: pet.pet_id,
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
            const includeBookingReminder = ['dashboard', 'booking', 'history', 'pets'].includes(context);
            const notifiedBookingIds = new Set(relevant.filter(item => item.booking_id).map(item => String(item.booking_id)));
            const upcoming = includeBookingReminder
                ? getUpcomingBookings(bookingData, seenAt).filter(booking => !notifiedBookingIds.has(String(booking.booking_id)))
                : [];
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
