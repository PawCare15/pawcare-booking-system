// AUTHENTICATION CHECK
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

// MOCK DATA FOR TESTING
function getMockData(query) {
    const mockData = {
        'get_booking_stats': { total: 45, pending: 8, confirmed: 12, completed: 20, cancelled: 5 },
        'get_booking_stats_previous_month': { total: 38, pending: 10, confirmed: 9, completed: 15, cancelled: 4 },
        'get_customers_count': { total: 28 },
        'get_customers_count_previous_month': { total: 22 },
        'get_pets_count': { total: 35 },
        'get_pets_count_previous_month': { total: 30 },
        'get_booking_trends': [
            { month: 'Jan', total: 20 },
            { month: 'Feb', total: 25 },
            { month: 'Mar', total: 30 },
            { month: 'Apr', total: 35 },
            { month: 'May', total: 40 },
            { month: 'Jun', total: 45 }
        ],
        'get_recent_bookings': [
            { booking_id: 'BK-001', customer_name: 'Jenny Lee', pet_name: 'Buddy', service_name: 'Grooming', booking_date: '2026-06-15', booking_time: '10:00 AM', status: 'Completed' },
            { booking_id: 'BK-002', customer_name: 'Ahmad Firdaus', pet_name: 'Luna', service_name: 'Check-up', booking_date: '2026-06-14', booking_time: '02:00 PM', status: 'Confirmed' },
            { booking_id: 'BK-003', customer_name: 'Siti Nur', pet_name: 'Max', service_name: 'Boarding', booking_date: '2026-06-13', booking_time: '09:00 AM', status: 'Pending' }
        ],
        'get_recent_reviews': [
            { customer_name: 'Jenny Lee', rating: 5, comment: 'Excellent service! My dog loves it here.', created_at: '2026-06-10' },
            { customer_name: 'Daniel Tan', rating: 4, comment: 'Good service, very professional.', created_at: '2026-06-08' }
        ],
        'get_unread_notification_count': 3,
        'get_all_bookings_for_calendar': [
            { id: 'BK-001', customer_name: 'Jenny Lee', pet_name: 'Buddy', service_name: 'Grooming', booking_date: '2026-08-22', booking_time: '10:00', status: 'confirmed', notes: 'First time grooming' },
            { id: 'BK-002', customer_name: 'Ahmad Firdaus', pet_name: 'Luna', service_name: 'Check-up', booking_date: '2026-08-22', booking_time: '14:00', status: 'pending', notes: '' },
            { id: 'BK-003', customer_name: 'Siti Nur', pet_name: 'Max', service_name: 'Boarding', booking_date: '2026-08-23', booking_time: '09:00', status: 'completed', notes: 'Boarding 3 days' },
            { id: 'BK-004', customer_name: 'Daniel Tan', pet_name: 'Coco', service_name: 'Grooming', booking_date: '2026-08-23', booking_time: '11:30', status: 'confirmed', notes: '' },
            { id: 'BK-005', customer_name: 'Sarah Lim', pet_name: 'Milo', service_name: 'Vaccination', booking_date: '2026-08-24', booking_time: '15:00', status: 'pending', notes: 'Booster shot' },
            { id: 'BK-006', customer_name: 'Kevin Wong', pet_name: 'Bella', service_name: 'Check-up', booking_date: '2026-08-25', booking_time: '10:30', status: 'cancelled', notes: 'Rescheduled' }
        ]
    };
    return mockData[query] || null;
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
            // LOAD ADMIN PROFILE (mock)
            loadAdminProfile();
            
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

            // LOAD CALENDAR
            await initDashboardCalendar();

        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
    }

    // LOAD ADMIN PROFILE (mock)
    function loadAdminProfile() {
        document.getElementById('headerName').textContent = 'Admin';
        document.getElementById('headerAvatarImg').style.display = 'none';
        document.getElementById('headerAvatarPlaceholder').style.display = 'flex';
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
            closeCalendarEventModal();
        }
    });

// ============================================================ //
// SERVICE CALENDAR - DASHBOARD                                 //
// ============================================================ //

let currentCalendarDate = new Date();
let calendarEvents = [];

// GET ALL BOOKINGS FOR CALENDAR - FROM SUPABASE
async function getCalendarBookings() {
    try {
        // 查询 bookings 表并关联 customers 和 pets 表
        const response = await fetch(`${SUPABASE_URL}/rest/v1/booking?select=booking_id,pet_id,admin_id,status,booking_date,booking_time,check_in_datetime,check_out_datetime,customer_id,special_notes,reschedule_requested_date,reschedule_requested_time,reschedule_status,customer(name),pet(name,species,breed)`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Supabase query failed: ${response.status}`);
        }
        
        const bookings = await response.json();
        
        if (bookings && bookings.length > 0) {
            return bookings.map(b => {
                // 处理嵌套的 customers 和 pets 数据
                let customerName = 'Unknown';
                let petName = 'Unknown';
                let serviceName = 'Service';
                
                // 从关联数据中提取名称
                if (b.customer && b.customer.length > 0) {
                    customerName = b.customer[0].name || 'Unknown';
                }
                
                if (b.pet && b.pet.length > 0) {
                    petName = b.pets[0].name || 'Unknown';
                }
                
                // 根据服务类型设置服务名称 (从 pet 的 species 或默认)
                if (b.pet && b.pet.length > 0 && b.pet[0].species) {
                    serviceName = b.pets[0].species || 'Service';
                }
                
                return {
                    id: b.booking_id,
                    customer_name: customerName,
                    pet_name: petName,
                    service_name: serviceName,
                    booking_date: b.booking_date,
                    booking_time: b.booking_time,
                    status: b.status || 'pending',
                    notes: b.special_notes || '',
                    check_in: b.check_in_datetime,
                    check_out: b.check_out_datetime,
                    customer_id: b.customer_id,
                    pet_id: b.pet_id,
                    reschedule_status: b.reschedule_status,
                    reschedule_date: b.reschedule_requested_date,
                    reschedule_time: b.reschedule_requested_time
                };
            });
        }
        
        return getMockCalendarData();
    } catch (err) {
        console.error('Error loading calendar bookings:', err);
        return getMockCalendarData();
    }
}

// MOCK CALENDAR DATA (FALLBACK)
function getMockCalendarData() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return [
        { 
            id: 'BK-001', 
            customer_name: 'Jenny Lee', 
            pet_name: 'Buddy', 
            service_name: 'Grooming', 
            booking_date: `${year}-${month}-${day}`, 
            booking_time: '10:00', 
            status: 'confirmed',
            notes: 'First time grooming'
        },
        { 
            id: 'BK-002', 
            customer_name: 'Ahmad Firdaus', 
            pet_name: 'Luna', 
            service_name: 'Check-up', 
            booking_date: `${year}-${month}-${String(parseInt(day) + 1).padStart(2, '0')}`, 
            booking_time: '14:00', 
            status: 'pending',
            notes: ''
        },
        { 
            id: 'BK-003', 
            customer_name: 'Siti Nur', 
            pet_name: 'Max', 
            service_name: 'Boarding', 
            booking_date: `${year}-${month}-${String(parseInt(day) + 2).padStart(2, '0')}`, 
            booking_time: '09:00', 
            status: 'completed',
            notes: 'Boarding 3 days'
        },
        { 
            id: 'BK-004', 
            customer_name: 'Daniel Tan', 
            pet_name: 'Coco', 
            service_name: 'Grooming', 
            booking_date: `${year}-${month}-${String(parseInt(day) + 3).padStart(2, '0')}`, 
            booking_time: '11:30', 
            status: 'confirmed',
            notes: ''
        },
        { 
            id: 'BK-005', 
            customer_name: 'Sarah Lim', 
            pet_name: 'Milo', 
            service_name: 'Vaccination', 
            booking_date: `${year}-${month}-${String(parseInt(day) + 4).padStart(2, '0')}`, 
            booking_time: '15:00', 
            status: 'pending',
            notes: 'Booster shot'
        }
    ];
}

// RENDER CALENDAR GRID
async function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    // Show loading state
    grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:#7A7A7A;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:24px;"></i>
            <p style="margin-top:12px;">Loading calendar...</p>
        </div>
    `;
    
    // Get bookings from database
    calendarEvents = await getCalendarBookings();
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Update title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonthTitle').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Build calendar HTML
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '';
    
    // Day headers
    dayNames.forEach(name => {
        html += `<div class="day-header">${name}</div>`;
    });
    
    // Empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="day-cell other-month"></div>`;
    }
    
    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const dayEvents = calendarEvents.filter(e => e.booking_date === dateStr);
        
        html += `<div class="day-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">`;
        html += `<div class="day-number">${day}</div>`;
        
        if (dayEvents.length > 0) {
            html += `<div class="day-events">`;
            const displayEvents = dayEvents.slice(0, 3);
            displayEvents.forEach(event => {
                const statusClass = event.status || 'pending';
                const timeDisplay = event.booking_time ? formatTimeShort(event.booking_time) : '';
                const eventTitle = `${timeDisplay ? timeDisplay + ' ' : ''}${event.pet_name} (${event.service_name})`;
                html += `<div class="event-mini ${statusClass}" onclick="event.stopPropagation(); showEventDetail('${event.id}')" title="${event.service_name} - ${event.pet_name}${timeDisplay ? ' at ' + timeDisplay : ''}">
                    ${eventTitle}
                </div>`;
            });
            if (dayEvents.length > 3) {
                html += `<div class="more-events" onclick="event.stopPropagation(); showDayEvents('${dateStr}')">+${dayEvents.length - 3} more</div>`;
            }
            html += `</div>`;
        }
        
        html += `</div>`;
    }
    
    grid.innerHTML = html;
}

// FORMAT TIME SHORT
function formatTimeShort(timeStr) {
    if (!timeStr) return '';
    try {
        // Handle various time formats
        let hours, minutes;
        if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            hours = parseInt(parts[0]);
            minutes = parts[1] ? parts[1].substring(0, 2) : '00';
        } else {
            return timeStr;
        }
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${h12}:${minutes}${ampm}`;
    } catch {
        return timeStr;
    }
}

// CHANGE CALENDAR VIEW
function changeCalendarView(direction) {
    if (direction === 'prev') {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    } else {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    }
    renderCalendar();
}

// REFRESH CALENDAR - KEEP CURRENT MONTH
async function refreshCalendarDashboard() {
    await renderCalendar();
}

// SHOW EVENT DETAIL
function showEventDetail(eventId) {
    const event = calendarEvents.find(e => e.id === eventId);
    if (!event) return;
    
    const modal = document.getElementById('calendarEventModal');
    if (!modal) {
        createEventDetailModal();
        setTimeout(() => {
            populateEventModal(event);
        }, 50);
    } else {
        populateEventModal(event);
    }
}

// POPULATE EVENT MODAL
function populateEventModal(event) {
    const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'check_in': 'Checked In',
        'check_out': 'Checked Out',
        'no_show': 'No Show'
    };
    const statusDisplay = statusMap[event.status] || event.status || 'Unknown';
    
    document.getElementById('calEventTitle').textContent = `Booking #${event.id}`;
    document.getElementById('calEventId').textContent = `#${event.id}`;
    document.getElementById('calEventStatus').textContent = statusDisplay;
    document.getElementById('calEventStatus').className = `detail-modal-status ${event.status || 'pending'}`;
    document.getElementById('calCustomer').textContent = event.customer_name || 'Unknown';
    document.getElementById('calPet').textContent = event.pet_name || 'Unknown';
    document.getElementById('calService').textContent = event.service_name || 'Unknown';
    
    let dateTimeStr = event.booking_date || 'Unknown';
    if (event.booking_time) {
        dateTimeStr += ` at ${formatTimeShort(event.booking_time)}`;
    }
    
    // Check-in/Check-out info
    let checkInfo = '';
    if (event.check_in) {
        checkInfo += `Check-in: ${new Date(event.check_in).toLocaleString()}`;
    }
    if (event.check_out) {
        checkInfo += (checkInfo ? ' | ' : '') + `Check-out: ${new Date(event.check_out).toLocaleString()}`;
    }
    
    document.getElementById('calDateTime').textContent = dateTimeStr;
    document.getElementById('calNotes').textContent = event.notes || 'No additional notes';
    
    // Check-in/Check-out
    const checkEl = document.getElementById('calCheckInfo');
    if (checkEl) {
        checkEl.textContent = checkInfo || 'No check-in/out recorded';
    }
    
    // Service icon
    const serviceIcons = {
        'Grooming': '✂️',
        'Check-up': '🏥',
        'Boarding': '🏠',
        'Vaccination': '💉',
        'Dental': '🦷',
        'Surgery': '🔬',
        'Training': '🎓',
        'Dog': '🐕',
        'Cat': '🐈',
        'Bird': '🐦',
        'Rabbit': '🐰'
    };
    document.getElementById('calEventAvatar').textContent = serviceIcons[event.service_name] || '📅';
    
    // Store booking ID
    document.getElementById('calViewBookingBtn').dataset.bookingId = event.id;
    
    // Show modal
    lockBodyScroll();
    document.getElementById('calendarEventModal').classList.add('active');
}

// SHOW DAY EVENTS
function showDayEvents(dateStr) {
    const events = calendarEvents.filter(e => e.booking_date === dateStr);
    if (events.length === 0) return;
    
    // Show first event as detail
    showEventDetail(events[0].id);
}

// CREATE EVENT DETAIL MODAL
function createEventDetailModal() {
    const modalHTML = `
    <div class="modal-overlay calendar-event-modal" id="calendarEventModal">
        <div class="modal-box modal-detail modal-view">
            <button class="modal-close" onclick="closeCalendarEventModal()">
                <i class="fa-solid fa-xmark"></i>
            </button>
            
            <div class="detail-modal-header">
                <div class="detail-modal-avatar" id="calEventAvatar">📅</div>
                <div>
                    <div class="detail-modal-name" id="calEventTitle">Booking Details</div>
                    <div style="display:flex; gap:10px; align-items:center; margin-top:4px; flex-wrap:wrap;">
                        <span class="detail-modal-id" id="calEventId">#BK-001</span>
                        <span class="detail-modal-status" id="calEventStatus">Pending</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fa-regular fa-circle-user"></i> Customer & Pet Information
                </div>
                <div class="event-mini-detail">
                    <div class="detail-item">
                        <span class="label">Customer Name</span>
                        <span class="value" id="calCustomer">-</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Pet Name</span>
                        <span class="value" id="calPet">-</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Service</span>
                        <span class="value" id="calService">-</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Date & Time</span>
                        <span class="value" id="calDateTime">-</span>
                    </div>
                    <div class="detail-item full-width">
                        <span class="label">Check-in / Check-out</span>
                        <span class="value" id="calCheckInfo">-</span>
                    </div>
                    <div class="detail-item full-width">
                        <span class="label">Notes</span>
                        <span class="value" id="calNotes">No additional notes</span>
                    </div>
                </div>
            </div>

            <div class="detail-actions">
                <button class="btn btn-secondary" onclick="closeCalendarEventModal()">Close</button>
                <button class="btn btn-primary" id="calViewBookingBtn" onclick="viewCalendarBooking()">
                    <i class="fa-regular fa-eye"></i> View Booking
                </button>
            </div>
        </div>
    </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div.firstElementChild);
}

// CLOSE CALENDAR EVENT MODAL
function closeCalendarEventModal() {
    const modal = document.getElementById('calendarEventModal');
    if (modal) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

// VIEW CALENDAR BOOKING
function viewCalendarBooking() {
    const bookingId = document.getElementById('calViewBookingBtn').dataset.bookingId;
    if (bookingId) {
        closeCalendarEventModal();
        window.location.href = `admin_bookings.html?view=${bookingId}`;
    }
}

// INIT CALENDAR ON DASHBOARD
async function initDashboardCalendar() {
    currentCalendarDate = new Date();
    await renderCalendar();
}

// EXPOSE TO GLOBAL
window.showLogoutModal = showLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.changeCalendarView = changeCalendarView;
window.refreshCalendarDashboard = refreshCalendarDashboard;
window.showEventDetail = showEventDetail;
window.showDayEvents = showDayEvents;
window.closeCalendarEventModal = closeCalendarEventModal;
window.viewCalendarBooking = viewCalendarBooking;
}
