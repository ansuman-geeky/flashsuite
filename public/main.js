document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        loadDashboardData();
        loadBlogsData();
    }
});

let allLinks = [];
let myClickChart, myRefChart;

async function loadDashboardData() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
            if (response.status === 401) window.location.href = '/login.html';
            return;
        }
        const data = await response.json();

        document.getElementById('totalClicks').innerText = data.totalClicks;
        document.getElementById('totalLinks').innerText = data.links.length;

        allLinks = data.links;
        renderLinksTable(allLinks);
        renderCharts(data.chartData, data.referrerData);
    } catch (err) {
        console.error("Failed to load dashboard:", err);
    }
}

function renderLinksTable(links) {
    const tbody = document.getElementById('linksBody');
    tbody.innerHTML = links.map(link => `
        <tr>
            <td><strong>${link.short_code}</strong></td>
            <td class="url-cell">${link.original_url}</td>
            <td>
                <button onclick="openQrModal('${window.location.origin}/${link.short_code}')" class="btn-action btn-qr">QR</button>
                <button onclick="editLink(${link.id}, '${link.original_url}')" class="btn-action btn-edit">Edit</button>
                <button onclick="deleteLink(${link.id})" class="btn-action btn-delete">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterLinks() {
    const q = document.getElementById('searchLinks').value.toLowerCase();
    const filtered = allLinks.filter(l => l.short_code.toLowerCase().includes(q) || l.original_url.toLowerCase().includes(q));
    renderLinksTable(filtered);
}

function renderCharts(chartData, referrerData) {
    if (myClickChart) myClickChart.destroy();
    if (myRefChart) myRefChart.destroy();

    const ctx = document.getElementById('clickChart').getContext('2d');
    myClickChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Clicks Over Time',
                data: chartData.values,
                borderColor: '#9D1C44',
                backgroundColor: 'rgba(157, 28, 68, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxRef = document.getElementById('referrerChart').getContext('2d');
    myRefChart = new Chart(ctxRef, {
        type: 'doughnut',
        data: {
            labels: referrerData.labels,
            datasets: [{
                data: referrerData.values,
                backgroundColor: ['#9D1C44', '#1A2B3C', '#F39C12', '#2ECC71', '#3498DB']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

async function editLink(id, oldUrl) {
    const newUrl = prompt("Enter new destination URL:", oldUrl);
    if (!newUrl || newUrl === oldUrl) return;

    await fetch(`/api/links/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl })
    });
    loadDashboardData();
}

async function deleteLink(id) {
    if (!confirm("Are you sure?")) return;
    await fetch(`/api/links/${id}`, { method: 'DELETE' });
    loadDashboardData();
}

function logout() {
    fetch('/api/logout', { method: 'POST' }).then(() => window.location.href = '/');
}

// Blog Management Functions
function switchView(viewId) {
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('blogView').style.display = 'none';
    if (document.getElementById('settingsView')) document.getElementById('settingsView').style.display = 'none';

    // Remove active class from all nav items
    document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + viewId);
    if (activeNav) activeNav.classList.add('active');

    const titleEl = document.getElementById('pageTitle');

    if (viewId === 'dashboard') {
        document.getElementById('dashboardView').style.display = 'block';
        if (titleEl) titleEl.innerText = 'System Dashboard';
    } else if (viewId === 'blogs') {
        document.getElementById('blogView').style.display = 'block';
        if (titleEl) titleEl.innerText = 'Blog Management';
    } else if (viewId === 'settings') {
        document.getElementById('settingsView').style.display = 'block';
        if (titleEl) titleEl.innerText = 'System Settings';
    }
}

async function loadBlogsData() {
    try {
        const response = await fetch('/api/admin/blogs');
        const blogs = await response.json();

        const tbody = document.getElementById('blogsBody');
        tbody.innerHTML = blogs.map(blog => `
            <tr>
                <td><strong>${blog.title}</strong></td>
                <td><span class="status-badge ${blog.status}">${blog.status.toUpperCase()}</span></td>
                <td>${new Date(blog.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick='startEditBlog(${JSON.stringify(blog).replace(/'/g, "&apos;")})' class="btn-action btn-edit">Edit</button>
                    <button onclick="deleteBlog(${blog.id})" class="btn-action btn-delete">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Failed to load blogs:", err);
    }
}

let editingBlogId = null;

function startEditBlog(blog) {
    editingBlogId = blog.id;
    document.getElementById('blogTitle').value = blog.title;
    document.getElementById('blogContent').value = blog.content;
    document.getElementById('blogStatus').value = blog.status;
    document.getElementById('blogSubmitBtn').innerText = "Update Blog";
    document.getElementById('blogCancelBtn').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditBlog() {
    editingBlogId = null;
    document.getElementById('blogTitle').value = '';
    document.getElementById('blogContent').value = '';
    document.getElementById('blogStatus').value = 'published';
    document.getElementById('blogSubmitBtn').innerText = "Publish Blog";
    document.getElementById('blogCancelBtn').style.display = "none";
}

async function saveBlog() {
    const title = document.getElementById('blogTitle').value;
    const content = document.getElementById('blogContent').value;
    const status = document.getElementById('blogStatus').value;

    if (!title) return alert("Blog title is required");

    const url = editingBlogId ? `/api/admin/blogs/${editingBlogId}` : '/api/admin/blogs';
    const method = editingBlogId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, status })
        });

        if (res.ok) {
            alert(editingBlogId ? "Blog updated successfully!" : "Blog saved successfully!");
            cancelEditBlog();
            loadBlogsData();
        } else {
            alert("Failed to save blog");
        }
    } catch (err) {
        console.error("Error saving blog:", err);
    }
}

async function deleteBlog(id) {
    if (!confirm("Are you sure you want to delete this blog?")) return;
    await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' });
    loadBlogsData();
}

async function updateCredentials() {
    const u = document.getElementById('settingUsername').value;
    const p = document.getElementById('settingPassword').value;

    if (!u && !p) return alert("Please enter a new username or password.");

    try {
        const res = await fetch('/api/admin/credentials', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        
        if (res.ok) {
            alert("Credentials updated! Please login again.");
            logout();
        } else {
            const data = await res.json();
            alert("Error: " + (data.error || "Failed to update credentials"));
        }
    } catch (err) {
        console.error(err);
        alert("An error occurred");
    }
}

async function clearAnalytics() {
    if (!confirm("CRITICAL WARNING: Are you absolutely sure you want to delete all analytics data? This action CANNOT be undone!")) return;
    
    try {
        const res = await fetch('/api/admin/analytics', { method: 'DELETE' });
        if (res.ok) {
            alert("Analytics data cleared successfully.");
            loadDashboardData();
        } else {
            alert("Failed to clear analytics");
        }
    } catch (err) {
        console.error(err);
    }
}