// INITIALIZE EMAILJS WITH YOUR PUBLIC KEY
emailjs.init({
    publicKey: "JEjxrjixU6-925dt6"
});

// MOBILE NAVIGATION / HAMBURGER MENU HANDLER
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn ? menuBtn.querySelector("i") : null;

// CHECK IF NAVIGATION ELEMENTS EXIST IN THE DOM
if (menuBtn && navLinks) {

    // TOGGLE MENU DISPLAY WHEN HAMBURGER BUTTON IS CLICKED
    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("open");
        const isOpen = navLinks.classList.contains("open");

        // SWITCH ICON BETWEEN HAMBURGER AND CLOSE (X) ICON
        if (menuBtnIcon) {
            menuBtnIcon.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
        }
    });

    // CLOSE NAVIGATION MENU WHEN A NAVIGATION LINK IS CLICKED
    navLinks.addEventListener("click", () => {
        navLinks.classList.remove("open");

        // RESET ICON BACK TO HAMBURGER ICON
        if (menuBtnIcon) {
            menuBtnIcon.setAttribute("class", "ri-menu-line");
        }
    });
}

// WAIT UNTIL THE PAGE IS FULLY LOADED
document.addEventListener("DOMContentLoaded", () => {

    // GET THE FORM ELEMENT
    const form = document.getElementById("questionForm");

    // CHECK IF FORM EXISTS
    if (!form) {
        console.error("❌ Form with id='questionForm' not found.");
        return;
    }

    // LOG SUCCESS MESSAGE
    console.log("✅ FAQ form found, ready to send emails!");

    // DOM ELEMENTS
    // GET ALL FORM FIELD ELEMENTS
    const custName = document.getElementById("custName");
    const custEmail = document.getElementById("custEmail");
    const custPhone = document.getElementById("custPhone");
    const serviceType = document.getElementById("serviceType");
    const custQuestion = document.getElementById("custQuestion");
    const submitBtn = document.getElementById("submitBtn");

    // VALIDATION FUNCTIONS
    // VALIDATE NAME - MIN 2 CHARACTERS, LETTERS AND SPACES ONLY
    function validateName(value) {
        const trimmed = value.trim();
        if (trimmed.length < 2) return false;
        if (!/^[A-Za-z\s]+$/.test(trimmed)) return false;
        return true;
    }

    // VALIDATE EMAIL - MUST BE GMAIL.COM
    function validateEmail(value) {
        const trimmed = value.trim();
        if (!trimmed) return false;
        if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/.test(trimmed)) return false;
        return true;
    }

    // VALIDATE PHONE - 10 OR 11 DIGITS, MUST START WITH 0
    function validatePhone(value) {
        const trimmed = value.trim();
        if (!trimmed) return false;
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length !== 10 && digits.length !== 11) return false;
        if (!digits.startsWith('0')) return false;
        return true;
    }

    // VALIDATE SERVICE - MUST SELECT A TOPIC
    function validateService(value) {
        if (!value || value === "") return false;
        return true;
    }

    // VALIDATE QUESTION - MINIMUM 10 CHARACTERS
    function validateQuestion(value) {
        const trimmed = value.trim();
        if (trimmed.length < 10) return false;
        return true;
    }

    // SINGLE FIELD VALIDATION (BORDER ONLY)
    // VALIDATE INDIVIDUAL FIELD AND APPLY BORDER STYLES
    function validateField(input, validationFn) {
        const isValid = validationFn(input.value);
        
        if (isValid) {
            input.classList.remove("is-invalid");
            input.classList.add("is-valid");
        } else {
            input.classList.remove("is-valid");
            input.classList.add("is-invalid");
        }
        return isValid;
    }

    // REAL-TIME VALIDATION
    // VALIDATE NAME ON INPUT
    custName.addEventListener("input", function() {
        validateField(this, validateName);
    });

    // VALIDATE EMAIL ON INPUT
    custEmail.addEventListener("input", function() {
        validateField(this, validateEmail);
    });

    // VALIDATE PHONE ON INPUT - ONLY ALLOW DIGITS, MAX 11
    custPhone.addEventListener("input", function() {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 11) {
            this.value = this.value.slice(0, 11);
        }
        validateField(this, validatePhone);
    });

    // VALIDATE SERVICE ON CHANGE
    serviceType.addEventListener("change", function() {
        validateField(this, validateService);
    });

    // VALIDATE QUESTION ON INPUT
    custQuestion.addEventListener("input", function() {
        validateField(this, validateQuestion);
    });

    // BLUR VALIDATION
    // VALIDATE NAME ON BLUR
    custName.addEventListener("blur", function() {
        validateField(this, validateName);
    });

    // VALIDATE EMAIL ON BLUR
    custEmail.addEventListener("blur", function() {
        validateField(this, validateEmail);
    });

    // VALIDATE PHONE ON BLUR
    custPhone.addEventListener("blur", function() {
        validateField(this, validatePhone);
    });

    // VALIDATE QUESTION ON BLUR
    custQuestion.addEventListener("blur", function() {
        validateField(this, validateQuestion);
    });

    // FULL FORM VALIDATION 
    // VALIDATE ALL FIELDS BEFORE SUBMISSION
    function validateForm() {
        const isNameValid = validateField(custName, validateName);
        const isEmailValid = validateField(custEmail, validateEmail);
        const isPhoneValid = validateField(custPhone, validatePhone);
        const isServiceValid = validateField(serviceType, validateService);
        const isQuestionValid = validateField(custQuestion, validateQuestion);

        return isNameValid && isEmailValid && isPhoneValid && isServiceValid && isQuestionValid;
    }

    // HANDLE FORM SUBMISSION
    // PROCESS FORM WHEN USER CLICKS SUBMIT
    form.addEventListener("submit", function (e) {

        // PREVENT PAGE REFRESH
        e.preventDefault();

        // VALIDATE ALL FIELDS
        if (!validateForm()) {
            // FIND FIRST INVALID FIELD AND SCROLL TO IT
            const firstInvalid = form.querySelector(".is-invalid");
            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            // SHOW ERROR POPUP
            Swal.fire({
                icon: "warning",
                title: "Incomplete Form",
                text: "Please fill in all required fields correctly.",
                confirmButtonColor: "#8B5E3C"
            });
            return;
        }

        // GET ALL FORM VALUES
        const customerName = custName.value.trim();
        const customerEmail = custEmail.value.trim();
        const phone = custPhone.value.trim();
        const service = serviceType.value;
        const question = custQuestion.value.trim();

        // DISABLE SUBMIT BUTTON TO PREVENT DOUBLE SUBMISSION
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line me-2"></i>Sending...';

        // SHOW LOADING POPUP
        Swal.fire({
            title: "Sending...",
            text: "Please wait while we send your question.",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // SEND EMAIL VIA EMAILJS
        emailjs.send("service_p8b828k", "template_6nctswq", {
            customer_name: customerName,
            customer_email: customerEmail,
            phone: phone || "Not provided",
            service: service,
            question: question
        })

        // HANDLE SUCCESS RESPONSE
        .then(function (response) {
            console.log("✅ Email sent successfully!", response);

            // CLOSE LOADING POPUP
            Swal.close();

            // SHOW SUCCESS POPUP
            Swal.fire({
                icon: "success",
                title: "Question Sent! 🎉",
                text: "Thank you for contacting Paw Walker Grooming House. We will reply within 24 hours.",
                confirmButtonColor: "#8B5E3C"
            });

            // RESET THE FORM
            form.reset();

            // REMOVE ALL VALIDATION STYLES
            form.querySelectorAll(".is-valid, .is-invalid").forEach(el => {
                el.classList.remove("is-valid", "is-invalid");
            });

        })

        // HANDLE ERROR RESPONSE
        .catch(function (error) {
            console.error("❌ Email sending failed:", error);

            // CLOSE LOADING POPUP
            Swal.close();

            // SHOW ERROR POPUP
            Swal.fire({
                icon: "error",
                title: "Unable to Send",
                text: error.text || "Something went wrong. Please try again or contact us directly.",
                confirmButtonColor: "#8B5E3C"
            });

        })

        // RE-ENABLE SUBMIT BUTTON
        .finally(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ri-send-plane-fill me-2"></i>Submit Question';
        });

    });

});