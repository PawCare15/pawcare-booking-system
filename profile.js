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
// LOGOUT MODAL CONTROLS (确保 logout 后无法回退到 dashboard)
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
    // 使用 replace 替换历史记录，防止用户按后退键回到 dashboard
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
    // 2. 辅助：更新头像显示 (图片或占位)
    // ==========================================
    function setAvatar(avatarUrl) {
        // Header avatar
        if (avatarUrl) {
            headerAvatarImg.src = avatarUrl;
            headerAvatarImg.style.display = 'block';
            headerAvatarPlaceholder.style.display = 'none';
        } else {
            headerAvatarImg.style.display = 'none';
            headerAvatarPlaceholder.style.display = 'inline';
        }

        // Summary avatar
        if (avatarUrl) {
            summaryAvatarImg.src = avatarUrl;
            summaryAvatarImg.style.display = 'block';
            summaryAvatarPlaceholder.style.display = 'none';
        } else {
            summaryAvatarImg.style.display = 'none';
            summaryAvatarPlaceholder.style.display = 'inline';
        }
    }

    // ==========================================
    // 3. 从 API 加载用户资料
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
        // 基本信息
        if (fullNameInput) fullNameInput.value = data.full_name || '';
        if (emailInput) emailInput.value = data.email || '';
        if (phoneInput) phoneInput.value = data.phone_number || '';
        if (addressInput) addressInput.value = data.address || '';

        if (headerName) headerName.textContent = data.full_name || 'User';
        if (summaryName) summaryName.textContent = data.full_name || 'User';
        if (summaryEmail) summaryEmail.textContent = data.email || 'Not provided';
        if (summaryPhone) summaryPhone.textContent = data.phone_number || 'Not provided';
        if (summaryAddress) summaryAddress.textContent = data.address || 'Not provided';

        // 会员日期
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

        // 头像 (优先显示用户上传的)
        setAvatar(data.avatar_url || null);
    }

    // ==========================================
    // 4. 保存个人资料 (发送到 API)
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
    // 5. AVATAR UPLOAD PREVIEW (本地预览)
    // ==========================================
    if (avatarInput) {
        avatarInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                // 预览更新
                setAvatar(dataUrl);
                showConfirmationModal("Profile picture updated! (Preview only. Save to keep it.)");
            };
            reader.readAsDataURL(file);
        });
    }

    // ==========================================
    // 6. CHANGE PASSWORD MODAL & LOGIC
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

            // 此处可调用后端 API 更改密码，目前仅为前端模拟
            showConfirmationModal("Your password has been changed successfully!");
            changePasswordForm.reset();
            if (passwordModal) passwordModal.classList.remove("active");
        });
    }

    // ==========================================
    // 7. TERMS & ABOUT POP-UP BUTTONS
    // ==========================================
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

    // ==========================================
    // 8. VALIDATION MODAL CONTROLS
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
    // 9. CONFIRMATION MODAL CONTROLS
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
    // 10. TERMS & ABOUT MODAL CLOSE
    // ==========================================
    document.getElementById('termsModalOkBtn').addEventListener('click', function() {
        const modal = document.getElementById('termsModal');
        if (modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });
    document.getElementById('termsModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            unlockBodyScroll();
        }
    });

    document.getElementById('aboutModalOkBtn').addEventListener('click', function() {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
    });
    document.getElementById('aboutModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            unlockBodyScroll();
        }
    });

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

    // Load profile data on page start
    loadUserProfile();
});