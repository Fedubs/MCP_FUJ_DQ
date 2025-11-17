// Upload.js - Phase 1 Upload Functionality

let selectedFile = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
});

function initializeUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // File input change handler
    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    // Drag and drop handlers
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
        if (file) {
            handleFileSelect(file);
        }
    });
}

function handleFileSelect(file) {
    // Validate file type
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        showError('Please select a valid Excel file (.xlsx or .xls)');
        return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
        showError('File size exceeds 50MB limit');
        return;
    }

    selectedFile = file;
    displayFileInfo(file);
}

function displayFileInfo(file) {
    // Hide drop zone, show file info
    document.getElementById('dropZone').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'block';
    
    // Display file details
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    
    // Enable upload button
    document.getElementById('uploadBtn').disabled = false;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function removeFile() {
    selectedFile = null;
    resetForm();
}

function resetForm() {
    // Reset file input
    document.getElementById('fileInput').value = '';
    
    // Show drop zone, hide file info
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    
    // Disable upload button
    document.getElementById('uploadBtn').disabled = true;
    
    selectedFile = null;
}

function startUpload() {
    if (!selectedFile) {
        showError('Please select a file first');
        return;
    }

    // Show progress bar
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('uploadBtn').disabled = true;
    
    // Simulate upload and processing
    simulateProgress();
}

function simulateProgress() {
    let progress = 0;
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                completeUpload();
            }, 500);
        }
        
        progressFill.style.width = progress + '%';
        progressPercent.textContent = Math.round(progress) + '%';
    }, 200);
}

function completeUpload() {
    // This will be replaced with actual API call in implementation
    console.log('Upload complete for file:', selectedFile.name);
    
    // For now, show success message
    alert('Upload successful! (This is a demo - Phase 1 implementation will follow)');
    
    // Reset form
    resetForm();
}

function showError(message) {
    alert('Error: ' + message);
}
