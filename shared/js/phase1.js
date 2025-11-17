// Phase 1: Upload & Profiling Logic

const Phase1 = {
    selectedFile: null,
    
    init() {
        console.log('Phase 1 initialized');
        this.setupEventListeners();
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
        document.getElementById('uploadBtn').disabled = false;
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
        document.getElementById('uploadBtn').disabled = true;
        this.selectedFile = null;
    },
    
    async startUpload() {
        console.log('Starting upload...');
        
        if (!this.selectedFile) {
            alert('Please select a file first');
            return;
        }
        
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('uploadBtn').disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            
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
                throw new Error(`Upload failed: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Upload result:', result);
            
            this.completeProgress();
            
            setTimeout(() => {
                // Handle both response formats
                const fileName = result.data?.fileName || result.fileName || this.selectedFile.name;
                const totalRecords = result.data?.totalRecords || result.totalRecords || 'N/A';
                const totalColumns = result.data?.totalColumns || result.totalColumns || 'N/A';
                
                alert(`Upload successful!
                
File: ${fileName}
Records: ${totalRecords}
Columns: ${totalColumns}

Click OK to proceed to Phase 2 for analysis.`);
                
                console.log('Navigating to Phase 2...');
                window.location.href = '/phase2';
            }, 500);
            
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
            this.resetForm();
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
