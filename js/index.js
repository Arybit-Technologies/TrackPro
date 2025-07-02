// === TrackPro index.js ===

// === Loading Animation ===
window.addEventListener('load', function() {
    const loading = document.getElementById('loading');
    setTimeout(() => {
        loading.classList.add('hidden');
    }, 1000);
});

// === Navbar Scroll Effect (preserves glassmorphism) ===
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(15, 23, 42, 0.98)';
        navbar.style.boxShadow = '0 2px 16px rgba(50,6,46,0.08)';
    } else {
        navbar.style.background = 'var(--glass-bg)';
        navbar.style.boxShadow = 'none';
    }
});

// === Scroll Reveal Animation for Cards ===
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .revenue-card, .stat-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(.4,2,.6,1)';
        observer.observe(card);
    });

    // Enhanced hover effects for cards
    document.querySelectorAll('.feature-card, .revenue-card, .stat-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-15px) scale(1.02)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// === Smooth Scrolling for Anchor Links ===
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// === Animated Counters for Stats ===
function animateCounters(section) {
    const counters = section.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = counter.innerText;
        const isPercentage = target.includes('%');
        const isCurrency = target.includes('$');
        const isTime = target.includes('s') || target.toLowerCase().includes('months');
        let numericValue;
        if (isCurrency) {
            numericValue = parseFloat(target.replace(/[$M]/g, ''));
        } else if (isPercentage) {
            numericValue = parseFloat(target.replace('%', ''));
        } else if (isTime && target.includes('s')) {
            numericValue = parseFloat(target.replace('s', ''));
        } else if (isTime && target.toLowerCase().includes('months')) {
            numericValue = parseFloat(target.toLowerCase().replace(' months', ''));
        } else {
            numericValue = parseFloat(target);
        }
        if (isNaN(numericValue)) return;
        let current = 0;
        const increment = numericValue / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
                current = numericValue;
                clearInterval(timer);
            }
            let displayValue;
            if (isCurrency) {
                displayValue = '$' + current.toFixed(1) + 'M';
            } else if (isPercentage) {
                displayValue = Math.floor(current) + '%';
            } else if (isTime && target.includes('s')) {
                displayValue = Math.floor(current) + 's';
            } else if (isTime && target.toLowerCase().includes('months')) {
                displayValue = Math.floor(current) + ' Months';
            } else {
                displayValue = current.toFixed(1);
            }
            counter.innerText = displayValue;
        }, 30);
    });
}

// Trigger counter animation when stats section is visible
document.addEventListener('DOMContentLoaded', () => {
    const statsObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    const revenueStats = document.querySelector('.revenue-stats');
    if (heroStats) statsObserver.observe(heroStats);
    if (revenueStats) statsObserver.observe(revenueStats);
});

// === Particle Effect for Hero Section ===
function createParticle() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.background = 'rgba(255, 255, 255, 0.3)';
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = '100%';
    particle.style.animation = 'floatUp 8s linear forwards';
    hero.appendChild(particle);
    setTimeout(() => {
        particle.remove();
    }, 8000);
}

// Add CSS for particle animation if not already present
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('particle-floatUp-style')) {
        const style = document.createElement('style');
        style.id = 'particle-floatUp-style';
        style.textContent = `
          @keyframes floatUp {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
    }
    // Create particles periodically
    setInterval(createParticle, 2000);
    // Add some initial particles
    for (let i = 0; i < 5; i++) {
        setTimeout(createParticle, i * 400);
    }
});

// === Dark Mode Toggle with Persistence and Icon/Text Update ===
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleThemeBtn');
    function setTheme(dark) {
        if (dark) {
            document.body.classList.add('dark-mode');
            toggleBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        } else {
            document.body.classList.remove('dark-mode');
            toggleBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
    }
    // On load, set theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    setTheme(savedTheme === 'dark');
    // Toggle on click
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const isDark = !document.body.classList.contains('dark-mode');
            setTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
});