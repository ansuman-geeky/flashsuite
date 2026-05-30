const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Use about.html as template for the layout
const templatePath = path.join(__dirname, '../public/about.html');
const pricingPath = path.join(__dirname, '../public/pricing.html');
const dashboardPath = path.join(__dirname, '../public/dashboard.html');

if (!fs.existsSync(templatePath)) {
    console.error("about.html not found to use as template");
    process.exit(1);
}

let templateHtml = fs.readFileSync(templatePath, 'utf8');

// --- 1. Create PRICING page ---
const $pricing = cheerio.load(templateHtml);
$pricing('title').text('Pricing | FlashSuite');

const pricingMain = `
<main class="pt-32 pb-16 min-h-screen">
    <div class="px-margin-desktop max-w-max-width mx-auto">
        <div class="text-center mb-16">
            <h1 class="font-display-lg text-display-lg font-bold text-on-surface mb-6">Simple, Transparent Pricing</h1>
            <p class="font-body-xl text-on-surface-variant max-w-2xl mx-auto">Choose the perfect plan for your needs. Upgrade or downgrade at any time.</p>
        </div>

        <!-- Pricing Toggle -->
        <div class="flex justify-center mb-12">
            <div class="bg-surface-variant/50 p-1 rounded-full flex relative">
                <div id="pricingIndicator" class="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-all duration-300"></div>
                <button onclick="togglePricing('monthly')" id="btnMonthly" class="relative z-10 px-6 py-2 rounded-full font-label-lg font-bold text-on-surface transition-colors">Monthly</button>
                <button onclick="togglePricing('yearly')" id="btnYearly" class="relative z-10 px-6 py-2 rounded-full font-label-lg font-medium text-on-surface-variant transition-colors">Yearly <span class="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-1">-20%</span></button>
            </div>
        </div>

        <!-- Dynamic Plans Container -->
        <div id="plansContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <!-- Loading State -->
            <div class="col-span-full text-center py-12">
                <span class="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            </div>
        </div>
    </div>
</main>
<script>
    let currentPricingMode = 'monthly';
    let plansData = [];

    function togglePricing(mode) {
        currentPricingMode = mode;
        const indicator = document.getElementById('pricingIndicator');
        const btnM = document.getElementById('btnMonthly');
        const btnY = document.getElementById('btnYearly');
        
        if(mode === 'monthly') {
            indicator.style.transform = 'translateX(0)';
            btnM.classList.add('font-bold', 'text-on-surface');
            btnM.classList.remove('font-medium', 'text-on-surface-variant');
            btnY.classList.add('font-medium', 'text-on-surface-variant');
            btnY.classList.remove('font-bold', 'text-on-surface');
        } else {
            indicator.style.transform = 'translateX(100%)';
            btnY.classList.add('font-bold', 'text-on-surface');
            btnY.classList.remove('font-medium', 'text-on-surface-variant');
            btnM.classList.add('font-medium', 'text-on-surface-variant');
            btnM.classList.remove('font-bold', 'text-on-surface');
        }
        renderPlans();
    }

    async function loadPlans() {
        try {
            const res = await fetch('/api/admin/subs/plans');
            if(res.ok) {
                plansData = await res.json();
                renderPlans();
            }
        } catch(e) {
            console.error('Error loading plans');
        }
    }

    function renderPlans() {
        const container = document.getElementById('plansContainer');
        container.innerHTML = '';

        plansData.forEach(plan => {
            if(plan.status !== 'active') return;

            const isPopular = plan.is_popular;
            const priceCents = currentPricingMode === 'monthly' ? plan.monthly_price : plan.yearly_price;
            const price = (priceCents / 100).toFixed(2);
            
            // Just basic features for now, a real app would fetch mapped features
            const featuresHTML = \`
                <ul class="space-y-4 mb-8">
                    <li class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-primary text-xl">check_circle</span>
                        <span class="text-on-surface-variant">Core FlashSuite Tools</span>
                    </li>
                    <li class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-primary text-xl">\${plan.monthly_price > 0 ? 'check_circle' : 'remove'}</span>
                        <span class="\${plan.monthly_price > 0 ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}">Premium AI Features</span>
                    </li>
                    <li class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-primary text-xl">\${plan.monthly_price > 0 ? 'check_circle' : 'remove'}</span>
                        <span class="\${plan.monthly_price > 0 ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}">Priority Support</span>
                    </li>
                </ul>
            \`;

            const card = document.createElement('div');
            card.className = \`glass-card p-8 rounded-[32px] relative flex flex-col \${isPopular ? 'border-primary/50 shadow-xl scale-105 z-10' : 'border-outline-variant/30'}\`;
            
            card.innerHTML = \`
                \${isPopular ? \`<div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-vibrant-fuchsia text-white px-4 py-1 rounded-full text-label-sm font-bold shadow-lg">\${plan.badge_label || 'Popular'}</div>\` : ''}
                <h3 class="font-title-lg text-title-lg font-bold text-on-surface mb-2">\${plan.name}</h3>
                <p class="text-on-surface-variant mb-6 h-12">\${plan.description || ''}</p>
                <div class="mb-8">
                    <span class="text-display-md font-bold text-on-surface">$\${price}</span>
                    <span class="text-on-surface-variant">/ \${currentPricingMode === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                \${featuresHTML}
                <div class="mt-auto">
                    <button onclick="subscribe(\${plan.id})" class="w-full py-3.5 rounded-full font-title-md \${isPopular ? 'bg-primary text-white hover:bg-vibrant-fuchsia shadow-md hover:-translate-y-1' : 'bg-surface-variant text-on-surface hover:bg-outline-variant/30'} transition-all duration-300">
                        \${plan.monthly_price === 0 ? 'Get Started' : 'Subscribe Now'}
                    </button>
                </div>
            \`;
            container.appendChild(card);
        });
    }

    async function subscribe(planId) {
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: planId, is_yearly: currentPricingMode === 'yearly' })
            });
            
            if(res.status === 401) {
                window.location.href = '/login.html#signup';
                return;
            }
            
            const data = await res.json();
            if(data.url) {
                window.location.href = data.url;
            }
        } catch(e) {
            console.error('Checkout error');
        }
    }

    document.addEventListener('DOMContentLoaded', loadPlans);
</script>
`;

$pricing('main').replaceWith(pricingMain);
fs.writeFileSync(pricingPath, $pricing.html());
console.log("Created pricing.html");

// --- 2. Create DASHBOARD page ---
const $dash = cheerio.load(templateHtml);
$dash('title').text('Dashboard | FlashSuite');

const dashMain = `
<main class="pt-32 pb-16 min-h-screen bg-surface-light">
    <div class="px-margin-desktop max-w-max-width mx-auto">
        
        <div class="flex items-center justify-between mb-12">
            <h1 class="font-display-md text-display-md font-bold text-on-surface">My Dashboard</h1>
            <button onclick="logout()" class="px-4 py-2 rounded-full border border-error/50 text-error hover:bg-error/10 font-label-md transition-colors flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">logout</span> Sign Out
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Profile Card -->
            <div class="glass-card p-8 rounded-[32px] border border-outline-variant/30">
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-vibrant-fuchsia flex items-center justify-center text-white text-2xl font-bold shadow-lg" id="avatarInitial">U</div>
                    <div>
                        <h2 class="font-title-lg font-bold text-on-surface" id="userName">Loading...</h2>
                        <p class="text-on-surface-variant text-body-md" id="userEmail"></p>
                    </div>
                </div>
                
                <div id="adminBadge" class="hidden mb-6 bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-2xl flex items-center justify-between">
                    <span class="font-bold flex items-center gap-2"><span class="material-symbols-outlined">admin_panel_settings</span> Administrator</span>
                    <a href="/admin.html" class="text-sm underline hover:text-vibrant-fuchsia">Go to Admin Portal &rarr;</a>
                </div>
            </div>

            <!-- Subscription Card -->
            <div class="lg:col-span-2 glass-card p-8 rounded-[32px] border border-outline-variant/30 relative overflow-hidden">
                <div class="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h2 class="font-title-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">workspace_premium</span> Active Subscription
                </h2>
                
                <div id="subContainer" class="bg-white/50 border border-outline-variant/30 rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Current Plan</p>
                            <h3 class="font-display-sm font-bold text-on-surface" id="subName">Free Tier</h3>
                        </div>
                        <div id="subBadge" class="hidden bg-gradient-to-r from-primary to-vibrant-fuchsia text-white px-3 py-1 rounded-full text-label-sm font-bold">PRO</div>
                    </div>
                    <p class="text-body-md text-on-surface-variant mb-6" id="subStatus">You are currently on the free tier.</p>
                    
                    <div class="flex gap-4">
                        <a href="/pricing.html" class="px-6 py-2.5 rounded-full bg-primary text-white font-label-md hover:bg-vibrant-fuchsia transition-colors flex items-center gap-2 shadow-md">
                            <span class="material-symbols-outlined text-[18px]">upgrade</span> Upgrade Plan
                        </a>
                        <button onclick="manageBilling()" id="billingBtn" class="hidden px-6 py-2.5 rounded-full bg-surface-variant text-on-surface font-label-md hover:bg-outline-variant/30 transition-colors flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">credit_card</span> Manage Billing
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
    </div>
</main>
<script>
    async function loadDashboard() {
        try {
            const res = await fetch('/api/user/profile');
            if(res.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const user = await res.json();
            document.getElementById('userName').textContent = user.username;
            document.getElementById('userEmail').textContent = user.email || 'No email provided';
            document.getElementById('avatarInitial').textContent = user.username.charAt(0).toUpperCase();
            
            if(user.role === 'admin') {
                document.getElementById('adminBadge').classList.remove('hidden');
            }

            // Load Subscriptions
            const subRes = await fetch('/api/user/subscriptions');
            const subs = await subRes.json();
            
            if(subs && subs.length > 0) {
                const active = subs[0]; // Get the first active sub
                document.getElementById('subName').textContent = active.plan_name;
                
                if(active.badge_label || active.plan_name.toLowerCase().includes('pro')) {
                    document.getElementById('subBadge').classList.remove('hidden');
                    document.getElementById('subBadge').textContent = active.badge_label || 'PRO';
                }

                if(active.stripe_subscription_id) {
                    const d = new Date(active.current_period_end);
                    document.getElementById('subStatus').textContent = \`Renews on \${d.toLocaleDateString()}\`;
                    document.getElementById('billingBtn').classList.remove('hidden');
                }
            }

        } catch(e) {
            console.error('Error loading profile', e);
        }
    }

    async function manageBilling() {
        try {
            const btn = document.getElementById('billingBtn');
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Loading...';
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const data = await res.json();
            if(data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Failed to open portal');
                btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">credit_card</span> Manage Billing';
            }
        } catch(e) {
            alert('A network error occurred.');
        }
    }

    async function logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch(e) {}
    }

    document.addEventListener('DOMContentLoaded', loadDashboard);
</script>
`;

$dash('main').replaceWith(dashMain);
fs.writeFileSync(dashboardPath, $dash.html());
console.log("Created dashboard.html");
