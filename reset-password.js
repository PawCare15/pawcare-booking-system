document.addEventListener('DOMContentLoaded', function() {

    // ===== 自定义弹窗 =====
    function showPopup(icon, title, message, btnText = 'Got it!') {
        const overlay = document.getElementById('customPopup');
        document.getElementById('popupIcon').textContent = icon;
        document.getElementById('popupTitle').textContent = title;
        document.getElementById('popupMessage').textContent = message;
        document.getElementById('popupBtn').textContent = btnText;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        document.getElementById('popupBtn').onclick = function() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };
        overlay.onclick = function(e) {
            if (e.target === this) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        };
    }

    // ===== DOM 引用 =====
    const otpInput = document.getElementById('otpInput');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetForm = document.getElementById('resetForm');
    const resetBtn = document.getElementById('resetBtn');
    const otpError = document.getElementById('otpError');
    const passwordError = document.getElementById('passwordError');
    const confirmError = document.getElementById('confirmError');
    const successMsg = document.getElementById('successMessage');
    const reqContainer = document.getElementById('passwordRequirements');

    const reqLength = document.getElementById('req-length');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    // ===== 密码策略 =====
    const passwordPolicy = {
        minLength: 8,
        maxLength: 16,
        hasLowercase: /[a-z]/,
        hasUppercase: /[A-Z]/,
        hasNumber: /[0-9]/,
        hasSpecial: /[!@#$%^&*]/,
    };

    function isPasswordValid(password) {
        const checks = {
            length: password.length >= passwordPolicy.minLength && password.length <= passwordPolicy.maxLength,
            lowercase: passwordPolicy.hasLowercase.test(password),
            uppercase: passwordPolicy.hasUppercase.test(password),
            number: passwordPolicy.hasNumber.test(password),
            special: passwordPolicy.hasSpecial.test(password),
        };
        return checks.length && checks.lowercase && checks.uppercase && checks.number && checks.special;
    }

    function updatePasswordRequirements(password) {
        const checks = {
            length: password.length >= passwordPolicy.minLength && password.length <= passwordPolicy.maxLength,
            lowercase: passwordPolicy.hasLowercase.test(password),
            uppercase: passwordPolicy.hasUppercase.test(password),
            number: passwordPolicy.hasNumber.test(password),
            special: passwordPolicy.hasSpecial.test(password),
        };

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

    // ===== 密码框显示/隐藏切换 =====
    function setupTogglePassword(buttonId, inputId) {
        const btn = document.getElementById(buttonId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener('click', function() {
                const isPassword = input.getAttribute('type') === 'password';
                input.setAttribute('type', isPassword ? 'text' : 'password');
                const icon = this.querySelector('i');
                icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
            });
        }
    }

    setupTogglePassword('toggleNewPassword', 'newPassword');
    setupTogglePassword('toggleConfirmPassword', 'confirmPassword');

    // ===== 密码输入时显示要求 =====
    newPassword.addEventListener('input', function() {
        const pwd = this.value;
        const valid = updatePasswordRequirements(pwd);

        if (pwd.length > 0) {
            reqContainer.classList.add('show');
        } else {
            reqContainer.classList.remove('show');
        }

        if (pwd.length > 0 && !valid) {
            passwordError.classList.add('show');
        } else {
            passwordError.classList.remove('show');
        }

        if (confirmPassword.value.length > 0) {
            if (pwd !== confirmPassword.value) {
                confirmError.classList.add('show');
            } else {
                confirmError.classList.remove('show');
            }
        }
    });

    newPassword.addEventListener('focus', function() {
        if (this.value.length > 0) {
            reqContainer.classList.add('show');
        }
    });

    newPassword.addEventListener('blur', function() {
        if (this.value.length === 0) {
            reqContainer.classList.remove('show');
        }
    });

    confirmPassword.addEventListener('input', function() {
        if (this.value.length > 0 && this.value !== newPassword.value) {
            confirmError.classList.add('show');
        } else {
            confirmError.classList.remove('show');
        }
    });

    // ===== OTP 输入限制 =====
    otpInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 6);
        if (this.value.length === 6) {
            otpError.classList.remove('show');
        }
    });

    // ===== 表单提交 =====
    resetForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const otp = otpInput.value.trim();
        const pwd = newPassword.value;
        const confirm = confirmPassword.value;

        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            otpError.textContent = 'Please enter a valid 6-digit OTP.';
            otpError.classList.add('show');
            otpInput.focus();
            return;
        } else {
            otpError.classList.remove('show');
        }

        if (!isPasswordValid(pwd)) {
            passwordError.textContent = 'Password must meet all requirements above.';
            passwordError.classList.add('show');
            newPassword.focus();
            return;
        } else {
            passwordError.classList.remove('show');
        }

        if (pwd !== confirm) {
            confirmError.textContent = 'Passwords do not match.';
            confirmError.classList.add('show');
            confirmPassword.focus();
            return;
        } else {
            confirmError.classList.remove('show');
        }

        resetBtn.disabled = true;
        resetBtn.textContent = '⏳ Processing...';

        const email = localStorage.getItem('resetEmail') || 'user@example.com';

        fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                otp: otp,
                newPassword: pwd
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                successMsg.textContent = '✅ ' + data.message;
                successMsg.classList.add('show');
                showPopup('🎉', 'Password Reset!', 'Your password has been reset successfully. Redirecting to login...');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2500);
            } else {
                showPopup('❌', 'Reset Failed', data.message || 'Invalid OTP. Please try again.');
                resetBtn.disabled = false;
                resetBtn.textContent = '✅ Reset Password';
            }
        })
        .catch(err => {
            showPopup('😅', 'Error', 'Unable to connect to server. Please try again.');
            console.error(err);
            resetBtn.disabled = false;
            resetBtn.textContent = '✅ Reset Password';
        });
    });

    // ===== 从 URL 参数读取邮箱 =====
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    if (emailFromUrl) {
        localStorage.setItem('resetEmail', emailFromUrl);
    }

    console.log('📧 Resetting password for:', localStorage.getItem('resetEmail') || 'unknown');
});