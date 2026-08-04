document.addEventListener('DOMContentLoaded', function() {

    // =========================================================
    // 自定义弹窗函数
    // =========================================================
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

    // =========================================================
    // DOM REFERENCES
    // =========================================================
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

    // =========================================================
    // PASSWORD POLICY
    // =========================================================
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

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

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

    // =========================================================
    // 自动填充 URL 参数中的邮箱（注册后跳转回来）
    // =========================================================
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    if (emailFromUrl) {
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) {
            emailInput.value = emailFromUrl;
            // 触发验证更新
            emailInput.dispatchEvent(new Event('input'));
        }
    }

    // =========================================================
    // REMEMBER ME 功能
    // =========================================================

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

    function saveCredentials(email, password) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
    }

    function clearCredentials() {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
    }

    function handleRememberMe(email, password) {
        if (rememberCheckbox && rememberCheckbox.checked) {
            saveCredentials(email, password);
        } else {
            clearCredentials();
        }
    }

    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                clearCredentials();
            }
        });
    }

    // =========================================================
    // EVENTS
    // =========================================================
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

    emailInput.addEventListener('input', function() {
        updateLoginButton();
    });

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = this.querySelector('i');
            icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
        });
    }

    // =========================================================
    // 登录表单提交 - 替换原来那一段
    // =========================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // 1. 前端格式验证（保留，提升用户体验）
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

            // 2. 禁用按钮防止重复提交
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Logging in...';

            try {
                // 3. 发送请求到后端 API 验证
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // ✅ 4. 只有后端验证通过，才存储登录状态
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.customer));
                    localStorage.setItem('isLoggedIn', 'true');

                    // 5. 处理 “记住我” (只存邮箱密码用于自动填充，不用于验证)
                    if (rememberCheckbox && rememberCheckbox.checked) {
                        localStorage.setItem('rememberedEmail', email);
                        localStorage.setItem('rememberedPassword', password);
                    } else {
                        localStorage.removeItem('rememberedEmail');
                        localStorage.removeItem('rememberedPassword');
                    }

                    showPopup('🎉', 'Welcome Back!', 'Login successful! Redirecting...');
                    
                    setTimeout(() => {
                        window.location.replace('dashboard.html');
                    }, 800);

                } else {
                    // ❌ 登录失败（密码错误 / 用户不存在）
                    showPopup('😅', 'Login Failed', data.message || 'Invalid email or password.');
                }

            } catch (error) {
                console.error('Login error:', error);
                showPopup('❌', 'Network Error', 'Unable to connect to the server. Please try again.');
            } finally {
                // 恢复按钮状态
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="ri-login-circle-line"></i> Sign In';
            }
        });
    }

    // =========================================================
    // OTP POPUP LOGIC
    // =========================================================
    const otpOverlay = document.getElementById('otpOverlay');
    const otpGotItBtn = document.getElementById('otpGotItBtn');
    const otpEmailDisplay = document.getElementById('otpEmailDisplay').querySelector('span');
    const resendLink = document.getElementById('otpResendLink');

    function getMaskedEmail(email) {
        if (!email) return 'user***@gmail.com';
        const parts = email.split('@');
        const name = parts[0];
        const domain = parts[1] || 'gmail.com';
        if (name.length <= 2) return `${name}***@${domain}`;
        return `${name.substring(0, 3)}***@${domain}`;
    }

    function showOtpPopup(email) {
        const masked = getMaskedEmail(email);
        otpEmailDisplay.textContent = masked;
        otpOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideOtpPopup() {
        otpOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

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

    // =========================================================
    // Forgot Password 点击（带反馈）
    // =========================================================
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

    // =========================================================
    // Got it! 按钮 → 跳转到重置密码页面
    // =========================================================
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

    // =========================================================
    // 点击弹窗外关闭
    // =========================================================
    otpOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            hideOtpPopup();
        }
    });

    // =========================================================
    // Resend OTP
    // =========================================================
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

    // =========================================================
    // INIT — 加载保存的凭证（默认隐藏密码提示）
    // =========================================================
    if (reqContainer) {
        reqContainer.classList.remove('show');
    }
    loadRememberedCredentials();
    updateLoginButton();

});