const API_URL = window.location.origin;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupFormHandler();
    checkServerStatus();
});

// Setup Form Handler
function setupFormHandler() {
    const form = document.getElementById('dataForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitData();
    });
}

// Submit Data
async function submitData() {
    const field1 = document.getElementById('field1').value.trim();
    const field2 = document.getElementById('field2').value.trim();
    const field3 = document.getElementById('field3').value.trim();

    if (!field1 || !field2) {
        showStatus('Please fill in required fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/collect-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ field1, field2, field3 })
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✓ Data saved successfully!', 'success');
            document.getElementById('dataForm').reset();
            setTimeout(() => loadData(), 500);
        } else {
            showStatus('✗ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus('✗ Error submitting data. Check your connection.', 'error');
    }
}

// Load Data
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/api/data`);
        const result = await response.json();

        const container = document.getElementById('dataContainer');

        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(item => `
                <div class="data-item">
                    <div><span class="data-item-label">Field 1:</span><span class="data-item-value">${escapeHtml(item.field1)}</span></div>
                    <div><span class="data-item-label">Field 2:</span><span class="data-item-value">${escapeHtml(item.field2)}</span></div>
                    ${item.field3 ? `<div><span class="data-item-label">Field 3:</span><span class="data-item-value">${escapeHtml(item.field3)}</span></div>` : ''}
                    <div class="data-timestamp">📅 ${new Date(item.timestamp).toLocaleString()}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="no-data">No data collected yet. Start by submitting data above.</div>';
        }
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('dataContainer').innerHTML = '<div class="no-data">Error loading data</div>';
    }
}

// Export Data as CSV
function exportData() {
    window.location.href = `${API_URL}/api/export-csv`;
    showStatus('✓ CSV exported! Check your downloads folder.', 'success');
}

// Clear All Data
function clearAllData() {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
        // This would require an additional endpoint in server.js
        showStatus('Clear functionality coming soon', 'error');
    }
}

// Show Status Message
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
    
    setTimeout(() => {
        statusEl.textContent = 'Status: Ready';
        statusEl.className = 'status';
    }, 3000);
}

// Check Server Status
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/api/health`);
        const result = await response.json();
        console.log('Server status:', result);
    } catch (error) {
        console.error('Server connection error:', error);
        showStatus('⚠ Cannot connect to server', 'error');
    }
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
