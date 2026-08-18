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

// ADMIN CUSTOMERS - JAVASCRIPT                       
// CUSTOMER DATA (STATIC SAMPLE - 5 CUSTOMERS)                
let customersData = [
    { 
        id: '#CUS-0001', 
        name: 'Jenny Lee', 
        email: 'jennylee@gmail.com', 
        phone: '012-345 6789', 
        bookings: 8, 
        joinDate: '20 Jan 2026', 
        status: 'Active',
        address: '123, Jalan Kenanga 1, 11900 Bayan Lepas, Penang',
        completed: 6,
        cancelled: 2,
        recentBookings: [
            { service: 'Grooming (Buddy)', date: '16 May 2026, 10:00 AM' },
            { service: 'Boarding (Luna)', date: '20 May 2026, 02:00 PM' },
            { service: 'Check-up (Coco)', date: '05 May 2026, 11:00 AM' }
        ]
    },
    { 
        id: '#CUS-0002', 
        name: 'Ahmad Firdaus', 
        email: 'ahmadf@gmail.com', 
        phone: '013-987 6543', 
        bookings: 5, 
        joinDate: '18 Feb 2026', 
        status: 'Active',
        address: '45, Jalan Mutiara 2, 11600 George Town, Penang',
        completed: 4,
        cancelled: 1,
        recentBookings: [
            { service: 'Grooming (Max)', date: '10 May 2026, 09:00 AM' },
            { service: 'Boarding (Milo)', date: '15 May 2026, 01:00 PM' }
        ]
    },
    { 
        id: '#CUS-0003', 
        name: 'Siti Nur', 
        email: 'sitinur@gmail.com', 
        phone: '013-987 6543', 
        bookings: 6, 
        joinDate: '02 Mar 2026', 
        status: 'Active',
        address: '78, Jalan Permatang 5, 14000 Bukit Mertajam, Penang',
        completed: 5,
        cancelled: 1,
        recentBookings: [
            { service: 'Grooming (Mimi)', date: '12 May 2026, 11:00 AM' },
            { service: 'Check-up (Mimi)', date: '18 May 2026, 03:00 PM' }
        ]
    },
    { 
        id: '#CUS-0004', 
        name: 'Daniel Tan', 
        email: 'danieltan@gmail.com', 
        phone: '012-363 5768', 
        bookings: 4, 
        joinDate: '15 Mar 2026', 
        status: 'Active',
        address: '12, Jalan Delima 3, 11900 Bayan Lepas, Penang',
        completed: 3,
        cancelled: 1,
        recentBookings: [
            { service: 'Boarding (Brownie)', date: '08 May 2026, 10:00 AM' },
            { service: 'Grooming (Brownie)', date: '22 May 2026, 02:00 PM' }
        ]
    },
    { 
        id: '#CUS-0005', 
        name: 'Mei Ling', 
        email: 'meiling@gmail.com', 
        phone: '012-263 3289', 
        bookings: 7, 
        joinDate: '22 Mar 2026', 
        status: 'Active',
        address: '56, Jalan Sri Aman 4, 10400 George Town, Penang',
        completed: 6,
        cancelled: 1,
        recentBookings: [
            { service: 'Grooming (Bobo)', date: '05 May 2026, 09:30 AM' },
            { service: 'Check-up (Bobo)', date: '19 May 2026, 01:30 PM' },
            { service: 'Boarding (Bobo)', date: '25 May 2026, 10:00 AM' }
        ]
    }
];

// VARIABLE TO STORE CURRENT CUSTOMER BEING EDITED/DELETED
let currentCustomerId = null;

// RENDER CUSTOMER TABLE                                        
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
        const statusClass = customer.status.toLowerCase();
        const statusDisplay = customer.status;
        const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        
        return `<tr>
            <td><strong>${customer.id}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:28px; height:28px; border-radius:50%; background:#FDF3E7; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:11px; color:#5A361A; flex-shrink:0;">${initials}</div>
                    ${customer.name}
                </div>
            </td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td style="text-align:center;">${customer.bookings}</td>
            <td>${customer.joinDate}</td>
            <td><span class="status-badge-sm ${statusClass}">${statusDisplay}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-sm view" onclick="viewCustomerDetail('${customer.id}')" title="View Details">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="btn-sm edit" onclick="openEditModal('${customer.id}')" title="Edit">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="btn-sm delete" onclick="openDeleteModal('${customer.id}')" title="Delete">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// VIEW CUSTOMER DETAIL - SHOW MODAL 
function viewCustomerDetail(id) {
    const customer = customersData.find(c => c.id === id);
    
    if (!customer) {
        alert('CUSTOMER NOT FOUND!');
        return;
    }
    
    const modal = document.getElementById('customerDetailModal');
    const content = document.getElementById('customerDetailContent');
    
    const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const statusClass = customer.status.toLowerCase();
    
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
    
    content.innerHTML = `
        <div class="detail-modal-header">
            <div class="detail-modal-avatar">${initials}</div>
            <div>
                <div class="detail-modal-name">${customer.name}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; align-items:center;">
                    <span class="detail-modal-id"><i class="fa-regular fa-id-card"></i> ${customer.id}</span>
                    <span style="font-size:12px; color:#8A7A6A;"><i class="fa-regular fa-calendar"></i> Joined ${customer.joinDate}</span>
                    <span class="detail-modal-status ${statusClass}">${customer.status}</span>
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
                    <span class="value">${customer.phone}</span>
                </div>
                <div class="detail-info-item">
                    <span class="label">Email</span>
                    <span class="value">${customer.email}</span>
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
                    <span class="number">${customer.bookings}</span>
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
            <button class="btn btn-primary" onclick="closeCustomerDetail(); openEditModal('${customer.id}')">
                <i class="fa-regular fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-danger" onclick="closeCustomerDetail(); openDeleteModal('${customer.id}')">
                <i class="fa-regular fa-trash-can"></i> Delete
            </button>
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

// EDIT CUSTOMER - OPEN MODAL 
function openEditModal(id) {
    const customer = customersData.find(c => c.id === id);
    
    if (!customer) {
        alert('CUSTOMER NOT FOUND!');
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
                <span>${customer.id}</span>
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
                    <input type="email" id="editEmail" value="${customer.email}" required>
                </div>
                <div class="field">
                    <label>Phone <span class="required">*</span></label>
                    <input type="text" id="editPhone" value="${customer.phone}" required>
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
                    <i class="fa-regular fa-floppy-disk"></i> Save Changes
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

function saveEditCustomer(event) {
    event.preventDefault();
    
    const id = currentCustomerId;
    const customer = customersData.find(c => c.id === id);
    
    if (!customer) {
        alert('Customer not found!');
        return;
    }
    
    // GET VALUE FROM FORM
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    const status = document.getElementById('editStatus').value;
    
    // VALIDATION
    if (!name) {
        alert('Please enter full name.');
        document.getElementById('editName').focus();
        return;
    }
    if (!email) {
        alert('Please enter email.');
        document.getElementById('editEmail').focus();
        return;
    }
    if (!phone) {
        alert('Please enter phone number.');
        document.getElementById('editPhone').focus();
        return;
    }
    
    // UPDATE CUSTOMER DATA
    customer.name = name;
    customer.email = email;
    customer.phone = phone;
    customer.address = address || customer.address;
    customer.status = status;
    
    // CLOSE EDIT MODAL
    closeEditModal();
    
    // SHOW SUCCESS MODAL WITH CUSTOMER NAME 
    showSuccessModal('Customer Updated Successfully!', `Customer ${customer.name} (${id}) has been updated successfully.`);
}

// SUCCESS MODAL
function showSuccessModal(title, message) {
    const modal = document.getElementById('successModal');
    const titleEl = document.getElementById('successTitle');
    const messageEl = document.getElementById('successMessage');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
    unlockBodyScroll();
    
    // Refresh table and stats after closing
    renderCustomerTable(customersData);
    loadCustomerStats();
}

// DELETE CUSTOMER - OPEN CONFIRMATION MODAL          
function openDeleteModal(id) {
    const customer = customersData.find(c => c.id === id);
    
    if (!customer) {
        alert('CUSTOMER NOT FOUND!');
        return;
    }
    
    currentCustomerId = id;
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    // SHOW CUSTOMER NAME CLEARLY
    message.innerHTML = `Are you sure you want to delete customer <strong>${customer.name}</strong> (${customer.id})? This action cannot be undone.`;
    
    // REMOVE PREVIOUS EVENT LISTENER AND ADD NEW ONE
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', function() {
        confirmDeleteCustomer();
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

function confirmDeleteCustomer() {
    const id = currentCustomerId;
    
    if (!id) {
        alert('No customer selected for deletion.');
        return;
    }
    
    const index = customersData.findIndex(c => c.id === id);
    
    if (index === -1) {
        alert('Customer not found!');
        return;
    }
    
    // GET CUSTOMER NAME FOR MESSAGE
    const customerName = customersData[index].name;
    
    // REMOVE CUSTOMER
    customersData.splice(index, 1);
    
    // CLOSE DELETE MODAL
    closeDeleteModal();
    
    // SHOW SUCCESS MODAL WITH CUSTOMER NAME 
    showSuccessModal('Customer Deleted Successfully!', `Customer ${customerName} (${id}) has been deleted successfully.`);
}

// SEARCH FUNCTION                                           
function searchCustomers(query) {
    const filtered = customersData.filter(customer => {
        const searchTerm = query.toLowerCase().trim();
        return customer.name.toLowerCase().includes(searchTerm) ||
               customer.email.toLowerCase().includes(searchTerm) ||
               customer.phone.includes(searchTerm);
    });
    renderCustomerTable(filtered);
}

// LOAD CUSTOMER STATS                                         
function loadCustomerStats() {
    const total = customersData.length;
    const active = customersData.filter(c => c.status === 'Active').length;
    const inactive = customersData.filter(c => c.status === 'Inactive').length;
    
    // CALCULATE NEW CUSTOMERS THIS MONTH BASED ON JOINDATE
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthName = monthNames[currentMonth];
    
    let newCustomers = 0;
    customersData.forEach(c => {
        const joinParts = c.joinDate.split(' ');
        if (joinParts.length >= 3) {
            const joinMonth = joinParts[1];
            const joinYear = parseInt(joinParts[2]);
            if (joinMonth === currentMonthName && joinYear === currentYear) {
                newCustomers++;
            }
        }
    });
    
    // UPDATE STATS CARDS
    const totalEl = document.getElementById('totalCustomers');
    const newEl = document.getElementById('newCustomers');
    const activeEl = document.getElementById('activeCustomers');
    const inactiveEl = document.getElementById('inactiveCustomers');
    
    if (totalEl) totalEl.textContent = total;
    if (newEl) newEl.textContent = newCustomers;
    if (activeEl) activeEl.textContent = active;
    if (inactiveEl) inactiveEl.textContent = inactive;
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

    // CLOSE MODALS ON ESCAPE KEY
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
            closeLogoutModal();
            closeCustomerDetail();
            closeEditModal();
            closeDeleteModal();
            closeSuccessModal();
        }
    });

    // NOTIFICATION BELL
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            alert('NO NEW NOTIFICATIONS.');
        });
    }

    // SEARCH INPUT LISTENER
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchCustomers(e.target.value);
        });
    }

    // CLOSE MODALS ON OVERLAY CLICK
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                unlockBodyScroll();
                if (this.id === 'successModal') {
                    renderCustomerTable(customersData);
                    loadCustomerStats();
                }
            }
        });
    });

    // LOAD DATA
    loadCustomerStats();
    renderCustomerTable(customersData);

    console.log('PAWCARE ADMIN CUSTOMERS LOADED SUCCESSFULLY!');
});