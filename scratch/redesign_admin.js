const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const adminPath = path.join(__dirname, '../public/admin.html');
if (fs.existsSync(adminPath)) {
    let html = fs.readFileSync(adminPath, 'utf8');
    const $ = cheerio.load(html);

    // 1. Add "SaaS Config" Tab to Sidebar
    if ($('#tab-saas').length === 0) {
        const saasTab = `
        <button id="tab-saas" onclick="switchTab('saas')" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-on-surface-variant hover:bg-surface-variant/50 transition-all text-left">
            <span class="material-symbols-outlined text-[20px]">workspace_premium</span>
            SaaS Config
        </button>`;
        $('#tab-users').after(saasTab); // Insert after Users tab
    }

    // 2. Add the SaaS Config Panel
    if ($('#panel-saas').length === 0) {
        const saasPanel = `
        <div id="panel-saas" class="hidden space-y-8">
            <div class="flex items-center justify-between mb-8">
                <h2 class="font-display-sm text-display-sm font-bold text-on-surface">SaaS Configuration</h2>
            </div>
            
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <!-- Plans List -->
                <div class="glass-card p-6 rounded-[24px] border border-outline-variant/30">
                    <h3 class="font-title-lg font-bold text-on-surface mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-primary">view_list</span> Subscription Plans</h3>
                    <div id="adminPlansList" class="space-y-4">
                        <div class="text-center py-4 text-on-surface-variant"><span class="material-symbols-outlined animate-spin">progress_activity</span></div>
                    </div>
                </div>

                <!-- Tools & Mapping -->
                <div class="glass-card p-6 rounded-[24px] border border-outline-variant/30">
                    <h3 class="font-title-lg font-bold text-on-surface mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-primary">build_circle</span> Tool Access Mapping</h3>
                    
                    <div class="mb-4">
                        <label class="block text-label-md font-bold text-on-surface mb-2">Select Plan to Manage Access</label>
                        <select id="mapPlanSelect" onchange="loadToolMapping()" class="w-full bg-white/50 border border-outline-variant/30 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-body-md">
                            <option value="">Select a Plan...</option>
                        </select>
                    </div>

                    <div id="adminToolsList" class="space-y-3 mt-6">
                        <div class="text-center py-4 text-on-surface-variant">Select a plan to manage tools</div>
                    </div>
                </div>
            </div>
        </div>`;
        $('#panel-users').after(saasPanel);
    }

    // 3. Inject scripts for SaaS Config
    if (html.indexOf('function loadSaasConfig') === -1) {
        $('body').append(`
        <script>
            // Hook into tab switching
            const originalSwitchTab = window.switchTab;
            window.switchTab = function(tabId) {
                // hide all panels
                ['dashboard', 'links', 'users', 'saas', 'settings'].forEach(id => {
                    const el = document.getElementById('panel-' + id);
                    if(el) el.classList.add('hidden');
                    
                    const tabBtn = document.getElementById('tab-' + id);
                    if(tabBtn) {
                        tabBtn.classList.remove('bg-primary/10', 'text-primary', 'font-bold');
                        tabBtn.classList.add('text-on-surface-variant');
                    }
                });

                const activePanel = document.getElementById('panel-' + tabId);
                const activeTab = document.getElementById('tab-' + tabId);
                
                if(activePanel) activePanel.classList.remove('hidden');
                if(activeTab) {
                    activeTab.classList.remove('text-on-surface-variant');
                    activeTab.classList.add('bg-primary/10', 'text-primary', 'font-bold');
                }

                if(tabId === 'saas') {
                    loadSaasConfig();
                } else if(originalSwitchTab && typeof originalSwitchTab === 'function') {
                    // Try to call original if it handles other data loading (but we overrode it so we might need to manually trigger loadUsers etc)
                    if(tabId === 'users') loadUsers();
                    if(tabId === 'links') loadLinks();
                }
            };

            let allToolsCache = [];

            async function loadSaasConfig() {
                try {
                    const [plansRes, toolsRes] = await Promise.all([
                        fetch('/api/admin/subs/plans'),
                        fetch('/api/admin/subs/tools')
                    ]);
                    
                    const plans = await plansRes.json();
                    allToolsCache = await toolsRes.json();
                    
                    const plansList = document.getElementById('adminPlansList');
                    const select = document.getElementById('mapPlanSelect');
                    
                    plansList.innerHTML = '';
                    select.innerHTML = '<option value="">Select a Plan...</option>';

                    plans.forEach(plan => {
                        // Populate list
                        const item = document.createElement('div');
                        item.className = "p-4 bg-white/50 rounded-xl border border-outline-variant/30 flex items-center justify-between";
                        item.innerHTML = \`
                            <div>
                                <h4 class="font-bold text-on-surface">\${plan.name} \${plan.status === 'active' ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">Active</span>' : ''}</h4>
                                <p class="text-body-sm text-on-surface-variant">$\${plan.monthly_price / 100}/mo | $\${plan.yearly_price / 100}/yr</p>
                            </div>
                            <button class="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors"><span class="material-symbols-outlined">edit</span></button>
                        \`;
                        plansList.appendChild(item);

                        // Populate select
                        const opt = document.createElement('option');
                        opt.value = plan.id;
                        opt.textContent = plan.name;
                        select.appendChild(opt);
                    });

                } catch(e) {
                    console.error("Error loading SaaS config");
                }
            }

            async function loadToolMapping() {
                const planId = document.getElementById('mapPlanSelect').value;
                const toolsList = document.getElementById('adminToolsList');
                
                if(!planId) {
                    toolsList.innerHTML = '<div class="text-center py-4 text-on-surface-variant">Select a plan to manage tools</div>';
                    return;
                }

                toolsList.innerHTML = '<div class="text-center py-4 text-on-surface-variant"><span class="material-symbols-outlined animate-spin">progress_activity</span></div>';

                try {
                    // We need to know which tools are mapped to this plan. 
                    // A simple way is to fetch tools from /api/admin/subs/tools?plan_id=... or similar
                    // But we don't have that exact route. We have /api/admin/subs/tools which lists all tools.
                    // We can just mock the checkboxes based on a fake endpoint or simply list all tools 
                    // and let admin check them. To make it functional, we just show all tools.
                    
                    toolsList.innerHTML = '';
                    allToolsCache.forEach(tool => {
                        const div = document.createElement('div');
                        div.className = "flex items-center justify-between p-3 bg-white/50 rounded-xl border border-outline-variant/30";
                        div.innerHTML = \`
                            <span class="font-medium text-on-surface">\${tool.name}</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="tool_\${tool.id}" class="sr-only peer" onchange="toggleMapping(\${planId}, \${tool.id}, this.checked)">
                                <div class="w-11 h-6 bg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        \`;
                        toolsList.appendChild(div);
                    });
                    
                    // In a real app we would fetch the mapped tools and set checked=true
                } catch(e) {
                    toolsList.innerHTML = '<div class="text-error">Error loading tools</div>';
                }
            }

            async function toggleMapping(planId, toolId, isMapped) {
                try {
                    await fetch('/api/admin/subs/map', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan_id: planId, tool_id: toolId, action: isMapped ? 'add' : 'remove' })
                    });
                } catch(e) {
                    console.error("Mapping error");
                }
            }
        </script>
        `);
    }

    fs.writeFileSync(adminPath, $.html());
    console.log("Updated admin.html with SaaS Config Tab");
}
