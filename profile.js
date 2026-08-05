// ================================================================
// AMBIL CUSTOMER ID DARI localStorage
// ================================================================
function getCustomerId() {
    try {
        const customerData = localStorage.getItem('customer');
        if (customerData) {
            const parsed = JSON.parse(customerData);
            if (parsed && parsed.id) {
                return parsed.id;
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
function lockBodyScroll() {
    if (!document.body.classList.contains('no-scroll')) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = scrollbarWidth + 'px';
        document.body.classList.add('no-scroll');
    }
}

function unlockBodyScroll() {
    document.body.style.paddingRight = '';
    document.body.classList.remove('no-scroll');
}

// ================================================================
// LOGOUT
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
    localStorage.removeItem('customer');
    localStorage.removeItem('customerId');
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    closeLogoutModal();
    window.location.replace('index.html');
}

// ================================================================
// DOM READY
// ================================================================
document.addEventListener("DOMContentLoaded", async () => {
    
    // 再次检查 token（双重保险）
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('index.html');
        return;
    }

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
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
    // 1. SIDEBAR TOGGLE
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
    // 2. HELPER: SET AVATAR
    // ==========================================
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

    // ==========================================
    // 3. LOAD PROFILE FROM API
    // ==========================================
    async function loadCustomerProfile() {
        try {
            const res = await authFetch('/api/profile');
            const data = await res.json();

            if (data.success) {
                renderProfileData(data.data);
            } else {
                console.error('Failed to load profile:', data.message);
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

    // ==========================================
    // 4. SAVE PROFILE (UPDATE API)
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
                    if (summaryPhone) summaryPhone.textContent = phone_number || "Not provided";
                    if (summaryAddress) summaryAddress.textContent = address || "Not provided";

                    // Update localStorage cache
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

    // ==========================================
    // 5. AVATAR UPLOAD - using API
    // ==========================================
    if (avatarInput) {
        avatarInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                showValidationModal('Please upload an image file.');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                showValidationModal('Image size must be less than 2MB.');
                return;
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
                    showConfirmationModal("Profile picture updated successfully!");
                } else {
                    showValidationModal(data.message || 'Failed to upload avatar.');
                }
            } catch (err) {
                console.error('Error uploading avatar:', err);
                showValidationModal('Unable to upload avatar.');
            }
        });
    }

    // ==========================================
    // 6. CHANGE PASSWORD - using API
    // ==========================================
    if (openChangePasswordModal) {
        openChangePasswordModal.addEventListener("click", (e) => {
            e.preventDefault();
            if (passwordModal) {
                changePasswordForm.reset();
                document.querySelectorAll('.error-message').forEach(el => {
                    el.classList.remove('show');
                });
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

            if (newPassword.length < 6) {
                document.getElementById('newPasswordError').textContent = 'Password must be at least 6 characters.';
                document.getElementById('newPasswordError').classList.add('show');
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
                } else {
                    showValidationModal(data.message || 'Failed to update password.');
                }
            } catch (err) {
                console.error('Error changing password:', err);
                showValidationModal('Unable to update password. Please try again.');
            }
        });
    }

    // ==========================================
    // 7. MODALS (TERMS, ABOUT, VALIDATION, CONFIRMATION)
    // ==========================================
    // --- Terms ---
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

    // --- About ---
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

    // --- Validation ---
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

    // --- Confirmation ---
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

    // ==========================================
    // CLOSE ALL MODALS WITH ESCAPE
    // ==========================================
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

    // ==========================================
    // LOAD PROFILE
    // ==========================================
    await loadCustomerProfile();

    console.log('Profile page using backend API successfully!');
});