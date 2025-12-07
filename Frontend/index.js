// ========== HEADER SECTION FUNCTIONS ==========

// DOM Elements
const header = document.querySelector('.header');
const progressBar = document.querySelector('.progress-bar');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileMenuClose = document.querySelector('.mobile-menu-close');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
const navLinks = document.querySelectorAll('.nav-link');

// Scroll Effects
window.addEventListener('scroll', () => {
    // Header scroll effect
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // Progress bar
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + '%';
});

// Mobile Menu Functions
function toggleMobileMenu() {
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
}

function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
}

// Event Listeners
mobileMenuBtn.addEventListener('click', toggleMobileMenu);
mobileMenuClose.addEventListener('click', closeMobileMenu);

// Close mobile menu when clicking on links
mobileNavLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
});

// Smooth scroll for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Add active class to current section in navigation
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', updateActiveNavLink);

// Initialize header animations
function initHeaderAnimations() {
    // Animate nav links on load
    navLinks.forEach((link, index) => {
        link.style.animation = `slideInRight 0.5s ease forwards ${index * 0.1}s`;
        link.style.opacity = '0';
    });
    
    // Animate header actions
    const btnHeader = document.querySelector('.btn-header');
    if (btnHeader) {
        btnHeader.style.animation = 'fadeInUp 0.8s ease forwards 0.6s';
        btnHeader.style.opacity = '0';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initHeaderAnimations();
    
    // Add click outside to close mobile menu
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active') && 
            !mobileMenu.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });
});

// Export functions if using modules (optional)
// export { initHeaderAnimations, updateActiveNavLink };




// Hero Section Functions

// ========== HERO SECTION FUNCTIONS ==========

// DOM Elements
const hero = document.querySelector('.hero');
const heroTitleParts = document.querySelectorAll('.title-part');
const heroSubtitle = document.querySelector('.hero-subtitle');
const heroDescription = document.querySelector('.hero-description');
const heroActions = document.querySelector('.hero-actions');
const heroStats = document.querySelector('.hero-stats');
const statNumbers = document.querySelectorAll('.stat-number');
const scrollIndicator = document.querySelector('.scroll-indicator');

// Text Typing Animation
function initTypingAnimation() {
    const subtitle = document.querySelector('.hero-subtitle');
    const text = subtitle.textContent;
    const cursor = document.querySelector('.typing-cursor');
    
    // Remove cursor from text
    subtitle.textContent = text.replace('|', '');
    
    let i = 0;
    const speed = 50; // typing speed in ms
    
    function typeWriter() {
        if (i < text.length) {
            const char = text.charAt(i);
            if (char !== '|') {
                subtitle.textContent += char;
            }
            i++;
            setTimeout(typeWriter, speed);
        } else {
            // Add cursor back after typing
            subtitle.appendChild(cursor);
        }
    }
    
    // Start typing after 1 second
    setTimeout(() => {
        subtitle.textContent = '';
        typeWriter();
    }, 1000);
}

// Animated Counter
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const duration = 2000; // 2 seconds
    const stepTime = duration / 100;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        if (element.textContent.includes('%')) {
            element.textContent = Math.floor(current) + '%';
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, stepTime);
}

// Initialize Counters
function initCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const target = parseInt(element.getAttribute('data-count'));
                animateCounter(element, target);
                observer.unobserve(element);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(number => {
        observer.observe(number);
    });
}

// Floating Elements Animation
function initFloatingElements() {
    const floatingElements = document.querySelectorAll('.floating-element');
    
    floatingElements.forEach((element, index) => {
        // Add mouse move interaction
        element.addEventListener('mouseenter', () => {
            element.style.animation = 'floatElement 1s ease-in-out';
            element.style.transform = 'scale(1.2)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.animation = `floatElement 6s ease-in-out infinite ${index}s`;
            element.style.transform = 'scale(1)';
        });
        
        // Make elements clickable on desktop
        element.style.pointerEvents = 'auto';
        element.style.cursor = 'pointer';
        
        element.addEventListener('click', () => {
            element.style.animation = 'none';
            element.style.transform = 'scale(1.5)';
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.animation = `floatElement 6s ease-in-out infinite ${index}s`;
                element.style.transform = 'scale(1)';
                element.style.opacity = '0.8';
            }, 500);
        });
    });
}

// Particle Background Animation
function initParticleBackground() {
    const particles = document.querySelectorAll('.bg-particle');
    
    particles.forEach(particle => {
        // Add subtle movement on mouse move
        hero.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth) * 10;
            const y = (e.clientY / window.innerHeight) * 10;
            
            particle.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
}

// Scroll Indicator Interaction
function initScrollIndicator() {
    const scrollText = document.querySelector('.scroll-text');
    
    scrollIndicator.addEventListener('click', () => {
        window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
        });
        
        // Add click feedback
        scrollText.textContent = 'Scrolling...';
        setTimeout(() => {
            scrollText.textContent = 'Scroll to explore';
        }, 1000);
    });
    
    // Hide scroll indicator when scrolling
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            scrollIndicator.style.opacity = '0';
            scrollIndicator.style.pointerEvents = 'none';
        } else {
            scrollIndicator.style.opacity = '1';
            scrollIndicator.style.pointerEvents = 'auto';
        }
    });
}

// Glitch Effect for Title
function initGlitchEffect() {
    heroTitleParts.forEach(part => {
        setInterval(() => {
            // Random glitch effect
            if (Math.random() > 0.9) {
                part.style.textShadow = `
                    ${Math.random() * 2}px ${Math.random() * 2}px 0 #ff00ff,
                    ${Math.random() * -2}px ${Math.random() * -2}px 0 #00ffff
                `;
                
                setTimeout(() => {
                    part.style.textShadow = 'none';
                }, 100);
            }
        }, 1000);
    });
}

// Initialize Hero Section
function initHeroSection() {
    // Start animations
    initTypingAnimation();
    initCounters();
    initFloatingElements();
    initParticleBackground();
    initScrollIndicator();
    initGlitchEffect();
    
    // Add hero section intersection observer
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Hero is in view - trigger animations
                entry.target.classList.add('in-view');
                
                // Add parallax effect on scroll
                window.addEventListener('scroll', () => {
                    const scrolled = window.pageYOffset;
                    const rate = scrolled * -0.5;
                    hero.style.backgroundPosition = `center ${rate}px`;
                });
            }
        });
    }, { threshold: 0.5 });
    
    heroObserver.observe(hero);
}

// Export functions
// export { initHeroSection, initCounters, initTypingAnimation };


// ============================================
// Feature Section Functions

// ========== FEATURES SECTION FUNCTIONS ==========

// DOM Elements
const featureCards = document.querySelectorAll('.feature-card');
const featureVideos = document.querySelectorAll('.feature-video');
const playIndicators = document.querySelectorAll('.play-indicator');

// Initialize Features Section
function initFeaturesSection() {
    initFeatureCards();
    initVideoControls();
    initFeatureHoverEffects();
    initFeatureIntersectionObserver();
}

// Feature Cards Animation
function initFeatureCards() {
    featureCards.forEach((card, index) => {
        // Staggered animation on load
        card.style.animation = `fadeInUp 0.8s ease forwards ${index * 0.1}s`;
        card.style.opacity = '0';
        
        // Mouse move effect for hover light
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
        
        // Click effect
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.feature-link')) {
                card.classList.toggle('active');
                
                if (card.classList.contains('active')) {
                    card.querySelector('.feature-card-inner').style.transform = 
                        'rotateY(0) rotateX(0) translateY(-20px) scale(1.02)';
                } else {
                    card.querySelector('.feature-card-inner').style.transform = 
                        'rotateY(5deg) rotateX(5deg) translateY(-10px)';
                }
            }
        });
        
        // Feature link interaction
        const featureLink = card.querySelector('.feature-link');
        if (featureLink) {
            featureLink.addEventListener('click', (e) => {
                e.stopPropagation();
                const feature = card.getAttribute('data-feature');
                showFeatureDetails(feature);
            });
        }
    });
}

// Video Controls
function initVideoControls() {
    featureVideos.forEach((video, index) => {
        const card = video.closest('.feature-card');
        const playIndicator = playIndicators[index];
        
        // Play/pause on click
        video.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVideoPlayback(video, playIndicator);
        });
        
        // Play indicator click
        if (playIndicator) {
            playIndicator.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleVideoPlayback(video, playIndicator);
            });
        }
        
        // Show play indicator on hover
        card.addEventListener('mouseenter', () => {
            if (video.paused) {
                playIndicator.style.opacity = '1';
                playIndicator.style.transform = 'scale(1)';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            if (video.paused) {
                playIndicator.style.opacity = '0';
                playIndicator.style.transform = 'scale(0.5)';
            }
        });
        
        // Video ended event
        video.addEventListener('ended', () => {
            video.currentTime = 0;
            playIndicator.style.opacity = '1';
            playIndicator.style.transform = 'scale(1)';
        });
    });
}

function toggleVideoPlayback(video, indicator) {
    if (video.paused) {
        video.play();
        indicator.innerHTML = '<i class="fas fa-pause"></i>';
        indicator.style.opacity = '1';
        indicator.style.transform = 'scale(1)';
    } else {
        video.pause();
        indicator.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// Feature Hover Effects
function initFeatureHoverEffects() {
    featureCards.forEach(card => {
        const iconWrapper = card.querySelector('.icon-wrapper i');
        const listItems = card.querySelectorAll('.list-item');
        
        card.addEventListener('mouseenter', () => {
            // Icon animation
            if (iconWrapper) {
                iconWrapper.style.transform = 'scale(1.2) rotate(10deg)';
            }
            
            // List items animation
            listItems.forEach((item, index) => {
                item.style.transitionDelay = `${index * 0.1}s`;
                item.style.transform = 'translateX(0)';
            });
            
            // Number animation
            const featureNumber = card.querySelector('.feature-number');
            if (featureNumber) {
                featureNumber.style.animation = 'none';
                featureNumber.style.transform = 'scale(1.1)';
                featureNumber.style.background = 'var(--gradient-purple)';
                featureNumber.style.color = 'white';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            // Reset icon
            if (iconWrapper) {
                iconWrapper.style.transform = 'scale(1) rotate(0)';
            }
            
            // Reset list items
            listItems.forEach(item => {
                item.style.transform = '';
                item.style.transitionDelay = '';
            });
            
            // Reset number
            const featureNumber = card.querySelector('.feature-number');
            if (featureNumber) {
                featureNumber.style.animation = 'countGlow 3s infinite';
                featureNumber.style.transform = 'scale(1)';
                featureNumber.style.background = 'rgba(109, 78, 255, 0.1)';
                featureNumber.style.color = 'var(--primary-purple)';
            }
        });
    });
}

// Intersection Observer for Features
function initFeatureIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const iconRing = card.querySelector('.icon-ring');
                
                // Start pulse animation
                if (iconRing) {
                    iconRing.style.animation = 'pulseIcon 2s infinite';
                }
                
                // Add visible class
                card.classList.add('visible');
                
                // Trigger video play (if autoplay is allowed)
                const video = card.querySelector('.feature-video');
                if (video && isInViewport(card)) {
                    video.play().catch(e => {
                        // Autoplay was prevented
                        console.log('Autoplay prevented:', e);
                    });
                }
            } else {
                const video = entry.target.querySelector('.feature-video');
                if (video) {
                    video.pause();
                }
            }
        });
    }, { threshold: 0.3 });
    
    featureCards.forEach(card => {
        observer.observe(card);
    });
}

// Helper function to check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Feature Details Modal
function showFeatureDetails(feature) {
    const featureData = {
        emotion: {
            title: 'Emotion Recognition',
            description: 'Advanced AI algorithms analyze facial expressions, voice tones, and text inputs to detect and understand your emotional state in real-time.',
            benefits: [
                'Real-time emotional analysis',
                'Multi-modal detection (face, voice, text)',
                'Detailed emotional insights and patterns',
                'Historical emotion tracking'
            ],
            icon: 'fas fa-brain'
        },
        growth: {
            title: 'Personalized Growth Pathway',
            description: 'Customized learning paths based on your emotional patterns and goals to help you develop emotional intelligence effectively.',
            benefits: [
                'AI-powered personalization',
                'Progress tracking and analytics',
                'Adaptive learning recommendations',
                'Goal setting and achievement tracking'
            ],
            icon: 'fas fa-chart-line'
        },
        // Add more feature data as needed
    };
    
    if (featureData[feature]) {
        const data = featureData[feature];
        createFeatureModal(data);
    }
}

function createFeatureModal(data) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.feature-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'feature-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-icon">
                    <i class="${data.icon}"></i>
                </div>
                <button class="modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <h3>${data.title}</h3>
                <p>${data.description}</p>
                <div class="modal-benefits">
                    <h4>Key Benefits</h4>
                    <ul>
                        ${data.benefits.map(benefit => `<li><i class="fas fa-check"></i> ${benefit}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <a href="signup.html" class="btn btn-primary">
                    <i class="fas fa-rocket"></i>
                    Try This Feature
                </a>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .feature-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }
        
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            position: relative;
            z-index: 1;
            background: white;
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideInUp 0.4s ease;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .modal-icon {
            width: 60px;
            height: 60px;
            background: var(--gradient-purple);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-icon i {
            color: white;
            font-size: 1.5rem;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--dark-gray);
            cursor: pointer;
            padding: 0.5rem;
            transition: all 0.3s ease;
        }
        
        .modal-close:hover {
            color: var(--primary-purple);
            transform: rotate(90deg);
        }
        
        .modal-body h3 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
            color: var(--dark-purple);
        }
        
        .modal-body p {
            color: var(--dark-gray);
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        
        .modal-benefits h4 {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: var(--dark-purple);
        }
        
        .modal-benefits ul {
            list-style: none;
            margin-bottom: 2rem;
        }
        
        .modal-benefits li {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
            color: var(--dark-gray);
        }
        
        .modal-benefits i {
            color: #4CAF50;
        }
        
        .modal-footer {
            text-align: center;
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    document.head.appendChild(style);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    closeBtn.addEventListener('click', () => modal.remove());
    overlay.addEventListener('click', () => modal.remove());
    
    // Close on escape key
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

// Initialize when features section is in view
function initFeaturesObserver() {
    const featuresSection = document.querySelector('#features');
    if (!featuresSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                initFeaturesSection();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(featuresSection);
}

// Call this in your main initialization
// initFeaturesObserver();


// ================================

// Recourse Section Functions

// ========== RESOURCES SECTION FUNCTIONS ==========

function initResourcesSection() {
    const resourceCards = document.querySelectorAll('.resource-card');
    const resourceBtns = document.querySelectorAll('.resource-btn');
    
    // Resource card hover effects
    resourceCards.forEach(card => {
        // Mouse move effect for hover light
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            
            // Parallax effect for icon
            const icon = card.querySelector('.resource-icon');
            if (icon) {
                const moveX = (x - rect.width / 2) * 0.02;
                const moveY = (y - rect.height / 2) * 0.02;
                icon.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1) rotate(10deg)`;
            }
        });
        
        card.addEventListener('mouseleave', () => {
            const icon = card.querySelector('.resource-icon');
            if (icon) {
                icon.style.transform = '';
            }
        });
        
        // Click effect
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.resource-btn')) {
                card.classList.add('clicked');
                setTimeout(() => {
                    card.classList.remove('clicked');
                }, 300);
            }
        });
        
        // Feature tags animation
        const featureTags = card.querySelectorAll('.feature-tag');
        featureTags.forEach((tag, index) => {
            tag.style.animationDelay = `${index * 0.1}s`;
        });
    });
    
    // Resource button click effects
    resourceBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Add click animation
            const btnIcon = this.querySelector('i');
            const originalIcon = btnIcon.className;
            
            btnIcon.className = 'fas fa-spinner fa-spin';
            this.style.pointerEvents = 'none';
            
            setTimeout(() => {
                btnIcon.className = originalIcon;
                this.style.pointerEvents = 'auto';
                
                // Show success notification for external links
                if (this.getAttribute('href').startsWith('http')) {
                    showResourceNotification('Opening external resource...');
                }
            }, 1500);
        });
    });
    
    // Initialize animations
    initResourceAnimations();
}

function initResourceAnimations() {
    const resourceCards = document.querySelectorAll('.resource-card');
    
    // Intersection observer for staggered animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
                }, index * 200);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    resourceCards.forEach(card => {
        observer.observe(card);
    });
}

function showResourceNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.resource-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'resource-notification';
    notification.innerHTML = `
        <i class="fas fa-external-link-alt"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .resource-notification {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            border-left: 4px solid var(--primary-purple);
        }
        
        .resource-notification i {
            color: var(--primary-purple);
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize when resources section is in view
function initResourcesObserver() {
    const resourcesSection = document.querySelector('#resources');
    if (!resourcesSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                initResourcesSection();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(resourcesSection);
}


// ========================= daily insights section ===============

// ========== DAILY EMOTIONAL INSIGHTS SECTION FUNCTIONS ==========

function initInsightsSection() {
    const insightItems = document.querySelectorAll('.insight-item');
    const prevBtn = document.getElementById('prev-insight');
    const nextBtn = document.getElementById('next-insight');
    const progressFill = document.querySelector('.progress-fill');
    const currentInsightSpan = document.querySelector('.current-insight');
    const playBtn = document.querySelector('.play-pause');
    const rewindBtn = document.getElementById('rewind');
    const forwardBtn = document.getElementById('forward');
    const videoPlayBtn = document.querySelector('.play-btn');
    
    let currentInsight = 0;
    const totalInsights = insightItems.length;
    
    // Initialize first insight as active
    updateInsight(0);
    
    // Next insight button
    nextBtn.addEventListener('click', () => {
        currentInsight = (currentInsight + 1) % totalInsights;
        updateInsight(currentInsight);
        scrollToInsight(currentInsight);
    });
    
    // Previous insight button
    prevBtn.addEventListener('click', () => {
        currentInsight = (currentInsight - 1 + totalInsights) % totalInsights;
        updateInsight(currentInsight);
        scrollToInsight(currentInsight);
    });
    
    // Click on insight item
    insightItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            currentInsight = index;
            updateInsight(currentInsight);
        });
        
        // Add hover animation delay
        item.style.animationDelay = `${index * 0.05}s`;
    });
    
    // Auto-rotate insights
    let autoRotateInterval = setInterval(() => {
        currentInsight = (currentInsight + 1) % totalInsights;
        updateInsight(currentInsight);
        scrollToInsight(currentInsight);
    }, 8000);
    
    // Pause auto-rotate on hover
    const insightsList = document.querySelector('.insights-list');
    insightsList.addEventListener('mouseenter', () => {
        clearInterval(autoRotateInterval);
    });
    
    insightsList.addEventListener('mouseleave', () => {
        autoRotateInterval = setInterval(() => {
            currentInsight = (currentInsight + 1) % totalInsights;
            updateInsight(currentInsight);
            scrollToInsight(currentInsight);
        }, 8000);
    });
    
    // Video controls
    let isPlaying = false;
    
    playBtn.addEventListener('click', () => {
        const icon = playBtn.querySelector('i');
        isPlaying = !isPlaying;
        
        if (isPlaying) {
            icon.className = 'fas fa-pause';
            playBtn.style.background = 'var(--accent-purple)';
        } else {
            icon.className = 'fas fa-play';
            playBtn.style.background = 'var(--primary-purple)';
        }
        
        // Simulate video play/pause
        simulateVideoPlayback(isPlaying);
    });
    
    rewindBtn.addEventListener('click', () => {
        // Simulate rewind
        showVideoNotification('Rewinding 10 seconds');
    });
    
    forwardBtn.addEventListener('click', () => {
        // Simulate forward
        showVideoNotification('Forwarding 10 seconds');
    });
    
    videoPlayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        playBtn.click();
    });
    
    // Initialize animations
    initInsightAnimations();
}

function updateInsight(index) {
    const insightItems = document.querySelectorAll('.insight-item');
    const progressFill = document.querySelector('.progress-fill');
    const currentInsightSpan = document.querySelector('.current-insight');
    
    // Remove active class from all items
    insightItems.forEach(item => {
        item.classList.remove('active');
        item.style.animation = 'none';
    });
    
    // Add active class to current item
    insightItems[index].classList.add('active');
    insightItems[index].style.animation = 'fadeInUp 0.5s ease';
    
    // Update progress
    const progress = ((index + 1) / insightItems.length) * 100;
    progressFill.style.width = `${progress}%`;
    
    // Update current number
    currentInsightSpan.textContent = index + 1;
    
    // Add pulse animation to active item
    const activeItem = insightItems[index];
    activeItem.style.animation = 'pulse 2s infinite';
    
    setTimeout(() => {
        activeItem.style.animation = '';
    }, 2000);
}

function scrollToInsight(index) {
    const insightItems = document.querySelectorAll('.insight-item');
    const scroller = document.querySelector('.insights-scroller');
    
    if (insightItems[index]) {
        const itemTop = insightItems[index].offsetTop;
        const itemHeight = insightItems[index].offsetHeight;
        const scrollerHeight = scroller.clientHeight;
        
        scroller.scrollTo({
            top: itemTop - (scrollerHeight / 2) + (itemHeight / 2),
            behavior: 'smooth'
        });
    }
}

function simulateVideoPlayback(isPlaying) {
    const videoOverlay = document.querySelector('.video-overlay');
    const videoTitle = document.querySelector('.video-title');
    
    if (isPlaying) {
        videoOverlay.style.opacity = '0';
        videoTitle.style.opacity = '0';
        showVideoNotification('Video playing');
    } else {
        videoOverlay.style.opacity = '1';
        videoTitle.style.opacity = '1';
        showVideoNotification('Video paused');
    }
}

function showVideoNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.video-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'video-notification';
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>${message}</span>
    `;
    
    document.querySelector('.video-card').appendChild(notification);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .video-notification {
            position: absolute;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 0.75rem 1.25rem;
            border-radius: 10px;
            font-size: 0.9rem;
            z-index: 100;
            animation: fadeInOut 2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 200px;
            text-align: center;
        }
        
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
            20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    // Auto remove
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function initInsightAnimations() {
    const insightItems = document.querySelectorAll('.insight-item');
    
    // Intersection observer for staggered animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    insightItems.forEach(item => {
        observer.observe(item);
    });
}

// Initialize when insights section is in view
function initInsightsObserver() {
    const insightsSection = document.querySelector('#ai-feelwise');
    if (!insightsSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                initInsightsSection();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(insightsSection);
}


// ======================= testimonial section =========================
// Simple Testimonials Flip Animation
document.addEventListener('DOMContentLoaded', function() {
  // Get all testimonial cards
  const testimonialCards = document.querySelectorAll('.testimonial-card');
  
  // Add click event to each card for flip
  testimonialCards.forEach(card => {
    // Read more button
    const readMoreBtn = card.querySelector('.read-full-btn');
    const closeBtn = card.querySelector('.close-testimonial');
    
    if (readMoreBtn) {
      readMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.add('flipped');
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.remove('flipped');
      });
    }
    
    // Also allow clicking anywhere on the card to close when flipped
    card.addEventListener('click', (e) => {
      if (card.classList.contains('flipped') && 
          !e.target.closest('.read-full-btn') && 
          !e.target.closest('.testimonial-back')) {
        card.classList.remove('flipped');
      }
    });
  });
  
  // Add hover effect enhancement
  testimonialCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-10px) scale(1.02)';
      card.style.boxShadow = '0 25px 50px rgba(109, 78, 255, 0.15)';
    });
    
    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('flipped')) {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.08)';
      }
    });
  });
  
  // Animate cards on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  }, { threshold: 0.1 });
  
  testimonialCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
});


// ================== Who We Help Section ===================

// Optional: Add scroll animation
document.addEventListener('DOMContentLoaded', function() {
  const paragraphs = document.querySelectorAll('.enhanced-paragraph');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  paragraphs.forEach(paragraph => {
    observer.observe(paragraph);
  });
});




// ================================
function toggleFAQPanel() {
    const panel = document.getElementById('faq-panel');
    panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
  }
  

    // Function to handle slide-in effect on scroll
function initSlideInOnScroll(selector, threshold = 0.2) {
  const elements = document.querySelectorAll(selector);

  if (!elements.length) return; // Exit if no elements found

  const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
          if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target); // Stop observing once visible
          }
      });
  }, { threshold });

  elements.forEach((el) => observer.observe(el));
}

// Initialize the function on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  initSlideInOnScroll(".slide-in"); // Apply to all elements with class 'slide-in'
});
function toggleFAQPanel() {
  const panel = document.getElementById('faq-panel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}
  


var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;

// 2. Create the player when API is ready
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '415',
    width: '800',
    videoId: '7CBfCW67xT8', // The video ID from YouTube
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// 3. Optional: Autoplay or other actions when player is ready
function onPlayerReady(event) {
  console.log("Player is ready");
  // Uncomment to autoplay:
  // event.target.playVideo();
}

// 4. Handle player state changes
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    console.log("Video is playing");
  } else if (event.data == YT.PlayerState.PAUSED) {
    console.log("Video is paused");
  } else if (event.data == YT.PlayerState.ENDED) {
    console.log("Video ended");
  }
}
function playYouTube(el) {
    el.innerHTML = `
        <iframe width="100%" height="100%"
        src="https://www.youtube.com/embed/xl9r_hOh9r4?autoplay=1"
        frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    `;
}

// ===== YouTube Player Fix =====

document.querySelectorAll('.youtube-player').forEach(box => {
    box.addEventListener('click', () => {
        const videoId = box.getAttribute('data-id');
        box.innerHTML = `
            <iframe width="100%" height="100%" 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                frameborder="0" 
                allow="autoplay; encrypted-media" 
                allowfullscreen>
            </iframe>
        `;
    });
});
