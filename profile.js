// AUTH CHECK - PREVENT BACK NAVIGATION AFTER LOGOUT
(function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('index.html');
        return;
    }
})();

// DETECT BACK BUTTON NAVIGATION FROM CACHED PAGE
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        const tokenCheck = localStorage.getItem('token');
        if (!tokenCheck) {
            window.location.replace('index.html');
        }
    }
});

// WRAPPER FOR API CALLS WITH TOKEN
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
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
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }
    return response;
}

// GET CUSTOMER ID FROM LOCALSTORAGE
function getCustomerId() {
    try {
        const customerData = localStorage.getItem('customer');
        if (customerData) {
            const parsed = JSON.parse(customerData);
            if (parsed && parsed.customer_id) {
                return parsed.customer_id;
            }
        }
        const customerId = localStorage.getItem('customerId');
        if (customerId) {
            return customerId;
        }
        return null;
    } catch (e) {
        console.error('Error getting customer ID:', e);
        return null;
    }
}

// ================================================================
// SCROLLBAR COMPENSATION
// ================================================================
let modalCount = 0;

function getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
}

function lockBodyScroll() {
    if (modalCount === 0) {
        const scrollbarWidth = getScrollbarWidth();
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

// ================================================================
// NOTIFICATIONS MODAL CONTROLS
// ================================================================
const notificationBtn = document.getElementById('notificationBtn');
const notificationsModal = document.getElementById('notificationsModal');
const closeNotificationsModal = document.getElementById('closeNotificationsModal');
const notificationsModalOkBtn = document.getElementById('notificationsModalOkBtn');

function showNotificationsModal() {
    const content = document.getElementById('notificationsModalContent');
    if (!content) return;
    
    // 复用 dashboard 的 notifications 渲染逻辑
    // 但需要获取最新的 bookings 数据
    fetchNotificationsData().then(html => {
        content.innerHTML = html || '<div style="text-align:center; padding:20px; color:#7A7A7A;">No upcoming appointments.</div>';
        lockBodyScroll();
        notificationsModal.classList.add('active');
    });
}

function hideNotificationsModal() {
    notificationsModal.classList.remove('active');
    unlockBodyScroll();
}

if (notificationBtn) {
    notificationBtn.addEventListener('click', showNotificationsModal);
}
if (closeNotificationsModal) {
    closeNotificationsModal.addEventListener('click', hideNotificationsModal);
}
if (notificationsModalOkBtn) {
    notificationsModalOkBtn.addEventListener('click', hideNotificationsModal);
}
notificationsModal.addEventListener('click', function(e) {
    if (e.target === this) hideNotificationsModal();
});

// 辅助函数：获取通知列表 HTML（复用 renderNotifications 的逻辑）
async function fetchNotificationsData() {
    try {
        const res = await authFetch('/api/bookings');
        const data = await res.json();
        if (!data.success) return '<div style="text-align:center; color:#7A7A7A; padding:20px;">Unable to load notifications.</div>';
        
        const bookings = data.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const tomorrowBookings = bookings.filter(b => {
            const bookingDate = new Date(b.booking_date);
            bookingDate.setHours(0, 0, 0, 0);
            return bookingDate.getTime() === tomorrow.getTime() && b.status !== 'cancelled';
        });
        
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        
        const upcomingBookings = bookings.filter(b => {
            const bookingDate = new Date(b.booking_date);
            bookingDate.setHours(0, 0, 0, 0);
            return bookingDate >= today && 
                   bookingDate <= threeDaysLater && 
                   b.status !== 'cancelled' &&
                   bookingDate.getTime() !== tomorrow.getTime();
        });
        
        let html = '';
        
        if (tomorrowBookings.length > 0) {
            tomorrowBookings.forEach(b => {
                const petName = b.pet ? b.pet.name : 'Unknown';
                const time = b.booking_time || 'N/A';
                html += `
                    <div style="background: #FEF7E0; border-radius: 8px; padding: 10px 14px; border: 1px solid #FDE68A; margin-bottom: 10px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid fa-clock" style="color: #D97706;"></i>
                            <strong>⏰ Tomorrow!</strong>
                            <span style="margin-left:auto; font-size:12px; color:#B06000;">${tomorrow.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' })}</span>
                        </div>
                        <div style="margin-top:4px;">Appointment for <strong>${petName}</strong> at <strong>${time}</strong></div>
                    </div>
                `;
            });
        }
        
        if (upcomingBookings.length > 0) {
            upcomingBookings.slice(0, 5).forEach(b => {
                const petName = b.pet ? b.pet.name : 'Unknown';
                const date = new Date(b.booking_date);
                const dateDisplay = date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' });
                const daysUntil = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
                let timeDisplay = '';
                if (daysUntil === 0) timeDisplay = 'Today';
                else if (daysUntil === 1) timeDisplay = 'Tomorrow';
                else timeDisplay = `In ${daysUntil} days`;
                
                html += `
                    <div style="display:flex; align-items:center; padding:8px 0; border-bottom:1px solid #EFECE6;">
                        <i class="fa-regular fa-calendar" style="color:#D97706; width:24px;"></i>
                        <div style="flex:1; margin-left:8px;">
                            <strong>${petName}</strong> on ${dateDisplay}
                        </div>
                        <span style="font-size:12px; color:#7A7A7A;">${timeDisplay}</span>
                    </div>
                `;
            });
        }
        
        if (!html) {
            html = '<div style="text-align:center; padding:30px; color:#7A7A7A;"><i class="fa-regular fa-bell" style="font-size:32px; display:block; margin-bottom:10px;"></i>No upcoming appointments.</div>';
        }
        return html;
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return '<div style="text-align:center; color:#7A7A7A; padding:20px;">Error loading notifications.</div>';
    }
}

// ==========================================
      // LOGOUT MODAL
      // ==========================================
      window.showLogoutModal = function() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
          modal.classList.add('active');
          lockBodyScroll();
        }
      };

      window.closeLogoutModal = function() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
          modal.classList.remove('active');
          unlockBodyScroll();
        }
      };

      window.confirmLogout = function() {
        localStorage.removeItem('customer');
        localStorage.removeItem('customerId');
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        window.closeLogoutModal();
        window.location.replace('index.html');
      };

      const logoutModal = document.getElementById('logoutModal');
      if (logoutModal) {
        logoutModal.addEventListener('click', function(e) {
          if (e.target === this) {
            window.closeLogoutModal();
          }
        });
      }

// ================================================================
// LOAD HEADER PROFILE
// ================================================================
async function loadHeaderProfile() {
    try {
        const res = await authFetch('/api/profile');
        const data = await res.json();
        if (data.success) {
            const profile = data.data;
            document.getElementById('headerName').textContent = profile.full_name || 'User';
            if (profile.profile_photo) {
                const img = document.getElementById('headerAvatarImg');
                img.src = profile.profile_photo;
                img.style.display = 'block';
                document.getElementById('headerAvatarPlaceholder').style.display = 'none';
            } else {
                document.getElementById('headerAvatarImg').style.display = 'none';
                document.getElementById('headerAvatarPlaceholder').style.display = 'inline';
            }
            // 同时更新 welcome 横幅（若还未更新）
            const welcomeSpan = document.querySelector('#welcomeUserName span');
            if (welcomeSpan) {
                welcomeSpan.textContent = profile.full_name;
            }
            // 更新 localStorage 以便其他页面使用
            const customer = JSON.parse(localStorage.getItem('customer') || '{}');
            customer.full_name = profile.full_name;
            customer.profile_photo = profile.profile_photo;
            localStorage.setItem('customer', JSON.stringify(customer));
        }
    } catch (err) {
        console.error('Error loading header profile:', err);
    }
}

// TOGGLE PASSWORD VISIBILITY
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = button.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
    }
}

// PASSWORD VALIDATION FUNCTIONS
const passwordPolicy = {
    minLength: 8,
    maxLength: 16,
    hasLowercase: /[a-z]/,
    hasUppercase: /[A-Z]/,
    hasNumber: /[0-9]/,
    hasSpecial: /[!@#$%^&*]/,
};

function validateRequirement(value, regex) {
    return regex.test(value);
}

function isPasswordValid(password) {
    const checks = {
        length: password.length >= passwordPolicy.minLength && password.length <= passwordPolicy.maxLength,
        lowercase: validateRequirement(password, passwordPolicy.hasLowercase),
        uppercase: validateRequirement(password, passwordPolicy.hasUppercase),
        number: validateRequirement(password, passwordPolicy.hasNumber),
        special: validateRequirement(password, passwordPolicy.hasSpecial),
    };
    return checks.length && checks.lowercase && checks.uppercase && checks.number && checks.special;
}

function updatePasswordRequirements(password) {
    const checks = {
        length: password.length >= passwordPolicy.minLength && password.length <= passwordPolicy.maxLength,
        lowercase: validateRequirement(password, passwordPolicy.hasLowercase),
        uppercase: validateRequirement(password, passwordPolicy.hasUppercase),
        number: validateRequirement(password, passwordPolicy.hasNumber),
        special: validateRequirement(password, passwordPolicy.hasSpecial),
    };

    const reqLength = document.getElementById('req-length');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    const requirementMap = [
        { element: reqLength, met: checks.length },
        { element: reqLowercase, met: checks.lowercase },
        { element: reqUppercase, met: checks.uppercase },
        { element: reqNumber, met: checks.number },
        { element: reqSpecial, met: checks.special },
    ];

    requirementMap.forEach(({ element, met }) => {
        const icon = element.querySelector('i');
        if (met) {
            element.classList.remove('not-met');
            element.classList.add('met');
            icon.className = 'ri-check-line';
        } else {
            element.classList.remove('met');
            element.classList.add('not-met');
            icon.className = 'ri-close-line';
        }
    });

    return checks.length && checks.lowercase && checks.uppercase && checks.number && checks.special;
}

// DOM CONTENT LOADED - MAIN APPLICATION
document.addEventListener("DOMContentLoaded", async () => {

    // ================================================================
    // 1. 先加载用户头像和名称（所有页面都需要的公共部分）
    // ================================================================
    loadHeaderProfile();

    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            // 已在 profile 页面，可以不跳转或提示
            // 这里不跳转
            return;
        });
    }
    
    // DOUBLE CHECK TOKEN FOR SECURITY
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('index.html');
        return;
    }

    // DOM ELEMENTS REFERENCES
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarClose = document.getElementById("sidebarClose");

    const profileForm = document.getElementById("profileForm");
    const fullNameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const addressInput = document.getElementById("address");

    const headerName = document.getElementById("headerName");
    const headerAvatarImg = document.getElementById("headerAvatarImg");
    const headerAvatarPlaceholder = document.getElementById("headerAvatarPlaceholder");

    const summaryName = document.getElementById("summaryName");
    const summaryEmail = document.getElementById("summaryEmail");
    const summaryPhone = document.getElementById("summaryPhone");
    const summaryAddress = document.getElementById("summaryAddress");
    const summaryMemberSince = document.getElementById("summaryMemberSince");
    const summaryAvatarImg = document.getElementById("summaryAvatarImg");
    const summaryAvatarPlaceholder = document.getElementById("summaryAvatarPlaceholder");
    const avatarInput = document.getElementById("avatarInput");

    const passwordModal = document.getElementById("passwordModal");
    const openChangePasswordModal = document.getElementById("openChangePasswordModal");
    const closePasswordModal = document.getElementById("closePasswordModal");
    const changePasswordForm = document.getElementById("changePasswordForm");

    const termsBtn = document.getElementById("termsBtn");
    const aboutBtn = document.getElementById("aboutBtn");

    // PASSWORD REQUIREMENTS DOM REFERENCES
    const reqContainer = document.getElementById('passwordRequirements');
    const newPasswordInput = document.getElementById('newPassword');

    // SIDEBAR TOGGLE FUNCTIONALITY
    function openSidebar() {
        if (sidebar) sidebar.classList.add("active");
        if (sidebarOverlay) sidebarOverlay.classList.add("active");
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    }

    if (menuToggle) menuToggle.addEventListener("click", openSidebar);
    if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

    // SET AVATAR IMAGE
    function setAvatar(avatarUrl) {
        if (avatarUrl) {
            headerAvatarImg.src = avatarUrl;
            headerAvatarImg.style.display = 'block';
            headerAvatarPlaceholder.style.display = 'none';
            summaryAvatarImg.src = avatarUrl;
            summaryAvatarImg.style.display = 'block';
            summaryAvatarPlaceholder.style.display = 'none';
        } else {
            headerAvatarImg.style.display = 'none';
            headerAvatarPlaceholder.style.display = 'inline';
            summaryAvatarImg.style.display = 'none';
            summaryAvatarPlaceholder.style.display = 'inline';
        }
    }

    // LOAD PROFILE FROM API
    async function loadCustomerProfile() {
        try {
            const res = await authFetch('/api/profile');
            const data = await res.json();

            if (data.success) {
                console.log('Profile data received:', data.data);
                renderProfileData(data.data);
            } else {
                console.error('Failed to load profile:', data.message);
                // 如果失败，显示提示
                showValidationModal('Failed to load profile data. Please refresh.');
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            showValidationModal('Unable to connect to server.');
        }
    }

    // RENDER PROFILE DATA TO UI
    function renderProfileData(data) {
        // UPDATE FORM FIELDS - MATCH DATABASE COLUMN NAMES
        if (fullNameInput) fullNameInput.value = data.full_name || '';
        if (emailInput) emailInput.value = data.email || '';
        if (phoneInput) phoneInput.value = data.phone_number || '';
        if (addressInput) addressInput.value = data.address || '';

        // UPDATE HEADER USERNAME
        if (headerName) headerName.textContent = data.full_name || 'User';

        // UPDATE PROFILE SUMMARY
        if (summaryName) summaryName.textContent = data.full_name || 'User';
        if (summaryEmail) summaryEmail.textContent = data.email || 'Not provided';
        if (summaryPhone) summaryPhone.textContent = data.phone_number || 'Not provided';
        if (summaryAddress) summaryAddress.textContent = data.address || 'Not provided';
        if (summaryMemberSince) {
            if (data.created_at) {
                const dateObj = new Date(data.created_at);
                summaryMemberSince.textContent = dateObj.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
            } else {
                summaryMemberSince.textContent = "Customer";
            }
        }

        setAvatar(data.profile_photo || null);
    }

    // SAVE PROFILE - UPDATE API
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const phone_number = phoneInput ? phoneInput.value.trim() : "";
            const address = addressInput ? addressInput.value.trim() : "";

            try {
                const res = await authFetch('/api/profile', {
                    method: 'PUT',
                    body: JSON.stringify({ phone_number, address })
                });
                const data = await res.json();

                if (data.success) {
                    // UPDATE SUMMARY DISPLAY
                    if (summaryPhone) summaryPhone.textContent = phone_number || "Not provided";
                    if (summaryAddress) summaryAddress.textContent = address || "Not provided";

                    // UPDATE LOCALSTORAGE CACHE
                    try {
                        const customerData = localStorage.getItem('customer');
                        if (customerData) {
                            const parsed = JSON.parse(customerData);
                            parsed.phone_number = phone_number;
                            parsed.address = address;
                            localStorage.setItem('customer', JSON.stringify(parsed));
                        }
                    } catch (err) {
                        console.warn('Could not update localStorage:', err);
                    }

                    showConfirmationModal("Profile changes saved successfully!");
                } else {
                    showValidationModal(data.message || 'Failed to save profile.');
                }
            } catch (err) {
                console.error('Error saving profile:', err);
                showValidationModal('Unable to connect to server.');
            }
        });
    }

    // AVATAR UPLOAD - API
    if (avatarInput) {
        avatarInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                showValidationModal('Please upload an image file.');
                avatarInput.value = ''; // 清空 input
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                showValidationModal('Image size must be less than 2MB.');
                avatarInput.value = '';
                return;
            }

            // ===== 显示 Loading =====
            const cameraBtn = document.querySelector('.camera-btn');
            const originalHtml = cameraBtn ? cameraBtn.innerHTML : '';
            if (cameraBtn) {
                cameraBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                cameraBtn.style.pointerEvents = 'none';
            }

            try {
                const formData = new FormData();
                formData.append('avatar', file);

                const token = localStorage.getItem('token');
                const res = await fetch('/api/profile/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await res.json();

                if (data.success) {
                    setAvatar(data.avatar_url);
                    // 更新 localStorage 中的头像
                    const customer = JSON.parse(localStorage.getItem('customer') || '{}');
                    customer.profile_photo = data.avatar_url;
                    localStorage.setItem('customer', JSON.stringify(customer));
                    showConfirmationModal("Profile picture updated successfully!");
                } else {
                    showValidationModal(data.message || 'Failed to upload avatar.');
                }
            } catch (err) {
                console.error('Error uploading avatar:', err);
                showValidationModal('Unable to upload avatar.');
            } finally {
                // ===== 恢复按钮状态 =====
                if (cameraBtn) {
                    cameraBtn.innerHTML = originalHtml || '<i class="fa-solid fa-camera"></i>';
                    cameraBtn.style.pointerEvents = '';
                }
                avatarInput.value = ''; // 清空 input
            }
        });
    }

    // CHANGE PASSWORD - API WITH PASSWORD REQUIREMENTS
    if (openChangePasswordModal) {
        openChangePasswordModal.addEventListener("click", (e) => {
            e.preventDefault();
            if (passwordModal) {
                changePasswordForm.reset();
                document.querySelectorAll('.error-message').forEach(el => {
                    el.classList.remove('show');
                });
                if (reqContainer) {
                    reqContainer.classList.remove('show');
                }
                passwordModal.classList.add('active');
                lockBodyScroll();
            }
        });
    }

    if (closePasswordModal) {
        closePasswordModal.addEventListener("click", () => {
            if (passwordModal) {
                passwordModal.classList.remove('active');
                unlockBodyScroll();
            }
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === passwordModal) {
            passwordModal.classList.remove('active');
            unlockBodyScroll();
        }
    });

    // PASSWORD INPUT EVENT - UPDATE REQUIREMENTS
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            const isValid = updatePasswordRequirements(password);

            if (reqContainer) {
                if (password.length > 0) {
                    reqContainer.classList.add('show');
                } else {
                    reqContainer.classList.remove('show');
                }
            }

            const newPasswordError = document.getElementById('newPasswordError');
            if (password.length > 0 && !isValid) {
                if (newPasswordError) {
                    newPasswordError.textContent = 'Password must meet all requirements above.';
                    newPasswordError.classList.add('show');
                }
            } else {
                if (newPasswordError) {
                    newPasswordError.classList.remove('show');
                }
            }

            const retypePassword = document.getElementById('retypePassword')?.value;
            const retypeError = document.getElementById('retypePasswordError');
            if (retypePassword && password !== retypePassword) {
                if (retypeError) {
                    retypeError.textContent = 'Passwords do not match.';
                    retypeError.classList.add('show');
                }
            } else {
                if (retypeError) {
                    retypeError.classList.remove('show');
                }
            }
        });
    }

    // CONFIRM PASSWORD INPUT EVENT
    const retypePasswordInput = document.getElementById('retypePassword');
    if (retypePasswordInput) {
        retypePasswordInput.addEventListener('input', function() {
            const newPassword = document.getElementById('newPassword')?.value || '';
            const retypeError = document.getElementById('retypePasswordError');
            
            if (this.value && this.value !== newPassword) {
                if (retypeError) {
                    retypeError.textContent = 'Passwords do not match.';
                    retypeError.classList.add('show');
                }
            } else {
                if (retypeError) {
                    retypeError.classList.remove('show');
                }
            }
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById("currentPassword")?.value;
            const newPassword = document.getElementById("newPassword")?.value;
            const retypePassword = document.getElementById("retypePassword")?.value;

            document.querySelectorAll('.error-message').forEach(el => {
                el.classList.remove('show');
            });

            if (!currentPassword) {
                document.getElementById('currentPasswordError').textContent = 'Please enter your current password.';
                document.getElementById('currentPasswordError').classList.add('show');
                return;
            }

            if (!isPasswordValid(newPassword)) {
                document.getElementById('newPasswordError').textContent = 'Password must meet all requirements above.';
                document.getElementById('newPasswordError').classList.add('show');
                if (reqContainer) {
                    reqContainer.classList.add('show');
                }
                return;
            }

            if (newPassword !== retypePassword) {
                document.getElementById('retypePasswordError').textContent = 'Passwords do not match.';
                document.getElementById('retypePasswordError').classList.add('show');
                return;
            }

            try {
                const res = await authFetch('/api/profile/password', {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await res.json();

                if (data.success) {
                    if (passwordModal) {
                        passwordModal.classList.remove('active');
                        unlockBodyScroll();
                    }
                    showConfirmationModal('Your password has been changed successfully!');
                    changePasswordForm.reset();
                    if (reqContainer) {
                        reqContainer.classList.remove('show');
                    }
                } else {
                    // 先关闭密码模态再显示错误提示
                    if (passwordModal) {
                        passwordModal.classList.remove('active');
                        unlockBodyScroll();
                    }
                    showValidationModal(data.message || 'Failed to update password.');
                }
            } catch (err) {
                console.error('Error changing password:', err);
                if (passwordModal) {
                    passwordModal.classList.remove('active');
                    unlockBodyScroll();
                }
                showValidationModal('Unable to update password. Please try again.');
            }
        });
    }

    // MODAL CONTROLS - TERMS, ABOUT, VALIDATION, CONFIRMATION
    // TERMS MODAL
    if (termsBtn) {
        termsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const modal = document.getElementById('termsModal');
            if (modal) {
                lockBodyScroll();
                modal.classList.add('active');
            }
        });
    }

    document.getElementById('termsModalOkBtn')?.addEventListener('click', function() {
        const modal = document.getElementById('termsModal');
        if (modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });

    document.getElementById('termsModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            unlockBodyScroll();
        }
    });

    // ABOUT MODAL
    if (aboutBtn) {
        aboutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const modal = document.getElementById('aboutModal');
            if (modal) {
                lockBodyScroll();
                modal.classList.add('active');
            }
        });
    }

    document.getElementById('aboutModalOkBtn')?.addEventListener('click', function() {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });

    document.getElementById('aboutModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            unlockBodyScroll();
        }
    });

    // VALIDATION MODAL
    function showValidationModal(message) {
        const modal = document.getElementById('validationModal');
        const msgEl = document.getElementById('validationMessage');
        if (modal && msgEl) {
            msgEl.textContent = message;
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

    // CONFIRMATION MODAL
    function showConfirmationModal(message) {
        const modal = document.getElementById('confirmationModal');
        const msgEl = document.getElementById('confirmationMessage');
        if (modal && msgEl) {
            msgEl.textContent = message;
            lockBodyScroll();
            modal.classList.add('active');
        }
    }

    function hideConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    }

    document.getElementById('validationOkBtn')?.addEventListener('click', hideValidationModal);
    document.getElementById('validationModal')?.addEventListener('click', function(e) {
        if (e.target === this) hideValidationModal();
    });

    document.getElementById('confirmationOkBtn')?.addEventListener('click', hideConfirmationModal);
    document.getElementById('confirmationModal')?.addEventListener('click', function(e) {
        if (e.target === this) hideConfirmationModal();
    });

    // CLOSE ALL MODALS WITH ESCAPE KEY
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideValidationModal();
            hideConfirmationModal();
            document.getElementById('termsModal')?.classList.remove('active');
            document.getElementById('aboutModal')?.classList.remove('active');
            document.getElementById('passwordModal')?.classList.remove('active');
            unlockBodyScroll();
        }
    });

    // INITIALIZE - LOAD PROFILE DATA
    await loadCustomerProfile();

    console.log('Profile page using backend API successfully!');
});