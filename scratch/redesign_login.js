const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const loginPath = path.join(__dirname, '../public/login.html');
if (fs.existsSync(loginPath)) {
    let html = fs.readFileSync(loginPath, 'utf8');
    const $ = cheerio.load(html);
    
    const newMain = `
<main class="pt-20 pb-16 min-h-screen flex items-center justify-center bg-surface-light relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-1/4 -right-32 w-96 h-96 bg-vibrant-fuchsia/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md px-4 relative z-10">
        <div class="glass-card p-8 md:p-10 rounded-[32px] shadow-xl border border-outline-variant/30 text-center">
            <a href="/" class="inline-block mb-8 hover:scale-105 transition-transform">
                <img src="/flashsuite_logo.png" alt="FlashSuite Logo" class="h-14 w-auto object-contain">
            </a>

            <!-- Auth Toggle Tabs -->
            <div class="flex p-1 bg-surface-variant/50 rounded-full mb-8 relative">
                <div id="tabIndicator" class="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-all duration-300"></div>
                <button type="button" onclick="switchTab('login')" id="tabLogin" class="flex-1 py-2 text-label-lg font-bold text-on-surface relative z-10 transition-colors">Sign In</button>
                <button type="button" onclick="switchTab('signup')" id="tabSignup" class="flex-1 py-2 text-label-lg font-medium text-on-surface-variant relative z-10 transition-colors">Create Account</button>
            </div>

            <!-- Login Form -->
            <form id="loginForm" class="text-left space-y-6">
                <div>
                    <label for="username" class="block text-label-md font-bold text-on-surface mb-2 pl-2">Username</label>
                    <input type="text" id="username" required autocomplete="username" 
                        class="w-full bg-white/50 border border-outline-variant/30 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-lg text-on-surface placeholder:text-on-surface-variant/50" 
                        placeholder="Enter your username">
                </div>
                <div>
                    <label for="password" class="block text-label-md font-bold text-on-surface mb-2 pl-2">Password</label>
                    <input type="password" id="password" required autocomplete="current-password" 
                        class="w-full bg-white/50 border border-outline-variant/30 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-lg text-on-surface placeholder:text-on-surface-variant/50" 
                        placeholder="••••••••">
                </div>
                <button type="submit" id="loginBtn" class="w-full bg-primary hover:bg-vibrant-fuchsia text-white rounded-full py-3.5 font-title-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">login</span> Sign In
                </button>
            </form>

            <!-- Signup Form (Hidden by default) -->
            <form id="signupForm" class="text-left space-y-6 hidden">
                <div>
                    <label for="regUsername" class="block text-label-md font-bold text-on-surface mb-2 pl-2">Choose Username</label>
                    <input type="text" id="regUsername" required autocomplete="username" 
                        class="w-full bg-white/50 border border-outline-variant/30 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-lg text-on-surface placeholder:text-on-surface-variant/50" 
                        placeholder="Choose a username">
                </div>
                <div>
                    <label for="regPassword" class="block text-label-md font-bold text-on-surface mb-2 pl-2">Create Password</label>
                    <input type="password" id="regPassword" required autocomplete="new-password" 
                        class="w-full bg-white/50 border border-outline-variant/30 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-lg text-on-surface placeholder:text-on-surface-variant/50" 
                        placeholder="••••••••">
                </div>
                <button type="submit" id="signupBtn" class="w-full bg-vibrant-fuchsia hover:bg-primary text-white rounded-full py-3.5 font-title-lg shadow-lg shadow-vibrant-fuchsia/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">person_add</span> Create Account
                </button>
            </form>

            <div id="errorMsg" class="hidden mt-6 p-3 rounded-xl bg-error/10 border border-error/20 text-error font-body-md">
                Invalid credentials. Please try again.
            </div>
            
            <p class="mt-8 text-label-md text-on-surface-variant/70">
                By signing in, you agree to our <a href="/terms" class="text-primary hover:underline">Terms of Service</a> and <a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>.
            </p>
        </div>
    </div>
</main>
    `;
    
    $('main').replaceWith(newMain);
    
    // Title update
    $('title').text('Sign In / Sign Up | FlashSuite');

    // Completely replace the old script tags with the new auth logic
    const authScript = `
    <script>
        // Tab Switching Logic
        let currentMode = 'login';
        
        function switchTab(mode) {
            currentMode = mode;
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            const indicator = document.getElementById('tabIndicator');
            const tabLogin = document.getElementById('tabLogin');
            const tabSignup = document.getElementById('tabSignup');
            const errorMsg = document.getElementById('errorMsg');
            
            errorMsg.classList.add('hidden');
            
            if (mode === 'login') {
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
                indicator.style.transform = 'translateX(0)';
                tabLogin.classList.add('font-bold');
                tabLogin.classList.remove('font-medium', 'text-on-surface-variant');
                tabSignup.classList.remove('font-bold');
                tabSignup.classList.add('font-medium', 'text-on-surface-variant');
            } else {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
                indicator.style.transform = 'translateX(100%)';
                tabSignup.classList.add('font-bold');
                tabSignup.classList.remove('font-medium', 'text-on-surface-variant');
                tabLogin.classList.remove('font-bold');
                tabLogin.classList.add('font-medium', 'text-on-surface-variant');
            }
        }
        
        // Handle URL Hash (e.g., /login.html#signup)
        window.addEventListener('DOMContentLoaded', () => {
            if (window.location.hash === '#signup') {
                switchTab('signup');
            }
        });

        const errorMsg = document.getElementById('errorMsg');

        // Login Handler
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Signing in...';
            btn.disabled = true;

            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                
                if (res.ok) {
                    window.location.href = '/admin.html';
                } else {
                    const data = await res.json();
                    errorMsg.textContent = data.error || 'Invalid credentials. Please try again.';
                    errorMsg.classList.remove('hidden');
                }
            } catch (err) {
                errorMsg.textContent = 'A network error occurred.';
                errorMsg.classList.remove('hidden');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        // Signup Handler
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signupBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Creating...';
            btn.disabled = true;

            const u = document.getElementById('regUsername').value;
            const p = document.getElementById('regPassword').value;

            try {
                const res = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });

                if (res.ok) {
                    window.location.href = '/admin.html';
                } else {
                    const data = await res.json();
                    errorMsg.textContent = data.error || 'Registration failed. Try a different username.';
                    errorMsg.classList.remove('hidden');
                }
            } catch (err) {
                errorMsg.textContent = 'A network error occurred.';
                errorMsg.classList.remove('hidden');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    </script>
    `;
    
    // Remove old scripts related to login
    $('script').each((i, el) => {
        const text = $(el).html();
        if (text.includes("document.getElementById('loginForm').addEventListener")) {
            $(el).remove();
        }
    });

    $('body').append(authScript);
    
    // Remove old style tag that might mess up inline layouts
    $('style').each((i, el) => {
        const text = $(el).html();
        if (text.includes('.login-container')) {
            // Keep base styles
            $(el).html(`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .bg-mesh {
            background-color: #f8f9fa;
            background-image: 
                radial-gradient(at 0% 0%, rgba(192, 38, 211, 0.05) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(158, 0, 177, 0.05) 0px, transparent 50%);
        }
            `);
        }
    });

    // Remove old body inline styles
    $('body').attr('style', null);

    fs.writeFileSync(loginPath, $.html());
    console.log("Updated login.html");
}
