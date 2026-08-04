// Initialize EmailJS
emailjs.init({
    publicKey: "JEjxrjixU6-925dt6"
});

// Wait until the page is fully loaded
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("questionForm");

    if (!form) {
        console.error("Form with id='questionForm' not found.");
        return;
    }

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        // HTML validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = form.querySelector("button[type='submit']");

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line me-2"></i>Sending...';

        Swal.fire({
            title: "Sending...",
            text: "Please wait while we send your question.",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        emailjs.send("service_p8b828k", "template_6nctswq", {

            customer_name: document.getElementById("custName").value.trim(),
            customer_email: document.getElementById("custEmail").value.trim(),
            phone: document.getElementById("custPhone").value.trim(),
            service: document.getElementById("serviceType").value,
            question: document.getElementById("custQuestion").value.trim()

        })

        .then(function (response) {

            console.log("SUCCESS!", response);

            Swal.fire({
                icon: "success",
                title: "Question Sent!",
                text: "Thank you for contacting Paw Walker Grooming House. We will reply within 24 hours.",
                confirmButtonColor: "#8B5E3C"
            });

            // Clear the form
            form.reset();

        })

        .catch(function (error) {

            console.error("FAILED...", error);

            Swal.fire({
                icon: "error",
                title: "Unable to Send",
                text: error.text || "Something went wrong. Please try again.",
                confirmButtonColor: "#8B5E3C"
            });

        })

        .finally(function () {

            submitBtn.disabled = false;
            submitBtn.innerHTML =
                '<i class="ri-send-plane-fill me-2"></i>Submit Question';

        });

    });

});