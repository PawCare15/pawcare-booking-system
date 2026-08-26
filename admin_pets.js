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

// SUPABASE DIRECT QUERY FUNCTIONS - KEEP FOR BACKWARD COMPATIBILITY
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
function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('active');
    unlockBodyScroll();
    currentPetId = null;
}

// ================================================================
// PET DATA - LOAD FROM SUPABASE
// ================================================================
let petsData = [];
let customersData = [];
let currentPetId = null;
let isEditMode = false;
let tempImageData = null;

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
            const adminData = admins[0];
            
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
// NOTIFICATION FUNCTIONS - PET PAGE
// ================================================================

// 1. GET NEW PETS TODAY
async function getNewPetsToday() {
    try {
        const token = localStorage.getItem('token');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/pet?select=pet_id,pet_name,species,breed,customer_id,created_at&created_at=gte.${todayStr}&order=created_at.desc`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch new pets: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Error getting new pets today:', err);
        return [];
    }
}

// 2. GET PETS WITH UPCOMING BOOKINGS (within 3 days)
async function getPetsWithUpcomingBookings() {
    try {
        const token = localStorage.getItem('token');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        const threeDaysStr = threeDaysLater.toISOString();
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/booking?select=pet_id,booking_date,booking_time,status&status=in.(pending,upcoming)&booking_date=gte.${todayStr}&booking_date=lte.${threeDaysStr}&order=booking_date.asc`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch upcoming bookings: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Error getting pets with upcoming bookings:', err);
        return [];
    }
}

// 3. GET PETS WITH SPECIAL NOTES
async function getPetsWithSpecialNotes() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/pet?select=pet_id,pet_name,species,breed,special_notes,customer_id&special_notes=not.is.null&special_notes=neq.`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch pets with special notes: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Error getting pets with special notes:', err);
        return [];
    }
}

// 4. GET INACTIVE PETS (> 6 months no booking)
async function getInactivePets() {
    try {
        const token = localStorage.getItem('token');
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsStr = sixMonthsAgo.toISOString();
        
        const petResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/pet?select=pet_id,pet_name,species,breed,customer_id,created_at`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!petResponse.ok) {
            throw new Error(`Failed to fetch pets: ${petResponse.status}`);
        }

        const allPets = await petResponse.json();
        
        const bookingResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/booking?select=pet_id,booking_date&booking_date=gte.${sixMonthsStr}`,
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
        
        const activePetIds = new Set();
        recentBookings.forEach(b => {
            if (b.pet_id) activePetIds.add(b.pet_id);
        });
        
        const inactivePets = allPets.filter(p => 
            !activePetIds.has(p.pet_id) && p.created_at < sixMonthsStr
        );
        
        return inactivePets;
    } catch (err) {
        console.error('Error getting inactive pets:', err);
        return [];
    }
}

// ================================================================
// LOAD NOTIFICATION COUNT - PET PAGE
// ================================================================
async function loadNotificationCount() {
    try {
        const newPets = await getNewPetsToday();
        const upcomingBookings = await getPetsWithUpcomingBookings();
        
        const uniquePetsWithUpcoming = new Set();
        upcomingBookings.forEach(b => {
            if (b.pet_id) uniquePetsWithUpcoming.add(b.pet_id);
        });
        
        const totalNotifications = newPets.length + uniquePetsWithUpcoming.size;
        
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
            newPets: newPets,
            upcomingBookings: upcomingBookings,
            total: totalNotifications
        };

        console.log(`🔔 Pet Notifications: ${totalNotifications} (New: ${newPets.length}, Upcoming: ${uniquePetsWithUpcoming.size})`);
        
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
// SHOW NOTIFICATION DETAILS - PET PAGE
// ================================================================
async function showNotificationDetails() {
    const [petRes, bookRes] = await Promise.all([
        authFetch('/api/admin/pets'),
        authFetch('/api/admin/bookings')
    ]);
    const pets = petRes.data || [];
    const bookings = bookRes.data || [];

    const today = new Date().toISOString().split('T')[0];
    const in3Days = new Date(); in3Days.setDate(in3Days.getDate() + 3); const in3DaysStr = in3Days.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6); const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    const newPets = pets.filter(p => p.created_at && p.created_at.startsWith(today)).length;
    const upcomingPets = bookings.filter(b => b.booking_date >= today && b.booking_date <= in3DaysStr && ['pending', 'upcoming'].includes(b.status)).length;
    const specialNotePets = pets.filter(p => p.special_notes && p.special_notes.length > 0).length;
    const inactivePets = pets.filter(p => !bookings.some(b => b.pet_id === p.pet_id && b.booking_date >= sixMonthsAgoStr)).length;

    const notifCount = document.getElementById('notifCount');
    if (notifCount) {
        const total = newPets + upcomingPets;
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
    if (newPets > 0) html += notifCard("🐾", "#FEF7E0", "#D97706", "New Pets Added Today", "Pets baru diregister hari ini", newPets, "#FEF7E0", "#D97706", "admin_pets.html");
    if (upcomingPets > 0) html += notifCard("📅", "#FEF7E0", "#D97706", "Pets with Upcoming Bookings", "Pets yang ada booking dalam 3 hari", upcomingPets, "#FEF7E0", "#D97706", "admin_bookings.html");
    if (specialNotePets > 0) html += notifCard("📝", "#E3F2FD", "#0D47A1", "Pets with Special Notes", "Pets yang ada medical notes/keperluan khas", specialNotePets, "#E3F2FD", "#0D47A1", "admin_pets.html");
    if (inactivePets.length > 0) html += notifCard("📉", "#E3F2FD", "#0D47A1", "Inactive Pets", "Pets yang tak booking > 6 bulan", inactivePets.length, "#E3F2FD", "#0D47A1", "admin_pets.html");

    if (!html) { html = '<div style="text-align:center; padding:40px 20px;">No pet notifications.</div>'; }
    document.getElementById('notificationsModalContent').innerHTML = html;
    document.getElementById('notificationsModal').classList.add('active');
    lockBodyScroll();
}

// ================================================================
// LOAD CUSTOMERS FROM SUPABASE (for dropdown)
// ================================================================
async function loadCustomersForDropdown() {
    try {
        // 🆕 TAMBAHAN: Guna authFetch ke backend API
        const response = await authFetch('/api/admin/customers');
        if (!response) return [];
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to load customers');
        }

        customersData = result.data || [];
        
        const select = document.getElementById('petOwnerId');
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Select Existing Customer --</option>';
            customersData.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.customer_id;
                option.textContent = `${customer.full_name} (${customer.customer_id})`;
                if (customer.customer_id === currentValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
        
        return customersData;
    } catch (err) {
        console.error('Error loading customers for dropdown:', err);
        return [];
    }
}

// ================================================================
// LOAD PETS FROM SUPABASE - 🆕 GUNA BACKEND API
// ================================================================
async function loadPetsFromSupabase() {
    try {
        console.log('🔍 Loading pets from admin API...');
        
        // 🆕 TAMBAHAN: Guna authFetch ke backend API
        const response = await authFetch('/api/admin/pets');
        if (!response) return [];
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to load pets');
        }

        const pets = (result.data || []).sort((firstPet, secondPet) => {
            const firstNumber = Number(String(firstPet.pet_id || '').match(/\d+/)?.[0] || 0);
            const secondNumber = Number(String(secondPet.pet_id || '').match(/\d+/)?.[0] || 0);
            return firstNumber - secondNumber;
        });
        console.log('✅ Pets loaded successfully:', pets.length);
        
        petsData = pets.map(pet => {
            let ageDisplay = 'N/A';
            if (pet.date_of_birth) {
                const dob = new Date(pet.date_of_birth);
                const today = new Date();
                let years = today.getFullYear() - dob.getFullYear();
                const months = today.getMonth() - dob.getMonth();
                if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
                    years--;
                }
                if (years > 0) {
                    ageDisplay = `${years} ${years === 1 ? 'Year' : 'Years'}`;
                } else {
                    const monthDiff = (today.getMonth() - dob.getMonth() + 12) % 12;
                    ageDisplay = `${monthDiff} ${monthDiff === 1 ? 'Month' : 'Months'}`;
                }
            }
            
            // 🆕 TAMBAHAN: Use pet data from API response
            const customer = pet.customer || {};
            
            return {
                id: pet.pet_id || '#PET-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
                pet_id: pet.pet_id,
                name: pet.pet_name || 'Unknown',
                ownerId: pet.customer_id || '',
                owner: customer.full_name || 'Unknown',
                species: pet.species || 'Dog',
                breed: pet.breed || '',
                date_of_birth: pet.date_of_birth || '',
                age: ageDisplay,
                weight: pet.weight ? `${pet.weight} kg` : 'N/A',
                status: pet.status || 'Active',
                gender: pet.gender || 'Male',
                medicalNotes: pet.special_notes || '',
                lastService: 'None scheduled',
                totalBookings: 0,
                ownerPhone: customer.phone_number || 'N/A',
                ownerEmail: customer.email || 'N/A',
                image: pet.pet_photo || '',
                created_at: pet.created_at || new Date().toISOString()
            };
        });

        await loadPetBookingStats();

        renderPetTable(petsData);
        loadPetStats();
        loadNotificationCount();
        
        return petsData;
    } catch (err) {
        console.error('Error loading pets from API:', err);
        showValidationModal('Failed to load pets from database. Please refresh.');
        return [];
    }
}

// ================================================================
// LOAD PET BOOKING STATS - 🆕 GUNA BACKEND API
// ================================================================
async function loadPetBookingStats() {
    try {
        // 🆕 TAMBAHAN: Guna authFetch ke backend API untuk booking stats
        const response = await authFetch('/api/admin/bookings/stats');
        if (!response) return;
        
        const result = await response.json();
        if (!result.success) return;

        // We also need individual pet booking counts
        const bookingsResponse = await authFetch('/api/bookings');
        if (!bookingsResponse) return;
        
        const bookingsResult = await bookingsResponse.json();
        if (!bookingsResult.success) return;
        
        const bookings = bookingsResult.data || [];

        const bookingMap = {};
        bookings.forEach(booking => {
            const petId = booking.pet?.pet_id || booking.pet_id;
            if (!petId) return;
            
            if (!bookingMap[petId]) {
                bookingMap[petId] = {
                    total: 0,
                    completed: 0
                };
            }
            bookingMap[petId].total++;
            if (booking.status === 'completed') bookingMap[petId].completed++;
        });

        petsData.forEach(pet => {
            const stats = bookingMap[pet.pet_id] || { total: 0, completed: 0 };
            pet.totalBookings = stats.total;
            if (stats.total > 0 && stats.completed > 0) {
                pet.lastService = 'Has bookings';
            }
        });

    } catch (err) {
        console.error('Error loading pet booking stats:', err);
    }
}

// ================================================================
// RENDER PET TABLE
// ================================================================
function renderPetTable(data) {
    const tbody = document.getElementById('petTableBody');
    const countSpan = document.getElementById('petCount');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#7A7A7A; padding:20px;">No pets found</td></tr>`;
        if (countSpan) countSpan.textContent = '0';
        return;
    }
    
    if (countSpan) countSpan.textContent = data.length;
    
    tbody.innerHTML = data.map(pet => {
        const statusClass = pet.status ? pet.status.toLowerCase() : 'active';
        const statusDisplay = pet.status || 'Active';
        const speciesIcon = pet.species === 'Dog' ? 'fa-solid fa-dog' : 'fa-solid fa-cat';
        
        const avatarHtml = pet.image ? 
            `<img src="${pet.image}" alt="${pet.name}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0;">` :
            `<div style="width:28px; height:28px; border-radius:50%; background:#FDF3E7; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:11px; color:#5A361A; flex-shrink:0;">${pet.name.charAt(0).toUpperCase()}</div>`;
        
        return `<tr>
            <td><strong>${pet.id || pet.pet_id || 'N/A'}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${avatarHtml}
                    ${pet.name}
                </div>
            </td>
            <td>${pet.owner}</td>
            <td><i class="${speciesIcon}" style="margin-right:4px; color:#5A361A;"></i> ${pet.species}</td>
            <td>${pet.breed || 'N/A'}</td>
            <td>${pet.age}</td>
            <td>${pet.weight}</td>
            <td><span class="status-badge-sm ${statusClass}">${statusDisplay}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-action view" onclick="viewPetDetail('${pet.pet_id}')" title="View Details">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="btn-action edit" onclick="openEditPetModal('${pet.pet_id}')" title="Edit">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="btn-action delete" onclick="openDeleteModal('${pet.pet_id}')" title="Delete">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ================================================================
// VIEW PET DETAIL
// ================================================================
function viewPetDetail(id) {
    const pet = petsData.find(p => p.pet_id === id);
    
    if (!pet) {
        showValidationModal('Pet not found!');
        return;
    }
    
    const modal = document.getElementById('petDetailModal');
    const content = document.getElementById('petDetailContent');
    
    const statusClass = pet.status ? pet.status.toLowerCase() : 'active';
    const speciesIcon = pet.species === 'Dog' ? 'fa-solid fa-dog' : 'fa-solid fa-cat';
    
    const petImageHtml = pet.image ? 
        `<img src="${pet.image}" alt="${pet.name}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid #EFE4D8;">` :
        `<div class="detail-modal-avatar" style="background:linear-gradient(135deg,#FDF3E7,#F5E6D3);">
            <i class="${speciesIcon}" style="font-size:34px; color:#5A361A;"></i>
        </div>`;
    
    content.innerHTML = `
        <div class="detail-modal-header">
            ${petImageHtml}
            <div>
                <div class="detail-modal-name">${pet.name}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; align-items:center;">
                    <span class="detail-modal-id"><i class="fa-regular fa-id-card"></i> ${pet.id || pet.pet_id}</span>
                    <span style="font-size:12px; color:#8A7A6A;"><i class="fa-regular fa-calendar"></i> ${pet.breed || 'Unknown breed'}</span>
                    <span class="detail-modal-status ${statusClass}">${pet.status || 'Active'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-regular fa-user"></i> Owner Information
            </div>
            <div class="detail-info-grid">
                <div class="detail-info-item">
                    <span class="label">Owner Name</span>
                    <span class="value">${pet.owner}</span>
                </div>
                <div class="detail-info-item">
                    <span class="label">Phone</span>
                    <span class="value">${pet.ownerPhone || 'N/A'}</span>
                </div>
                <div class="detail-info-item full-width">
                    <span class="label">Email</span>
                    <span class="value">${pet.ownerEmail || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-solid fa-paw"></i> Pet Information
            </div>
            <div class="detail-info-grid">
                <div class="detail-info-item">
                    <span class="label">Gender</span>
                    <span class="value">${pet.gender || 'N/A'}</span>
                </div>
                <div class="detail-info-item">
                    <span class="label">Weight</span>
                    <span class="value">${pet.weight}</span>
                </div>
                <div class="detail-info-item full-width">
                    <span class="label">Medical Notes</span>
                    <span class="value">${pet.medicalNotes || 'No medical notes.'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-regular fa-clock"></i> Pet History
            </div>
            <div class="detail-info-grid" style="grid-template-columns:1fr 1fr;">
                <div class="detail-info-item">
                    <span class="label">Last Service</span>
                    <span class="value" style="font-size:13px;">${pet.lastService || 'N/A'}</span>
                </div>
                <div class="detail-info-item full-width">
                    <span class="label">Total Bookings</span>
                    <span class="value" style="font-size:18px; font-weight:700; color:#5A361A;">${pet.totalBookings || 0}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-actions">
            <button class="btn btn-secondary" onclick="closePetDetail()">Close</button>
            <button class="btn btn-primary" onclick="closePetDetail(); openEditPetModal('${pet.pet_id}')">
                <i class="fa fa-pencil" aria-hidden="true"></i> Edit Pet
            </button>
            <button class="btn btn-danger" onclick="closePetDetail(); openDeleteModal('${pet.pet_id}')">
                <i class="fa fa-trash-o" aria-hidden="true"></i> Delete Pet
            </button>
        </div>
    `;
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closePetDetail() {
    const modal = document.getElementById('petDetailModal');
    modal.classList.remove('active');
    unlockBodyScroll();
}

// ================================================================
// FORMAT AGE
// ================================================================
function formatAge(value) {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return '';
    if (num === 1) return '1 Year';
    return num + ' Years';
}

// ================================================================
// FORMAT WEIGHT
// ================================================================
function formatWeight(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return '';
    return num + ' kg';
}

// ================================================================
// HANDLE IMAGE UPLOAD
// ================================================================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showValidationModal('Image size must be less than 2MB. Please choose a smaller image.');
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showValidationModal('Please select a valid image file.');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        tempImageData = e.target.result;
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.src = tempImageData;
            preview.style.display = 'block';
        }
        const placeholder = document.getElementById('imagePlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// ================================================================
// REMOVE IMAGE
// ================================================================
function removeImage() {
    tempImageData = null;
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    const placeholder = document.getElementById('imagePlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    const fileInput = document.getElementById('petImageInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

// ================================================================
// GET CUSTOMER DROPDOWN OPTIONS
// ================================================================
function getCustomerOptions(selectedId) {
    return customersData.map(customer => {
        const selected = customer.customer_id === selectedId ? 'selected' : '';
        return `<option value="${customer.customer_id}" ${selected}>${customer.full_name} (${customer.customer_id})</option>`;
    }).join('');
}

// ================================================================
// GET CUSTOMER BY ID
// ================================================================
function getCustomerById(id) {
    return customersData.find(c => c.customer_id === id);
}

// ================================================================
// AUTO FILL OWNER DETAILS
// ================================================================
function autoFillOwnerDetails() {
    const select = document.getElementById('petOwnerId');
    const customerId = select.value;
    
    if (customerId) {
        const customer = getCustomerById(customerId);
        if (customer) {
            document.getElementById('petOwnerName').value = customer.full_name;
            document.getElementById('petOwnerPhone').value = customer.phone_number || '';
            document.getElementById('petOwnerEmail').value = customer.email || '';
        }
    } else {
        document.getElementById('petOwnerName').value = '';
        document.getElementById('petOwnerPhone').value = '';
        document.getElementById('petOwnerEmail').value = '';
    }
}

// ================================================================
// OPEN ADD PET MODAL
// ================================================================
function openAddPetModal() {
    isEditMode = false;
    currentPetId = null;
    tempImageData = null;
    
    const modal = document.getElementById('petFormModal');
    const content = document.getElementById('petFormContent');
    
    content.innerHTML = `
        <div class="edit-header">
            <div class="edit-avatar" style="background:linear-gradient(135deg,#FDF3E7,#F5E6D3);">
                <i class="fa-solid fa-paw" style="font-size:28px; color:#5A361A;"></i>
            </div>
            <div class="edit-title">
                <h3>Add New Pet</h3>
                <span>Create a new pet profile</span>
            </div>
        </div>
        
        <form id="petForm" onsubmit="savePet(event)">
            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-image" style="color:#D97706;"></i> Pet Photo
                </div>
                <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                    <div style="position:relative; width:100px; height:100px; border-radius:12px; border:2px dashed #D3C4B8; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#FAF8F5; flex-shrink:0;">
                        <img id="imagePreview" style="width:100%; height:100%; object-fit:cover; display:none;" alt="Pet preview">
                        <div id="imagePlaceholder" style="display:flex; flex-direction:column; align-items:center; color:#B0A090; font-size:11px;">
                            <i class="fa-regular fa-camera" style="font-size:28px; margin-bottom:4px;"></i>
                            <span>No image</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <label for="petImageInput" style="cursor:pointer;">
                            <div class="btn btn-secondary" style="padding:8px 20px; font-size:12px; margin:0;">
                                <i class="fa-regular fa-upload"></i> Choose Image
                            </div>
                            <input type="file" id="petImageInput" accept="image/*" style="display:none;" onchange="handleImageUpload(event)">
                        </label>
                        <button type="button" class="btn btn-secondary" style="padding:8px 20px; font-size:12px; background:#FCE8E6; color:#C5221F; border-color:#FCE8E6;" onclick="removeImage()">
                            <i class="fa fa-trash-o" aria-hidden="true"></i> Remove
                        </button>
                        <small style="color:#8A7A6A; font-size:10px;">Max 2MB (JPG, PNG, GIF)</small>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-paw" style="color:#D97706;"></i> Pet Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Pet Name <span class="required">*</span></label>
                        <input type="text" id="petName" placeholder="Enter pet name" required>
                    </div>
                    <div class="field">
                        <label>Species <span class="required">*</span></label>
                        <select id="petSpecies" required>
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>Breed <span class="required">*</span></label>
                        <input type="text" id="petBreed" placeholder="e.g. Golden Retriever" required>
                    </div>
                    <div class="field">
                        <label>Date of Birth</label>
                        <input type="date" id="petDob" required>
                    </div>
                    <div class="field">
                        <label>Weight (kg) <span class="required">*</span></label>
                        <input type="number" id="petWeight" placeholder="e.g. 25" min="0" step="0.1" required>
                    </div>
                    <div class="field">
                        <label>Gender</label>
                        <select id="petGender">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    <div class="field full-width">
                        <label>Medical Notes</label>
                        <textarea id="petMedicalNotes" rows="2" placeholder="Any medical notes... (optional)"></textarea>
                    </div>
                    <div class="field">
                        <label>Status</label>
                        <select id="petStatus">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 8px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-user" style="color:#D97706;"></i> Owner Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Select Existing Owner <span class="required">*</span></label>
                        <select id="petOwnerId" required onchange="autoFillOwnerDetails()">
                            <option value="">-- Select Existing Customer --</option>
                            ${getCustomerOptions(null)}
                        </select>
                    </div>
                    <div class="field full-width" style="margin-top:8px;">
                        <label>Owner Name <span class="required">*</span></label>
                        <input type="text" id="petOwnerName" placeholder="Owner name will auto fill" required readonly>
                    </div>
                    <div class="field">
                        <label>Owner Phone</label>
                        <input type="text" id="petOwnerPhone" placeholder="Auto fill from customer" readonly>
                    </div>
                    <div class="field full-width">
                        <label>Owner Email</label>
                        <input type="email" id="petOwnerEmail" placeholder="Auto fill from customer" readonly>
                    </div>
                </div>
            </div>
            
            <div class="edit-actions">
                <button type="button" class="btn btn-secondary" onclick="closePetFormModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fa-regular fa-floppy-disk"></i> Add Pet
                </button>
            </div>
        </form>
    `;
    
    setTimeout(() => {
        const preview = document.getElementById('imagePreview');
        const placeholder = document.getElementById('imagePlaceholder');
        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }, 100);
    
    modal.classList.add('active');
    lockBodyScroll();
}

// ================================================================
// OPEN EDIT PET MODAL
// ================================================================
function openEditPetModal(id) {
    const pet = petsData.find(p => p.pet_id === id);
    
    if (!pet) {
        showValidationModal('Pet not found!');
        return;
    }
    
    isEditMode = true;
    currentPetId = id;
    tempImageData = pet.image || null;
    
    const modal = document.getElementById('petFormModal');
    const content = document.getElementById('petFormContent');
    
    const weightNum = pet.weight.replace(' kg', '').trim();
    const hasImage = pet.image && pet.image.length > 0;
    
    content.innerHTML = `
        <div class="edit-header">
            <div class="edit-avatar" style="background:linear-gradient(135deg,#FDF3E7,#F5E6D3);">
                <i class="fa-solid fa-paw" style="font-size:28px; color:#5A361A;"></i>
            </div>
            <div class="edit-title">
                <h3>Edit Pet</h3>
                <span>${pet.id || pet.pet_id}</span>
            </div>
        </div>
        
        <form id="petForm" onsubmit="savePet(event)">
            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-image" style="color:#D97706;"></i> Pet Photo
                </div>
                <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                    <div style="position:relative; width:100px; height:100px; border-radius:12px; border:2px solid #D3C4B8; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#FAF8F5; flex-shrink:0;">
                        <img id="imagePreview" src="${hasImage ? pet.image : ''}" style="width:100%; height:100%; object-fit:cover; display:${hasImage ? 'block' : 'none'};" alt="Pet preview">
                        <div id="imagePlaceholder" style="display:${hasImage ? 'none' : 'flex'}; flex-direction:column; align-items:center; color:#B0A090; font-size:11px;">
                            <i class="fa-regular fa-camera" style="font-size:28px; margin-bottom:4px;"></i>
                            <span>No image</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <label for="petImageInput" style="cursor:pointer;">
                            <div class="btn btn-secondary" style="padding:8px 20px; font-size:12px; margin:0;">
                                <i class="fa-regular fa-upload"></i> Change Image
                            </div>
                            <input type="file" id="petImageInput" accept="image/*" style="display:none;" onchange="handleImageUpload(event)">
                        </label>
                        <button type="button" class="btn btn-secondary" style="padding:8px 20px; font-size:12px; background:#FCE8E6; color:#C5221F; border-color:#FCE8E6;" onclick="removeImage()">
                            <i class="fa fa-trash-o" aria-hidden="true"></i> Remove
                        </button>
                        <small style="color:#8A7A6A; font-size:10px;">Max 2MB (JPG, PNG, GIF)</small>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-paw" style="color:#D97706;"></i> Pet Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Pet Name <span class="required">*</span></label>
                        <input type="text" id="petName" value="${pet.name}" required>
                    </div>
                    <div class="field">
                        <label>Species <span class="required">*</span></label>
                        <select id="petSpecies" required>
                            <option value="Dog" ${pet.species === 'Dog' ? 'selected' : ''}>Dog</option>
                            <option value="Cat" ${pet.species === 'Cat' ? 'selected' : ''}>Cat</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>Breed <span class="required">*</span></label>
                        <input type="text" id="petBreed" value="${pet.breed}" required>
                    </div>
                    <div class="field">
                        <label>Date of Birth</label>
                        <input type="date" id="petDob" value="${pet.date_of_birth || ''}" required>
                    </div>
                    <div class="field">
                        <label>Weight (kg) <span class="required">*</span></label>
                        <input type="number" id="petWeight" value="${weightNum}" min="0" step="0.1" required>
                    </div>
                    <div class="field">
                        <label>Gender</label>
                        <select id="petGender">
                            <option value="Male" ${pet.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${pet.gender === 'Female' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                    <div class="field full-width">
                        <label>Medical Notes</label>
                        <textarea id="petMedicalNotes" rows="2" placeholder="Any medical notes... (optional)">${pet.medicalNotes || ''}</textarea>
                    </div>
                    <div class="field">
                        <label>Status</label>
                        <select id="petStatus">
                            <option value="Active" ${pet.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Inactive" ${pet.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 8px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-user" style="color:#D97706;"></i> Owner Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Select Existing Owner <span class="required">*</span></label>
                        <select id="petOwnerId" required onchange="autoFillOwnerDetails()">
                            <option value="">-- Select Existing Customer --</option>
                            ${getCustomerOptions(pet.ownerId)}
                        </select>
                    </div>
                    <div class="field full-width" style="margin-top:8px;">
                        <label>Owner Name <span class="required">*</span></label>
                        <input type="text" id="petOwnerName" value="${pet.owner}" required readonly>
                    </div>
                    <div class="field">
                        <label>Owner Phone</label>
                        <input type="text" id="petOwnerPhone" value="${pet.ownerPhone || ''}" readonly>
                    </div>
                    <div class="field full-width">
                        <label>Owner Email</label>
                        <input type="email" id="petOwnerEmail" value="${pet.ownerEmail || ''}" readonly>
                    </div>
                </div>
            </div>
            
            <div class="edit-actions">
                <button type="button" class="btn btn-secondary" onclick="closePetFormModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fa-regular fa-floppy-disk"></i> Update Pet
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('active');
    lockBodyScroll();
}

// ================================================================
// CLOSE PET FORM MODAL
// ================================================================
function closePetFormModal() {
    const modal = document.getElementById('petFormModal');
    modal.classList.remove('active');
    unlockBodyScroll();
    currentPetId = null;
    isEditMode = false;
    tempImageData = null;
}

// ================================================================
// SAVE PET (Add or Update) - 🆕 GUNA BACKEND API
// ================================================================
async function savePet(event) {
    event.preventDefault();
    
    const name = document.getElementById('petName').value.trim();
    const species = document.getElementById('petSpecies').value;
    const breed = document.getElementById('petBreed').value.trim();
    const dob = document.getElementById('petDob').value;
    const weightInput = document.getElementById('petWeight').value.trim();
    const gender = document.getElementById('petGender').value;
    const medicalNotes = document.getElementById('petMedicalNotes').value.trim();
    const status = document.getElementById('petStatus').value;
    const ownerId = document.getElementById('petOwnerId').value;
    const ownerName = document.getElementById('petOwnerName').value.trim();
    const ownerPhone = document.getElementById('petOwnerPhone').value.trim();
    const ownerEmail = document.getElementById('petOwnerEmail').value.trim();
    
    // Validation
    if (!name) {
        showValidationModal('Please enter pet name.');
        document.getElementById('petName').focus();
        return;
    }
    if (!ownerId) {
        showValidationModal('Please select an existing owner.');
        document.getElementById('petOwnerId').focus();
        return;
    }
    if (!ownerName) {
        showValidationModal('Owner name is required. Please select a valid customer.');
        document.getElementById('petOwnerId').focus();
        return;
    }
    if (!breed) {
        showValidationModal('Please enter breed.');
        document.getElementById('petBreed').focus();
        return;
    }
    if (!weightInput || isNaN(weightInput) || parseFloat(weightInput) <= 0) {
        showValidationModal('Please enter a valid weight (number).');
        document.getElementById('petWeight').focus();
        return;
    }
    
    const weight = parseFloat(weightInput);
    const imageData = tempImageData || '';
    
    const petData = {
        name: name,
        customer_id: ownerId,
        species: species.toLowerCase(),
        breed: breed,
        dob: dob || null,
        weight: weight,
        gender: gender,
        notes: medicalNotes || '',
        photo_url: imageData || null,
        status: status
    };
    
    try {
        let url = '/api/admin/pets';
        let method = 'POST';
        
        if (isEditMode && currentPetId) {
            url = `/api/admin/pets/${currentPetId}`;
            method = 'PUT';
        }
        
        // 🆕 TAMBAHAN: Guna authFetch ke backend API
        const response = await authFetch(url, {
            method: method,
            body: JSON.stringify(petData)
        });

        if (!response) return;
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to save pet');
        }

        // Reload pets
        await loadPetsFromSupabase();
        await loadCustomersForDropdown();
        
        closePetFormModal();
        showSuccessModal(
            isEditMode ? 'Pet Updated Successfully!' : 'Pet Added Successfully!',
            `${name} has been ${isEditMode ? 'updated' : 'added'} successfully.`
        );
        
    } catch (err) {
        console.error('Error saving pet:', err);
        showValidationModal('Failed to save pet. Please try again.');
    }
}

// ================================================================
// DELETE PET - WITH CUSTOMER NOTIFICATION
// ================================================================
function openDeleteModal(id) {
    const pet = petsData.find(p => p.pet_id === id);
    
    if (!pet) {
        showValidationModal('Pet not found!');
        return;
    }
    
    currentPetId = id;
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    document.querySelector('#deleteConfirmModal .modal-title').textContent = '🗑️ Delete Pet';
    
    message.innerHTML = `
        <div style="text-align: left;">
            <p>Are you sure you want to delete <strong>${pet.name}</strong>?</p>
            <div style="background: #FEF7E0; border-left: 4px solid #D97706; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
                <p style="font-size: 13px; color: #92400E; margin: 0 0 4px 0;">
                    <i class="fa-regular fa-bell"></i> 
                    Customer <strong>${pet.owner}</strong> will receive a notification
                </p>
                <p style="font-size: 12px; color: #92400E; margin: 0;">
                    📱 They will see it on their dashboard when they log in.
                </p>
            </div>
            <div style="background: #FCE8E6; border-left: 4px solid #DC2626; padding: 10px 14px; border-radius: 8px; margin: 8px 0;">
                <p style="font-size: 12px; color: #B91C1C; margin: 0;">
                    <i class="fa-solid fa-triangle-exclamation"></i> 
                    All data for this pet will be permanently deleted.
                </p>
            </div>
            <div style="margin-top: 12px;">
                <label style="font-size: 12px; font-weight: 600; color: #4A3327; display: block; margin-bottom: 4px;">
                    <i class="fa-regular fa-pen"></i> Note to Customer (Optional)
                </label>
                <textarea id="adminDeleteNote" style="width: 100%; padding: 8px 12px; border: 1.5px solid #EFECE6; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 13px; resize: vertical; min-height: 50px;" placeholder="Add a note for the customer..."></textarea>
            </div>
        </div>
    `;
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.textContent = '🗑️ Delete Pet';
    newConfirmBtn.className = 'btn btn-danger';
    newConfirmBtn.addEventListener('click', function() {
        confirmDeletePetWithNotification();
    });
    
    modal.classList.add('active');
    lockBodyScroll();
}

// ================================================================
// CONFIRM DELETE PET - 🆕 GUNA BACKEND API
// ================================================================
async function confirmDeletePetWithNotification() {
    const id = currentPetId;
    
    if (!id) {
        showValidationModal('No pet selected for deletion.');
        return;
    }
    
    const pet = petsData.find(p => p.pet_id === id);
    if (!pet) {
        showValidationModal('Pet not found!');
        return;
    }
    
    const adminNote = document.getElementById('adminDeleteNote')?.value.trim() || '';
    const petName = pet.name;
    const customerId = pet.ownerId;
    const customerName = pet.owner;
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = '⏳ Deleting...';
    confirmBtn.disabled = true;
    
    try {
        // 🆕 TAMBAHAN: Guna authFetch ke backend API untuk delete
        const response = await authFetch(`/api/admin/pets/${id}`, {
            method: 'DELETE'
        });

        if (!response) return;
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to delete pet');
        }

        // Remove from local data
        const index = petsData.findIndex(p => p.pet_id === id);
        if (index !== -1) {
            petsData.splice(index, 1);
        }
        
        closeDeleteModal();
        renderPetTable(petsData);
        loadPetStats();
        loadNotificationCount();
        
        showSuccessModal(
            '🗑️ Pet Deleted Successfully!', 
            `Pet "${petName}" has been deleted.<br><br>
            <i class="fa-regular fa-bell" style="color: #D97706;"></i> 
            <strong>${customerName}</strong> will receive a notification on their dashboard.<br><br>
            <span style="font-size: 13px; color: #7A7A7A;">
                ${adminNote ? `📝 Note sent: "${adminNote}"` : 'No additional note sent.'}
            </span>`
        );
        
    } catch (err) {
        console.error('Error deleting pet:', err);
        showValidationModal('Failed to delete pet. Please try again.');
    } finally {
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
    // 🆕 TAMBAHAN: Support HTML message
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
    applyFiltersAndRender();
    loadPetStats();
}

// ================================================================
// VALIDATION MODAL
// ================================================================
function showValidationModal(message) {
    const modal = document.getElementById('validationModal');
    const msgEl = document.getElementById('validationMessage');
    if (modal && msgEl) {
        // 🆕 TAMBAHAN: Support HTML message
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
// SEARCH AND FILTER
// ================================================================
function applyFiltersAndRender() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const speciesFilter = document.getElementById('speciesFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    const filtered = petsData.filter(pet => {
        const matchesSearch = pet.name.toLowerCase().includes(searchQuery) ||
                              pet.owner.toLowerCase().includes(searchQuery) ||
                              pet.breed.toLowerCase().includes(searchQuery);
        
        const matchesSpecies = speciesFilter === 'all' || pet.species === speciesFilter;
        const matchesStatus = statusFilter === 'all' || pet.status === statusFilter;
        
        return matchesSearch && matchesSpecies && matchesStatus;
    });
    
    renderPetTable(filtered);
}

// ================================================================
// LOAD PET STATS - 🆕 GUNA BACKEND API
// ================================================================
async function loadPetStats() {
    try {
        // 🆕 TAMBAHAN: Guna authFetch ke backend API untuk stats
        const response = await authFetch('/api/admin/pets/stats');
        if (!response) return;
        
        const result = await response.json();
        if (!result.success) return;
        
        const stats = result.data || {};
        
        document.getElementById('totalPets').textContent = stats.total || 0;
        document.getElementById('totalDogs').textContent = stats.dogs || 0;
        document.getElementById('totalCats').textContent = stats.cats || 0;
        
        const total = stats.total || 0;
        const dogs = stats.dogs || 0;
        const cats = stats.cats || 0;
        const dogPercent = total > 0 ? ((dogs / total) * 100).toFixed(1) : 0;
        const catPercent = total > 0 ? ((cats / total) * 100).toFixed(1) : 0;
        
        document.getElementById('dogPercentage').textContent = `${dogPercent}% of total`;
        document.getElementById('catPercentage').textContent = `${catPercent}% of total`;
        
    } catch (err) {
        console.error('Error loading pet stats:', err);
        // Fallback to local calculation if API fails
        const total = petsData.length;
        const dogs = petsData.filter(p => p.species === 'Dog').length;
        const cats = petsData.filter(p => p.species === 'Cat').length;
        
        document.getElementById('totalPets').textContent = total;
        document.getElementById('totalDogs').textContent = dogs;
        document.getElementById('totalCats').textContent = cats;
        
        const dogPercent = total > 0 ? ((dogs / total) * 100).toFixed(1) : 0;
        const catPercent = total > 0 ? ((cats / total) * 100).toFixed(1) : 0;
        
        document.getElementById('dogPercentage').textContent = `${dogPercent}% of total`;
        document.getElementById('catPercentage').textContent = `${catPercent}% of total`;
    }
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
            closePetDetail();
            closePetFormModal();
            closeDeleteModal();
            closeSuccessModal();
            hideValidationModal();
            const notifModal = document.getElementById('notificationsModal');
            if (notifModal && notifModal.classList.contains('active')) {
                notifModal.classList.remove('active');
                unlockBodyScroll();
            }
        }
    });

    // NOTIFICATION BUTTON
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.removeEventListener('click', showNotificationDetails);
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('🔔 Notification button clicked!');
            showNotificationDetails();
        });
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            applyFiltersAndRender();
        });
    }

    const speciesFilter = document.getElementById('speciesFilter');
    if (speciesFilter) {
        speciesFilter.addEventListener('change', function() {
            applyFiltersAndRender();
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyFiltersAndRender();
        });
    }

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                unlockBodyScroll();
                if (this.id === 'successModal') {
                    applyFiltersAndRender();
                    loadPetStats();
                }
            }
        });
    });

    // LOAD DATA
    loadAdminProfile();
    loadCustomersForDropdown().then(() => {
        loadPetsFromSupabase();
    });

    console.log('PAWCARE ADMIN PETS LOADED SUCCESSFULLY!');
    console.log('🔧 Using backend API for all pet operations');
});