let quill;

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        loadDashboardData();
        loadBlogsData();
        initQuill();
    }
});

function initQuill() {
    if (typeof Quill === 'undefined') return;
    quill = new Quill('#blogEditor', {
        theme: 'snow',
        placeholder: 'Write your blog post here...',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, 4, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'image'],
                    ['clean']
                ],
                handlers: {
                    image: selectLocalImage
                }
            }
        }
    });
}

function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            return resolve(file);
        }
        
        // Skip compression for GIFs (to preserve animation) or small images (< 500KB)
        if (file.type === 'image/gif' || file.size < 500 * 1024) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = event.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

function selectLocalImage() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        try {
            const compressedFile = await compressImage(file);
            const formData = new FormData();
            formData.append('image', compressedFile);

            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            
            const range = quill.getSelection();
            const index = range ? range.index : quill.getLength() - 1;
            quill.insertEmbed(index, 'image', data.imageUrl);
            quill.setSelection(index + 1);
        } catch (err) {
            console.error(err);
            alert("Failed to upload image. Please try again.");
        }
    };
}

async function uploadBlogImage() {
    const fileInput = document.getElementById('blogImageFile');
    const file = fileInput.files[0];
    if (!file) return alert("Please select an image file first.");

    try {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append('image', compressedFile);

        const res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        
        const range = quill.getSelection();
        const index = range ? range.index : quill.getLength() - 1;
        quill.insertEmbed(index, 'image', data.imageUrl);
        quill.setSelection(index + 1);
        
        fileInput.value = '';
        alert("Image uploaded and inserted successfully!");
    } catch (err) {
        console.error(err);
        alert("Failed to upload image. Please try again.");
    }
}

let allLinks = [];
let myClickChart, myRefChart;

async function loadDashboardData() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
            if (response.status === 401) window.location.href = '/login';
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
    if (myRefChart) myRefChart.destroy(); // Keep this in case someone else calls it

    const clickCanvas = document.getElementById('clickChart');
    if (clickCanvas) {
        const ctx = clickCanvas.getContext('2d');
        myClickChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Clicks Over Time',
                    data: chartData.values,
                    backgroundColor: '#C026D3', // vibrant fuchsia
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, border: { display: false }, grid: { color: '#f3f4f6' } },
                    x: { grid: { display: false }, border: { display: false } }
                }
            }
        });
    }

    const refContainer = document.getElementById('referrerList');
    if (refContainer) {
        // Render as HTML list instead of Doughnut chart
        refContainer.innerHTML = referrerData.labels.map((label, i) => {
            let icon = 'public';
            if(label.toLowerCase().includes('twitter') || label.toLowerCase() === 'x') icon = 'alternate_email';
            if(label.toLowerCase().includes('facebook')) icon = 'facebook';
            if(label.toLowerCase().includes('linkedin')) icon = 'work';
            
            return `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                        <span class="material-symbols-outlined text-[16px]">${icon}</span>
                    </div>
                    <span class="text-on-surface font-medium">${label}</span>
                </div>
                <span class="font-bold text-on-surface">${referrerData.values[i]}</span>
            </div>
        `}).join('');
    }
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
    if (document.getElementById('saasView')) document.getElementById('saasView').style.display = 'none';

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
    } else if (viewId === 'saas') {
        if (document.getElementById('saasView')) document.getElementById('saasView').style.display = 'block';
        if (titleEl) titleEl.innerText = 'SaaS Configuration';
        if (typeof loadSaasConfig === 'function') loadSaasConfig();
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
    if (quill) {
        quill.root.innerHTML = blog.content || '';
    }
    document.getElementById('blogStatus').value = blog.status;
    document.getElementById('blogSubmitBtn').innerText = "Update Blog";
    document.getElementById('blogCancelBtn').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditBlog() {
    editingBlogId = null;
    document.getElementById('blogTitle').value = '';
    if (quill) {
        quill.root.innerHTML = '';
    }
    document.getElementById('blogStatus').value = 'published';
    document.getElementById('blogSubmitBtn').innerText = "Publish Blog";
    document.getElementById('blogCancelBtn').style.display = "none";
}

async function saveBlog() {
    const title = document.getElementById('blogTitle').value;
    const content = quill ? quill.root.innerHTML : '';
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