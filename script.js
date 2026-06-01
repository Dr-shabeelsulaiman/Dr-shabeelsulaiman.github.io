// Doctor's Logbook JavaScript

// Configuration
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzaGLZgIuWYTF-a5JjlI_WKmCGmHGNrralOhHlQNeLbdKclPs4f1ubkMjk7OpuQhWkQjQ/exec', // Your deployed Apps Script URL - properly configured!
    SHEET_NAME: 'PatientRecords'
};

// Global variables
let patients = [];
let currentPatient = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set today's date as default
    document.getElementById('visitDate').valueAsDate = new Date();
    
    // Load existing patients
    loadPatients();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup search functionality
    setupSearch();
}

function setupEventListeners() {
    // Form submission
    document.getElementById('patientForm').addEventListener('submit', handleFormSubmit);
    
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
        const result = await savePatientToGoogleSheets(formData);
        
        if (result.success) {
            // Add to local array
            patients.push({
                ...formData,
                id: result.id || Date.now().toString(),
                timestamp: new Date().toISOString()
            });
            
            // Reset form
            document.getElementById('patientForm').reset();
            document.getElementById('visitDate').valueAsDate = new Date();
            
            // Show success message
            showSuccess('Patient record saved successfully!');
            
            // Refresh table
            loadPatients();
        } else {
            console.error('Save failed with result:', result);
            const errorMsg = result.error || result.message || 'Unknown error occurred';
            showError(`Failed to save patient record: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error saving patient:', error);
        showError('An error occurred while saving the patient record.');
    } finally {
        showLoading(false);
    }
}

function validateForm() {
    const form = document.getElementById('patientForm');
    const requiredFields = form.querySelectorAll('[required]');
    
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            field.focus();
            showError(`Please fill in the ${field.previousElementSibling.textContent.replace('*', '').trim()} field.`);
            return false;
        }
    }
    
    // Validate email if provided
    const email = document.getElementById('patientEmail').value;
    if (email && !isValidEmail(email)) {
        document.getElementById('patientEmail').focus();
        showError('Please enter a valid email address.');
        return false;
    }
    
    // Validate phone if provided
    const phone = document.getElementById('patientPhone').value;
    if (phone && !isValidPhone(phone)) {
        document.getElementById('patientPhone').focus();
        showError('Please enter a valid phone number.');
        return false;
    }
    
    return true;
}

function getFormData() {
    return {
        name: document.getElementById('patientName').value.trim(),
        age: parseInt(document.getElementById('patientAge').value),
        gender: document.getElementById('patientGender').value,
        phone: document.getElementById('patientPhone').value.trim(),
        email: document.getElementById('patientEmail').value.trim(),
        visitDate: document.getElementById('visitDate').value,
        chiefComplaint: document.getElementById('chiefComplaint').value.trim(),
        diagnosis: document.getElementById('diagnosis').value.trim(),
        treatment: document.getElementById('treatment').value.trim(),
        notes: document.getElementById('notes').value.trim()
    };
}

async function savePatientToGoogleSheets(patientData) {
    try {
        console.log('Attempting to save patient:', patientData);
        console.log('Using Script URL:', CONFIG.SCRIPT_URL);
        console.log('Current origin:', window.location.origin);
        
        // Check if running from file:// protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running from file:// - CORS will be blocked. Please use http://localhost:8000');
            return { success: false, message: 'Please access the website via http://localhost:8000 instead of opening the HTML file directly' };
        }
        
        // Build URL with parameters for GET request
        const params = new URLSearchParams({
            action: 'addPatient',
            name: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            phone: patientData.phone || '',
            email: patientData.email || '',
            visitDate: patientData.visitDate,
            chiefComplaint: patientData.chiefComplaint,
            diagnosis: patientData.diagnosis || '',
            treatment: patientData.treatment || '',
            notes: patientData.notes || ''
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

async function loadPatients() {
    try {
        showLoading(true);
        
        // Check if running from file:// protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running from file:// - CORS will be blocked. Please use http://localhost:8000');
            patients = getMockPatients();
            displayPatients(patients);
            showLoading(false);
            return;
        }
        
        // Try to load from Google Sheets first
        if (CONFIG.SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getPatients`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    patients = result.data.patients || [];
                } else {
                    throw new Error(result.message);
                }
            }
        } else {
            // Use mock data for development
            patients = getMockPatients();
        }
        
        displayPatients(patients);
    } catch (error) {
        console.error('Error loading patients:', error);
        // Use mock data as fallback
        patients = getMockPatients();
        displayPatients(patients);
    } finally {
        showLoading(false);
    }
}

function displayPatients(patientsToDisplay) {
    const tableBody = document.getElementById('patientsTableBody');
    const noRecords = document.getElementById('noRecords');
    
    if (patientsToDisplay.length === 0) {
        tableBody.innerHTML = '';
        noRecords.style.display = 'block';
        return;
    }
    
    noRecords.style.display = 'none';
    
    tableBody.innerHTML = patientsToDisplay.map(patient => `
        <tr>
            <td>${formatDate(patient.visitDate)}</td>
            <td>
                <strong>${escapeHtml(patient.name)}</strong>
                ${isNewPatient(patient.visitDate) ? '<span class="badge bg-success ms-1">New</span>' : ''}
            </td>
            <td>${patient.age}</td>
            <td>${patient.gender}</td>
            <td>${patient.phone || '-'}</td>
            <td>${truncateText(escapeHtml(patient.chiefComplaint), 50)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewPatient('${patient.id || patient.timestamp}')">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="printPatientRecord('${patient.id || patient.timestamp}')">
                    <i class="bi bi-printer"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterPatients(searchTerm) {
    const filtered = patients.filter(patient => {
        return patient.name.toLowerCase().includes(searchTerm) ||
               patient.phone?.includes(searchTerm) ||
               patient.email?.toLowerCase().includes(searchTerm) ||
               patient.chiefComplaint.toLowerCase().includes(searchTerm) ||
               patient.diagnosis?.toLowerCase().includes(searchTerm);
    });
    
    displayPatients(filtered);
}

function viewPatient(patientId) {
    const patient = patients.find(p => (p.id || p.timestamp) === patientId);
    if (!patient) return;
    
    currentPatient = patient;
    
    const modalBody = document.getElementById('patientDetails');
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary">Personal Information</h6>
                <p><strong>Name:</strong> ${escapeHtml(patient.name)}</p>
                <p><strong>Age:</strong> ${patient.age}</p>
                <p><strong>Gender:</strong> ${patient.gender}</p>
                <p><strong>Phone:</strong> ${patient.phone || 'Not provided'}</p>
                <p><strong>Email:</strong> ${patient.email || 'Not provided'}</p>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary">Visit Information</h6>
                <p><strong>Visit Date:</strong> ${formatDate(patient.visitDate)}</p>
                <p><strong>Chief Complaint:</strong> ${escapeHtml(patient.chiefComplaint)}</p>
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-12">
                <h6 class="text-primary">Medical Details</h6>
                <p><strong>Diagnosis:</strong></p>
                <p>${escapeHtml(patient.diagnosis || 'Not recorded')}</p>
                <p><strong>Treatment Plan:</strong></p>
                <p>${escapeHtml(patient.treatment || 'Not recorded')}</p>
                <p><strong>Additional Notes:</strong></p>
                <p>${escapeHtml(patient.notes || 'No additional notes')}</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('patientModal'));
    modal.show();
}

function printPatientRecord(patientId) {
    if (patientId) {
        const patient = patients.find(p => (p.id || p.timestamp) === patientId);
        if (patient) {
            currentPatient = patient;
        }
    }
    
    if (!currentPatient) {
        showError('No patient record selected for printing.');
        return;
    }
    
    // Create printable content
    const printContent = `
        <div class="print-only">
            <h2>Doctor's Logbook - Patient Record</h2>
            <hr>
            <div class="row">
                <div class="col-6">
                    <p><strong>Patient Name:</strong> ${escapeHtml(currentPatient.name)}</p>
                    <p><strong>Age:</strong> ${currentPatient.age}</p>
                    <p><strong>Gender:</strong> ${currentPatient.gender}</p>
                    <p><strong>Phone:</strong> ${currentPatient.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${currentPatient.email || 'N/A'}</p>
                </div>
                <div class="col-6">
                    <p><strong>Visit Date:</strong> ${formatDate(currentPatient.visitDate)}</p>
                    <p><strong>Printed Date:</strong> ${formatDate(new Date().toISOString().split('T')[0])}</p>
                </div>
            </div>
            <hr>
            <h5>Chief Complaint</h5>
            <p>${escapeHtml(currentPatient.chiefComplaint)}</p>
            
            <h5>Diagnosis</h5>
            <p>${escapeHtml(currentPatient.diagnosis || 'Not recorded')}</p>
            
            <h5>Treatment Plan</h5>
            <p>${escapeHtml(currentPatient.treatment || 'Not recorded')}</p>
            
            <h5>Additional Notes</h5>
            <p>${escapeHtml(currentPatient.notes || 'No additional notes')}</p>
        </div>
    `;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Patient Record - ${escapeHtml(currentPatient.name)}</title>
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

function isNewPatient(visitDate) {
    const visit = new Date(visitDate);
    const today = new Date();
    const diffTime = Math.abs(today - visit);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7; // Consider patients from last 7 days as "new"
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
            button.innerHTML = '<i class="bi bi-save me-1"></i>Save Patient';
        }
    });
}

function getMockPatients() {
    return [
        {
            id: '1',
            name: 'John Doe',
            age: 45,
            gender: 'Male',
            phone: '+1 234-567-8900',
            email: 'john.doe@email.com',
            visitDate: '2024-06-01',
            chiefComplaint: 'Persistent headache and dizziness for the past week',
            diagnosis: 'Tension headache, possible hypertension',
            treatment: 'Prescribed pain relievers, recommended blood pressure monitoring',
            notes: 'Patient advised to follow up in 2 weeks',
            timestamp: '2024-06-01T10:30:00.000Z'
        },
        {
            id: '2',
            name: 'Jane Smith',
            age: 32,
            gender: 'Female',
            phone: '+1 234-567-8901',
            email: 'jane.smith@email.com',
            visitDate: '2024-05-30',
            chiefComplaint: 'Annual checkup',
            diagnosis: 'Good overall health',
            treatment: 'Routine blood tests ordered',
            notes: 'Patient maintains healthy lifestyle',
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
    
    modal.show();
}

function printDateRange() {
    const startDate = document.getElementById('printStartDate').value;
    const endDate = document.getElementById('printEndDate').value;
    const format = document.getElementById('printFormat').value;
    const includeEmptyFields = document.getElementById('includeEmptyFields').checked;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }
    
    // Filter patients by date range
    const filteredPatients = patients.filter(patient => {
        const visitDate = new Date(patient.visitDate);
        return visitDate >= new Date(startDate) && visitDate <= new Date(endDate + 'T23:59:59');
    });
    
    if (filteredPatients.length === 0) {
        showError('No patients found in the selected date range');
        return;
    }
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('printRangeModal')).hide();
    
    // Generate print content
    generatePrintReport(filteredPatients, startDate, endDate, format, includeEmptyFields);
}

function generatePrintReport(patientsToPrint, startDate, endDate, format, includeEmptyFields) {
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Mobile: Create downloadable HTML file
        createDownloadableReport(patientsToPrint, startDate, endDate, format, includeEmptyFields);
        return;
    }
    
    // Desktop: Open print window
    const printWindow = window.open('', '_blank');
    
    let content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dr. Shabeel Sulaiman's Logbook - Patient Report</title>
            <style>
                @page {
                    size: A4;
                    margin: 15mm;
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
                
                .header { 
                    text-align: center; 
                    border-bottom: 2px solid #007bff; 
                    padding-bottom: 15px; 
                    margin-bottom: 20px;
                }
                
                .header h1 { 
                    color: #007bff; 
                    margin-bottom: 8px; 
                    font-size: 18px;
                }
                
                .header p { 
                    margin: 3px 0; 
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
                    text-align: left;
                    vertical-align: top;
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
            <div class="header">
                <h1>Dr. Shabeel Sulaiman's Logbook</h1>
                <p><strong>Patient Report</strong></p>
                <p>Date Range: ${startDateFormatted} to ${endDateFormatted}</p>
                <p>Generated on: ${formatDate(new Date().toISOString())}</p>
                <p>Total Patients: ${patientsToPrint.length}</p>
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
    
    patientsToPrint.forEach((patient, index) => {
        content += `
            <div class="patient-record">
                <div class="patient-header">
                    <h3>Patient ${index + 1}: ${escapeHtml(patient.name)}</h3>
                    <div class="serial-number">S.No: ${index + 1}</div>
                    <p>Visit Date: ${formatDate(patient.visitDate)}</p>
                </div>
                <div class="info-grid">
                    <div>
                        <div class="info-item"><span class="info-label">Age:</span> ${patient.age}</div>
                        <div class="info-item"><span class="info-label">Gender:</span> ${patient.gender}</div>
                        <div class="info-item"><span class="info-label">Phone:</span> ${patient.phone || (includeEmptyFields ? '<span class="empty-field">Not provided</span>' : '')}</div>
                    </div>
                    <div>
                        <div class="info-item"><span class="info-label">Email:</span> ${patient.email || (includeEmptyFields ? '<span class="empty-field">Not provided</span>' : '')}</div>
                        <div class="info-item"><span class="info-label">Patient ID:</span> ${patient.id || 'N/A'}</div>
                        <div class="info-item"><span class="info-label">Recorded:</span> ${formatDate(patient.timestamp || patient.visitDate)}</div>
                    </div>
                </div>
                <div class="section-title">Chief Complaint:</div>
                <p>${escapeHtml(patient.chiefComplaint)}</p>
                
                ${(patient.diagnosis || includeEmptyFields) ? `
                    <div class="section-title">Diagnosis:</div>
                    <p>${patient.diagnosis ? escapeHtml(patient.diagnosis) : '<span class="empty-field">No diagnosis recorded</span>'}</p>
                ` : ''}
                
                ${(patient.treatment || includeEmptyFields) ? `
                    <div class="section-title">Treatment Plan:</div>
                    <p>${patient.treatment ? escapeHtml(patient.treatment) : '<span class="empty-field">No treatment recorded</span>'}</p>
                ` : ''}
                
                ${(patient.notes || includeEmptyFields) ? `
                    <div class="section-title">Additional Notes:</div>
                    <p>${patient.notes ? escapeHtml(patient.notes) : '<span class="empty-field">No additional notes</span>'}</p>
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
    
    const genderCount = {
        'Male': patientsToPrint.filter(p => p.gender === 'Male').length,
        'Female': patientsToPrint.filter(p => p.gender === 'Female').length,
        'Other': patientsToPrint.filter(p => p.gender === 'Other').length
    };
    
    content += `
        <h3>Summary Statistics</h3>
        <div class="info-grid">
            <div>
                <h4>Age Distribution</h4>
                <p>0-18 years: ${ageGroups['0-18']} patients</p>
                <p>19-35 years: ${ageGroups['19-35']} patients</p>
                <p>36-50 years: ${ageGroups['36-50']} patients</p>
                <p>51+ years: ${ageGroups['51+']} patients</p>
            </div>
            <div>
                <h4>Gender Distribution</h4>
                <p>Male: ${genderCount['Male']} patients</p>
                <p>Female: ${genderCount['Female']} patients</p>
                <p>Other: ${genderCount['Other']} patients</p>
            </div>
        </div>
    `;
    
    content += '</div>';
    
    // Brief patient list
    content += '<h3>Patient Summary</h3>';
    patientsToPrint.forEach((patient, index) => {
        content += `
            <div class="patient-record">
                <div class="patient-header">
                    <h4>${index + 1}. ${escapeHtml(patient.name)}</h4>
                    <div class="serial-number">S.No: ${index + 1}</div>
                </div>
                <div class="info-grid">
                    <div>
                        <div class="info-item"><span class="info-label">Visit Date:</span> ${formatDate(patient.visitDate)}</div>
                        <div class="info-item"><span class="info-label">Age/Gender:</span> ${patient.age}/${patient.gender}</div>
                        <div class="info-item"><span class="info-label">Contact:</span> ${patient.phone || 'Not provided'}</div>
                    </div>
                    <div>
                        <div class="info-item"><span class="info-label">Chief Complaint:</span> ${escapeHtml(truncateText(patient.chiefComplaint, 100))}</div>
                        <div class="info-item"><span class="info-label">Diagnosis:</span> ${patient.diagnosis ? escapeHtml(truncateText(patient.diagnosis, 100)) : 'Not recorded'}</div>
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
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Phone</th>
                    <th>Chief Complaint</th>
                    <th>Diagnosis</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    patientsToPrint.forEach((patient, index) => {
        content += `
            <tr>
                <td class="serial-col">${index + 1}</td>
                <td>${formatDate(patient.visitDate)}</td>
                <td>${escapeHtml(patient.name)}</td>
                <td>${patient.age}</td>
                <td>${patient.gender}</td>
                <td>${patient.phone || '-'}</td>
                <td>${escapeHtml(truncateText(patient.chiefComplaint, 50))}</td>
                <td>${patient.diagnosis ? escapeHtml(truncateText(patient.diagnosis, 50)) : '-'}</td>
            </tr>
        `;
    });
    
    content += `
            </tbody>
        </table>
    `;
    
    return content;
}


function createDownloadableReport(patientsToPrint, startDate, endDate, format, includeEmptyFields) {
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);
    
    // Generate the same content as desktop but as a downloadable file
    let content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dr. Shabeel Sulaiman's Logbook - Patient Report</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @page {
                    size: A4;
                    margin: 15mm;
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
                
                .header { 
                    text-align: center; 
                    border-bottom: 2px solid #007bff; 
                    padding-bottom: 15px; 
                    margin-bottom: 20px;
                }
                
                .header h1 { 
                    color: #007bff; 
                    margin-bottom: 8px; 
                    font-size: 18px;
                }
                
                .header p { 
                    margin: 3px 0; 
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
                    text-align: left;
                    vertical-align: top;
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
            <div class="header">
                <h1>Dr. Shabeel Sulaiman's Logbook</h1>
                <p><strong>Patient Report</strong></p>
                <p>Date Range: ${startDateFormatted} to ${endDateFormatted}</p>
                <p>Generated on: ${formatDate(new Date().toISOString())}</p>
                <p>Total Patients: ${patientsToPrint.length}</p>
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
                <h3>📱 Mobile Instructions</h3>
                <p><strong>To save as PDF:</strong></p>
                <ol>
                    <li>Click the "Print Report" button below</li>
                    <li>In the print dialog, choose "Save as PDF" or "Print to PDF"</li>
                    <li>Save the file to your device</li>
                </ol>
                <p><strong>Alternative:</strong> Use your browser's menu (⋮) → Print → Save as PDF</p>
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
    a.download = `patient-report-${startDate}-to-${endDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Show success message
    showSuccess('Report downloaded! Open the file and click "Print Report" to save as PDF.');
}

// Export functions for global access
window.viewPatient = viewPatient;
window.printPatientRecord = printPatientRecord;
window.loadPatients = loadPatients;
window.showPrintRangeModal = showPrintRangeModal;
window.printDateRange = printDateRange;
