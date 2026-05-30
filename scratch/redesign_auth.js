const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const loginPath = path.join(__dirname, '../public/login.html');
if (fs.existsSync(loginPath)) {
    let html = fs.readFileSync(loginPath, 'utf8');
    const $ = cheerio.load(html);
    
    // 1. Add Email Field to Signup Form
    if ($('#regEmail').length === 0) {
        const emailField = `
        <div>
            <label for="regEmail" class="block text-label-md font-bold text-on-surface mb-2 pl-2">Email Address</label>
            <input type="email" id="regEmail" required autocomplete="email" 
                class="w-full bg-white/50 border border-outline-variant/30 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-lg text-on-surface placeholder:text-on-surface-variant/50" 
                placeholder="you@example.com">
        </div>`;
        $('#signupForm').prepend(emailField);
    }

    // 2. Add Forgot Password Link
    if ($('#forgotPasswordBtn').length === 0) {
        const forgotLink = `
        <div class="text-right mt-2">
            <button type="button" onclick="switchTab('forgot')" id="forgotPasswordBtn" class="text-label-sm font-medium text-primary hover:text-vibrant-fuchsia transition-colors">Forgot Password?</button>
        </div>`;
        $('#loginForm > div:nth-child(2)').after(forgotLink);
    }

    // 3. Add Forgot Password Form
    if ($('#forgotForm').length === 0) {
        const forgotForm = `
        <form id="forgotForm" class="text-left space-y-6 hidden">
            <div class="text-center mb-4">
                <p class="text-body-md text-on-surface-variant">Enter your email address and we'll send you a link to reset your password.</p>
            </div>
            <div>
                <label for="forgotEmail" class="block text-label-md font-bold text-on-surface mb-2 pl-2">Email Address</label>
                <input type="email" id="forgotEmail" required autocomplete="email" 
                    class="w-full bg-white/50 border border-outline-variant/30 rounded-2xl px-5 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-lg text-on-surface placeholder:text-on-surface-variant/50" 
                    placeholder="you@example.com">
            </div>
            <button type="submit" id="forgotBtn" class="w-full bg-on-surface hover:bg-black text-surface rounded-full py-3.5 font-title-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-[20px]">mark_email_read</span> Send Reset Link
            </button>
            <div class="text-center mt-4">
                <button type="button" onclick="switchTab('login')" class="text-label-md font-medium text-on-surface-variant hover:text-primary transition-colors">Back to Sign In</button>
            </div>
        </form>`;
        $('#signupForm').after(forgotForm);
    }

    // 4. Update the script tags to handle the new logic
    // We will append a new script block to overwrite the switchTab logic
    $('body').append(`
    <script>
        // Override switchTab
        function switchTab(mode) {
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            const forgotForm = document.getElementById('forgotForm');
            const indicator = document.getElementById('tabIndicator');
            const tabLogin = document.getElementById('tabLogin');
            const tabSignup = document.getElementById('tabSignup');
            const errorMsg = document.getElementById('errorMsg');
            
            errorMsg.classList.add('hidden');
            
            if (mode === 'login') {
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
                forgotForm.classList.add('hidden');
                indicator.style.transform = 'translateX(0)';
                tabLogin.classList.add('font-bold');
                tabLogin.classList.remove('font-medium', 'text-on-surface-variant');
                tabSignup.classList.remove('font-bold');
                tabSignup.classList.add('font-medium', 'text-on-surface-variant');
            } else if (mode === 'signup') {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
                forgotForm.classList.add('hidden');
                indicator.style.transform = 'translateX(100%)';
                tabSignup.classList.add('font-bold');
                tabSignup.classList.remove('font-medium', 'text-on-surface-variant');
                tabLogin.classList.remove('font-bold');
                tabLogin.classList.add('font-medium', 'text-on-surface-variant');
            } else if (mode === 'forgot') {
                loginForm.classList.add('hidden');
                signupForm.classList.add('hidden');
                forgotForm.classList.remove('hidden');
                // Hide indicator if you want, or leave it
                tabLogin.classList.remove('font-bold');
                tabLogin.classList.add('font-medium', 'text-on-surface-variant');
                tabSignup.classList.remove('font-bold');
                tabSignup.classList.add('font-medium', 'text-on-surface-variant');
            }
        }

        // Updated Signup Handler
        const signupFormEl = document.getElementById('signupForm');
        // Remove existing listener by cloning (hacky but works in DOM)
        const newSignupForm = signupFormEl.cloneNode(true);
        signupFormEl.parentNode.replaceChild(newSignupForm, signupFormEl);
        
        newSignupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signupBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Creating...';
            btn.disabled = true;

            const u = document.getElementById('regUsername').value;
            const p = document.getElementById('regPassword').value;
            const email = document.getElementById('regEmail').value;

            try {
                const res = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p, email: email })
                });

                if (res.ok) {
                    window.location.href = '/dashboard.html';
                } else {
                    const data = await res.json();
                    const errorMsg = document.getElementById('errorMsg');
                    errorMsg.textContent = data.error || 'Registration failed.';
                    errorMsg.classList.remove('hidden');
                }
            } catch (err) {
                const errorMsg = document.getElementById('errorMsg');
                errorMsg.textContent = 'A network error occurred.';
                errorMsg.classList.remove('hidden');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        // Forgot password logic
        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value;
            const btn = document.getElementById('forgotBtn');
            btn.innerHTML = 'Sending...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                
                const errorMsg = document.getElementById('errorMsg');
                if (res.ok) {
                    errorMsg.textContent = 'If that email exists, a reset link has been sent (check server console).';
                    errorMsg.className = 'mt-6 p-3 rounded-xl bg-green-100 border border-green-200 text-green-800 font-body-md';
                } else {
                    errorMsg.textContent = 'Failed to send reset link.';
                    errorMsg.className = 'mt-6 p-3 rounded-xl bg-error/10 border border-error/20 text-error font-body-md';
                }
                errorMsg.classList.remove('hidden');
            } catch(e) { }
            finally {
                btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">mark_email_read</span> Send Reset Link';
                btn.disabled = false;
            }
        });
    </script>
    `);

    fs.writeFileSync(loginPath, $.html());
    console.log("Updated login.html with email and forgot password.");
}
