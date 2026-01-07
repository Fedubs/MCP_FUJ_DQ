// Phase 1: Upload & Profiling Logic

const Phase1 = {
    selectedFile: null,
    serviceNowConnected: false,
    claudeApiKeySaved: false,
    
    init() {
        console.log('Phase 1 initialized');
        this.setupEventListeners();
        this.loadClaudeApiKeyFromCookie();
    },
    
    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        if (!dropZone || !fileInput) {
            console.error('Drop zone or file input not found');
            return;
        }
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileSelect(file);
        });
    },
    
    // ========== CLAUDE API KEY METHODS ==========
    
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    },
    
    setCookie(name, value, days = 30) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
    },
    
    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    },
    
    loadClaudeApiKeyFromCookie() {
        const savedKey = this.getCookie('claude_api_key');
        const apiKeyInput = document.getElementById('claudeApiKey');
        const statusDiv = document.getElementById('apiKeyStatus');
        const saveBtn = document.getElementById('saveApiKeyBtn');
        const testBtn = document.getElementById('testApiKeyBtn');
        const clearBtn = document.getElementById('clearApiKeyBtn');
        const toggleBtn = document.getElementById('toggleApiKeyBtn');
        
        if (savedKey) {
            // Key exists in cookie - show masked state
            apiKeyInput.value = '••••••••••••••••••••••••••••••••';
            apiKeyInput.disabled = true;
            apiKeyInput.type = 'password';
            
            this.claudeApiKeySaved = true;
            
            // Update buttons
            saveBtn.style.display = 'none';
            testBtn.style.display = 'none';
            toggleBtn.style.display = 'none';
            clearBtn.style.display = 'inline-block';
            
            // Show saved status
            statusDiv.innerHTML = `
                <div style="padding: 0.75rem; background: #d4edda; border-left: 4px solid #28a745; color: #155724;">
                    ✓ API key saved and ready
                </div>
            `;
            statusDiv.style.display = 'block';
            
            this.updateUploadButtonState();
        }
    },
    
    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('claudeApiKey');
        const toggleBtn = document.getElementById('toggleApiKeyBtn');
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleBtn.textContent = 'Hide';
        } else {
            apiKeyInput.type = 'password';
            toggleBtn.textContent = 'Show';
        }
    },
    
    async testClaudeApiKey() {
        const apiKey = document.getElementById('claudeApiKey').value.trim();
        const statusDiv = document.getElementById('apiKeyStatus');
        const testBtn = document.getElementById('testApiKeyBtn');
        const saveBtn = document.getElementById('saveApiKeyBtn');
        
        if (!apiKey) {
            statusDiv.innerHTML = `
                <div style="padding: 0.75rem; background: #fff3cd; border-left: 4px solid #ffc107; color: #856404;">
                    ⚠️ Please enter an API key
                </div>
            `;
            statusDiv.style.display = 'block';
            return;
        }
        
        // Validate format first
        if (!apiKey.startsWith('sk-ant-')) {
            statusDiv.innerHTML = `
                <div style="padding: 0.75rem; background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24;">
                    ✗ Invalid format. API key should start with sk-ant-
                </div>
            `;
            statusDiv.style.display = 'block';
            saveBtn.disabled = true;
            return;
        }
        
        // Show loading state
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        statusDiv.innerHTML = `
            <div style="padding: 0.75rem; background: #e7f3ff; border-left: 4px solid #2196F3; color: #014361;">
                🔄 Testing API key with Claude...
            </div>
        `;
        statusDiv.style.display = 'block';
        
        try {
            const response = await fetch('/api/phase1/test-claude-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey })
            });
            
            const result = await response.json();
            
            if (result.success) {
                statusDiv.innerHTML = `
                    <div style="padding: 0.75rem; background: #d4edda; border-left: 4px solid #28a745; color: #155724;">
                        ✓ ${result.message} - Click Save to continue
                    </div>
                `;
                saveBtn.disabled = false;
            } else {
                statusDiv.innerHTML = `
                    <div style="padding: 0.75rem; background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24;">
                        ✗ ${result.error}
                    </div>
                `;
                saveBtn.disabled = true;
            }
            
        } catch (error) {
            console.error('API key test error:', error);
            statusDiv.innerHTML = `
                <div style="padding: 0.75rem; background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24;">
                    ✗ Test failed: ${error.message}
                </div>
            `;
            saveBtn.disabled = true;
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Test';
        }
    },
    
    saveClaudeApiKey() {
        const apiKey = document.getElementById('claudeApiKey').value.trim();
        const apiKeyInput = document.getElementById('claudeApiKey');
        const statusDiv = document.getElementById('apiKeyStatus');
        const saveBtn = document.getElementById('saveApiKeyBtn');
        const testBtn = document.getElementById('testApiKeyBtn');
        const clearBtn = document.getElementById('clearApiKeyBtn');
        const toggleBtn = document.getElementById('toggleApiKeyBtn');
        
        if (!apiKey || !apiKey.startsWith('sk-ant-')) {
            alert('Please test a valid API key first');
            return;
        }
        
        // Save to cookie
        this.setCookie('claude_api_key', apiKey, 30);
        this.claudeApiKeySaved = true;
        
        // Mask the input
        apiKeyInput.value = '••••••••••••••••••••••••••••••••';
        apiKeyInput.disabled = true;
        apiKeyInput.type = 'password';
        
        // Update buttons
        saveBtn.style.display = 'none';
        testBtn.style.display = 'none';
        toggleBtn.style.display = 'none';
        clearBtn.style.display = 'inline-block';
        
        // Update status
        statusDiv.innerHTML = `
            <div style="padding: 0.75rem; background: #d4edda; border-left: 4px solid #28a745; color: #155724;">
                ✓ API key saved successfully
            </div>
        `;
        
        this.updateUploadButtonState();
    },
    
    clearClaudeApiKey() {
        const apiKeyInput = document.getElementById('claudeApiKey');
        const statusDiv = document.getElementById('apiKeyStatus');
        const saveBtn = document.getElementById('saveApiKeyBtn');
        const testBtn = document.getElementById('testApiKeyBtn');
        const clearBtn = document.getElementById('clearApiKeyBtn');
        const toggleBtn = document.getElementById('toggleApiKeyBtn');
        
        // Delete cookie
        this.deleteCookie('claude_api_key');
        this.claudeApiKeySaved = false;
        
        // Reset input
        apiKeyInput.value = '';
        apiKeyInput.disabled = false;
        apiKeyInput.type = 'password';
        
        // Update buttons
        saveBtn.style.display = 'inline-block';
        saveBtn.disabled = true;
        testBtn.style.display = 'inline-block';
        toggleBtn.style.display = 'inline-block';
        toggleBtn.textContent = 'Show';
        clearBtn.style.display = 'none';
        
        // Hide status
        statusDiv.style.display = 'none';
        
        this.updateUploadButtonState();
    },
    
    updateUploadButtonState() {
        const uploadBtn = document.getElementById('uploadBtn');
        const warningDiv = document.getElementById('apiKeyRequiredWarning');
        
        if (this.selectedFile && this.claudeApiKeySaved) {
            uploadBtn.disabled = false;
            if (warningDiv) warningDiv.style.display = 'none';
        } else if (this.selectedFile && !this.claudeApiKeySaved) {
            uploadBtn.disabled = true;
            if (warningDiv) warningDiv.style.display = 'block';
        } else {
            uploadBtn.disabled = true;
            if (warningDiv) warningDiv.style.display = 'none';
        }
    },
    
    // ========== FILE HANDLING METHODS ==========
    
    handleFileSelect(file) {
        console.log('File selected:', file.name);
        
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            alert('Please select a valid Excel file (.xlsx or .xls)');
            return;
        }
        
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File size exceeds 50MB limit');
            return;
        }
        
        this.selectedFile = file;
        this.displayFileInfo(file);
    },
    
    displayFileInfo(file) {
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = App.formatFileSize(file.size);
        this.updateUploadButtonState();
    },
    
    removeFile() {
        this.selectedFile = null;
        this.resetForm();
    },
    
    resetForm() {
        document.getElementById('fileInput').value = '';
        document.getElementById('dropZone').style.display = 'block';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'none';
        this.selectedFile = null;
        this.updateUploadButtonState();
    },
    
    // ========== SERVICENOW METHODS ==========
    
    async testServiceNowConnection() {
        const instance = document.getElementById('snowInstance').value.trim();
        const username = document.getElementById('snowUsername').value.trim();
        const password = document.getElementById('snowPassword').value;
        
        const statusDiv = document.getElementById('connectionStatus');
        const testBtn = document.getElementById('testConnectionBtn');
        
        if (!instance || !username || !password) {
            statusDiv.innerHTML = `
                <div style="padding: 0.75rem; background: #fff3cd; border-left: 4px solid #ffc107; color: #856404;">
                    ⚠️ Please fill in all ServiceNow fields
                </div>
            `;
            statusDiv.style.display = 'block';
            return;
        }
        
        // Show loading state
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        statusDiv.innerHTML = `
            <div style="padding: 0.75rem; background: #e7f3ff; border-left: 4px solid #2196F3; color: #014361;">
                🔄 Connecting to ServiceNow...
            </div>
        `;
        statusDiv.style.display = 'block';
        
        try {
            const response = await fetch('/api/phase1/test-servicenow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ instance, username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.serviceNowConnected = true;
                statusDiv.innerHTML = `
                    <div style="padding: 0.75rem; background: #d4edda; border-left: 4px solid #28a745; color: #155724;">
                        ✓ Connection successful! Connected to: ${result.instance}
                    </div>
                `;
                
                // Show clear button
                document.getElementById('clearConnectionBtn').style.display = 'inline-block';
                
                // Disable fields
                document.getElementById('snowInstance').disabled = true;
                document.getElementById('snowUsername').disabled = true;
                document.getElementById('snowPassword').disabled = true;
                testBtn.style.display = 'none';
            } else {
                this.serviceNowConnected = false;
                statusDiv.innerHTML = `
                    <div style="padding: 0.75rem; background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24;">
                        ✗ ${result.error || 'Connection failed'}
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Connection test error:', error);
            this.serviceNowConnected = false;
            statusDiv.innerHTML = `
                <div style="padding: 0.75rem; background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24;">
                    ✗ Connection failed: ${error.message}
                </div>
            `;
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
        }
    },
    
    clearServiceNowConnection() {
        // Re-enable fields
        document.getElementById('snowInstance').disabled = false;
        document.getElementById('snowUsername').disabled = false;
        document.getElementById('snowPassword').disabled = false;
        document.getElementById('snowInstance').value = '';
        document.getElementById('snowUsername').value = '';
        document.getElementById('snowPassword').value = '';
        
        // Hide status and clear button
        document.getElementById('connectionStatus').style.display = 'none';
        document.getElementById('clearConnectionBtn').style.display = 'none';
        document.getElementById('testConnectionBtn').style.display = 'inline-block';
        
        this.serviceNowConnected = false;
    },
    
    // ========== UPLOAD METHODS ==========
    
    async startUpload() {
        console.log('Starting upload...');
        
        if (!this.selectedFile) {
            this.showError('Please select a file first');
            return;
        }
        
        if (!this.claudeApiKeySaved) {
            this.showError('Please save a valid Claude API key first');
            return;
        }
        
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('uploadBtn').disabled = true;
        
        // Hide any previous errors
        this.hideError();
        
        try {
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            
            // Add ServiceNow credentials if provided
            const instance = document.getElementById('snowInstance').value.trim();
            const username = document.getElementById('snowUsername').value.trim();
            const password = document.getElementById('snowPassword').value;
            
            if (instance && username && password) {
                formData.append('snowInstance', instance);
                formData.append('snowUsername', username);
                formData.append('snowPassword', password);
                console.log('Including ServiceNow credentials in upload');
            }
            
            console.log('Uploading to /api/phase1/upload...');
            
            this.animateProgress();
            
            const response = await fetch('/api/phase1/upload', {
                method: 'POST',
                body: formData
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error(`Upload failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Upload result:', result);
            
            this.completeProgress();
            
            // Wait a moment to show 100% completion, then navigate directly to Phase 2
            setTimeout(() => {
                console.log('✓ Upload successful, navigating to Phase 2...');
                window.location.href = '/phase2';
            }, 800);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Upload failed: ' + error.message);
            this.resetForm();
        }
    },
    
    showError(message) {
        // Create or update error message below upload button
        let errorDiv = document.getElementById('uploadError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'uploadError';
            errorDiv.style.cssText = `
                margin-top: 1rem;
                padding: 1rem;
                background: #f8d7da;
                border-left: 4px solid #dc3545;
                border-radius: 4px;
                color: #721c24;
            `;
            document.getElementById('uploadBtn').parentElement.appendChild(errorDiv);
        }
        errorDiv.innerHTML = `<strong>✗ Error:</strong> ${message}`;
        errorDiv.style.display = 'block';
    },
    
    hideError() {
        const errorDiv = document.getElementById('uploadError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    },
    
    animateProgress() {
        let progress = 0;
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        this.progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90;
            
            progressFill.style.width = progress + '%';
            progressPercent.textContent = Math.round(progress) + '%';
        }, 200);
    },
    
    completeProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
    }
};

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Phase1.init());
} else {
    // DOM is already ready
    Phase1.init();
}
