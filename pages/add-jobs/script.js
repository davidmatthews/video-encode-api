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

// Get API base URL from environment or use relative path
const getApiBaseUrl = () => {
    // In production, replace with your Worker URL
    // For local development, you might need to adjust this
    const workerUrl = localStorage.getItem('videoEncodeWorkerUrl') || '';
    return workerUrl || '/api';
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
        const response = await fetch(`${getApiBaseUrl()}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to add jobs');
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
