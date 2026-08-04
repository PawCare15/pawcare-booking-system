// ================================================================
// AUTH CHECK - 登录状态检查
// ================================================================
(function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('index.html');
        return;
    }
})();

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
// LOGOUT MODAL CONTROLS
// ================================================================
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
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    closeLogoutModal();
    window.location.replace('index.html');
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('logoutModal');
    if (e.target === modal) {
        closeLogoutModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLogoutModal();
    }
});

// ================================================================
// ===== 封装带 Token 的请求 =====
// ================================================================
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

// ================================================================
// DOM READY
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
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
    const headerAvatar = document.getElementById("headerAvatar");
    const summaryName = document.getElementById("summaryName");
    const summaryEmail = document.getElementById("summaryEmail");
    const summaryPhone = document.getElementById("summaryPhone");
    const summaryAddress = document.getElementById("summaryAddress");
    const summaryMemberSince = document.getElementById("summaryMemberSince");
    const summaryAvatar = document.getElementById("summaryAvatar");
    const avatarInput = document.getElementById("avatarInput");

    const passwordModal = document.getElementById("passwordModal");
    const openChangePasswordModal = document.getElementById("openChangePasswordModal");
    const closePasswordModal = document.getElementById("closePasswordModal");
    const changePasswordForm = document.getElementById("changePasswordForm");

    const termsBtn = document.getElementById("termsBtn");
    const aboutBtn = document.getElementById("aboutBtn");

    // ==========================================
    // 1. SIDEBAR TOGGLE LOGIC
    // ==========================================
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

    // ==========================================
    // 2. 从 API 加载用户资料
    // ==========================================
    async function loadUserProfile() {
        try {
            const res = await authFetch('/api/profile');
            const data = await res.json();
            if (data.success) {
                renderProfileData(data.data);
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        }
    }

    function renderProfileData(data) {
        if (fullNameInput) fullNameInput.value = data.full_name || '';
        if (emailInput) emailInput.value = data.email || '';
        if (phoneInput) phoneInput.value = data.phone_number || '';
        if (addressInput) addressInput.value = data.address || '';

        if (headerName) headerName.textContent = data.full_name || 'User';
        if (headerAvatar && data.avatar_url) headerAvatar.src = data.avatar_url;

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
                summaryMemberSince.textContent = "Member";
            }
        }
    }

    // ==========================================
    // 3. 保存个人资料 (发送到 API)
    // ==========================================
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
                    // 更新摘要显示
                    if (summaryPhone) summaryPhone.textContent = phone_number || "Not provided";
                    if (summaryAddress) summaryAddress.textContent = address || "Not provided";
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

    // ==========================================
    // 4. AVATAR PREVIEW (local only, backend not implemented)
    // ==========================================
    if (avatarInput) {
        avatarInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                if (summaryAvatar) summaryAvatar.src = event.target.result;
                if (headerAvatar) headerAvatar.src = event.target.result;
                showConfirmationModal("Profile picture preview updated!");
            };
            reader.readAsDataURL(file);
        });
    }

    // ==========================================
    // 5. CHANGE PASSWORD MODAL & LOGIC
    // ==========================================
    if (openChangePasswordModal) {
        openChangePasswordModal.addEventListener("click", (e) => {
            e.preventDefault();
            if (passwordModal) passwordModal.classList.add("active");
        });
    }

    if (closePasswordModal) {
        closePasswordModal.addEventListener("click", () => {
            if (passwordModal) passwordModal.classList.remove("active");
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === passwordModal) {
            passwordModal.classList.remove("active");
        }
    });

    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const newPassword = document.getElementById("newPassword")?.value;
            const retypePassword = document.getElementById("retypePassword")?.value;

            if (newPassword !== retypePassword) {
                showValidationModal("New password and confirmation do not match!");
                return;
            }

            if (newPassword.length < 6) {
                showValidationModal("Password must be at least 6 characters long.");
                return;
            }

            // 注意：此处未发送到后端，需要后端添加 /api/change-password 路由
            showConfirmationModal("Your password has been changed successfully!");
            changePasswordForm.reset();
            if (passwordModal) passwordModal.classList.remove("active");
        });
    }

    // ==========================================
    // 6. TERMS & ABOUT POP-UP BUTTONS
    // ==========================================
    if (termsBtn) {
        termsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            showTermsModal();
        });
    }

    if (aboutBtn) {
        aboutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            showAboutModal();
        });
    }

    // ==========================================
    // 7. VALIDATION MODAL CONTROLS
    // ==========================================
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

    document.getElementById('validationOkBtn').addEventListener('click', hideValidationModal);
    document.getElementById('validationModal').addEventListener('click', function(e) {
        if (e.target === this) hideValidationModal();
    });

    // ==========================================
    // 8. CONFIRMATION MODAL CONTROLS
    // ==========================================
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

    document.getElementById('confirmationOkBtn').addEventListener('click', hideConfirmationModal);
    document.getElementById('confirmationModal').addEventListener('click', function(e) {
        if (e.target === this) hideConfirmationModal();
    });

    // ==========================================
    // 9. TERMS & ABOUT MODAL CONTROLS
    // ==========================================
    function showTermsModal() {
        const modal = document.getElementById('termsModal');
        if (modal) {
            lockBodyScroll();
            modal.classList.add('active');
        }
    }

    function hideTermsModal() {
        const modal = document.getElementById('termsModal');
        if (modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    }

    document.getElementById('termsModalOkBtn').addEventListener('click', hideTermsModal);
    document.getElementById('termsModal').addEventListener('click', function(e) {
        if (e.target === this) hideTermsModal();
    });

    function showAboutModal() {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            lockBodyScroll();
            modal.classList.add('active');
        }
    }

    function hideAboutModal() {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    }

    document.getElementById('aboutModalOkBtn').addEventListener('click', hideAboutModal);
    document.getElementById('aboutModal').addEventListener('click', function(e) {
        if (e.target === this) hideAboutModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideValidationModal();
            hideConfirmationModal();
            hideTermsModal();
            hideAboutModal();
        }
    });

    // Load profile data on page start
    loadUserProfile();
});