// --- 公共逻辑 (Navbar & Buttons) ---
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn ? menuBtn.querySelector("i") : null;

if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", (e) => {
        navLinks.classList.toggle("open");
        const isOpen = navLinks.classList.contains("open");
        menuBtnIcon.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
    });

    navLinks.addEventListener("click", (e) => {
        navLinks.classList.remove("open");
        menuBtnIcon.setAttribute("class", "ri-menu-line");
    });
}

document.querySelectorAll(".book-btn, .service__btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
        e.preventDefault(); 
        window.location.href = "login.html"; 
    });
});

// --- 服务页逻辑 ---
const scrollRevealOption = {
    distance: "50px",
    origin: "bottom",
    duration: 1000,
};

if (document.querySelector(".service__hero")) {
    ScrollReveal().reveal(".service__hero__content h1", { ...scrollRevealOption });
    ScrollReveal().reveal(".service__hero__content p", { ...scrollRevealOption, delay: 300 });
    ScrollReveal().reveal(".service__hero__content .service__btn", { ...scrollRevealOption, delay: 600 });
    ScrollReveal().reveal(".service__hero__image", {
        distance: "50px",
        origin: "right",
        duration: 1000,
        delay: 200,
    });

    document.querySelectorAll(".service__section").forEach((section, index) => {
        const delayBase = index * 200;
        ScrollReveal().reveal(section, {
            distance: "50px",
            origin: "bottom",
            duration: 900,
            delay: 100 + delayBase,
            opacity: 0,
            easing: "ease-out",
        });
    });

    ScrollReveal().reveal(".footer", {
        distance: "50px",
        origin: "bottom",
        duration: 1000,
        delay: 200,
    });
}

document.querySelectorAll(".serviceSwiper").forEach((swiperEl) => {
    new Swiper(swiperEl, {
        slidesPerView: 3,
        spaceBetween: 30,
        loop: false,
        pagination: {
            el: swiperEl.querySelector(".swiper-pagination"),
            clickable: true,
        },
        navigation: {
            nextEl: swiperEl.querySelector(".swiper-button-next"),
            prevEl: swiperEl.querySelector(".swiper-button-prev"),
        },
        breakpoints: {
            0: { slidesPerView: 1 },
            600: { slidesPerView: 2 },
            1024: { slidesPerView: 3 }
        }
    });
});

const params = new URLSearchParams(window.location.search);
const service = params.get("service");
if (service) {
    console.log("Selected Service:", service);
}