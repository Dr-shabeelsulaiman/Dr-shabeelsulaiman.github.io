// Doctor's Logbook JavaScript

// Configuration
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx5his4SD9gBzUMm6b6jXHDMMT258tpRC58yfEPLCgVJ1ASe0olLMq67GlfEk7GQ6uT/exec',
    SHEET_NAME: 'ProcedureRecords_v2'
};

// Global variables
let records = [];
let currentRecord = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set today's date as default
    const dateEl = document.getElementById('procedureDate');
    if (dateEl) dateEl.valueAsDate = new Date();
    
    // Load existing records
    loadRecords();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup search functionality
    setupSearch();
}

function setupEventListeners() {
    // Form submission
    const form = document.getElementById('procedureForm');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    // Navigation smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // Standard input event
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterPatients(searchTerm);
    });
    
    // Mobile-specific fixes
    searchInput.addEventListener('touchstart', function(e) {
        e.target.focus();
    });
    
    // Prevent zoom on iOS by ensuring font size is 16px on focus
    searchInput.addEventListener('focus', function(e) {
        e.target.style.fontSize = '16px';
    });
    
    searchInput.addEventListener('blur', function(e) {
        e.target.style.fontSize = '';
    });
    
    // Ensure proper touch handling on mobile
    searchInput.addEventListener('touchend', function(e) {
        e.preventDefault();
        e.target.focus();
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = getFormData();
    
    try {
        showLoading(true);
        
        // Save to Google Sheets
        const result = await saveRecordToGoogleSheets(formData);
        
        if (result.success) {
            // Add to local array
            records.push({
                ...formData,
                id: result.id || Date.now().toString(),
                timestamp: new Date().toISOString()
            });
            
            // Reset form
            const form = document.getElementById('procedureForm');
            if (form) form.reset();
            const dateEl = document.getElementById('procedureDate');
            if (dateEl) dateEl.valueAsDate = new Date();
            // Re-apply category after reset
            const cat = sessionStorage.getItem('logbookCategory');
            if (cat) document.getElementById('category').value = cat;
            
            // Show success message
            showSuccess('Procedure record saved successfully!');
            
            // Refresh table
            loadRecords();
        } else {
            console.error('Save failed with result:', result);
            const errorMsg = result.error || result.message || 'Unknown error occurred';
            showError(`Failed to save procedure record: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showError('An error occurred while saving the procedure record.');
    } finally {
        showLoading(false);
    }
}

function validateForm() {
    const form = document.getElementById('procedureForm');
    if (!form) return false;
    const requiredFields = form.querySelectorAll('[required]');
    
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            field.focus();
            const label = field.previousElementSibling ? field.previousElementSibling.textContent.replace('*', '').trim() : 'required';
            showError(`Please fill in the ${label} field.`);
            return false;
        }
    }
    
    // Ensure category is selected
    const category = document.getElementById('category').value;
    if (!category) {
        showError('Please select a procedure category (Minor or Major).');
        changeCategory();
        return false;
    }
    
    return true;
}

function getFormData() {
    return {
        category: document.getElementById('category').value,
        name: document.getElementById('patientName').value.trim(),
        age: parseInt(document.getElementById('patientAge').value),
        sex: document.getElementById('patientSex').value,
        ipNumber: document.getElementById('ipNumber').value.trim(),
        procedureDate: document.getElementById('procedureDate').value,
        diagnosis: document.getElementById('diagnosis').value.trim(),
        procedureDone: document.getElementById('procedureDone').value.trim(),
        observed: document.getElementById('observed').checked ? 'Yes' : 'No',
        assisted: document.getElementById('assisted').checked ? 'Yes' : 'No',
        performedUnderSupervision: document.getElementById('performedUnderSupervision').checked ? 'Yes' : 'No',
        independentlyPerformed: document.getElementById('independentlyPerformed').checked ? 'Yes' : 'No',
        hospital: document.getElementById('hospital').value.trim(),
        remarks: document.getElementById('remarks').value.trim()
    };
}

async function saveRecordToGoogleSheets(recordData) {
    try {
        console.log('Attempting to save record:', recordData);
        console.log('Using Script URL:', CONFIG.SCRIPT_URL);
        console.log('Current origin:', window.location.origin);
        
        // Check if running from file:// protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running from file:// - CORS will be blocked. Please use http://localhost:8000');
            return { success: false, message: 'Please access the website via http://localhost:8000 instead of opening the HTML file directly' };
        }
        
        // Build URL with parameters for GET request
        const params = new URLSearchParams({
            action: 'addRecord',
            category: recordData.category || '',
            name: recordData.name,
            age: recordData.age,
            sex: recordData.sex,
            ipNumber: recordData.ipNumber || '',
            procedureDate: recordData.procedureDate,
            diagnosis: recordData.diagnosis,
            procedureDone: recordData.procedureDone,
            observed: recordData.observed || 'No',
            assisted: recordData.assisted || 'No',
            performedUnderSupervision: recordData.performedUnderSupervision || 'No',
            independentlyPerformed: recordData.independentlyPerformed || 'No',
            hospital: recordData.hospital || '',
            supervisor: recordData.supervisor || '',
            remarks: recordData.remarks || ''
        });
        
        const response = await fetch(`${CONFIG.SCRIPT_URL}?${params.toString()}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Success response:', result);
        return result;
    } catch (error) {
        console.error('Google Sheets API Error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // For development, return mock success if URL is placeholder
        if (CONFIG.SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            console.log('Using mock data - please configure Google Apps Script URL');
            return { success: true, id: Date.now().toString() };
        }
        
        // Return detailed error for debugging
        return { 
            success: false, 
            message: `Network error: ${error.message}`,
            error: error.message
        };
    }
}

async function loadRecords() {
    try {
        showLoading(true);
        
        // Check if running from file:// protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running from file:// - CORS will be blocked. Please use http://localhost:8000');
            records = getMockRecords();
            displayRecords(records);
            showLoading(false);
            return;
        }
        
        // Try to load from Google Sheets first
        if (CONFIG.SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getRecords`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    records = result.data.records || [];
                } else {
                    throw new Error(result.message);
                }
            }
        } else {
            // Use mock data for development
            records = getMockRecords();
        }
        
        displayRecords(records);
    } catch (error) {
        console.error('Error loading records:', error);
        // Use mock data as fallback
        records = getMockRecords();
        displayRecords(records);
    } finally {
        showLoading(false);
    }
}

function displayRecords(recordsToDisplay) {
    const tableBody = document.getElementById('recordsTableBody');
    const noRecords = document.getElementById('noRecords');
    
    if (!tableBody) return;
    
    // Filter by current category if one is selected
    const currentCategory = sessionStorage.getItem('logbookCategory');
    if (currentCategory) {
        recordsToDisplay = recordsToDisplay.filter(r => {
            const recCat = (r.category || '').toString().trim();
            return recCat === currentCategory;
        });
    }
    
    if (recordsToDisplay.length === 0) {
        tableBody.innerHTML = '';
        if (noRecords) {
            noRecords.style.display = 'block';
            const msg = noRecords.querySelector('p');
            if (msg && currentCategory) msg.textContent = `No ${currentCategory.toLowerCase()} procedure records found`;
        }
        return;
    }
    
    if (noRecords) noRecords.style.display = 'none';
    
    tableBody.innerHTML = recordsToDisplay.map(record => `
        <tr>
            <td>${formatDate(record.procedureDate || record.visitDate)}</td>
            <td>
                <strong>${escapeHtml(record.name)}</strong>
                ${isNewRecord(record.procedureDate || record.visitDate) ? '<span class="badge bg-success ms-1">New</span>' : ''}
            </td>
            <td>${record.age}</td>
            <td>${record.sex || record.gender || '-'}</td>
            <td>${record.ipNumber || '-'}</td>
            <td>${truncateText(escapeHtml(record.diagnosis), 40)}</td>
            <td>${truncateText(escapeHtml(record.procedureDone || record.chiefComplaint || '-'), 40)}</td>
            <td>${record.observed === 'Yes' ? '<i class="bi bi-check-lg text-info"></i>' : '-'}</td>
            <td>${record.assisted === 'Yes' ? '<i class="bi bi-check-lg text-warning"></i>' : '-'}</td>
            <td>${record.performedUnderSupervision === 'Yes' ? '<i class="bi bi-check-lg text-primary"></i>' : '-'}</td>
            <td>${record.independentlyPerformed === 'Yes' ? '<i class="bi bi-check-lg text-success"></i>' : '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewRecord('${record.id || record.timestamp}')">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="printRecord('${record.id || record.timestamp}')">
                    <i class="bi bi-printer"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterRecords(searchTerm) {
    const currentCategory = sessionStorage.getItem('logbookCategory');
    let pool = records;
    if (currentCategory) {
        pool = records.filter(r => {
            const recCat = (r.category || '').toString().trim();
            return recCat === currentCategory;
        });
    }
    
    const filtered = pool.filter(record => {
        return record.name.toLowerCase().includes(searchTerm) ||
               (record.ipNumber || '').toLowerCase().includes(searchTerm) ||
               (record.diagnosis || '').toLowerCase().includes(searchTerm) ||
               (record.procedureDone || record.chiefComplaint || '').toLowerCase().includes(searchTerm);
    });
    
    displayRecords(filtered);
}

function viewRecord(recordId) {
    const record = records.find(r => (r.id || r.timestamp) === recordId);
    if (!record) return;
    
    currentRecord = record;
    
    const modalBody = document.getElementById('procedureDetails');
    if (!modalBody) return;
    
    const cat = record.category || sessionStorage.getItem('logbookCategory') || 'Procedure';
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary">Patient Information</h6>
                <p><strong>Name:</strong> ${escapeHtml(record.name)}</p>
                <p><strong>Age:</strong> ${record.age}</p>
                <p><strong>Sex:</strong> ${record.sex || record.gender || '-'}</p>
                <p><strong>IP No.:</strong> ${record.ipNumber || 'Not provided'}</p>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary">Procedure Information</h6>
                <p><strong>Category:</strong> <span class="badge bg-info">${cat}</span></p>
                <p><strong>Procedure Date:</strong> ${formatDate(record.procedureDate || record.visitDate)}</p>
                <p><strong>Procedure Done:</strong> ${escapeHtml(record.procedureDone || record.chiefComplaint || '-')}</p>
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-12">
                <h6 class="text-primary">Medical Details</h6>
                <p><strong>Diagnosis:</strong></p>
                <p>${escapeHtml(record.diagnosis || 'Not recorded')}</p>
                
                <div class="row mb-3">
                    <div class="col-md-3">
                        <p><strong>Observed:</strong> 
                            ${record.observed === 'Yes' ? '<span class="badge bg-info">Yes</span>' : '<span class="badge bg-secondary">No</span>'}
                        </p>
                    </div>
                    <div class="col-md-3">
                        <p><strong>Assisted:</strong> 
                            ${record.assisted === 'Yes' ? '<span class="badge bg-warning">Yes</span>' : '<span class="badge bg-secondary">No</span>'}
                        </p>
                    </div>
                    <div class="col-md-3">
                        <p><strong>Under Supervision:</strong> 
                            ${record.performedUnderSupervision === 'Yes' ? '<span class="badge bg-primary">Yes</span>' : '<span class="badge bg-secondary">No</span>'}
                        </p>
                    </div>
                    <div class="col-md-3">
                        <p><strong>Independently:</strong> 
                            ${record.independentlyPerformed === 'Yes' ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>'}
                        </p>
                    </div>
                </div>
                
                <p><strong>Hospital / Institution:</strong> ${escapeHtml(record.hospital || 'Not recorded')}</p>
                <p><strong>Supervising Consultant:</strong> ${escapeHtml(record.supervisor || 'Not recorded')}</p>
                <p><strong>Remarks:</strong></p>
                <p>${escapeHtml(record.remarks || 'No additional remarks')}</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('procedureModal'));
    modal.show();
}

function printRecord(recordId) {
    if (recordId) {
        const record = records.find(r => (r.id || r.timestamp) === recordId);
        if (record) {
            currentRecord = record;
        }
    }
    
    if (!currentRecord) {
        showError('No procedure record selected for printing.');
        return;
    }
    
    const cat = currentRecord.category || sessionStorage.getItem('logbookCategory') || 'Procedure';
    
    // Create printable content
    const printContent = `
        <div class="print-only">
            <h2>Doctor's Logbook - ${cat} Procedure Record</h2>
            <hr>
            <div class="row">
                <div class="col-6">
                    <p><strong>Patient Name:</strong> ${escapeHtml(currentRecord.name)}</p>
                    <p><strong>Age:</strong> ${currentRecord.age}</p>
                    <p><strong>Sex:</strong> ${currentRecord.sex || currentRecord.gender || '-'}</p>
                    <p><strong>IP No.:</strong> ${currentRecord.ipNumber || 'N/A'}</p>
                </div>
                <div class="col-6">
                    <p><strong>Procedure Date:</strong> ${formatDate(currentRecord.procedureDate || currentRecord.visitDate)}</p>
                    <p><strong>Category:</strong> ${cat}</p>
                    <p><strong>Printed Date:</strong> ${formatDate(new Date().toISOString())}</p>
                </div>
            </div>
            <hr>
            <h5>Diagnosis</h5>
            <p>${escapeHtml(currentRecord.diagnosis || 'Not recorded')}</p>
            
            <h5>Procedure Done</h5>
            <p>${escapeHtml(currentRecord.procedureDone || currentRecord.chiefComplaint || 'Not recorded')}</p>
            
            <h5>Performance Status</h5>
            <p><strong>Observed:</strong> ${currentRecord.observed === 'Yes' ? 'Yes' : 'No'}</p>
            <p><strong>Assisted:</strong> ${currentRecord.assisted === 'Yes' ? 'Yes' : 'No'}</p>
            <p><strong>Performed Under Supervision:</strong> ${currentRecord.performedUnderSupervision === 'Yes' ? 'Yes' : 'No'}</p>
            <p><strong>Independently Performed:</strong> ${currentRecord.independentlyPerformed === 'Yes' ? 'Yes' : 'No'}</p>
            
            <h5>Hospital / Institution</h5>
            <p>${escapeHtml(currentRecord.hospital || 'Not recorded')}</p>
            
            <h5>Supervising Consultant</h5>
            <p>${escapeHtml(currentRecord.supervisor || 'Not recorded')}</p>
            
            <h5>Remarks</h5>
            <p>${escapeHtml(currentRecord.remarks || currentRecord.notes || 'No additional remarks')}</p>
        </div>
    `;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Procedure Record - ${escapeHtml(currentRecord.name)}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-only { display: block; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            ${printContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Utility Functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function isNewRecord(visitDate) {
    const visit = new Date(visitDate);
    const today = new Date();
    const diffTime = Math.abs(today - visit);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7; // Consider records from last 7 days as "new"
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('successModal'));
    modal.show();
}

function showError(message) {
    // Create error toast
    const toastHtml = `
        <div class="toast align-items-center text-white bg-danger border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-triangle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.innerHTML = toastHtml;
    document.body.appendChild(toastContainer);
    
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
    
    setTimeout(() => {
        document.body.removeChild(toastContainer);
    }, 5000);
}

function showLoading(show) {
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        if (show) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-save me-1"></i>Save Procedure';
        }
    });
}

function getMockRecords() {
    return [
        {
            id: '1',
            category: 'Minor',
            name: 'John Doe',
            age: 45,
            sex: 'Male',
            ipNumber: 'IP-2024-001',
            procedureDate: '2024-06-01',
            diagnosis: 'Tension headache, possible hypertension',
            procedureDone: 'Wound Dressing',
            observed: 'Yes',
            assisted: 'No',
            performedUnderSupervision: 'Yes',
            independentlyPerformed: 'No',
            hospital: 'City Hospital',
            supervisor: 'Dr. Ahmed Khan',
            remarks: 'Patient advised to follow up in 2 weeks',
            timestamp: '2024-06-01T10:30:00.000Z'
        },
        {
            id: '2',
            category: 'Major',
            name: 'Jane Smith',
            age: 32,
            sex: 'Female',
            ipNumber: 'IP-2024-002',
            procedureDate: '2024-05-30',
            diagnosis: 'Acute appendicitis',
            procedureDone: 'Appendectomy',
            observed: 'No',
            assisted: 'Yes',
            performedUnderSupervision: 'No',
            independentlyPerformed: 'Yes',
            hospital: 'Metro Medical Center',
            supervisor: 'Dr. Rajesh Patel',
            remarks: 'Laparoscopic approach used',
            timestamp: '2024-05-30T14:15:00.000Z'
        }
    ];
}

// Print date range functionality
function showPrintRangeModal() {
    const modal = new bootstrap.Modal(document.getElementById('printRangeModal'));
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('printEndDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('printStartDate').value = startDate.toISOString().split('T')[0];
    
    // Set category dropdown to current session category
    const currentCategory = sessionStorage.getItem('logbookCategory');
    const catSelect = document.getElementById('printCategory');
    if (catSelect && currentCategory) {
        catSelect.value = currentCategory;
    }
    
    modal.show();
}

function printDateRange() {
    const startDate = document.getElementById('printStartDate').value;
    const endDate = document.getElementById('printEndDate').value;
    const format = document.getElementById('printFormat').value;
    const includeEmptyFields = document.getElementById('includeEmptyFields').checked;
    const selectedCategory = document.getElementById('printCategory').value;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }
    
    // Filter records by date range and selected category
    const filteredRecords = records.filter(record => {
        const visitDate = new Date(record.procedureDate || record.visitDate);
        const inRange = visitDate >= new Date(startDate) && visitDate <= new Date(endDate + 'T23:59:59');
        const matchesCategory = selectedCategory === 'All' || record.category === selectedCategory;
        return inRange && matchesCategory;
    });
    
    if (filteredRecords.length === 0) {
        const catLabel = selectedCategory === 'All' ? '' : selectedCategory.toLowerCase() + ' ';
        showError(`No ${catLabel}records found in the selected date range`);
        return;
    }
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('printRangeModal')).hide();
    
    // Generate print content
    generatePrintReport(filteredRecords, startDate, endDate, format, includeEmptyFields, selectedCategory);
}

function generatePrintReport(patientsToPrint, startDate, endDate, format, includeEmptyFields, selectedCategory) {
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);
    const catLabel = selectedCategory === 'All' ? 'All' : selectedCategory;
    const logoUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'logo.jpg';
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Mobile: Create downloadable HTML file
        createDownloadableReport(patientsToPrint, startDate, endDate, format, includeEmptyFields, selectedCategory);
        return;
    }
    
    // Desktop: Open print window
    const printWindow = window.open('', '_blank');
    
    let content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Procedure Report</title>
            <style>
                @page {
                    size: A4;
                    margin: 15mm;
                    @top-left { content: none; }
                    @top-center { content: none; }
                    @top-right { content: none; }
                    @bottom-left { content: none; }
                    @bottom-center { content: none; }
                    @bottom-right { content: none; }
                }
                
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px;
                    color: #333;
                    font-size: 12px;
                    line-height: 1.4;
                    width: 210mm;
                    box-sizing: border-box;
                }
                
                .report-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                
                .report-header img {
                    height: 70px;
                    width: auto;
                    max-width: 120px;
                    object-fit: contain;
                }
                
                .report-header .header-text {
                    text-align: center;
                }
                
                .report-header .header-text h1 {
                    color: #007bff;
                    margin: 0 0 4px 0;
                    font-size: 16px;
                }
                
                .report-header .header-text h2 {
                    color: #333;
                    margin: 0 0 4px 0;
                    font-size: 14px;
                    font-weight: bold;
                }
                
                .report-header .header-text h3 {
                    color: #555;
                    margin: 0 0 4px 0;
                    font-size: 12px;
                    font-weight: bold;
                    font-style: italic;
                }
                
                .report-header .header-text p {
                    margin: 2px 0;
                    color: #666;
                    font-size: 11px;
                }
                
                .summary { 
                    background: #f8f9fa; 
                    padding: 12px; 
                    border-radius: 5px; 
                    margin-bottom: 15px;
                    border: 1px solid #ddd;
                }
                
                .patient-record { 
                    margin-bottom: 20px; 
                    page-break-inside: avoid; 
                    border: 1px solid #ddd; 
                    border-radius: 5px; 
                    padding: 12px;
                }
                
                .patient-header { 
                    background: #007bff; 
                    color: white; 
                    padding: 8px 12px; 
                    margin: -12px -12px 12px -12px; 
                    border-radius: 5px 5px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .patient-header h3 {
                    margin: 0;
                    font-size: 14px;
                }
                
                .serial-number {
                    background: rgba(255,255,255,0.2);
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-weight: bold;
                    font-size: 12px;
                }
                
                .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 8px; 
                    margin-bottom: 12px;
                }
                
                .info-item { 
                    margin-bottom: 4px;
                    font-size: 11px;
                }
                
                .info-label { 
                    font-weight: bold; 
                    color: #555;
                    display: inline-block;
                    min-width: 80px;
                }
                
                .section-title { 
                    font-weight: bold; 
                    color: #007bff; 
                    margin-top: 12px; 
                    margin-bottom: 4px;
                    font-size: 12px;
                    border-bottom: 1px solid #e9ecef;
                    padding-bottom: 2px;
                }
                
                .empty-field { 
                    color: #999; 
                    font-style: italic;
                }
                
                .compact-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 15px;
                    font-size: 10px;
                }
                
                .compact-table th, .compact-table td { 
                    border: 1px solid #ddd; 
                    padding: 6px 8px; 
                    text-align: center;
                    vertical-align: middle;
                }
                
                .compact-table th { 
                    background: #f8f9fa; 
                    font-weight: bold;
                    font-size: 10px;
                }
                
                .compact-table .serial-col {
                    width: 40px;
                    text-align: center;
                    font-weight: bold;
                }
                
                @media print { 
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 15mm; }
                    .patient-record { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <img src="${logoUrl}" alt="Logo">
                <div class="header-text">
                    <h1>Govt Medical College Thrissur</h1>
                    <h2>Department of Urology</h2>
                    <h3>Logbook of Dr. Shabeel Sulaiman</h3>
                    <p><strong>${catLabel} Procedure Report</strong></p>
                    <p>Date Range: ${startDateFormatted} to ${endDateFormatted} | Generated: ${formatDate(new Date().toISOString())} | Total: ${patientsToPrint.length}</p>
                </div>
            </div>
    `;
    
    if (format === 'summary') {
        content += generateSummaryReport(patientsToPrint, includeEmptyFields);
    } else if (format === 'compact') {
        content += generateCompactReport(patientsToPrint);
    } else {
        content += generateDetailedReport(patientsToPrint, includeEmptyFields);
    }
    
    content += `
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <p style="color: #666;">End of Report - Dr. Shabeel Sulaiman's Logbook</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

function generateDetailedReport(patientsToPrint, includeEmptyFields) {
    let content = '';
    
    patientsToPrint.forEach((record, index) => {
        const cat = record.category || 'Procedure';
        content += `
            <div class="patient-record">
                <div class="patient-header">
                    <h3>Record ${index + 1}: ${escapeHtml(record.name)}</h3>
                    <div class="serial-number">S.No: ${index + 1}</div>
                    <p>${cat} | Date: ${formatDate(record.procedureDate || record.visitDate)}</p>
                </div>
                <div class="info-grid">
                    <div>
                        <div class="info-item"><span class="info-label">Age:</span> ${record.age}</div>
                        <div class="info-item"><span class="info-label">Sex:</span> ${record.sex || record.gender || '-'}</div>
                        <div class="info-item"><span class="info-label">IP No.:</span> ${record.ipNumber || 'N/A'}</div>
                    </div>
                    <div>
                        <div class="info-item"><span class="info-label">Category:</span> ${cat}</div>
                        <div class="info-item"><span class="info-label">Record ID:</span> ${record.id || 'N/A'}</div>
                        <div class="info-item"><span class="info-label">Recorded:</span> ${formatDate(record.timestamp || record.procedureDate || record.visitDate)}</div>
                    </div>
                </div>
                <div class="section-title">Diagnosis:</div>
                <p>${escapeHtml(record.diagnosis || 'Not recorded')}</p>
                
                <div class="section-title">Procedure Done:</div>
                <p>${escapeHtml(record.procedureDone || record.chiefComplaint || 'Not recorded')}</p>
                
                <div class="section-title">Performance Status:</div>
                <div class="info-grid">
                    <div>
                        <div class="info-item"><span class="info-label">Observed:</span> ${record.observed === 'Yes' ? 'Yes' : 'No'}</div>
                        <div class="info-item"><span class="info-label">Under Supervision:</span> ${record.performedUnderSupervision === 'Yes' ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                        <div class="info-item"><span class="info-label">Assisted:</span> ${record.assisted === 'Yes' ? 'Yes' : 'No'}</div>
                        <div class="info-item"><span class="info-label">Independently:</span> ${record.independentlyPerformed === 'Yes' ? 'Yes' : 'No'}</div>
                    </div>
                </div>
                
                ${(record.hospital || includeEmptyFields) ? `
                    <div class="section-title">Hospital / Institution:</div>
                    <p>${record.hospital ? escapeHtml(record.hospital) : '<span class="empty-field">Not recorded</span>'}</p>
                ` : ''}
                
                ${(record.supervisor || includeEmptyFields) ? `
                    <div class="section-title">Supervising Consultant:</div>
                    <p>${record.supervisor ? escapeHtml(record.supervisor) : '<span class="empty-field">Not recorded</span>'}</p>
                ` : ''}
                
                ${(record.remarks || record.notes || includeEmptyFields) ? `
                    <div class="section-title">Remarks:</div>
                    <p>${record.remarks || record.notes ? escapeHtml(record.remarks || record.notes) : '<span class="empty-field">No remarks</span>'}</p>
                ` : ''}
            </div>
        `;
    });
    
    return content;
}

function generateSummaryReport(patientsToPrint, includeEmptyFields) {
    let content = '<div class="summary">';
    
    // Statistics
    const ageGroups = {
        '0-18': patientsToPrint.filter(p => p.age <= 18).length,
        '19-35': patientsToPrint.filter(p => p.age > 18 && p.age <= 35).length,
        '36-50': patientsToPrint.filter(p => p.age > 35 && p.age <= 50).length,
        '51+': patientsToPrint.filter(p => p.age > 50).length
    };
    
    const sexCount = {
        'Male': patientsToPrint.filter(p => (p.sex || p.gender) === 'Male').length,
        'Female': patientsToPrint.filter(p => (p.sex || p.gender) === 'Female').length,
        'Other': patientsToPrint.filter(p => (p.sex || p.gender) === 'Other').length
    };
    
    const observedCount = patientsToPrint.filter(p => p.observed === 'Yes').length;
    const assistedCount = patientsToPrint.filter(p => p.assisted === 'Yes').length;
    const supervisionCount = patientsToPrint.filter(p => p.performedUnderSupervision === 'Yes').length;
    const independentCount = patientsToPrint.filter(p => p.independentlyPerformed === 'Yes').length;
    
    content += `
        <h3>Summary Statistics</h3>
        <div class="info-grid">
            <div>
                <h4>Age Distribution</h4>
                <p>0-18 years: ${ageGroups['0-18']} records</p>
                <p>19-35 years: ${ageGroups['19-35']} records</p>
                <p>36-50 years: ${ageGroups['36-50']} records</p>
                <p>51+ years: ${ageGroups['51+']} records</p>
            </div>
            <div>
                <h4>Sex Distribution</h4>
                <p>Male: ${sexCount['Male']} records</p>
                <p>Female: ${sexCount['Female']} records</p>
                <p>Other: ${sexCount['Other']} records</p>
                <p>Observed: ${observedCount}</p>
                <p>Assisted: ${assistedCount}</p>
                <p>Under Supervision: ${supervisionCount}</p>
                <p>Independent: ${independentCount}</p>
            </div>
        </div>
    `;
    
    content += '</div>';
    
    // Brief record list
    content += '<h3>Procedure Summary</h3>';
    patientsToPrint.forEach((record, index) => {
        content += `
            <div class="patient-record">
                <div class="patient-header">
                    <h4>${index + 1}. ${escapeHtml(record.name)}</h4>
                    <div class="serial-number">S.No: ${index + 1}</div>
                </div>
                <div class="info-grid">
                    <div>
                        <div class="info-item"><span class="info-label">Date:</span> ${formatDate(record.procedureDate || record.visitDate)}</div>
                        <div class="info-item"><span class="info-label">Age/Sex:</span> ${record.age}/${record.sex || record.gender || '-'}</div>
                        <div class="info-item"><span class="info-label">IP No.:</span> ${record.ipNumber || 'Not provided'}</div>
                    </div>
                    <div>
                        <div class="info-item"><span class="info-label">Procedure:</span> ${escapeHtml(truncateText(record.procedureDone || record.chiefComplaint || '-', 100))}</div>
                        <div class="info-item"><span class="info-label">Diagnosis:</span> ${record.diagnosis ? escapeHtml(truncateText(record.diagnosis, 100)) : 'Not recorded'}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    return content;
}

function generateCompactReport(patientsToPrint) {
    let content = `
        <table class="compact-table">
            <thead>
                <tr>
                    <th class="serial-col">S.No</th>
                    <th>Date</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>IP No.</th>
                    <th>Diagnosis</th>
                    <th>Procedure</th>
                    <th>O</th>
                    <th>A</th>
                    <th>PS</th>
                    <th>IP</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    patientsToPrint.forEach((record, index) => {
        content += `
            <tr>
                <td class="serial-col">${index + 1}</td>
                <td>${formatDate(record.procedureDate || record.visitDate)}</td>
                <td>${record.age}</td>
                <td>${record.sex || record.gender || '-'}</td>
                <td>${record.ipNumber || '-'}</td>
                <td>${escapeHtml(truncateText(record.diagnosis, 40))}</td>
                <td>${escapeHtml(truncateText(record.procedureDone || record.chiefComplaint || '-', 40))}</td>
                <td style="width:30px;text-align:center;vertical-align:middle;">${record.observed === 'Yes' ? '<strong>O</strong>' : ''}</td>
                <td style="width:30px;text-align:center;vertical-align:middle;">${record.assisted === 'Yes' ? '<strong>A</strong>' : ''}</td>
                <td style="width:30px;text-align:center;vertical-align:middle;">${record.performedUnderSupervision === 'Yes' ? '<strong>PS</strong>' : ''}</td>
                <td style="width:30px;text-align:center;vertical-align:middle;">${record.independentlyPerformed === 'Yes' ? '<strong>IP</strong>' : ''}</td>
            </tr>
        `;
    });
    
    content += `
            </tbody>
        </table>
    `;
    
    return content;
}


function createDownloadableReport(patientsToPrint, startDate, endDate, format, includeEmptyFields, selectedCategory) {
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);
    const catLabel = selectedCategory === 'All' ? 'All' : selectedCategory;
    const logoUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'logo.jpg';
    
    // Generate the same content as desktop but as a downloadable file
    let content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Procedure Report</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @page {
                    size: A4;
                    margin: 15mm;
                    @top-left { content: none; }
                    @top-center { content: none; }
                    @top-right { content: none; }
                    @bottom-left { content: none; }
                    @bottom-center { content: none; }
                    @bottom-right { content: none; }
                }
                
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px;
                    color: #333;
                    font-size: 12px;
                    line-height: 1.4;
                    width: 210mm;
                    box-sizing: border-box;
                }
                
                .report-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                
                .report-header img {
                    height: 70px;
                    width: auto;
                    max-width: 120px;
                    object-fit: contain;
                }
                
                .report-header .header-text {
                    text-align: center;
                }
                
                .report-header .header-text h1 {
                    color: #007bff;
                    margin: 0 0 4px 0;
                    font-size: 16px;
                }
                
                .report-header .header-text h2 {
                    color: #333;
                    margin: 0 0 4px 0;
                    font-size: 14px;
                    font-weight: bold;
                }
                
                .report-header .header-text h3 {
                    color: #555;
                    margin: 0 0 4px 0;
                    font-size: 12px;
                    font-weight: bold;
                    font-style: italic;
                }
                
                .report-header .header-text p {
                    margin: 2px 0;
                    color: #666;
                    font-size: 11px;
                }
                
                .summary { 
                    background: #f8f9fa; 
                    padding: 12px; 
                    border-radius: 5px; 
                    margin-bottom: 15px;
                    border: 1px solid #ddd;
                }
                
                .patient-record { 
                    margin-bottom: 20px; 
                    page-break-inside: avoid; 
                    border: 1px solid #ddd; 
                    border-radius: 5px; 
                    padding: 12px;
                }
                
                .patient-header { 
                    background: #007bff; 
                    color: white; 
                    padding: 8px 12px; 
                    margin: -12px -12px 12px -12px; 
                    border-radius: 5px 5px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .patient-header h3 {
                    margin: 0;
                    font-size: 14px;
                }
                
                .serial-number {
                    background: rgba(255,255,255,0.2);
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-weight: bold;
                    font-size: 12px;
                }
                
                .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 8px; 
                    margin-bottom: 12px;
                }
                
                .info-item { 
                    margin-bottom: 4px;
                    font-size: 11px;
                }
                
                .info-label { 
                    font-weight: bold; 
                    color: #555;
                    display: inline-block;
                    min-width: 80px;
                }
                
                .section-title { 
                    font-weight: bold; 
                    color: #007bff; 
                    margin-top: 12px; 
                    margin-bottom: 4px;
                    font-size: 12px;
                    border-bottom: 1px solid #e9ecef;
                    padding-bottom: 2px;
                }
                
                .empty-field { 
                    color: #999; 
                    font-style: italic;
                }
                
                .compact-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 15px;
                    font-size: 10px;
                }
                
                .compact-table th, .compact-table td { 
                    border: 1px solid #ddd; 
                    padding: 6px 8px; 
                    text-align: center;
                    vertical-align: middle;
                }
                
                .compact-table th { 
                    background: #f8f9fa; 
                    font-weight: bold;
                    font-size: 10px;
                }
                
                .compact-table .serial-col {
                    width: 40px;
                    text-align: center;
                    font-weight: bold;
                }
                
                .print-btn {
                    background: #007bff;
                    color: white;
                    padding: 15px;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    margin: 20px 0;
                    cursor: pointer;
                    display: block;
                    width: 100%;
                    text-align: center;
                }
                
                .instructions {
                    background: #e7f3ff;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #007bff;
                }
                
                @media print { 
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 15mm; }
                    .patient-record { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <img src="${logoUrl}" alt="Logo">
                <div class="header-text">
                    <h1>Govt Medical College Thrissur</h1>
                    <h2>Department of Urology</h2>
                    <h3>Logbook of Dr. Shabeel Sulaiman</h3>
                    <p><strong>${catLabel} Procedure Report</strong></p>
                    <p>Date Range: ${startDateFormatted} to ${endDateFormatted} | Generated: ${formatDate(new Date().toISOString())} | Total: ${patientsToPrint.length}</p>
                </div>
            </div>
    `;
    
    if (format === 'summary') {
        content += generateSummaryReport(patientsToPrint, includeEmptyFields);
    } else if (format === 'compact') {
        content += generateCompactReport(patientsToPrint);
    } else {
        content += generateDetailedReport(patientsToPrint, includeEmptyFields);
    }
    
    content += `
            <div class="instructions no-print">
                <h3>Mobile Instructions</h3>
                <p><strong>To save as PDF:</strong></p>
                <ol>
                    <li>Click the "Print Report" button below</li>
                    <li>In the print dialog, choose "Save as PDF" or "Print to PDF"</li>
                    <li>Uncheck "Headers and footers" in print settings (to remove page title/URL)</li>
                    <li>Save the file to your device</li>
                </ol>
                <p><strong>Alternative:</strong> Use your browser's menu (&#x22EE;) &rarr; Print &rarr; Save as PDF</p>
            </div>
            
            <button class="print-btn no-print" onclick="window.print()">
                🖨️ Print Report (Save as PDF)
            </button>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <p style="color: #666; font-size: 12px;">End of Report - Dr. Shabeel Sulaiman's Logbook</p>
            </div>
        </body>
        </html>
    `;
    
    // Create blob and download
    const blob = new Blob([content], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procedure-report-${startDate}-to-${endDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Show success message
    showSuccess('Report downloaded! Open the file and click "Print Report" to save as PDF.');
}

// Export functions for global access
window.viewRecord = viewRecord;
window.printRecord = printRecord;
window.loadRecords = loadRecords;
window.showPrintRangeModal = showPrintRangeModal;
window.printDateRange = printDateRange;
