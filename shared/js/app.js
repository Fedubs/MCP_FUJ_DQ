// App.js - Shared application utilities and helpers

console.log('[App.js] Script loaded at:', new Date().toISOString());

const App = {
    // API base URL
    apiBase: '/api',
    
    // Make API calls
    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Show notification/alert
    showNotification(message, type = 'info') {
        // Simple alert for now, can be enhanced later
        alert(message);
    },
    
    // Format file size
    formatFileSize(bytes) {
        console.log('[App.formatFileSize] Called with:', bytes);
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const result = Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        console.log('[App.formatFileSize] Returning:', result);
        return result;
    },
    
    // Format date
    formatDate(date) {
        return new Date(date).toLocaleString();
    }
};

// Make App available globally
window.App = App;

console.log('[App.js] App object created and assigned to window.App');
console.log('[App.js] window.App:', window.App);
console.log('[App.js] window.App.formatFileSize:', typeof window.App.formatFileSize);
