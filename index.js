// PUBLIC NAVBAR AND BUTTON LOGIC 
// GET NAVBAR ELEMENTS
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn ? menuBtn.querySelector("i") : null;

// TOGGLE MOBILE MENU ON BUTTON CLICK
if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", (e) => {
        navLinks.classList.toggle("open");
        const isOpen = navLinks.classList.contains("open");
        menuBtnIcon.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
    });

    // CLOSE MOBILE MENU WHEN A LINK IS CLICKED
    navLinks.addEventListener("click", (e) => {
        navLinks.classList.remove("open");
        menuBtnIcon.setAttribute("class", "ri-menu-line");
    });
}

// REDIRECT BOOK BUTTONS TO LOGIN PAGE
document.querySelectorAll(".book-btn, .service__btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
        e.preventDefault(); 
        window.location.href = "login.html"; 
    });
});

// SCROLL REVEAL ANIMATIONS FOR HOME PAGE 
// SCROLL REVEAL CONFIGURATION
const scrollRevealOption = {
    distance: "50px",
    origin: "bottom",
    duration: 1000,
};

// CHECK IF HEADER CONTENT EXISTS (HOME PAGE)
if (document.querySelector(".header__content")) {
    
    // REVEAL HEADER ELEMENTS WITH DELAYS
    ScrollReveal().reveal(".header__content h4", { ...scrollRevealOption });
    ScrollReveal().reveal(".header__content h1", { ...scrollRevealOption, delay: 500 });
    ScrollReveal().reveal(".header__content h2", { ...scrollRevealOption, delay: 1000 });
    ScrollReveal().reveal(".header__content p", { ...scrollRevealOption, delay: 1500 });
    ScrollReveal().reveal(".header__btn", { ...scrollRevealOption, delay: 2000 });

    // REVEAL INTRO CARDS WITH INTERVAL
    ScrollReveal().reveal(".intro__card", { ...scrollRevealOption, interval: 500 });

    // REVEAL ABOUT SECTION IMAGES FROM LEFT
    ScrollReveal().reveal(
        ".about__row:nth-child(3) .about__image img, .about__row:nth-child(5) .about__image img",
        { ...scrollRevealOption, origin: "left" }
    );
    
    // REVEAL ABOUT SECTION IMAGES FROM RIGHT
    ScrollReveal().reveal(".about__row:nth-child(4) .about__image img", { ...scrollRevealOption, origin: "right" });
    
    // REVEAL ABOUT CONTENT WITH DELAYS
    ScrollReveal().reveal(".about__content span", { ...scrollRevealOption, delay: 500 });
    ScrollReveal().reveal(".about__content h4", { ...scrollRevealOption, delay: 1000 });
    ScrollReveal().reveal(".about__content p", { ...scrollRevealOption, delay: 1500 });

    // REVEAL PRODUCT AND SERVICE CARDS
    ScrollReveal().reveal(".product__card", { ...scrollRevealOption, interval: 500 });
    ScrollReveal().reveal(".service__card", { duration: 1000, interval: 500 });
}

// SWIPER SLIDER INITIALIZATION
// INITIALIZE MAIN SWIPER (EXCLUDING SERVICE SWIPER)
if (document.querySelector(".swiper:not(.serviceSwiper)")) {
    const mainSwiper = new Swiper(".swiper:not(.serviceSwiper)", {
        slidesPerView: 3,
        spaceBetween: 20,
        loop: true,
    });
}