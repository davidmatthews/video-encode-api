// Load API key from localStorage
const apiKeyInput = document.getElementById('apiKey');
const storedApiKey = localStorage.getItem('videoEncodeApiKey');
if (storedApiKey) {
    apiKeyInput.value = storedApiKey;
}

// Save API key when changed
apiKeyInput.addEventListener('change', () => {
    localStorage.setItem('videoEncodeApiKey', apiKeyInput.value);
});

// Get API base URL from localStorage or use relative path
const getApiBaseUrl = () => {
    const workerUrl = localStorage.getItem('videoEncodeWorkerUrl') || '';
    return (workerUrl || '/api').replace(/\/$/, '');
};

// Build full API URL (Worker uses /api prefix; relative /api does not)
const getApiUrl = (path) => {
    const base = getApiBaseUrl();
    return base.startsWith('http') ? `${base}/api${path}` : `${base}${path}`;
};

async function parseJsonResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

let autoRefreshInterval = null;

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '—';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}

// Get status badge
function getStatusBadge(job) {
    if (job.finished) {
        return '<span class="status-badge status-finished">Finished</span>';
    } else if (job.started) {
        return '<span class="status-badge status-in-progress">In Progress</span>';
    } else {
        return '<span class="status-badge status-pending">Pending</span>';
    }
}

// Render jobs table
function renderJobs(jobs) {
    const container = document.getElementById('jobsContainer');
    
    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>No jobs found</h2>
                <p>There are no jobs matching the current filter.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="jobs-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>File Name</th>
                    <th>CRF</th>
                    <th>Preset</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Finished</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    jobs.forEach(job => {
        html += `
            <tr>
                <td>${job.id}</td>
                <td>${escapeHtml(job.file_name)}</td>
                <td>${escapeHtml(job.crf)}</td>
                <td>${escapeHtml(job.preset)}</td>
                <td>${getStatusBadge(job)}</td>
                <td class="timestamp">${formatTimestamp(job.started)}</td>
                <td class="timestamp">${formatTimestamp(job.finished)}</td>
                <td class="timestamp">${formatTimestamp(job.created_at)}</td>
                <td>
                    <button class="delete-btn" onclick="deleteJob(${job.id})">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load jobs
async function loadJobs() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showMessage('Please enter an API key', 'error');
        return;
    }

    const statusFilter = document.getElementById('statusFilter').value;
    const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';

    try {
        const response = await fetch(getApiUrl('/jobs') + statusParam, {
            headers: {
                'X-API-Key': apiKey
            }
        });

        const data = await parseJsonResponse(response);

        if (!response.ok) {
            throw new Error(data && data.error ? data.error : `Request failed (${response.status})`);
        }

        renderJobs(Array.isArray(data) ? data : []);
        hideMessage();
    } catch (error) {
        showMessage(error.message || 'An error occurred', 'error');
        document.getElementById('jobsContainer').innerHTML = `
            <div class="empty-state">
                <h2>Error loading jobs</h2>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

// Delete job
async function deleteJob(id) {
    if (!confirm(`Are you sure you want to delete job #${id}?`)) {
        return;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showMessage('Please enter an API key', 'error');
        return;
    }

    try {
        const response = await fetch(getApiUrl(`/jobs/${id}`), {
            method: 'DELETE',
            headers: {
                'X-API-Key': apiKey
            }
        });

        const data = await parseJsonResponse(response);

        if (!response.ok) {
            throw new Error(data && data.error ? data.error : 'Failed to delete job');
        }

        showMessage('Job deleted successfully', 'success');
        loadJobs();
    } catch (error) {
        showMessage(error.message || 'Failed to delete job', 'error');
    }
}

// Auto refresh
function autoRefresh() {
    const btn = document.getElementById('autoRefreshBtn');
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        btn.textContent = 'Auto Refresh: Off';
        btn.style.background = '#667eea';
    } else {
        autoRefreshInterval = setInterval(loadJobs, 5000); // Refresh every 5 seconds
        btn.textContent = 'Auto Refresh: On';
        btn.style.background = '#28a745';
    }
}

// Status filter change
document.getElementById('statusFilter').addEventListener('change', loadJobs);

// Show/hide message
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

function hideMessage() {
    document.getElementById('message').style.display = 'none';
}

// Load jobs on page load
loadJobs();
