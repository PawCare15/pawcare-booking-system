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

// DOM READY
document.addEventListener('DOMContentLoaded', function() {

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
        if (e.key === 'Escape') closeSidebar();
    });

    // SET CURRENT DATE
    function setCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }
    setCurrentDate();

    // NOTIFICATION BELL
    document.getElementById('notificationBtn').addEventListener('click', function() {
        alert('No new notifications.');
    });

    // LOAD DASHBOARD DATA
    async function loadDashboardData() {
        try {
            // LOAD ADMIN PROFILE
            await loadAdminProfile();
            
            // LOAD STATS
            await loadStats();
            
            // LOAD CHARTS
            await loadStatusChart();
            await loadTrendChart();
            
            // LOAD RECENT BOOKINGS
            await loadRecentBookings();
            
            // LOAD RECENT REVIEWS
            await loadRecentReviews();

            // UPDATE NOTIFICATION COUNT
            await updateNotificationCount();

        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
    }

    // LOAD ADMIN PROFILE
    async function loadAdminProfile() {
        try {
            const res = await authFetch('/api/profile');
            const data = await res.json();
            if (data.success) {
                const admin = data.data;
                document.getElementById('headerName').textContent = admin.full_name || 'Admin';
                if (admin.profile_photo) {
                    document.getElementById('headerAvatarImg').src = admin.profile_photo;
                    document.getElementById('headerAvatarImg').style.display = 'block';
                    document.getElementById('headerAvatarPlaceholder').style.display = 'none';
                }
            }
        } catch (err) {
            console.error('Error loading admin profile:', err);
        }
    }

    // LOAD STATS - FROM SUPABASE
    async function loadStats() {
        try {
            // GET BOOKINGS STATS
            const bookingsStats = await supabaseQuery('get_booking_stats');
            
            // GET CUSTOMERS COUNT
            const customersCount = await supabaseQuery('get_customers_count');
            
            // GET PETS COUNT
            const petsCount = await supabaseQuery('get_pets_count');

            if (bookingsStats) {
                document.getElementById('totalBookings').textContent = bookingsStats.total || 0;
                document.getElementById('pendingBookings').textContent = bookingsStats.pending || 0;
                document.getElementById('confirmedBookings').textContent = bookingsStats.confirmed || 0;
                document.getElementById('completedBookings').textContent = bookingsStats.completed || 0;
                document.getElementById('cancelledBookings').textContent = bookingsStats.cancelled || 0;
                
                // CALCULATE PERCENTAGE CHANGES (FROM PREVIOUS MONTH)
                const prevMonthStats = await supabaseQuery('get_booking_stats_previous_month');
                if (prevMonthStats) {
                    document.getElementById('totalChange').textContent = calculateChange(prevMonthStats.total, bookingsStats.total);
                    document.getElementById('pendingChange').textContent = calculateChange(prevMonthStats.pending, bookingsStats.pending);
                    document.getElementById('confirmedChange').textContent = calculateChange(prevMonthStats.confirmed, bookingsStats.confirmed);
                    document.getElementById('completedChange').textContent = calculateChange(prevMonthStats.completed, bookingsStats.completed);
                    document.getElementById('cancelledChange').textContent = calculateChange(prevMonthStats.cancelled, bookingsStats.cancelled);
                }
            }

            if (customersCount) {
                document.getElementById('totalCustomers').textContent = customersCount.total || 0;
                const prevCustomers = await supabaseQuery('get_customers_count_previous_month');
                if (prevCustomers) {
                    document.getElementById('customerChange').textContent = calculateChange(prevCustomers.total, customersCount.total);
                }
            }

            if (petsCount) {
                document.getElementById('totalPets').textContent = petsCount.total || 0;
                const prevPets = await supabaseQuery('get_pets_count_previous_month');
                if (prevPets) {
                    document.getElementById('petChange').textContent = calculateChange(prevPets.total, petsCount.total);
                }
            }

        } catch (err) {
            console.error('Error loading stats:', err);
        }
    }

    // HELPER: CALCULATE PERCENTAGE CHANGE
    function calculateChange(prevValue, currentValue) {
        if (!prevValue || prevValue === 0) return '+0% from last month';
        const change = ((currentValue - prevValue) / prevValue) * 100;
        const sign = change >= 0 ? '+' : '';
        const rounded = Math.round(change);
        return `${sign}${rounded}% from last month`;
    }

    // LOAD STATUS CHART (PIE CHART) - FROM SUPABASE
    let statusChartInstance = null;

    async function loadStatusChart() {
        try {
            const stats = await supabaseQuery('get_booking_stats');
            
            if (!stats) return;
            
            const ctx = document.getElementById('statusChart').getContext('2d');
            
            if (statusChartInstance) {
                statusChartInstance.destroy();
            }
            
            statusChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
                    datasets: [{
                        data: [
                            stats.pending || 0,
                            stats.confirmed || 0,
                            stats.completed || 0,
                            stats.cancelled || 0
                        ],
                        backgroundColor: ['#F59E0B', '#3B82F6', '#22C55E', '#EF4444'],
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });

            // UPDATE LEGEND
            const legend = document.getElementById('statusLegend');
            const total = (stats.pending || 0) + (stats.confirmed || 0) + (stats.completed || 0) + (stats.cancelled || 0);
            const colors = ['#F59E0B', '#3B82F6', '#22C55E', '#EF4444'];
            const labels = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
            const values = [stats.pending || 0, stats.confirmed || 0, stats.completed || 0, stats.cancelled || 0];
            
            legend.innerHTML = labels.map((label, i) => {
                const pct = total > 0 ? Math.round((values[i] / total) * 100) : 0;
                return `<span class="legend-item">
                    <span class="dot" style="background:${colors[i]}"></span>
                    ${label} ${values[i]} (${pct}%)
                </span>`;
            }).join('');

        } catch (err) {
            console.error('Error loading status chart:', err);
        }
    }

    // LOAD TREND CHART (LINE CHART) - FROM SUPABASE
    let trendChartInstance = null;

    async function loadTrendChart() {
        try {
            const trendData = await supabaseQuery('get_booking_trends', [6]);
            
            const ctx = document.getElementById('trendChart').getContext('2d');
            
            if (trendChartInstance) {
                trendChartInstance.destroy();
            }
            
            // DEFAULT FALLBACK IF NO DATA
            let labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            let values = [0, 0, 0, 0, 0, 0];
            
            if (trendData && trendData.length > 0) {
                labels = trendData.map(d => d.month);
                values = trendData.map(d => d.total);
            }
            
            // GRADIENT FILL
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(217, 119, 6, 0.2)');
            gradient.addColorStop(1, 'rgba(217, 119, 6, 0)');
            
            trendChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Bookings',
                        data: values,
                        borderColor: '#D97706',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#D97706',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: Math.max(1, Math.ceil(Math.max(...values) / 5))
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });

        } catch (err) {
            console.error('Error loading trend chart:', err);
        }
    }

    // LOAD RECENT BOOKINGS - FROM SUPABASE
    async function loadRecentBookings() {
        try {
            const bookings = await supabaseQuery('get_recent_bookings', [5]);
            const tbody = document.getElementById('recentBookingsBody');
            
            if (!bookings || bookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#7A7A7A; padding:20px;">No recent bookings</td></tr>`;
                return;
            }
            
            tbody.innerHTML = bookings.map(booking => {
                const statusClass = booking.status ? booking.status.toLowerCase() : 'pending';
                const statusDisplay = booking.status || 'Pending';
                return `<tr>
                    <td><strong>#${booking.booking_id || 'N/A'}</strong></td>
                    <td>${booking.customer_name || 'Unknown'}</td>
                    <td>${booking.pet_name || 'N/A'}</td>
                    <td>${booking.service_name || 'N/A'}</td>
                    <td>${booking.booking_date || ''} ${booking.booking_time || ''}</td>
                    <td><span class="status-pill ${statusClass}">${statusDisplay}</span></td>
                </tr>`;
            }).join('');

        } catch (err) {
            console.error('Error loading recent bookings:', err);
            document.getElementById('recentBookingsBody').innerHTML = 
                `<tr><td colspan="6" style="text-align:center; color:#7A7A7A; padding:20px;">Failed to load bookings</td></tr>`;
        }
    }

    // LOAD RECENT REVIEWS - FROM SUPABASE
    async function loadRecentReviews() {
        try {
            const reviews = await supabaseQuery('get_recent_reviews', [4]);
            const container = document.getElementById('recentReviews');
            
            if (!reviews || reviews.length === 0) {
                container.innerHTML = `<div style="text-align:center; color:#7A7A7A; padding:20px;">No recent reviews</div>`;
                return;
            }
            
            container.innerHTML = reviews.map(review => {
                const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
                const name = review.customer_name || 'Anonymous';
                const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                return `<div class="review-item">
                    <div class="review-avatar">${initials}</div>
                    <div class="review-content">
                        <div class="review-name">${name}</div>
                        <div class="review-stars">${stars}</div>
                        <div class="review-text">${review.comment || ''}</div>
                    </div>
                    <div class="review-date">${review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}</div>
                </div>`;
            }).join('');

        } catch (err) {
            console.error('Error loading recent reviews:', err);
            document.getElementById('recentReviews').innerHTML = 
                `<div style="text-align:center; color:#7A7A7A; padding:20px;">Failed to load reviews</div>`;
        }
    }

    // UPDATE NOTIFICATION COUNT - FROM SUPABASE
    async function updateNotificationCount() {
        try {
            const count = await supabaseQuery('get_unread_notification_count');
            if (count !== null) {
                document.getElementById('notifCount').textContent = count;
                document.getElementById('notifCount').style.display = count > 0 ? 'flex' : 'none';
            }
        } catch (err) {
            console.error('Error loading notifications:', err);
        }
    }

    // MODAL CLOSE ON ESCAPE
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeLogoutModal();
        }
    });

    // INIT
    loadDashboardData();
    console.log('PawCare Admin Dashboard loaded successfully!');

});