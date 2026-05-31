// Fetch and inject the navbar HTML
fetch('/components/navbar.html')
    .then(response => response.text())
    .then(html => {
        const placeholder = document.getElementById('navbar-placeholder');
        if (placeholder) {
            placeholder.outerHTML = html;
        }

        // Initialize active link logic
        const currentPath = window.location.pathname;
        document.querySelectorAll('nav a.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            let isActive = false;

            if (currentPath === href) {
                isActive = true;
            } else if (href !== '/' && currentPath.startsWith(href)) {
                isActive = true;
            } else if (href === '/pdftools' && currentPath.includes('pdf')) {
                isActive = true;
            }

            if (isActive) {
                if (link.hasAttribute('data-mobile')) {
                    link.classList.add('bg-primary/10', 'text-primary', 'font-bold');
                    link.classList.remove('text-on-surface');
                } else {
                    link.className = "nav-link font-body-md text-body-md text-primary font-bold border-b-2 border-primary pb-1";
                }
            } else {
                if (link.hasAttribute('data-mobile')) {
                    link.classList.remove('bg-primary/10', 'text-primary', 'font-bold');
                    link.classList.add('text-on-surface');
                } else {
                    link.className = "nav-link font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors";
                }
            }
        });
    });

// Global function for mobile menu
window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (menu && overlay) {
        if (menu.classList.contains('translate-x-full')) {
            menu.classList.remove('translate-x-full');
            overlay.classList.remove('hidden');
        } else {
            menu.classList.add('translate-x-full');
            overlay.classList.add('hidden');
        }
    }
};
