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
    const toggleConfirmBtn = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regConfirmPassword');
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    const termsCheck = document.getElementById('termsCheck');
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const reqContainer = document.getElementById('passwordRequirements');

    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('regEmailError');
    const confirmError = document.getElementById('confirmError');
    const phoneError = document.getElementById('phoneError');
    const termsError = document.getElementById('termsError');

    const reqLength = document.getElementById('req-length');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

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

    // VALIDATE NAME - LETTERS AND SPACES ONLY
    function isValidName(name) {
        const nameRegex = /^[A-Za-z\s]+$/;
        return name.trim().length >= 2 && nameRegex.test(name);
    }

    // VALIDATE MALAYSIAN PHONE NUMBER
    function isValidMalaysianPhone(phone) {
        if (!phone || phone.length === 0) return true;
        const phoneRegex = /^0[0-9]{8,10}$/;
        return phoneRegex.test(phone);
    }

    // UPDATE REGISTER BUTTON STATE
    function updateRegisterButton() {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        const phone = phoneInput.value.trim();
        const termsChecked = termsCheck.checked;

        const nameOk = isValidName(name);
        const emailOk = isValidEmail(email);
        const passwordOk = isPasswordValid(password);
        const confirmOk = password === confirm && password.length > 0;
        const phoneOk = isValidMalaysianPhone(phone);
        const termsOk = termsChecked;

        if (name && !nameOk) {
            nameError.textContent = 'Please enter a valid name (letters only).';
            nameError.classList.add('show');
        } else {
            nameError.classList.remove('show');
        }

        if (email && !emailOk) {
            emailError.textContent = 'Please enter a valid email address.';
            emailError.classList.add('show');
        } else {
            emailError.classList.remove('show');
        }

        if (confirm && !confirmOk) {
            confirmError.textContent = 'Passwords do not match.';
            confirmError.classList.add('show');
        } else {
            confirmError.classList.remove('show');
        }

        if (phone && !phoneOk) {
            phoneError.textContent = 'Please enter a valid Malaysian phone number (e.g. 0123456789).';
            phoneError.classList.add('show');
        } else {
            phoneError.classList.remove('show');
        }

        if (!termsOk && termsCheck.dirty) {
            termsError.textContent = 'You must agree to the terms to continue.';
            termsError.classList.add('show');
        } else {
            termsError.classList.remove('show');
        }

        registerBtn.disabled = !(nameOk && emailOk && passwordOk && confirmOk && phoneOk && termsOk);
    }

    // EVENTS
    // TOGGLE PASSWORD VISIBILITY
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = this.querySelector('i');
            icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
        });
    }

    // TOGGLE CONFIRM PASSWORD VISIBILITY
    if (toggleConfirmBtn && confirmInput) {
        toggleConfirmBtn.addEventListener('click', function() {
            const isPassword = confirmInput.getAttribute('type') === 'password';
            confirmInput.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = this.querySelector('i');
            icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
        });
    }

    // PASSWORD INPUT EVENT
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        updatePasswordRequirements(password);
        updateRegisterButton();

        if (reqContainer) {
            if (password.length > 0) {
                reqContainer.classList.add('show');
            } else {
                reqContainer.classList.remove('show');
            }
        }

        if (confirmInput.value.length > 0) {
            updateRegisterButton();
        }
    });

     // CONFIRM PASSWORD INPUT EVENT
    confirmInput.addEventListener('input', function() {
        updateRegisterButton();
    });

    // NAME INPUT EVENT - ONLY LETTERS AND SPACES
    nameInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^A-Za-z\s]/g, '');
        updateRegisterButton();
    });

    // EMAIL INPUT EVENT
    emailInput.addEventListener('input', function() {
        updateRegisterButton();
    });

    // PHONE INPUT EVENT - ONLY DIGITS, MAX 11 CHARACTERS
    phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value.length > 11) {
            this.value = this.value.slice(0, 11);
        }
        updateRegisterButton();
    });

    // TERMS CHECKBOX CHANGE EVENT
    termsCheck.addEventListener('change', function() {
        this.dirty = true;
        updateRegisterButton();
    });

    // REGISTER FORM SUBMISSION
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirm = confirmInput.value;
            const phone = phoneInput.value.trim();
            const address = document.getElementById('regAddress').value.trim(); // 确保获取地址

            // FRONTEND VALIDATION
            if (!isValidName(name)) {
                nameError.textContent = 'Please enter a valid name (letters only).';
                nameError.classList.add('show');
                nameInput.focus();
                return;
            }

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
                showPopup('😅', 'Oops!', 'Please make sure your password meets all the requirements.');
                passwordInput.focus();
                return;
            }

            if (password !== confirm) {
                confirmError.textContent = 'Passwords do not match.';
                confirmError.classList.add('show');
                confirmInput.focus();
                return;
            }

            if (!isValidMalaysianPhone(phone)) {
                phoneError.textContent = 'Please enter a valid Malaysian phone number (e.g. 0123456789).';
                phoneError.classList.add('show');
                phoneInput.focus();
                return;
            }

            if (!termsCheck.checked) {
                termsError.textContent = 'You must agree to the terms to continue.';
                termsError.classList.add('show');
                termsCheck.focus();
                return;
            }

            // DISABLE BUTTON TO PREVENT DOUBLE SUBMISSION
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Creating Account...';

            try {

                // SEND REGISTRATION REQUEST TO BACKEND API
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        full_name: name,
                        email: email,
                        password: password,
                        phone_number: phone,
                        address: address
                    })
                });

                const data = await response.json();

                if (data.success) {

                    // REGISTRATION SUCCESSFUL
                    showPopup('🎉', 'Account Created!', 'Your account has been created successfully. Redirecting to login...');
                    setTimeout(() => {
                        window.location.replace('login.html?email=' + encodeURIComponent(email));
                    }, 1500);
                } else {

                    // REGISTRATION FAILED
                    showPopup('😅', 'Registration Failed', data.message || 'Something went wrong. Please try again.');
                }

            } catch (error) {
                console.error('Registration error:', error);
                showPopup('❌', 'Network Error', 'Unable to connect to the server. Please check your internet connection.');
            } finally {
                
                // RESTORE BUTTON STATE
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="ri-user-add-line"></i> Create Account';
            }
        });
    }

    // INIT - HIDE PASSWORD REQUIREMENTS BY DEFAULT
    if (reqContainer) {
        reqContainer.classList.remove('show');
    }
    updateRegisterButton();

});