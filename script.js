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
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterPatients(searchTerm);
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

// Export functions for global access
window.viewPatient = viewPatient;
window.printPatientRecord = printPatientRecord;
window.loadPatients = loadPatients;
