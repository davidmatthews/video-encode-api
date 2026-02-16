// Load API key and Worker URL from localStorage
const apiKeyInput = document.getElementById('apiKey');
const workerUrlInput = document.getElementById('workerUrl');
const storedApiKey = localStorage.getItem('videoEncodeApiKey');
const storedWorkerUrl = localStorage.getItem('videoEncodeWorkerUrl');
if (storedApiKey) apiKeyInput.value = storedApiKey;
if (workerUrlInput && storedWorkerUrl) workerUrlInput.value = storedWorkerUrl;

apiKeyInput.addEventListener('change', () => {
    localStorage.setItem('videoEncodeApiKey', apiKeyInput.value);
});
if (workerUrlInput) {
    workerUrlInput.addEventListener('change', () => {
        localStorage.setItem('videoEncodeWorkerUrl', workerUrlInput.value.trim());
    });
}

// Get API base URL: Worker URL from input/localStorage, or /api for same-origin
const getApiBaseUrl = () => {
    const url = (workerUrlInput && workerUrlInput.value.trim()) || localStorage.getItem('videoEncodeWorkerUrl') || '';
    return url.replace(/\/$/, '') || '/api';
};

// Mode toggle
const singleModeBtn = document.getElementById('singleMode');
const bulkModeBtn = document.getElementById('bulkMode');
const singleJobForm = document.getElementById('singleJobForm');
const bulkJobForm = document.getElementById('bulkJobForm');

singleModeBtn.addEventListener('click', () => {
    singleModeBtn.classList.add('active');
    bulkModeBtn.classList.remove('active');
    singleJobForm.style.display = 'grid';
    bulkJobForm.style.display = 'none';
});

bulkModeBtn.addEventListener('click', () => {
    bulkModeBtn.classList.add('active');
    singleModeBtn.classList.remove('active');
    singleJobForm.style.display = 'none';
    bulkJobForm.style.display = 'block';
});

// Form submission
const form = document.getElementById('jobForm');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showMessage('Please enter an API key', 'error');
        return;
    }

    const isBulkMode = bulkModeBtn.classList.contains('active');
    let payload;

    if (isBulkMode) {
        const bulkJobsText = document.getElementById('bulkJobs').value.trim();
        if (!bulkJobsText) {
            showMessage('Please enter jobs data', 'error');
            return;
        }

        try {
            payload = JSON.parse(bulkJobsText);
            if (!Array.isArray(payload)) {
                throw new Error('Must be an array');
            }
        } catch (error) {
            showMessage('Invalid JSON format. Please check your input.', 'error');
            return;
        }
    } else {
        const fileName = document.getElementById('fileName').value.trim();
        const crf = document.getElementById('crf').value.trim();
        const preset = document.getElementById('preset').value.trim();

        if (!fileName || !crf || !preset) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        payload = {
            file_name: fileName,
            crf: crf,
            preset: preset
        };
    }

    try {
        const apiBase = getApiBaseUrl();
        const jobsUrl = apiBase.startsWith('http') ? `${apiBase}/api/jobs` : `${apiBase}/jobs`;
        const response = await fetch(jobsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (_) {
            if (!response.ok) {
                showMessage(`API error (${response.status}): ${response.statusText}. Response was not JSON. Check that the API URL points to your Worker (e.g. https://video-encode-api.xxx.workers.dev) and that the Worker is deployed.`, 'error');
                return;
            }
            showMessage('Server returned an empty or invalid response. Set the Worker URL above to your Cloudflare Worker URL (e.g. https://video-encode-api.xxx.workers.dev).', 'error');
            return;
        }

        if (!response.ok) {
            throw new Error(data && data.error ? data.error : `Request failed (${response.status})`);
        }

        const count = Array.isArray(data) ? data.length : 1;
        showMessage(`Successfully added ${count} job(s)!`, 'success');
        
        if (!isBulkMode) {
            clearForm();
        }
    } catch (error) {
        showMessage(error.message || 'An error occurred', 'error');
    }
});

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

function hideMessage() {
    messageDiv.style.display = 'none';
}

function clearForm() {
    document.getElementById('fileName').value = '';
    document.getElementById('crf').value = '';
    document.getElementById('preset').value = '';
    document.getElementById('bulkJobs').value = '';
    hideMessage();
}
