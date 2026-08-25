// WAIT FOR DOM TO BE FULLY LOADED
document.addEventListener('DOMContentLoaded', function() {

    // CUSTOM POPUP FUNCTION
    function showPopup(icon, title, message, btnText = 'Got it!') {
        const overlay = document.getElementById('customPopup');
        const iconEl = document.getElementById('popupIcon');
        const titleEl = document.getElementById('popupTitle');
        const msgEl = document.getElementById('popupMessage');
        const btnEl = document.getElementById('popupBtn');

        iconEl.textContent = icon;
        titleEl.textContent = title;
        msgEl.textContent = message;
        btnEl.textContent = btnText;

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        btnEl.onclick = function() {
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

    // DOM REFERENCES
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    const emailInput = document.getElementById('loginEmail');
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn'); 
    const emailError = document.getElementById('emailError');
    const rememberCheckbox = document.querySelector('input[name="remember"]');

    const reqLength = document.getElementById('req-length');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');
    const reqContainer = document.getElementById('passwordRequirements');

    // PASSWORD POLICY
    const passwordPolicy = {
        minLength: 8,
        maxLength: 16,
        hasLowercase: /[a-z]/,
        hasUppercase: /[A-Z]/,
        hasNumber: /[0-9]/,
        hasSpecial: /[!@#$%^&*]/,
    };

    // VALIDATE SINGLE REQUIREMENT
    function validateRequirement(value, regex) {
        return regex.test(value);
    }

    // CHECK IF PASSWORD MEETS ALL REQUIREMENTS
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

    // UPDATE PASSWORD REQUIREMENTS UI
    function updatePasswordRequirements(password) {
        const checks = {
            length: password.length >= passwordPolicy.minLength && password.length <= passwordPolicy.maxLength,
            lowercase: validateRequirement(password, passwordPolicy.hasLowercase),
            uppercase: validateRequirement(password, passwordPolicy.hasUppercase),
            number: validateRequirement(password, passwordPolicy.hasNumber),
            special: validateRequirement(password, passwordPolicy.hasSpecial),
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

    // VALIDATE EMAIL FORMAT
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // UPDATE LOGIN BUTTON STATE
    function updateLoginButton() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const emailOk = isValidEmail(email);
        const passwordOk = isPasswordValid(password);

        if (email && !emailOk) {
            emailError.textContent = 'Please enter a valid email address.';
            emailError.classList.add('show');
        } else {
            emailError.classList.remove('show');
        }

        loginBtn.disabled = !(emailOk && passwordOk);
    }

    // AUTO FILL EMAIL FROM URL PARAMETER
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    if (emailFromUrl) {
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) {
            emailInput.value = emailFromUrl;
            
            // TRIGGER VALIDATION UPDATE
            emailInput.dispatchEvent(new Event('input'));
        }
    }

    // REMEMBER ME FUNCTIONALITY
    // LOAD SAVED CREDENTIALS FROM LOCALSTORAGE
    function loadRememberedCredentials() {
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedPassword = localStorage.getItem('rememberedPassword');

        if (savedEmail && savedPassword) {
            emailInput.value = savedEmail;
            passwordInput.value = savedPassword;
            if (rememberCheckbox) {
                rememberCheckbox.checked = true;
            }
            updatePasswordRequirements(savedPassword);
            updateLoginButton();
            if (reqContainer) {
                reqContainer.classList.remove('show');
            }
        }
    }

    // SAVE CREDENTIALS TO LOCALSTORAGE
    function saveCredentials(email, password) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
    }

    // CLEAR SAVED CREDENTIALS
    function clearCredentials() {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
    }

    // HANDLE REMEMBER ME CHECKBOX
    function handleRememberMe(email, password) {
        if (rememberCheckbox && rememberCheckbox.checked) {
            saveCredentials(email, password);
        } else {
            clearCredentials();
        }
    }

    // REMEMBER ME CHECKBOX CHANGE EVENT
    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                clearCredentials();
            }
        });
    }
    
    // EVENTS
    // PASSWORD INPUT EVENT
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        updatePasswordRequirements(password);
        updateLoginButton();

        if (reqContainer) {
            if (password.length > 0) {
                reqContainer.classList.add('show');
            } else {
                reqContainer.classList.remove('show');
            }
        }
    });

    // EMAIL INPUT EVENT
    emailInput.addEventListener('input', function() {
        updateLoginButton();
    });

    // TOGGLE PASSWORD VISIBILITY
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = this.querySelector('i');
            icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
        });
    }

    // LOGIN FORM SUBMISSION
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // FRONTEND VALIDATION
            if (!isValidEmail(email)) {
                emailError.textContent = 'Please enter a valid email address.';
                emailError.classList.add('show');
                emailInput.focus();
                return;
            }

            if (!isPasswordValid(password)) {
                if (reqContainer) {
                    reqContainer.classList.add('show');
                }
                showPopup('😅', 'Oops!', 'Please make sure your password meets all the requirements shown below.');
                passwordInput.focus();
                return;
            }

            // DISABLE BUTTON TO PREVENT DOUBLE SUBMISSION
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Logging in...';

            try {

                // SEND REQUEST TO BACKEND API
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.two_factor_required) {
                    // 开启 2FA 需要二次验证 → 显示弹窗
                    showTwoFactorModal(email, password);
                    // 恢复登录按钮状态
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="ri-login-circle-line"></i> Sign In';
                    return;
                }

                if (data.success) {
                    // STORE LOGIN STATE
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.customer));
                    localStorage.setItem('isLoggedIn', 'true');

                    // HANDLE REMEMBER ME
                    if (rememberCheckbox && rememberCheckbox.checked) {
                        localStorage.setItem('rememberedEmail', email);
                        localStorage.setItem('rememberedPassword', password);
                    } else {
                        localStorage.removeItem('rememberedEmail');
                        localStorage.removeItem('rememberedPassword');
                    }

                    showPopup('🎉', 'Welcome Back!', 'Login successful! Redirecting...');
                    
                    // 🆕 根据用户角色决定跳转目标
                    const redirectUrl = data.customer.role === 'admin' ? 'admin_dashboard.html' : 'dashboard.html';
                    setTimeout(() => {
                        window.location.replace(redirectUrl);
                    }, 800);
                } else {
                    showPopup('😅', 'Login Failed', data.message || 'Invalid email or password.');
                }

            } catch (error) {
                console.error('Login error:', error);
                showPopup('❌', 'Network Error', 'Unable to connect to the server. Please try again.');
            } finally {
                // RESTORE BUTTON STATE
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="ri-login-circle-line"></i> Sign In';
            }
        });
    }
   
    // OTP POPUP LOGIC
    const otpOverlay = document.getElementById('otpOverlay');
    const otpGotItBtn = document.getElementById('otpGotItBtn');
    const otpEmailDisplay = document.getElementById('otpEmailDisplay').querySelector('span');
    const resendLink = document.getElementById('otpResendLink');

    // MASK EMAIL FOR DISPLAY
    function getMaskedEmail(email) {
        if (!email) return 'user***@gmail.com';
        const parts = email.split('@');
        const name = parts[0];
        const domain = parts[1] || 'gmail.com';
        if (name.length <= 2) return `${name}***@${domain}`;
        return `${name.substring(0, 3)}***@${domain}`;
    }

    // SHOW OTP POPUP
    function showOtpPopup(email) {
        const masked = getMaskedEmail(email);
        otpEmailDisplay.textContent = masked;
        otpOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // HIDE OTP POPUP
    function hideOtpPopup() {
        otpOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // SEND OTP EMAIL VIA API
    async function sendOtpEmail(email) {
        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email }),
            });

            const data = await response.json();

            if (data.success) {
                showOtpPopup(email);
                return Promise.resolve();
            } else {
                showPopup('❌', 'Failed to Send', data.message || 'Something went wrong.');
                return Promise.reject();
            }
        } catch (error) {
            console.error('Error:', error);
            showPopup('😅', 'Connection Error', 'Unable to reach the server.');
            return Promise.reject();
        }
    }

    // FORGOT PASSWORD CLICK HANDLER 
    document.querySelector('.forgot-link')?.addEventListener('click', function(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();

        if (!email) {
            showPopup('✉️', 'Email Required', 'Please enter your email address first.');
            document.getElementById('loginEmail').focus();
            return;
        }

        if (!isValidEmail(email)) {
            showPopup('📧', 'Invalid Email', 'Please enter a valid email address.');
            document.getElementById('loginEmail').focus();
            return;
        }

        const link = this;
        const originalText = link.textContent;
        link.textContent = '⏳ Sending...';
        link.style.color = '#af7957';
        link.style.pointerEvents = 'none';

        showPopup('📨', 'Sending OTP...', 'Please wait while we send the OTP to your email.');

        sendOtpEmail(email)
            .then(() => {
                setTimeout(() => {
                    link.textContent = originalText;
                    link.style.color = '';
                    link.style.pointerEvents = '';
                }, 2000);
            })
            .catch(() => {
                setTimeout(() => {
                    link.textContent = originalText;
                    link.style.color = '';
                    link.style.pointerEvents = '';
                }, 2000);
            });
    });

    // GOT IT BUTTON - REDIRECT TO RESET PASSWORD
    otpGotItBtn.addEventListener('click', function() {
        hideOtpPopup();

        const email = document.getElementById('loginEmail').value.trim();
        if (email) {
            localStorage.setItem('resetEmail', email);
            window.location.href = 'reset-password.html?email=' + encodeURIComponent(email);
        } else {
            window.location.href = 'reset-password.html';
        }
    });

   
    // CLOSE POPUP WHEN CLICKING OUTSIDE
    otpOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            hideOtpPopup();
        }
    });

    // RESEND OTP
    resendLink.addEventListener('click', function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();

        if (!email || !isValidEmail(email)) {
            showPopup('📧', 'Invalid Email', 'Please enter a valid email address.');
            return;
        }

        const originalText = this.textContent;
        this.textContent = '⏳ Sending...';
        this.style.color = '#af7957';
        this.style.pointerEvents = 'none';

        sendOtpEmail(email).then(() => {
            setTimeout(() => {
                this.textContent = originalText;
                this.style.color = '';
                this.style.pointerEvents = '';
            }, 3000);
        }).catch(() => {
            this.textContent = originalText;
            this.style.color = '';
            this.style.pointerEvents = '';
        });
    });

    // INIT - LOAD SAVED CREDENTIALS
    if (reqContainer) {
        reqContainer.classList.remove('show');
    }
    loadRememberedCredentials();
    updateLoginButton();

});

// ==========================================
// 2FA 验证码弹窗逻辑（弹窗方式）
// ==========================================
const twoFactorOverlay = document.getElementById('twoFactorOverlay');
const twoFactorCodeInput = document.getElementById('twoFactorCodeInput');
const twoFactorVerifyBtn = document.getElementById('twoFactorVerifyBtn');
const twoFactorEmailDisplay = document.getElementById('twoFactorEmailDisplay');
const twoFactorResendLink = document.getElementById('twoFactorResendLink');

let pendingEmail = '';
let pendingPassword = '';

function showTwoFactorModal(email, password) {
    pendingEmail = email;
    pendingPassword = password;
    twoFactorEmailDisplay.textContent = email;
    twoFactorCodeInput.value = '';
    twoFactorOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    twoFactorCodeInput.focus();
}

function hideTwoFactorModal() {
    twoFactorOverlay.style.display = 'none';
    document.body.style.overflow = '';
}

// 验证按钮点击
twoFactorVerifyBtn.addEventListener('click', async function() {
    const code = twoFactorCodeInput.value.trim();

    if (!code) {
        showPopup('⚠️', 'Missing Code', 'Please enter the 2FA code.');
        return;
    }

    twoFactorVerifyBtn.disabled = true;
    twoFactorVerifyBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Verifying...';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: pendingEmail,
                password: pendingPassword,
                two_factor_code: code
            })
        });

        const data = await response.json();

        if (data.success) {
            // 登录成功
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.customer));
            localStorage.setItem('isLoggedIn', 'true');

            // 处理记住我逻辑
            const rememberCheckbox = document.querySelector('input[name="remember"]');
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('rememberedEmail', pendingEmail);
                localStorage.setItem('rememberedPassword', pendingPassword);
            } else {
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
            }

            // 关闭 2FA 弹窗
            hideTwoFactorModal();

            // 确定跳转地址
            const redirectUrl = (data.customer && data.customer.role === 'admin') 
                ? 'admin_dashboard.html' 
                : 'dashboard.html';

            // 显示成功消息，然后跳转
            showPopup('🎉', 'Welcome Back!', 'Login successful! Redirecting...');
            // 使用较短的延迟，确保弹窗显示
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 500);

        } else {
            // 验证失败
            showPopup('❌', 'Verification Failed', data.message || 'Invalid code.');
            twoFactorCodeInput.value = '';
            twoFactorCodeInput.focus();
            // 恢复按钮（失败情况下）
            twoFactorVerifyBtn.disabled = false;
            twoFactorVerifyBtn.innerHTML = 'Verify Code';
        }

    } catch (error) {
        console.error('2FA login error:', error);
        showPopup('❌', 'Network Error', 'Unable to connect to server.');
        twoFactorVerifyBtn.disabled = false;
        twoFactorVerifyBtn.innerHTML = 'Verify Code';
    }
    // 注意：成功时不需要恢复按钮，因为页面会跳转
});

// 点击外面关闭
twoFactorOverlay.addEventListener('click', function(e) {
    if (e.target === this) {
        hideTwoFactorModal();
    }
});

// 重新发送验证码
twoFactorResendLink.addEventListener('click', function(e) {
    e.preventDefault();

    const link = this;
    const originalText = link.textContent;
    link.textContent = 'Sending...';
    link.style.pointerEvents = 'none';

    // 直接重新调用登录接口来触发再次发送邮件
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, password: pendingPassword })
    })
    .then(res => res.json())
    .then(() => {
        setTimeout(() => {
            link.textContent = originalText;
            link.style.pointerEvents = '';
        }, 2000);
    })
    .catch(() => {
        link.textContent = originalText;
        link.style.pointerEvents = '';
    });
});