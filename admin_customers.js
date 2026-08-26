// 统一放在页面所有 <script> 的最顶部
(function checkAuth() {
    // 定义检查函数
    function doAuthCheck() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        let shouldRedirect = false;
        let redirectUrl = 'index.html';

        if (!token) {
            shouldRedirect = true;
            redirectUrl = 'index.html';
        } else {
            try {
                const userData = JSON.parse(user);
                if (userData.role !== 'admin') {
                    shouldRedirect = true;
                    redirectUrl = 'dashboard.html';
                }
            } catch {
                shouldRedirect = true;
                redirectUrl = 'dashboard.html';
            }
        }

        if (shouldRedirect) {
            // 清空整个页面
            document.documentElement.innerHTML = `
                <html>
                    <head><title>Redirecting...</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#FAF7F2;color:#4A3327;">
                        Redirecting...
                    </body>
                </html>
            `;
            window.location.replace(redirectUrl);
        }
    }

    // 页面初次加载执行
    doAuthCheck();

    // 监听 pageshow 事件，处理 bfcache 恢复
    window.addEventListener('pageshow', function(event) {
        // 如果页面是从 bfcache 恢复，重新执行检查
        if (event.persisted) {
            doAuthCheck();
        }
    });
})();

// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://hrosrmkzzaqhuowrqegz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyb3NybWt6emFxaHVvd3JxZWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTQ1OTMsImV4cCI6MjEwMTA3MDU5M30.53e8JDMj0AId0zyFslIf9h1UmonG5zLJHyipzS28EKk';

// WRAPPER FOR API CALLS WITH TOKEN
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('login.html');
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        localStorage.clear();
        window.location.replace('login.html');
        throw new Error('Unauthorized');
    }
    return response;
}

// SUPABASE DIRECT QUERY FUNCTIONS
async function supabaseQuery(query, params = []) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('login.html');
        return null;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${query}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ params })
        });

        if (!response.ok) {
            throw new Error(`Supabase query failed: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Supabase query error:', err);
        return null;
    }
}

// SCROLLBAR COMPENSATION FOR MODALS
let modalCount = 0;

function lockBodyScroll() {
    if (modalCount === 0) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        document.body.style.overflow = 'hidden';
    }
    modalCount++;
}

function unlockBodyScroll() {
    modalCount--;
    if (modalCount <= 0) {
        modalCount = 0;
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
    }
}

// LOGOUT FUNCTIONS
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        lockBodyScroll();
        modal.classList.add('active');
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

function confirmLogout() {
    localStorage.clear();
    closeLogoutModal();
    window.location.replace('index.html');
}

// ================================================================
// CUSTOMER DATA - LOAD FROM SUPABASE
// ================================================================
let customersData = [];
let currentCustomerId = null;
let previousMonthStats = null;
let adminData = null;

// ================================================================
// LOAD ADMIN PROFILE FROM SUPABASE
// ================================================================
async function loadAdminProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await authFetch('/api/profile');

        if (!response.ok) {
            throw new Error(`Failed to fetch admin profile: ${response.status}`);
        }

        const profileResult = await response.json();
        const admins = profileResult.data ? [profileResult.data] : [];
        
        if (admins && admins.length > 0) {
            adminData = admins[0];
            
            const headerName = document.getElementById('headerName');
            const headerAvatarImg = document.getElementById('headerAvatarImg');
            const headerAvatarPlaceholder = document.getElementById('headerAvatarPlaceholder');
            
            if (headerName) headerName.textContent = adminData.full_name || 'Admin';
            
            if (adminData.profile_photo) {
                if (headerAvatarImg) {
                    headerAvatarImg.src = adminData.profile_photo;
                    headerAvatarImg.style.display = 'block';
                }
                if (headerAvatarPlaceholder) headerAvatarPlaceholder.style.display = 'none';
            } else {
                if (headerAvatarImg) headerAvatarImg.style.display = 'none';
                if (headerAvatarPlaceholder) headerAvatarPlaceholder.style.display = 'inline';
            }
            
            console.log('✅ Admin profile loaded:', adminData.full_name);
        }
    } catch (err) {
        console.error('Error loading admin profile:', err);
        const headerName = document.getElementById('headerName');
        if (headerName) headerName.textContent = 'Admin';
    }
}

// ================================================================
// 统一的 HEADER 功能 - 所有 Admin 页面共用
// ================================================================

// 1. 加载 Admin Profile 到 Header
async function loadAdminHeaderProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.replace('login.html');
                return;
            }
            throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            const profile = result.data;
            const nameEl = document.getElementById('headerName');
            const avatarImg = document.getElementById('headerAvatarImg');
            const placeholder = document.getElementById('headerAvatarPlaceholder');

            if (nameEl) nameEl.textContent = profile.full_name || 'Admin';

            // 更新头像
            if (profile.profile_photo) {
                avatarImg.src = profile.profile_photo;
                avatarImg.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
                // 同时保存到 localStorage 供其他页面使用
                localStorage.setItem('pawcareAvatar', profile.profile_photo);
            } else {
                // 检查 localStorage 是否有缓存的头像
                const cachedAvatar = localStorage.getItem('pawcareAvatar');
                if (cachedAvatar) {
                    avatarImg.src = cachedAvatar;
                    avatarImg.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                } else {
                    avatarImg.style.display = 'none';
                    if (placeholder) placeholder.style.display = 'inline';
                }
            }

            // 更新 user 对象中的 name
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (storedUser && storedUser.id) {
                storedUser.name = profile.full_name || storedUser.name;
                localStorage.setItem('user', JSON.stringify(storedUser));
            }
        }
    } catch (err) {
        console.error('Error loading admin header profile:', err);
        // 如果 localStorage 有缓存，使用缓存
        const cachedAvatar = localStorage.getItem('pawcareAvatar');
        if (cachedAvatar) {
            const avatarImg = document.getElementById('headerAvatarImg');
            const placeholder = document.getElementById('headerAvatarPlaceholder');
            if (avatarImg) {
                avatarImg.src = cachedAvatar;
                avatarImg.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
        }
    }
}

// 2. 打开 User Menu Modal
function openUserMenuModal() {
    const modal = document.getElementById('userMenuModal');
    if (modal) {
        modal.classList.add('active');
        lockBodyScroll();
    }
}

// 3. 关闭 User Menu Modal
function closeUserMenuModal() {
    const modal = document.getElementById('userMenuModal');
    if (modal) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

// 4. 绑定 User Menu 事件
function bindUserMenuEvents() {
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openUserMenuModal();
        });
    }

    const viewProfileBtn = document.getElementById('userViewProfileBtn');
    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', function() {
            closeUserMenuModal();
            window.location.href = 'admin_profile.html';
        });
    }

    const logoutBtn = document.getElementById('userLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            closeUserMenuModal();
            showLogoutModal();
        });
    }

    // 点击 overlay 关闭
    const modal = document.getElementById('userMenuModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeUserMenuModal();
            }
        });
    }

    // 点击关闭按钮
    const closeBtn = document.querySelector('[data-close="userMenuModal"]');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeUserMenuModal();
        });
    }

    // ESC 键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('userMenuModal');
            if (modal && modal.classList.contains('active')) {
                closeUserMenuModal();
            }
        }
    });
}

// 5. 监听头像更新事件（当 Profile 页面更新头像后，其他页面自动同步）
function listenForAvatarUpdates() {
    // 监听 storage 变化（当其他标签页更新时）
    window.addEventListener('storage', function(e) {
        if (e.key === 'pawcareAvatar' && e.newValue) {
            const avatarImg = document.getElementById('headerAvatarImg');
            const placeholder = document.getElementById('headerAvatarPlaceholder');
            if (avatarImg) {
                avatarImg.src = e.newValue;
                avatarImg.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
        }
        if (e.key === 'user' && e.newValue) {
            try {
                const userData = JSON.parse(e.newValue);
                const nameEl = document.getElementById('headerName');
                if (nameEl && userData.name) {
                    nameEl.textContent = userData.name;
                }
            } catch (err) {}
        }
    });

    // 页面可见时重新加载头像（从 Profile 页面返回时刷新）
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            loadAdminHeaderProfile();
        }
    });
}

// ===== 修复通知弹窗关闭（OK / X / 背景点击） =====
const closeNotifBtn = document.getElementById('closeNotificationsModal');
const okNotifBtn = document.getElementById('notificationsModalOkBtn');
const notifModal = document.getElementById('notificationsModal');

if (closeNotifBtn) {
    closeNotifBtn.addEventListener('click', function() {
        notifModal.classList.remove('active');
        unlockBodyScroll();
    });
}
if (okNotifBtn) {
    okNotifBtn.addEventListener('click', function() {
        notifModal.classList.remove('active');
        unlockBodyScroll();
    });
}
if (notifModal) {
    notifModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            unlockBodyScroll();
        }
    });
}

// ===== 确保用户菜单（头像/用户名点击）能正常弹出 =====
// 如果 bindUserMenuEvents 已经定义并调用，则无需重复；若未定义，则使用下面的后备。
// 但大多数页面已有 bindUserMenuEvents，这里只做兜底检查
if (typeof bindUserMenuEvents === 'function') {
    // 已经绑定，忽略
} else {
    // 简单绑定（如果页面没有定义该函数）
    const profileBtn = document.getElementById('profileBtn');
    const userMenuModal = document.getElementById('userMenuModal');
    if (profileBtn && userMenuModal) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenuModal.classList.add('active');
            lockBodyScroll();
        });
        // 关闭按钮
        const closeMenuBtn = userMenuModal.querySelector('[data-close="userMenuModal"]');
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', function() {
                userMenuModal.classList.remove('active');
                unlockBodyScroll();
            });
        }
        userMenuModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                unlockBodyScroll();
            }
        });
    }
}

// ================================================================
// NOTIFICATION FUNCTIONS - CUSTOMER PAGE
// ================================================================

// 1. GET NEW CUSTOMERS TODAY
async function getNewCustomersToday() {
    try {
        const token = localStorage.getItem('token');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/customer?select=customer_id,full_name,email,phone_number,created_at&created_at=gte.${todayStr}&order=created_at.desc`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch new customers: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Error getting new customers today:', err);
        return [];
    }
}

// 2. GET CUSTOMERS WITH PENDING BOOKINGS
async function getCustomersWithPendingBookings() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/booking?select=booking_id,customer_id,booking_date,booking_time,status&status=eq.pending&order=booking_date.asc`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch pending bookings: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Error getting customers with pending bookings:', err);
        return [];
    }
}

// 3. GET INACTIVE CUSTOMERS (> 3 months no booking)
async function getInactiveCustomers() {
    try {
        const token = localStorage.getItem('token');
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const threeMonthsStr = threeMonthsAgo.toISOString();
        
        const customerResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/customer?select=customer_id,full_name,email,phone_number,created_at`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!customerResponse.ok) {
            throw new Error(`Failed to fetch customers: ${customerResponse.status}`);
        }

        const allCustomers = await customerResponse.json();
        
        const bookingResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/booking?select=customer_id,booking_date&booking_date=gte.${threeMonthsStr}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!bookingResponse.ok) {
            throw new Error(`Failed to fetch bookings: ${bookingResponse.status}`);
        }

        const recentBookings = await bookingResponse.json();
        
        const activeCustomerIds = new Set();
        recentBookings.forEach(b => {
            if (b.customer_id) activeCustomerIds.add(b.customer_id);
        });
        
        const inactiveCustomers = allCustomers.filter(c => 
            !activeCustomerIds.has(c.customer_id) && c.created_at < threeMonthsStr
        );
        
        return inactiveCustomers;
    } catch (err) {
        console.error('Error getting inactive customers:', err);
        return [];
    }
}

// 4. GET TOP CUSTOMERS (by booking count)
async function getTopCustomers(limit = 3) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/booking?select=customer_id,status`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch bookings: ${response.status}`);
        }

        const bookings = await response.json();
        
        const bookingCount = {};
        bookings.forEach(b => {
            if (b.customer_id && b.status === 'completed') {
                bookingCount[b.customer_id] = (bookingCount[b.customer_id] || 0) + 1;
            }
        });
        
        const sorted = Object.entries(bookingCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        
        const topCustomers = [];
        for (const [customerId, count] of sorted) {
            const customer = customersData.find(c => c.customer_id === customerId);
            if (customer) {
                topCustomers.push({
                    customer_id: customerId,
                    name: customer.name,
                    email: customer.email,
                    bookings: count
                });
            }
        }
        
        return topCustomers;
    } catch (err) {
        console.error('Error getting top customers:', err);
        return [];
    }
}

// ================================================================
// LOAD NOTIFICATION COUNT - CUSTOMER PAGE
// ================================================================
async function loadNotificationCount() {
    try {
        const newCustomers = await getNewCustomersToday();
        const pendingBookings = await getCustomersWithPendingBookings();
        
        const uniqueCustomersWithPending = new Set();
        pendingBookings.forEach(b => {
            if (b.customer_id) uniqueCustomersWithPending.add(b.customer_id);
        });
        
        const totalNotifications = newCustomers.length + uniqueCustomersWithPending.size;
        
        const notifCount = document.getElementById('notifCount');
        if (notifCount) {
            if (totalNotifications > 0) {
                notifCount.textContent = totalNotifications;
                notifCount.classList.add('show');
                notifCount.style.display = 'flex';
            } else {
                notifCount.textContent = '';
                notifCount.classList.remove('show');
                notifCount.style.display = 'none';
            }
        }

        window.notificationData = {
            newCustomers: newCustomers,
            pendingBookings: pendingBookings,
            total: totalNotifications
        };

        console.log(`🔔 Customer Notifications: ${totalNotifications} (New: ${newCustomers.length}, Pending: ${uniqueCustomersWithPending.size})`);
        
        return totalNotifications;

    } catch (err) {
        console.error('Error loading notification count:', err);
        const notifCount = document.getElementById('notifCount');
        if (notifCount) {
            notifCount.textContent = '';
            notifCount.classList.remove('show');
            notifCount.style.display = 'none';
        }
        return 0;
    }
}

// ================================================================
// SHOW NOTIFICATION DETAILS - CUSTOMER PAGE
// ================================================================
async function showNotificationDetails() {
    const [custRes, bookRes] = await Promise.all([
        authFetch('/api/admin/customers'),
        authFetch('/api/admin/bookings')
    ]);
    const customers = custRes.data || [];
    const bookings = bookRes.data || [];

    const today = new Date().toISOString().split('T')[0];
    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3); const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

    // 前端计算
    const newCustomers = customers.filter(c => c.created_at && c.created_at.startsWith(today)).length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const inactiveCustomers = customers.filter(c => !bookings.some(b => b.customer_id === c.customer_id && b.booking_date >= threeMonthsAgoStr)).length;
    // Top customers 直接拿后端已经有的统计接口
    const topRes = await authFetch('/api/admin/top-customers');
    const topCustomers = topRes.data || [];

    const notifCount = document.getElementById('notifCount');
    if (notifCount) {
        const total = newCustomers + pendingBookings;
        notifCount.textContent = total; notifCount.style.display = total > 0 ? 'flex' : 'none';
    }

    function notifCard(icon, iconBg, iconColor, title, desc, count, badgeBg, badgeColor, link) {
        return `<div style="display:flex; gap:12px; padding:16px; margin-bottom:10px; border-radius:12px; background:#FFFFFF; border-left:4px solid ${badgeColor}; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; background:${iconBg}; color:${iconColor};">${icon}</div>
            <div style="flex:1; min-width:0;"><div style="font-weight:600; font-size:14px; color:#333;">${title}</div><div style="font-size:12px; color:#7A7A7A;">${desc}</div></div>
            <div style="flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between;">
                <span style="background:${badgeBg}; color:${badgeColor}; padding:3px 12px; border-radius:20px; font-size:11px; font-weight:700; margin-bottom:8px;">${count}</span>
                <a href="${link}" style="font-size:11px; color:#5A361A; font-weight:600; text-decoration:none;">View →</a>
            </div></div>`;
    }

    let html = '';
    if (newCustomers > 0) html += notifCard("👤", "#FEF7E0", "#D97706", "New Customers Today", "Pelanggan baru daftar hari ini", newCustomers, "#FEF7E0", "#D97706", "admin_customers.html");
    if (pendingBookings > 0) html += notifCard("📋", "#FEF7E0", "#D97706", "Customers with Pending Bookings", "Pelanggan yang ada booking pending", pendingBookings, "#FEF7E0", "#D97706", "admin_bookings.html");
    if (inactiveCustomers.length > 0) html += notifCard("📉", "#E3F2FD", "#0D47A1", "Inactive Customers", "Pelanggan yang tak pernah booking > 3 bulan", inactiveCustomers.length, "#E3F2FD", "#0D47A1", "admin_customers.html?status=inactive");
    if (topCustomers.length > 0) html += notifCard("🏆", "#E8F5E9", "#2E7D32", "Top Customers", "Pelanggan dengan booking terbanyak", topCustomers.length, "#E8F5E9", "#2E7D32", "admin_customers.html");

    if (!html) { html = '<div style="text-align:center; padding:40px 20px;">No customer notifications.</div>'; }
    document.getElementById('notificationsModalContent').innerHTML = html;
    document.getElementById('notificationsModal').classList.add('active');
    lockBodyScroll();
}

// ================================================================
// LOAD CUSTOMERS FROM SUPABASE
// ================================================================
async function loadCustomersFromSupabase() {
    try {
        // 🆕 TAMBAHAN: Debug logging
        console.log('🔍 Loading customers...');
        console.log('🔍 Token exists:', !!localStorage.getItem('token'));

        const response = await authFetch('/api/admin/customers');

        // 🆕 TAMBAHAN: Log response status
        console.log('📡 Response status:', response.status);

        if (response.status === 403) {
            console.error('❌ Forbidden - admin access required');
            showValidationModal('Permission denied. Please contact admin.');
            return [];
        }

        if (!response.ok) {
            // 🆕 TAMBAHAN: Get detailed error
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = 'No error details available';
            }
            console.error('❌ Supabase error response:', errorText);
            throw new Error(`Failed to fetch customers: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const customers = result.data || [];
        console.log('✅ Customers loaded successfully:', customers.length);
        
        customersData = customers.map(customer => ({
            id: customer.customer_id || '#CUS-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
            customer_id: customer.customer_id,
            name: customer.full_name || 'Unknown',
            email: customer.email || '',
            phone: customer.phone_number || '',
            address: customer.address || '',
            profile_photo: customer.profile_photo || '',
            created_at: customer.created_at || new Date().toISOString(),
            bookings: Number(customer.booking_count) || 0,
            completed: Number(customer.completed_booking_count) || 0,
            cancelled: Number(customer.cancelled_booking_count) || 0,
            recentBookings: [],
            status: customer.status || 'Active'
        }));

        await loadCustomerBookingStats();

        renderCustomerTable(customersData);
        loadCustomerStats();
        loadNotificationCount();
        
        return customersData;
    } catch (err) {
        console.error('Error loading customers from Supabase:', err);
        // 🆕 TAMBAHAN: Better error message
        showValidationModal(`Failed to load customers from database: ${err.message}. Please refresh.`);
        return [];
    }
}

// ================================================================
// LOAD CUSTOMER BOOKING STATS
// ================================================================
async function loadCustomerBookingStats() {
    try {
        const response = await authFetch('/api/admin/bookings');
        if (!response || !response.ok) throw new Error(`Failed to fetch bookings: ${response?.status || 'network error'}`);
        const result = await response.json();
        const bookings = result.data || [];

        const bookingMap = {};
        bookings.forEach(booking => {
            const customerId = booking.customer_id;
            if (!bookingMap[customerId]) {
                bookingMap[customerId] = {
                    total: 0,
                    completed: 0,
                    cancelled: 0
                };
            }
            bookingMap[customerId].total++;
            if (booking.status === 'completed') bookingMap[customerId].completed++;
            if (booking.status === 'cancelled') bookingMap[customerId].cancelled++;
        });

        customersData.forEach(customer => {
            const stats = bookingMap[customer.customer_id] || { total: 0, completed: 0, cancelled: 0 };
            customer.bookings = stats.total;
            customer.completed = stats.completed;
            customer.cancelled = stats.cancelled;
        });

        await loadRecentBookingsForCustomers();

    } catch (err) {
        console.error('Error loading booking stats:', err);
    }
}

// ================================================================
// LOAD RECENT BOOKINGS FOR CUSTOMERS
// ================================================================
async function loadRecentBookingsForCustomers() {
    try {
        const response = await authFetch('/api/admin/bookings');
        if (!response || !response.ok) throw new Error(`Failed to fetch recent bookings: ${response?.status || 'network error'}`);
        const result = await response.json();
        const bookings = result.data || [];

        const recentMap = {};
        bookings.forEach(booking => {
            const customerId = booking.customer_id;
            if (!recentMap[customerId]) {
                recentMap[customerId] = [];
            }
            if (recentMap[customerId].length < 3) {
                recentMap[customerId].push({
                    service: 'Booking',
                    date: booking.booking_date ? 
                        new Date(booking.booking_date).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                        }) + ', ' + (booking.booking_time || 'N/A') : 
                        'N/A'
                });
            }
        });

        customersData.forEach(customer => {
            customer.recentBookings = recentMap[customer.customer_id] || [];
        });

    } catch (err) {
        console.error('Error loading recent bookings:', err);
    }
}

// ================================================================
// GET PREVIOUS MONTH STATS
// ================================================================
async function getPreviousMonthStats() {
    try {
        const token = localStorage.getItem('token');
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear = currentYear - 1;
        }
        
        const firstDayPrev = new Date(prevYear, prevMonth, 1).toISOString();
        const firstDayCurrent = new Date(currentYear, currentMonth, 1).toISOString();
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/customer?select=customer_id&created_at=gte.${firstDayPrev}&created_at=lt.${firstDayCurrent}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch previous month stats: ${response.status}`);
        }

        const prevMonthCustomers = await response.json();
        
        const totalResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/customer?select=customer_id&created_at=lt.${firstDayCurrent}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!totalResponse.ok) {
            throw new Error(`Failed to fetch total customers: ${totalResponse.status}`);
        }

        const totalPrev = await totalResponse.json();

        return {
            newCustomers: prevMonthCustomers.length,
            totalCustomers: totalPrev.length
        };
        
    } catch (err) {
        console.error('Error getting previous month stats:', err);
        return { newCustomers: 0, totalCustomers: 0 };
    }
}

// ================================================================
// RENDER CUSTOMER TABLE
// ================================================================
function renderCustomerTable(data) {
    const tbody = document.getElementById('customerTableBody');
    const countSpan = document.getElementById('customerCount');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#7A7A7A; padding:20px;">No customers found</td></tr>`;
        if (countSpan) countSpan.textContent = '0';
        return;
    }
    
    if (countSpan) countSpan.textContent = data.length;
    
    tbody.innerHTML = data.map(customer => {
        let statusClass = customer.status ? 
            (customer.status === 'pending_deletion' ? 'pending-deletion' : customer.status.toLowerCase()) 
            : 'active';
        
        let statusDisplay = customer.status || 'Active';
        if (customer.status === 'pending_deletion') {
            statusDisplay = '⏳ Pending Deletion';
        }
        
        const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        
        let joinDate = 'N/A';
        if (customer.created_at) {
            try {
                joinDate = new Date(customer.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            } catch (e) {
                joinDate = 'N/A';
            }
        }
        
        const avatarHtml = customer.profile_photo ? 
            `<img src="${customer.profile_photo}" alt="${customer.name}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0;">` :
            `<div style="width:28px; height:28px; border-radius:50%; background:#FDF3E7; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:11px; color:#5A361A; flex-shrink:0;">${initials}</div>`;
        
        return `<tr>
            <td><strong>${customer.id || customer.customer_id || 'N/A'}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${avatarHtml}
                    ${customer.name}
                </div>
            </td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td style="text-align:center;">${customer.bookings || 0}</td>
            <td>${joinDate}</td>
            <td>
                <span class="status-badge-sm ${statusClass}">${statusDisplay}</span>
                ${customer.status === 'pending_deletion' ? 
                    `<span style="display: inline-block; margin-left: 6px; font-size: 10px; background: #FEF7E0; color: #92400E; padding: 2px 10px; border-radius: 12px;">
                        ⏳ Waiting for customer
                    </span>` : ''}
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-action view" onclick="viewCustomerDetail('${customer.customer_id}')" title="View Details">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="btn-action edit" onclick="openEditModal('${customer.customer_id}')" title="Edit">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    ${customer.status !== 'pending_deletion' ? 
                        `<button class="btn-action delete" onclick="openDeleteModal('${customer.customer_id}')" title="Delete">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>` : 
                        `<button class="btn-action" style="background:#F5F0EB; color:#B0A090; cursor:not-allowed;" title="Pending deletion" disabled>
                            <i class="fa-regular fa-clock"></i>
                        </button>`
                    }
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ================================================================
// VIEW CUSTOMER DETAIL - SHOW MODAL
// ================================================================
function viewCustomerDetail(id) {
    const customer = customersData.find(c => c.customer_id === id);
    
    if (!customer) {
        showValidationModal('Customer not found!');
        return;
    }
    
    const modal = document.getElementById('customerDetailModal');
    const content = document.getElementById('customerDetailContent');
    
    const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const statusClass = customer.status ? 
        (customer.status === 'pending_deletion' ? 'pending-deletion' : customer.status.toLowerCase()) 
        : 'active';
    
    const avatarHtml = customer.profile_photo ? 
        `<img src="${customer.profile_photo}" alt="${customer.name}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid #EFE4D8;">` :
        `<div class="detail-modal-avatar">${initials}</div>`;
    
    let recentBookingsHtml = '';
    if (customer.recentBookings && customer.recentBookings.length > 0) {
        recentBookingsHtml = customer.recentBookings.map(booking => {
            return `<div class="booking-item">
                <span class="service"><i class="fa-regular fa-calendar-check"></i> ${booking.service}</span>
                <span class="date">${booking.date}</span>
            </div>`;
        }).join('');
    } else {
        recentBookingsHtml = '<div style="color:#8A7A6A; font-size:13px; padding:12px 16px; text-align:center;">No recent bookings</div>';
    }

    let joinDate = 'N/A';
    if (customer.created_at) {
        try {
            joinDate = new Date(customer.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            joinDate = 'N/A';
        }
    }
    
    content.innerHTML = `
        <div class="detail-modal-header">
            ${avatarHtml}
            <div>
                <div class="detail-modal-name">${customer.name}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; align-items:center;">
                    <span class="detail-modal-id"><i class="fa-regular fa-id-card"></i> ${customer.id || customer.customer_id}</span>
                    <span style="font-size:12px; color:#8A7A6A;"><i class="fa-regular fa-calendar"></i> Joined ${joinDate}</span>
                    <span class="detail-modal-status ${statusClass}">${customer.status || 'Active'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-regular fa-address-card"></i> Personal Information
            </div>
            <div class="detail-info-grid">
                <div class="detail-info-item">
                    <span class="label">Full Name</span>
                    <span class="value">${customer.name}</span>
                </div>
                <div class="detail-info-item">
                    <span class="label">Phone Number</span>
                    <span class="value">${customer.phone || 'N/A'}</span>
                </div>
                <div class="detail-info-item">
                    <span class="label">Email</span>
                    <span class="value">${customer.email || 'N/A'}</span>
                </div>
                <div class="detail-info-item full-width">
                    <span class="label">Address</span>
                    <span class="value">${customer.address || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-regular fa-calendar-check"></i> Booking Summary
            </div>
            <div class="summary-cards">
                <div class="summary-card total">
                    <span class="number">${customer.bookings || 0}</span>
                    <span class="label">Total Bookings</span>
                </div>
                <div class="summary-card completed">
                    <span class="number">${customer.completed || 0}</span>
                    <span class="label">Completed</span>
                </div>
                <div class="summary-card cancelled">
                    <span class="number">${customer.cancelled || 0}</span>
                    <span class="label">Cancelled</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-regular fa-clock"></i> Recent Bookings
            </div>
            <div class="booking-list">
                ${recentBookingsHtml}
            </div>
        </div>
        
        <div class="detail-actions">
            <button class="btn btn-secondary" onclick="closeCustomerDetail()">Close</button>
            <button class="btn btn-primary" onclick="closeCustomerDetail(); openEditModal('${customer.customer_id}')">
                <i class="fa fa-pencil" aria-hidden="true"></i> Edit
            </button>
            ${customer.status !== 'pending_deletion' ? 
                `<button class="btn btn-danger" onclick="closeCustomerDetail(); openDeleteModal('${customer.customer_id}')">
                    <i class="fa fa-trash-o" aria-hidden="true"></i> Delete
                </button>` : 
                `<button class="btn" style="background:#F5F0EB; color:#B0A090; cursor:not-allowed;" disabled>
                    <i class="fa-regular fa-clock"></i> Pending Deletion
                </button>`
            }
        </div>
    `;
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closeCustomerDetail() {
    const modal = document.getElementById('customerDetailModal');
    modal.classList.remove('active');
    unlockBodyScroll();
}

// ================================================================
// EDIT CUSTOMER - OPEN MODAL
// ================================================================
function openEditModal(id) {
    const customer = customersData.find(c => c.customer_id === id);
    
    if (!customer) {
        showValidationModal('Customer not found!');
        return;
    }
    
    currentCustomerId = id;
    const modal = document.getElementById('editCustomerModal');
    const content = document.getElementById('editCustomerContent');
    
    const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    
    content.innerHTML = `
        <div class="edit-header">
            <div class="edit-avatar">${initials}</div>
            <div class="edit-title">
                <h3>Edit Customer</h3>
                <span>${customer.id || customer.customer_id}</span>
            </div>
        </div>
        
        <form id="editCustomerForm" onsubmit="saveEditCustomer(event)">
            <div class="edit-form">
                <div class="field full-width">
                    <label>Full Name <span class="required">*</span></label>
                    <input type="text" id="editName" value="${customer.name}" required>
                </div>
                <div class="field">
                    <label>Email <span class="required">*</span></label>
                    <input type="email" id="editEmail" value="${customer.email || ''}" required>
                </div>
                <div class="field">
                    <label>Phone <span class="required">*</span></label>
                    <input type="text" id="editPhone" value="${customer.phone || ''}" required>
                </div>
                <div class="field full-width">
                    <label>Address</label>
                    <textarea id="editAddress" rows="2">${customer.address || ''}</textarea>
                </div>
                <div class="field">
                    <label>Status</label>
                    <select id="editStatus">
                        <option value="Active" ${customer.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${customer.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
            </div>
            
            <div class="edit-actions">
                <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fa fa-pencil" aria-hidden="true"></i> Save Changes
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closeEditModal() {
    const modal = document.getElementById('editCustomerModal');
    modal.classList.remove('active');
    unlockBodyScroll();
    currentCustomerId = null;
}

// ================================================================
// SAVE EDIT CUSTOMER - UPDATE SUPABASE
// ================================================================
async function saveEditCustomer(event) {
    event.preventDefault();
    
    const id = currentCustomerId;
    const customer = customersData.find(c => c.customer_id === id);
    
    if (!customer) {
        showValidationModal('Customer not found!');
        return;
    }
    
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    const status = document.getElementById('editStatus').value;
    
    if (!name) {
        showValidationModal('Please enter full name.');
        document.getElementById('editName').focus();
        return;
    }
    if (!email) {
        showValidationModal('Please enter email.');
        document.getElementById('editEmail').focus();
        return;
    }
    if (!phone) {
        showValidationModal('Please enter phone number.');
        document.getElementById('editPhone').focus();
        return;
    }
    
    try {
        const response = await authFetch(`/api/admin/customers/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: name,
                email: email,
                phone_number: phone,
                address: address || null,
                status
            })
        });

        if (!response.ok) {
            let errorMessage = `Failed to update customer: ${response.status}`;
            try {
                const errorResult = await response.json();
                errorMessage = errorResult.message || errorMessage;
            } catch (parseError) {}
            throw new Error(errorMessage);
        }

        customer.name = name;
        customer.email = email;
        customer.phone = phone;
        customer.address = address || customer.address;
        customer.status = status;
        
        closeEditModal();
        renderCustomerTable(customersData);
        loadCustomerStats();
        showSuccessModal('Customer Updated Successfully!', `Customer ${customer.name} (${customer.id}) has been updated successfully.`);
        
    } catch (err) {
        console.error('Error updating customer:', err);
        showValidationModal(`Failed to update customer: ${err.message}`);
    }
}

// ================================================================
// DELETE CUSTOMER - WITH EMAIL NOTIFICATION
// ================================================================
function openDeleteModal(id) {
    const customer = customersData.find(c => c.customer_id === id);
    
    if (!customer) {
        showValidationModal('Customer not found!');
        return;
    }
    
    // Check if customer already has pending deletion
    if (customer.status === 'pending_deletion') {
        showValidationModal(`
            ⏳ This customer already has a pending deletion request.<br>
            They need to click the link in their email to confirm.
        `);
        return;
    }
    
    currentCustomerId = id;
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    // Update modal title
    document.querySelector('#deleteConfirmModal .modal-title').textContent = '🗑️ Delete Customer';
    
    message.innerHTML = `
        <div style="text-align: left;">
            <p>Are you sure you want to delete <strong>${customer.name}</strong>?</p>
            <div style="background: #FEF7E0; border-left: 4px solid #D97706; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
                <p style="font-size: 13px; color: #92400E; margin: 0 0 4px 0;">
                    <i class="fa-regular fa-envelope"></i> 
                    An email will be sent to <strong>${customer.email}</strong>
                </p>
                <p style="font-size: 12px; color: #92400E; margin: 0;">
                    ⏳ They just need to <strong>click the link</strong> in the email to delete their account.
                </p>
            </div>
            <div style="background: #FCE8E6; border-left: 4px solid #DC2626; padding: 10px 14px; border-radius: 8px; margin: 8px 0;">
                <p style="font-size: 12px; color: #B91C1C; margin: 0;">
                    <i class="fa-solid fa-triangle-exclamation"></i> 
                    All customer data will be permanently deleted from the system.
                </p>
            </div>
            <p style="font-size: 12px; color: #7A7A7A; margin-top: 8px;">
                <i class="fa-regular fa-clock"></i> Link expires in <strong>7 days</strong>
            </p>
        </div>
    `;
    
    // Replace confirm button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.textContent = '📧 Send Deletion Email';
    newConfirmBtn.addEventListener('click', function() {
        confirmDeleteCustomerWithEmail();
    });
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('active');
    unlockBodyScroll();
    currentCustomerId = null;
}

// ================================================================
// CONFIRM DELETE WITH EMAIL
// ================================================================
async function confirmDeleteCustomerWithEmail() {
    const id = currentCustomerId;
    
    if (!id) {
        showValidationModal('No customer selected for deletion.');
        return;
    }
    
    const customer = customersData.find(c => c.customer_id === id);
    if (!customer) {
        showValidationModal('Customer not found!');
        return;
    }
    
    // Show loading state
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = '⏳ Sending email...';
    confirmBtn.disabled = true;
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 30000);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/customers/${id}/delete-request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        const data = await response.json();

        if (data.success) {
            // Update customer status locally
            const customerIndex = customersData.findIndex(c => c.customer_id === id);
            if (customerIndex !== -1) {
                customersData[customerIndex].status = 'pending_deletion';
            }
            
            closeDeleteModal();
            renderCustomerTable(customersData);
            loadCustomerStats();
            
            showSuccessModal(
                '📧 Email Sent!', 
                `A deletion confirmation email has been sent to <strong>${customer.email}</strong>.<br><br>
                The customer just needs to <strong>click the link</strong> in the email to delete their account.<br><br>
                <span style="font-size: 13px; color: #7A7A7A;">
                    ⏳ The link will expire in 7 days.
                </span>`
            );
        } else {
            showValidationModal(data.message || 'Failed to send deletion request.');
        }
        
    } catch (err) {
        console.error('Error deleting customer:', err);
        const message = err.name === 'AbortError'
            ? 'The request took too long. Please check the server and try again.'
            : 'Unable to connect to server. Please try again.';
        showValidationModal(message);
    } finally {
        clearTimeout(requestTimeout);
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}

// ================================================================
// SUCCESS MODAL
// ================================================================
function showSuccessModal(title, message) {
    const modal = document.getElementById('successModal');
    const titleEl = document.getElementById('successTitle');
    const messageEl = document.getElementById('successMessage');
    
    titleEl.textContent = title;
    // 🆕 TAMBAHAN: Handle HTML message for better formatting
    if (message.includes('<')) {
        messageEl.innerHTML = message;
    } else {
        messageEl.textContent = message;
    }
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
    unlockBodyScroll();
}

// ================================================================
// VALIDATION MODAL
// ================================================================
function showValidationModal(message) {
    const modal = document.getElementById('validationModal');
    const msgEl = document.getElementById('validationMessage');
    if (modal && msgEl) {
        // 🆕 TAMBAHAN: Handle HTML message
        if (message.includes('<')) {
            msgEl.innerHTML = message;
        } else {
            msgEl.textContent = message;
        }
        lockBodyScroll();
        modal.classList.add('active');
    }
}

function hideValidationModal() {
    const modal = document.getElementById('validationModal');
    if (modal) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

// ================================================================
// SEARCH CUSTOMERS
// ================================================================
function searchCustomers(query) {
    const filtered = customersData.filter(customer => {
        const searchTerm = query.toLowerCase().trim();
        return customer.name.toLowerCase().includes(searchTerm) ||
               customer.email.toLowerCase().includes(searchTerm) ||
               customer.phone.includes(searchTerm);
    });
    renderCustomerTable(filtered);
}

// ================================================================
// LOAD CUSTOMER STATS - REAL TIME CALCULATION
// ================================================================
async function loadCustomerStats() {
    const total = customersData.length;
    const active = customersData.filter(c => c.status === 'Active').length;
    const inactive = customersData.filter(c => c.status === 'Inactive').length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDayCurrent = new Date(currentYear, currentMonth, 1);
    
    let newCustomers = 0;
    customersData.forEach(c => {
        if (c.created_at) {
            try {
                const date = new Date(c.created_at);
                if (date >= firstDayCurrent) {
                    newCustomers++;
                }
            } catch (e) {}
        }
    });
    
    const prevStats = await getPreviousMonthStats();
    
    const totalChange = calculatePercentageChange(prevStats.totalCustomers, total);
    const newChange = calculatePercentageChange(prevStats.newCustomers, newCustomers);
    
    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const inactivePercent = total > 0 ? Math.round((inactive / total) * 100) : 0;
    
    document.getElementById('totalCustomers').textContent = total;
    document.getElementById('newCustomers').textContent = newCustomers;
    document.getElementById('activeCustomers').textContent = active;
    document.getElementById('inactiveCustomers').textContent = inactive;
    
    const totalChangeEl = document.querySelector('.stat-card-balance:nth-child(1) .stat-change');
    const newChangeEl = document.querySelector('.stat-card-balance:nth-child(2) .stat-change');
    const activePercentEl = document.querySelector('.stat-card-balance:nth-child(3) .stat-change');
    const inactivePercentEl = document.querySelector('.stat-card-balance:nth-child(4) .stat-change');
    
    if (totalChangeEl) {
        totalChangeEl.textContent = totalChange;
        totalChangeEl.className = `stat-change ${totalChange.startsWith('+') ? 'positive' : totalChange.startsWith('-') ? 'negative' : ''}`;
    }
    
    if (newChangeEl) {
        newChangeEl.textContent = newChange;
        newChangeEl.className = `stat-change ${newChange.startsWith('+') ? 'positive' : newChange.startsWith('-') ? 'negative' : ''}`;
    }
    
    if (activePercentEl) {
        activePercentEl.textContent = `${activePercent}% of total`;
        activePercentEl.className = 'stat-change positive';
    }
    
    if (inactivePercentEl) {
        inactivePercentEl.textContent = `${inactivePercent}% of total`;
        inactivePercentEl.className = inactivePercent > 0 ? 'stat-change negative' : 'stat-change';
    }
}

// ================================================================
// HELPER: CALCULATE PERCENTAGE CHANGE
// ================================================================
function calculatePercentageChange(prevValue, currentValue) {
    if (prevValue === 0 && currentValue === 0) return '+0%';
    if (prevValue === 0) return '+100%';
    
    const change = ((currentValue - prevValue) / prevValue) * 100;
    const rounded = Math.round(change);
    const sign = rounded >= 0 ? '+' : '';
    
    return `${sign}${rounded}%`;
}

// ================================================================
// DOM READY - INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', function() {

    bindUserMenuEvents();

    // SIDEBAR TOGGLE
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (menuToggle) menuToggle.addEventListener('click', openSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
            closeLogoutModal();
            closeCustomerDetail();
            closeEditModal();
            closeDeleteModal();
            closeSuccessModal();
            hideValidationModal();
            // Close notification modal if open
            const notifModal = document.getElementById('notificationsModal');
            if (notifModal && notifModal.classList.contains('active')) {
                notifModal.classList.remove('active');
                unlockBodyScroll();
            }
        }
    });

    // ================================================================
    // NOTIFICATION BUTTON - SHOW DETAILS
    // ================================================================
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        // Remove any existing listeners to prevent duplicates
        notificationBtn.removeEventListener('click', showNotificationDetails);
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('🔔 Notification button clicked!');
            showNotificationDetails();
        });
    } else {
        console.warn('⚠️ Notification button not found!');
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchCustomers(e.target.value);
        });
    }

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                unlockBodyScroll();
            }
        });
    });

    // ================================================================
    // LOAD ADMIN PROFILE FIRST
    // ================================================================
    loadAdminProfile();

    // ================================================================
    // THEN LOAD CUSTOMER DATA
    // ================================================================
    loadCustomersFromSupabase();

    console.log('PAWCARE ADMIN CUSTOMERS LOADED SUCCESSFULLY!');
    console.log('Connected to Supabase customer table.');
    
    // 🆕 TAMBAHAN: Log environment info for debugging
    console.log('🔧 Environment:');
    console.log('  - SUPABASE_URL:', SUPABASE_URL);
    console.log('  - Token exists:', !!localStorage.getItem('token'));
    console.log('  - User role:', localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).role : 'None');
});