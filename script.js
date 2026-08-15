// Doctor's Logbook JavaScript - Dr. Shabeel Sulaiman

// Configuration
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx5his4SD9gBzUMm6b6jXHDMMT258tpRC58yfEPLCgVJ1ASe0olLMq67GlfEk7GQ6uT/exec',
    SHEET_NAME: 'ProcedureRecords_v2'
};

// Available Institutions
const INSTITUTIONS = [
    {
        id: 'yenepoya',
        name: 'Yenepoya Medical College',
        fullTitle: 'Yenepoya Medical College, Mangalore',
        short: 'YMC Mangalore'
    },
    {
        id: 'yenepoya_training',
        name: 'Yenepoya Training Period',
        fullTitle: 'Yenepoya Medical College - Training Period',
        short: 'YMC Training'
    },
    {
        id: 'thrissur',
        name: 'Thrissur Medical College',
        fullTitle: 'Govt Medical College Thrissur',
        short: 'GMC Thrissur'
    },
    {
        id: 'calicut',
        name: 'Calicut Medical College',
        fullTitle: 'Govt Medical College Calicut',
        short: 'GMC Calicut'
    }
];

const MINOR_PROCEDURES = [
    'Wound Dressing','Suture Removal','Incision & Drainage','Biopsy','Catheterization',
    'Lumbar Puncture','Thoracocentesis','Paracentesis','FNAC','Skin Biopsy',
    'Nail Avulsion','Debridement','Cauterization','Cryotherapy','Excision of Small Lesion'
];

const MAJOR_PROCEDURES = [
    'Appendectomy','Cholecystectomy','Hernia Repair','Laparotomy','Thyroidectomy',
    'Mastectomy','Hemicolectomy','Gastrectomy','Nephrectomy','Splenectomy',
    'Bowel Resection','Exploratory Laparotomy','Liver Resection','Pancreatectomy','Vascular Bypass',
    'Right RIRS','Left RIRS','Right URSL','Left URSL','TURP','Right Pyeloplasty','Left Pyeloplasty'
];

// Global State variables
let records = [];
let currentRecord = null;
let currentRoleFilter = 'all';
let currentViewMode = 'cards';
let activeView = 'home';

// Map already entered data and variants to the 4 standard institutions
function normalizeInstitution(rawHospital) {
    if (!rawHospital) return 'Yenepoya Medical College'; // Map old/empty data to Yenepoya Medical College
    const clean = rawHospital.toString().trim().toLowerCase();
    
    if (clean.includes('training')) {
        return 'Yenepoya Training Period';
    }
    if (clean.includes('thrissur') || clean.includes('gmc thrissur') || clean.includes('tmc')) {
        return 'Thrissur Medical College';
    }
    if (clean.includes('calicut') || clean.includes('kozhikode') || clean.includes('cmc') || clean.includes('gmc calicut')) {
        return 'Calicut Medical College';
    }
    // Default mapped to Yenepoya Medical College
    return 'Yenepoya Medical College';
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 1. Initialize Active Institution from storage (Default: Yenepoya Medical College)
    const savedInst = localStorage.getItem('logbookInstitution') || sessionStorage.getItem('logbookInstitution') || 'Yenepoya Medical College';
    applyInstitution(savedInst);

    // 2. Initialize Active Category from storage (Default: Major)
    const savedCat = localStorage.getItem('logbookCategory') || sessionStorage.getItem('logbookCategory') || 'Major';
    applyCategory(savedCat);

    // 3. Set today's date as default on the form
    const dateEl = document.getElementById('procedureDate');
    if (dateEl) dateEl.valueAsDate = new Date();

    // 4. Load database records
    loadRecords();

    // 5. Setup event listeners & search
    setupEventListeners();
    setupSearch();

    // 6. Start on Home View
    showView('home');
}

// View Routing & Navigation
function showView(viewName) {
    activeView = viewName;
    
    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.add('d-none');
    });

    // Show target section
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('d-none');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update bottom nav active state
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (viewName === 'add') {
        // Auto-fill hospital field on add form with currently selected institution
        const currentInst = sessionStorage.getItem('logbookInstitution') || 'Yenepoya Medical College';
        const hospInput = document.getElementById('hospital');
        if (hospInput && !document.getElementById('editingRecordId').value) {
            hospInput.value = currentInst;
        }
    } else if (viewName === 'records') {
        // Refresh records view
        displayRecords(records);
    } else if (viewName === 'home') {
        // Refresh home stats
        updateHeroStats();
    }
}

// Institution Management
function changeInstitution() {
    const modalEl = document.getElementById('institutionModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function selectInstitution(instName) {
    applyInstitution(instName);
    const modalEl = document.getElementById('institutionModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

function applyInstitution(instName) {
    localStorage.setItem('logbookInstitution', instName);
    sessionStorage.setItem('logbookInstitution', instName);

    // Update UI elements
    const navText = document.getElementById('navInstitutionText');
    if (navText) navText.textContent = instName;

    const heroText = document.getElementById('heroInstitutionText');
    if (heroText) heroText.textContent = instName;

    const actionText = document.getElementById('actionCardInstName');
    if (actionText) actionText.textContent = instName;

    const formText = document.getElementById('formInstitutionText');
    if (formText) formText.textContent = instName;

    // Update hospital input on add form if not in active edit mode
    const hospInput = document.getElementById('hospital');
    const editId = document.getElementById('editingRecordId');
    if (hospInput && (!editId || !editId.value)) {
        hospInput.value = instName;
    }

    // Update dropdown in records filter
    const recordsInstFilter = document.getElementById('recordsFilterInstitution');
    if (recordsInstFilter) {
        recordsInstFilter.value = instName;
    }

    // Update dropdown in print modal
    const printInstFilter = document.getElementById('printInstitution');
    if (printInstFilter) {
        printInstFilter.value = instName;
    }

    // Refresh displays
    updateHeroStats();
    displayRecords(records);
}

// Category Management
function changeCategory() {
    const modalEl = document.getElementById('categoryModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function selectCategory(category) {
    applyCategory(category);
    const modalEl = document.getElementById('categoryModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

function applyCategory(category) {
    localStorage.setItem('logbookCategory', category);
    sessionStorage.setItem('logbookCategory', category);

    // Update UI labels and badges
    document.querySelectorAll('.category-label').forEach(el => el.textContent = category + ' Procedure');

    const navCatText = document.getElementById('navCategoryText');
    if (navCatText) navCatText.textContent = category;

    const heroCatText = document.getElementById('heroCategoryText');
    if (heroCatText) heroCatText.textContent = category + ' Procedures';

    const actionCatText = document.getElementById('actionCardCatName');
    if (actionCatText) actionCatText.textContent = category + ' Procedures';

    const formCatText = document.getElementById('formCategoryText');
    if (formCatText) formCatText.textContent = category + ' Procedure';

    const catHidden = document.getElementById('category');
    if (catHidden) catHidden.value = category;

    // Update procedure datalist
    const list = document.getElementById('procedureList');
    if (list) {
        list.innerHTML = '';
        const procedures = category === 'Minor' ? MINOR_PROCEDURES : MAJOR_PROCEDURES;
        procedures.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            list.appendChild(opt);
        });
    }

    // Update records filter dropdown
    const recordsCatFilter = document.getElementById('recordsFilterCategory');
    if (recordsCatFilter) {
        recordsCatFilter.value = category;
    }

    // Update print modal dropdown
    const printCatFilter = document.getElementById('printCategory');
    if (printCatFilter) {
        printCatFilter.value = category;
    }

    // Clear search input and refresh
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    updateHeroStats();
    displayRecords(records);
}

// Records Filter Dropdowns
function filterRecordsByInstitution(inst) {
    displayRecords(records);
}

function filterRecordsByCategory(cat) {
    if (cat !== 'All') {
        applyCategory(cat);
    } else {
        displayRecords(records);
    }
}

function setupEventListeners() {
    const form = document.getElementById('procedureForm');
    if (form) form.addEventListener('submit', handleFormSubmit);
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        filterRecords(searchTerm);
    });
}

// Form Submission & Editing
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = getFormData();
    const editingId = document.getElementById('editingRecordId') ? document.getElementById('editingRecordId').value.trim() : '';
    const isEdit = !!editingId;
    
    try {
        showLoading(true, isEdit);
        
        let result;
        if (isEdit) {
            result = await updateRecordInGoogleSheets(formData, editingId);
        } else {
            result = await saveRecordToGoogleSheets(formData);
        }
        
        if (result.success) {
            if (isEdit) {
                const idx = records.findIndex(r => (r.id || r.timestamp) === editingId);
                if (idx !== -1) {
                    records[idx] = {
                        ...records[idx],
                        ...formData,
                        id: editingId
                    };
                }
                displayRecords(records);
                cancelEdit();
                showSuccess('Procedure record updated successfully!');
            } else {
                const newRecord = {
                    ...formData,
                    id: result.id || 'PAT_' + Date.now(),
                    timestamp: new Date().toISOString()
                };
                records.unshift(newRecord);
                displayRecords(records);
                
                // Reset form
                const form = document.getElementById('procedureForm');
                if (form) form.reset();
                const dateEl = document.getElementById('procedureDate');
                if (dateEl) dateEl.valueAsDate = new Date();
                
                // Re-apply active category and hospital
                const cat = sessionStorage.getItem('logbookCategory') || 'Major';
                document.getElementById('category').value = cat;
                const inst = sessionStorage.getItem('logbookInstitution') || 'Yenepoya Medical College';
                document.getElementById('hospital').value = inst;
                
                showSuccess('Procedure record saved successfully!');
            }
            
            updateHeroStats();
            
            // Background sync with database after short delay
            setTimeout(() => {
                loadRecords(true);
            }, 2500);
        } else {
            console.error('Operation failed with result:', result);
            const errorMsg = result.error || result.message || 'Unknown error occurred';
            showError(`Failed: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error saving/updating record:', error);
        showError('An error occurred while saving the procedure record.');
    } finally {
        showLoading(false, isEdit);
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
    return true;
}

function getFormData() {
    return {
        category: document.getElementById('category').value || sessionStorage.getItem('logbookCategory') || 'Major',
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
        hospital: document.getElementById('hospital').value.trim() || sessionStorage.getItem('logbookInstitution') || '',
        remarks: document.getElementById('remarks').value.trim()
    };
}

// Google Sheets API
async function saveRecordToGoogleSheets(recordData) {
    try {
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Google Sheets API Error:', error);
        return { success: false, message: error.message, error: error.message };
    }
}

async function updateRecordInGoogleSheets(recordData, id) {
    try {
        const params = new URLSearchParams({
            action: 'updateRecord',
            id: id,
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Google Sheets Update Error:', error);
        return { success: false, message: error.message, error: error.message };
    }
}

async function deleteRecordFromGoogleSheets(id) {
    try {
        const params = new URLSearchParams({
            action: 'deleteRecord',
            id: id
        });
        
        const response = await fetch(`${CONFIG.SCRIPT_URL}?${params.toString()}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Google Sheets Delete Error:', error);
        return { success: false, message: error.message, error: error.message };
    }
}

async function loadRecords(silent = false) {
    const tableBody = document.getElementById('recordsTableBody');
    const mobileContainer = document.getElementById('mobileRecordsContainer');
    const noRecords = document.getElementById('noRecords');
    
    try {
        if (!silent && tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center py-4 text-muted">
                        <div class="spinner-border spinner-border-sm text-info me-2" role="status"></div>
                        Loading records from database...
                    </td>
                </tr>
            `;
            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <div class="spinner-border spinner-border-sm text-info me-2" role="status"></div>
                        Loading records from database...
                    </div>
                `;
            }
            if (noRecords) noRecords.style.display = 'none';
        }
        
        if (CONFIG.SCRIPT_URL && CONFIG.SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getRecords`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && Array.isArray(result.data.records)) {
                    records = result.data.records;
                } else if (result.records && Array.isArray(result.records)) {
                    records = result.records;
                } else if (Array.isArray(result.data)) {
                    records = result.data;
                }
            }
        }
        
        updateHeroStats();
        displayRecords(records);
    } catch (error) {
        console.error('Error loading records:', error);
        if (!records) records = [];
        updateHeroStats();
        displayRecords(records);
    }
}

// Calculate & update Hero card counters on home dashboard
function updateHeroStats() {
    const currentInst = sessionStorage.getItem('logbookInstitution') || 'Yenepoya Medical College';
    const currentCat = (sessionStorage.getItem('logbookCategory') || 'Major').toLowerCase();
    
    let pool = records;
    if (currentCat) {
        pool = pool.filter(r => (r.category || '').toString().trim().toLowerCase() === currentCat);
    }
    if (currentInst && currentInst !== 'All') {
        pool = pool.filter(r => normalizeInstitution(r.hospital) === currentInst);
    }

    const total = pool.length;
    const ind = pool.filter(r => (r.independentlyPerformed || '').toString().toLowerCase() === 'yes').length;
    const sup = pool.filter(r => (r.performedUnderSupervision || '').toString().toLowerCase() === 'yes').length;
    const asst = pool.filter(r => (r.assisted || '').toString().toLowerCase() === 'yes').length;

    const elTotal = document.getElementById('heroTotalCount');
    const elInd = document.getElementById('heroIndCount');
    const elSup = document.getElementById('heroSupCount');
    const elAsst = document.getElementById('heroAsstCount');
    const elBadge = document.getElementById('badgeRecordCount');

    if (elTotal) elTotal.textContent = total;
    if (elInd) elInd.textContent = ind;
    if (elSup) elSup.textContent = sup;
    if (elAsst) elAsst.textContent = asst;
    if (elBadge) elBadge.textContent = `${total} Records`;
}

function switchViewMode(mode) {
    currentViewMode = mode;
    const cardsCont = document.getElementById('mobileRecordsContainer');
    const tableCont = document.getElementById('tableContainer');
    const btnCards = document.getElementById('btnViewCards');
    const btnTable = document.getElementById('btnViewTable');
    
    if (mode === 'table') {
        if (cardsCont) { cardsCont.classList.add('d-none'); cardsCont.classList.remove('d-block'); }
        if (tableCont) tableCont.classList.remove('d-none');
        if (btnTable) { btnTable.classList.add('active', 'btn-primary'); btnTable.classList.remove('btn-light'); }
        if (btnCards) { btnCards.classList.remove('active', 'btn-primary'); btnCards.classList.add('btn-light'); }
    } else {
        if (cardsCont) { cardsCont.classList.remove('d-none'); cardsCont.classList.add('d-block'); }
        if (tableCont) tableCont.classList.add('d-none');
        if (btnCards) { btnCards.classList.add('active', 'btn-primary'); btnCards.classList.remove('btn-light'); }
        if (btnTable) { btnTable.classList.remove('active', 'btn-primary'); btnTable.classList.add('btn-light'); }
    }
}

function filterByRole(role) {
    currentRoleFilter = role;
    
    const cards = ['statCardAll', 'statCardInd', 'statCardSup', 'statCardAsst'];
    cards.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('border-primary', 'shadow-md');
    });
    
    const activeMap = {
        'all': 'statCardAll',
        'independent': 'statCardInd',
        'supervised': 'statCardSup',
        'assisted': 'statCardAsst'
    };
    const activeCard = document.getElementById(activeMap[role]);
    if (activeCard) activeCard.classList.add('border-primary', 'shadow-md');
    
    const searchVal = (document.getElementById('searchInput') ? document.getElementById('searchInput').value : '').trim().toLowerCase();
    filterRecords(searchVal);
}

function displayRecords(recordsToDisplay) {
    const tableBody = document.getElementById('recordsTableBody');
    const mobileContainer = document.getElementById('mobileRecordsContainer');
    const noRecords = document.getElementById('noRecords');
    
    let list = Array.isArray(recordsToDisplay) ? [...recordsToDisplay] : [...records];
    
    // Filter by Category from filter dropdown or session
    const filterCatEl = document.getElementById('recordsFilterCategory');
    const selectedCategory = filterCatEl ? filterCatEl.value : (sessionStorage.getItem('logbookCategory') || 'Major');
    if (selectedCategory && selectedCategory !== 'All') {
        list = list.filter(r => (r.category || '').toString().trim().toLowerCase() === selectedCategory.toLowerCase());
    }
    
    // Filter by Institution from filter dropdown
    const filterInstEl = document.getElementById('recordsFilterInstitution');
    const selectedInstitution = filterInstEl ? filterInstEl.value : (sessionStorage.getItem('logbookInstitution') || 'Yenepoya Medical College');
    if (selectedInstitution && selectedInstitution !== 'All') {
        list = list.filter(r => normalizeInstitution(r.hospital) === selectedInstitution);
    }
    
    // Calculate category stats
    const totalCount = list.length;
    const indCount = list.filter(r => (r.independentlyPerformed || '').toString().toLowerCase() === 'yes').length;
    const supCount = list.filter(r => (r.performedUnderSupervision || '').toString().toLowerCase() === 'yes').length;
    const asstCount = list.filter(r => (r.assisted || '').toString().toLowerCase() === 'yes').length;
    
    const statTotalEl = document.getElementById('statTotalCount');
    const statIndEl = document.getElementById('statIndCount');
    const statSupEl = document.getElementById('statSupCount');
    const statAsstEl = document.getElementById('statAsstCount');
    
    if (statTotalEl) statTotalEl.textContent = totalCount;
    if (statIndEl) statIndEl.textContent = indCount;
    if (statSupEl) statSupEl.textContent = supCount;
    if (statAsstEl) statAsstEl.textContent = asstCount;
    
    // Apply role filter if active
    if (currentRoleFilter === 'independent') {
        list = list.filter(r => (r.independentlyPerformed || '').toString().toLowerCase() === 'yes');
    } else if (currentRoleFilter === 'supervised') {
        list = list.filter(r => (r.performedUnderSupervision || '').toString().toLowerCase() === 'yes');
    } else if (currentRoleFilter === 'assisted') {
        list = list.filter(r => (r.assisted || '').toString().toLowerCase() === 'yes');
    }
    
    // Update badge counter in records header
    const countBadge = document.getElementById('recordCountBadge');
    if (countBadge) {
        countBadge.textContent = `${list.length} record${list.length === 1 ? '' : 's'}`;
    }
    
    if (list.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';
        if (noRecords) {
            noRecords.style.display = 'block';
            const msg = noRecords.querySelector('p');
            if (msg) {
                msg.textContent = `No ${selectedCategory.toLowerCase()} procedure records found for ${selectedInstitution}`;
            }
        }
        return;
    }
    
    if (noRecords) noRecords.style.display = 'none';
    
    // Sort records newest first by date or timestamp
    list.sort((a, b) => {
        const dateA = new Date(a.procedureDate || a.timestamp || 0).getTime();
        const dateB = new Date(b.procedureDate || b.timestamp || 0).getTime();
        return dateB - dateA;
    });
    
    // 1. Render Desktop Table Rows
    if (tableBody) {
        tableBody.innerHTML = list.map(record => {
            const obs = (record.observed || '').toString().toLowerCase() === 'yes';
            const asst = (record.assisted || '').toString().toLowerCase() === 'yes';
            const sup = (record.performedUnderSupervision || '').toString().toLowerCase() === 'yes';
            const ind = (record.independentlyPerformed || '').toString().toLowerCase() === 'yes';
            const recId = escapeHtml(record.id || record.timestamp || '');
            
            return `
                <tr>
                    <td class="text-nowrap">${formatDate(record.procedureDate || record.visitDate)}</td>
                    <td>
                        <strong class="text-dark">${escapeHtml(record.name || 'Unnamed')}</strong>
                        ${isNewRecord(record.procedureDate || record.visitDate) ? '<span class="badge bg-success ms-1" style="font-size: 0.65rem;">New</span>' : ''}
                    </td>
                    <td>${record.age !== undefined && record.age !== null ? record.age : '-'}</td>
                    <td>${record.sex || record.gender || '-'}</td>
                    <td><span class="badge bg-light text-dark border">${escapeHtml(record.ipNumber || '-')}</span></td>
                    <td>${truncateText(escapeHtml(record.diagnosis || '-'), 35)}</td>
                    <td><span class="fw-semibold text-primary">${truncateText(escapeHtml(record.procedureDone || record.chiefComplaint || '-'), 35)}</span></td>
                    <td class="text-center">${obs ? '<i class="bi bi-check-circle-fill text-info" title="Observed"></i>' : '-'}</td>
                    <td class="text-center">${asst ? '<i class="bi bi-check-circle-fill text-warning" title="Assisted"></i>' : '-'}</td>
                    <td class="text-center">${sup ? '<i class="bi bi-check-circle-fill text-primary" title="Under Supervision"></i>' : '-'}</td>
                    <td class="text-center">${ind ? '<i class="bi bi-check-circle-fill text-success" title="Independently Performed"></i>' : '-'}</td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" title="View Details" onclick="viewRecord('${recId}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning" title="Edit Record" onclick="editRecord('${recId}')">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-outline-secondary" title="Print" onclick="printRecord('${recId}')">
                                <i class="bi bi-printer"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // 2. Render Mobile Cards Feed
    if (mobileContainer) {
        mobileContainer.innerHTML = list.map(record => {
            const obs = (record.observed || '').toString().toLowerCase() === 'yes';
            const asst = (record.assisted || '').toString().toLowerCase() === 'yes';
            const sup = (record.performedUnderSupervision || '').toString().toLowerCase() === 'yes';
            const ind = (record.independentlyPerformed || '').toString().toLowerCase() === 'yes';
            const recId = escapeHtml(record.id || record.timestamp || '');
            const mappedInst = normalizeInstitution(record.hospital);
            
            const ageSex = [
                record.age ? `${record.age} yrs` : '',
                record.sex || record.gender || ''
            ].filter(Boolean).join(' • ');

            return `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <div>
                            <div class="mobile-patient-name">
                                ${escapeHtml(record.name || 'Unnamed')}
                                ${isNewRecord(record.procedureDate || record.visitDate) ? '<span class="badge bg-success ms-1" style="font-size: 0.65rem;">New</span>' : ''}
                            </div>
                            <div class="text-muted small">${ageSex || 'Patient'}</div>
                        </div>
                        <div class="mobile-date-badge">
                            <i class="bi bi-calendar3 me-1"></i>${formatDate(record.procedureDate || record.visitDate)}
                        </div>
                    </div>
                    
                    <div class="mobile-procedure-title">
                        <i class="bi bi-activity text-primary"></i>
                        <span>${escapeHtml(record.procedureDone || record.chiefComplaint || '-')}</span>
                    </div>
                    
                    <div class="mobile-diagnosis">
                        <strong class="d-block text-secondary" style="font-size: 0.75rem;">DIAGNOSIS:</strong>
                        ${escapeHtml(record.diagnosis || 'Not recorded')}
                    </div>
                    
                    <div class="d-flex flex-wrap gap-1 mb-2">
                        ${ind ? '<span class="role-chip role-chip-ind"><i class="bi bi-person-check-fill"></i> Independent</span>' : ''}
                        ${sup ? '<span class="role-chip role-chip-sup"><i class="bi bi-person-badge-fill"></i> Supervised</span>' : ''}
                        ${asst ? '<span class="role-chip role-chip-asst"><i class="bi bi-hand-thumbs-up-fill"></i> Assisted</span>' : ''}
                        ${obs ? '<span class="role-chip role-chip-obs"><i class="bi bi-eye-fill"></i> Observed</span>' : ''}
                    </div>
                    
                    <div class="mobile-card-footer">
                        <div class="mobile-meta-info">
                            <span class="badge bg-light text-dark border me-1">IP: ${escapeHtml(record.ipNumber || 'N/A')}</span>
                            <span><i class="bi bi-hospital me-1 text-primary"></i>${escapeHtml(mappedInst)}</span>
                        </div>
                        
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary px-2 py-1" onclick="viewRecord('${recId}')" title="View Details">
                                <i class="bi bi-eye me-1"></i>View
                            </button>
                            <button class="btn btn-sm btn-outline-warning px-2 py-1" onclick="editRecord('${recId}')" title="Edit">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="printRecord('${recId}')" title="Print">
                                <i class="bi bi-printer"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Ensure correct view mode is visible
    switchViewMode(currentViewMode);
}

function filterRecords(searchTerm) {
    if (!searchTerm) {
        displayRecords(records);
        return;
    }
    
    const filtered = records.filter(record => {
        const mappedInst = normalizeInstitution(record.hospital);
        return (record.name || '').toLowerCase().includes(searchTerm) ||
               (record.ipNumber || '').toLowerCase().includes(searchTerm) ||
               (record.diagnosis || '').toLowerCase().includes(searchTerm) ||
               mappedInst.toLowerCase().includes(searchTerm) ||
               (record.remarks || '').toLowerCase().includes(searchTerm) ||
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
    const mappedInst = normalizeInstitution(record.hospital);
    
    modalBody.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <div class="p-3 bg-light rounded-3 border">
                    <h6 class="text-primary fw-bold mb-3"><i class="bi bi-person-fill me-2"></i>Patient Information</h6>
                    <div class="d-flex justify-content-between mb-2 pb-1 border-bottom">
                        <span class="text-muted">Name:</span>
                        <strong class="text-dark">${escapeHtml(record.name || '-')}</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-2 pb-1 border-bottom">
                        <span class="text-muted">Age / Sex:</span>
                        <span>${record.age ? record.age + ' yrs' : '-'} / ${record.sex || record.gender || '-'}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="text-muted">IP Number:</span>
                        <span class="badge bg-primary">${escapeHtml(record.ipNumber || 'Not provided')}</span>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="p-3 bg-light rounded-3 border">
                    <h6 class="text-primary fw-bold mb-3"><i class="bi bi-activity me-2"></i>Procedure Information</h6>
                    <div class="d-flex justify-content-between mb-2 pb-1 border-bottom">
                        <span class="text-muted">Category:</span>
                        <span class="badge bg-info">${cat}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 pb-1 border-bottom">
                        <span class="text-muted">Procedure Date:</span>
                        <strong>${formatDate(record.procedureDate || record.visitDate)}</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="text-muted">Procedure:</span>
                        <strong class="text-primary">${escapeHtml(record.procedureDone || record.chiefComplaint || '-')}</strong>
                    </div>
                </div>
            </div>
        </div>
        <hr class="my-3">
        <div class="row">
            <div class="col-12">
                <h6 class="text-primary fw-bold mb-2"><i class="bi bi-clipboard2-pulse me-2"></i>Diagnosis</h6>
                <div class="p-2 px-3 bg-light border-start border-primary border-3 rounded mb-3">
                    ${escapeHtml(record.diagnosis || 'Not recorded')}
                </div>
                
                <h6 class="text-primary fw-bold mb-2"><i class="bi bi-award me-2"></i>Performance Status</h6>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    ${record.independentlyPerformed === 'Yes' ? '<span class="role-chip role-chip-ind fs-6 px-3 py-2"><i class="bi bi-check-circle-fill"></i> Independently Performed</span>' : ''}
                    ${record.performedUnderSupervision === 'Yes' ? '<span class="role-chip role-chip-sup fs-6 px-3 py-2"><i class="bi bi-person-check-fill"></i> Under Supervision</span>' : ''}
                    ${record.assisted === 'Yes' ? '<span class="role-chip role-chip-asst fs-6 px-3 py-2"><i class="bi bi-hand-thumbs-up-fill"></i> Assisted</span>' : ''}
                    ${record.observed === 'Yes' ? '<span class="role-chip role-chip-obs fs-6 px-3 py-2"><i class="bi bi-eye-fill"></i> Observed</span>' : ''}
                </div>
                
                <div class="row g-2">
                    <div class="col-md-6">
                        <p class="mb-1 text-muted small">Hospital / Institution:</p>
                        <p class="fw-semibold text-primary"><i class="bi bi-hospital me-1"></i>${escapeHtml(mappedInst)}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1 text-muted small">Supervising Consultant:</p>
                        <p class="fw-semibold">${escapeHtml(record.supervisor || 'Not recorded')}</p>
                    </div>
                </div>
                
                <p class="mb-1 text-muted small">Remarks / Notes:</p>
                <p class="p-2 bg-light rounded">${escapeHtml(record.remarks || 'No additional remarks')}</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('procedureModal'));
    modal.show();
}

function editRecordFromModal() {
    if (!currentRecord) return;
    const modalEl = document.getElementById('procedureModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    
    editRecord(currentRecord.id || currentRecord.timestamp);
}

function editRecord(recordId) {
    const record = records.find(r => (r.id || r.timestamp) === recordId);
    if (!record) {
        showError('Record not found.');
        return;
    }
    
    showView('add');
    
    // Set editing ID in hidden field
    const editIdInput = document.getElementById('editingRecordId');
    if (editIdInput) editIdInput.value = record.id || record.timestamp;
    
    // Show edit banner with patient name & ID
    const editBanner = document.getElementById('editBanner');
    if (editBanner) {
        editBanner.classList.remove('d-none');
        const nameSpan = document.getElementById('editBannerPatientName');
        if (nameSpan) nameSpan.textContent = record.name || 'Unnamed';
        const idSpan = document.getElementById('editBannerId');
        if (idSpan) idSpan.textContent = record.id || '';
    }
    
    // Update button states
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const submitBtnIcon = document.getElementById('submitBtnIcon');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (submitBtn) {
        submitBtn.className = 'btn btn-warning px-4 py-2';
    }
    if (submitBtnText) submitBtnText.textContent = 'Update Procedure';
    if (submitBtnIcon) submitBtnIcon.className = 'bi bi-check2-circle me-1';
    if (cancelEditBtn) cancelEditBtn.classList.remove('d-none');
    if (resetBtn) resetBtn.classList.add('d-none');
    
    if (record.category) {
        const catInput = document.getElementById('category');
        if (catInput) catInput.value = record.category;
    }
    
    // Populate form fields
    document.getElementById('patientName').value = record.name || '';
    document.getElementById('patientAge').value = record.age !== undefined && record.age !== null ? record.age : '';
    document.getElementById('patientSex').value = record.sex || record.gender || '';
    document.getElementById('ipNumber').value = record.ipNumber || '';
    
    if (record.procedureDate || record.visitDate) {
        const rawDate = record.procedureDate || record.visitDate;
        let dateVal = '';
        if (rawDate.includes('T')) {
            dateVal = rawDate.split('T')[0];
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            dateVal = rawDate;
        } else {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                dateVal = d.toISOString().split('T')[0];
            }
        }
        if (dateVal) {
            document.getElementById('procedureDate').value = dateVal;
        }
    }
    
    document.getElementById('diagnosis').value = record.diagnosis || '';
    document.getElementById('procedureDone').value = record.procedureDone || record.chiefComplaint || '';
    
    document.getElementById('observed').checked = (record.observed || '').toString().toLowerCase() === 'yes';
    document.getElementById('assisted').checked = (record.assisted || '').toString().toLowerCase() === 'yes';
    document.getElementById('performedUnderSupervision').checked = (record.performedUnderSupervision || '').toString().toLowerCase() === 'yes';
    document.getElementById('independentlyPerformed').checked = (record.independentlyPerformed || '').toString().toLowerCase() === 'yes';
    
    // Sync tile styles
    toggleTileStyle('observed');
    toggleTileStyle('assisted');
    toggleTileStyle('performedUnderSupervision');
    toggleTileStyle('independentlyPerformed');
    
    document.getElementById('hospital').value = normalizeInstitution(record.hospital);
    document.getElementById('remarks').value = record.remarks || '';
    
    document.getElementById('patientName').focus();
}

function cancelEdit() {
    const editIdInput = document.getElementById('editingRecordId');
    if (editIdInput) editIdInput.value = '';
    
    const editBanner = document.getElementById('editBanner');
    if (editBanner) editBanner.classList.add('d-none');
    
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const submitBtnIcon = document.getElementById('submitBtnIcon');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (submitBtn) submitBtn.className = 'btn btn-success px-4 py-2';
    if (submitBtnText) submitBtnText.textContent = 'Save Procedure';
    if (submitBtnIcon) submitBtnIcon.className = 'bi bi-save me-1';
    if (cancelEditBtn) cancelEditBtn.classList.add('d-none');
    if (resetBtn) resetBtn.classList.remove('d-none');
    
    const form = document.getElementById('procedureForm');
    if (form) form.reset();
    const dateEl = document.getElementById('procedureDate');
    if (dateEl) dateEl.valueAsDate = new Date();
    
    const cat = sessionStorage.getItem('logbookCategory') || 'Major';
    if (cat) document.getElementById('category').value = cat;
    
    const inst = sessionStorage.getItem('logbookInstitution') || 'Yenepoya Medical College';
    if (inst) document.getElementById('hospital').value = inst;
    
    toggleTileStyle('observed');
    toggleTileStyle('assisted');
    toggleTileStyle('performedUnderSupervision');
    toggleTileStyle('independentlyPerformed');
}

function deleteRecordFromModal() {
    if (!currentRecord) return;
    deleteRecord(currentRecord.id || currentRecord.timestamp);
}

async function deleteRecord(recordId) {
    const record = records.find(r => (r.id || r.timestamp) === recordId);
    const name = record ? (record.name || 'this record') : 'this record';
    const proc = record && record.procedureDone ? ` (${record.procedureDone})` : '';
    
    const confirmed = window.confirm(`Are you sure you want to permanently delete the procedure record for "${name}"${proc}?\n\nThis action cannot be undone.`);
    if (!confirmed) return;
    
    const modalEl = document.getElementById('procedureModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
    
    // Optimistic UI delete
    records = records.filter(r => (r.id || r.timestamp) !== recordId);
    displayRecords(records);
    updateHeroStats();
    showSuccess(`Procedure record for "${name}" was deleted successfully.`);
    
    const editIdInput = document.getElementById('editingRecordId');
    if (editIdInput && editIdInput.value === recordId) {
        cancelEdit();
    }
    
    const result = await deleteRecordFromGoogleSheets(recordId);
    if (!result.success) {
        console.warn('Backend delete warning:', result.message);
    }
}

function toggleTileStyle(id) {
    const cb = document.getElementById(id);
    if (!cb) return;
    const tileMap = {
        'observed': 'tileObserved',
        'assisted': 'tileAssisted',
        'performedUnderSupervision': 'tileSupervised',
        'independentlyPerformed': 'tileIndependent'
    };
    const classMap = {
        'observed': 'active-observed',
        'assisted': 'active-assisted',
        'performedUnderSupervision': 'active-supervised',
        'independentlyPerformed': 'active-independent'
    };
    const tile = document.getElementById(tileMap[id]);
    if (tile) {
        if (cb.checked) {
            tile.classList.add(classMap[id]);
        } else {
            tile.classList.remove(classMap[id]);
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Not recorded';
    
    let year, month, day;
    if (typeof dateString === 'string') {
        const cleanDate = dateString.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        }
    }
    
    let date;
    if (year !== undefined && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
        date = new Date(year, month, day);
    } else {
        date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
        return dateString;
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = String(date.getDate()).padStart(2, '0');
    const m = monthNames[date.getMonth()];
    const y = date.getFullYear();
    
    return `${d}-${m}-${y}`;
}

function isNewRecord(dateString) {
    if (!dateString) return false;
    const visit = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - visit);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('successModal'));
    modal.show();
}

function showError(message) {
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

function showLoading(show, isEdit = false) {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    if (show) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${isEdit ? 'Updating...' : 'Saving...'}`;
    } else {
        submitBtn.disabled = false;
        if (isEdit) {
            submitBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Update Procedure';
        } else {
            submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>Save Procedure';
        }
    }
}

// ==========================================
// PRINT & PDF REPORT GENERATOR
// ==========================================

function showPrintRangeModal() {
    const modal = new bootstrap.Modal(document.getElementById('printRangeModal'));
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('printEndDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('printStartDate').value = startDate.toISOString().split('T')[0];
    
    // Set category dropdown to current session category
    const currentCategory = sessionStorage.getItem('logbookCategory') || 'Major';
    const catSelect = document.getElementById('printCategory');
    if (catSelect && currentCategory) {
        catSelect.value = currentCategory;
    }
    
    // Set institution dropdown to current session institution
    const currentInst = sessionStorage.getItem('logbookInstitution') || 'Yenepoya Medical College';
    const instSelect = document.getElementById('printInstitution');
    if (instSelect && currentInst) {
        instSelect.value = currentInst;
    }
    
    modal.show();
}

function printDateRange() {
    const startDate = document.getElementById('printStartDate').value;
    const endDate = document.getElementById('printEndDate').value;
    const format = document.getElementById('printFormat').value;
    const includeEmptyFields = document.getElementById('includeEmptyFields').checked;
    const selectedCategory = document.getElementById('printCategory').value;
    const selectedInstitution = document.getElementById('printInstitution').value;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }
    
    // Filter records by date range, selected category, and selected institution
    const filteredRecords = records.filter(record => {
        const visitDate = new Date(record.procedureDate || record.visitDate);
        const inRange = visitDate >= new Date(startDate) && visitDate <= new Date(endDate + 'T23:59:59');
        const matchesCategory = selectedCategory === 'All' || record.category === selectedCategory;
        const matchesInst = selectedInstitution === 'All' || normalizeInstitution(record.hospital) === selectedInstitution;
        return inRange && matchesCategory && matchesInst;
    });
    
    if (filteredRecords.length === 0) {
        const catLabel = selectedCategory === 'All' ? '' : selectedCategory.toLowerCase() + ' ';
        showError(`No ${catLabel}records found in the selected date range for ${selectedInstitution}`);
        return;
    }
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('printRangeModal')).hide();
    
    // Generate print content
    generatePrintReport(filteredRecords, startDate, endDate, format, includeEmptyFields, selectedCategory, selectedInstitution);
}

// ==========================================
// INSTITUTION-SPECIFIC PRINT & PDF HEADERS
// ==========================================

function getInstitutionHeaderHtml(selectedInstitution, selectedCategory, recordCountText, dateRangeText) {
    const isYMC = selectedInstitution === 'Yenepoya Medical College';
    const isYMCTraining = selectedInstitution === 'Yenepoya Training Period';
    const isThrissur = selectedInstitution === 'Thrissur Medical College';
    const isCalicut = selectedInstitution === 'Calicut Medical College';
    
    // Logo markup for Yenepoya institutions
    const logoImg = `<img src="logo.jpg" alt="Yenepoya University Logo" style="height: 75px; max-width: 80px; object-fit: contain;" onerror="this.style.display='none'">`;
    
    if (isYMC) {
        return `
            <div class="report-header" style="border-bottom: 2.5px solid #1e40af; padding-bottom: 12px; margin-bottom: 18px;">
                <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 6px;">
                    <tr>
                        <td style="width: 85px; vertical-align: middle; text-align: left; border: none; padding: 0;">
                            ${logoImg}
                        </td>
                        <td style="vertical-align: middle; text-align: center; border: none; padding: 0 10px;">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.03em; text-transform: uppercase;">UROLOGY CLINICAL & OPERATIVE LOGBOOK</h1>
                            <h2 style="margin: 3px 0 0 0; font-size: 13px; font-weight: 700; color: #0284c7; text-transform: uppercase;">DEPARTMENT OF NEPHRO-UROLOGY</h2>
                            <h2 style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #111827; text-transform: uppercase;">YENEPOYA MEDICAL COLLEGE</h2>
                            <h3 style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">MANGALURU, INDIA</h3>
                        </td>
                        <td style="width: 85px; border: none; padding: 0;"></td>
                    </tr>
                </table>
                
                <div style="margin-top: 8px; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <div>
                        <strong>Name:</strong> Dr. Shabeel Sulaiman &nbsp;|&nbsp; <strong>Designation:</strong> Consultant Urologist
                    </div>
                    <div style="color: #475569;">
                        <strong>Category:</strong> ${selectedCategory} Procedures &nbsp;|&nbsp; <strong>Total:</strong> ${recordCountText}
                    </div>
                </div>
                ${dateRangeText ? `<div style="text-align: center; margin-top: 4px; font-size: 10.5px; color: #64748b;"><strong>Period:</strong> ${dateRangeText}</div>` : ''}
            </div>
        `;
    }
    
    if (isYMCTraining) {
        return `
            <div class="report-header" style="border-bottom: 2.5px solid #1e40af; padding-bottom: 12px; margin-bottom: 18px;">
                <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 6px;">
                    <tr>
                        <td style="width: 85px; vertical-align: middle; text-align: left; border: none; padding: 0;">
                            ${logoImg}
                        </td>
                        <td style="vertical-align: middle; text-align: center; border: none; padding: 0 10px;">
                            <h1 style="margin: 0; font-size: 15px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.02em; text-transform: uppercase;">M.CH. UROLOGY CLINICAL, OPERATIVE & PROCEDURAL LOGBOOK</h1>
                            <h2 style="margin: 3px 0 0 0; font-size: 13px; font-weight: 700; color: #0284c7; text-transform: uppercase;">DEPARTMENT OF NEPHRO UROLOGY</h2>
                            <h2 style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #111827; text-transform: uppercase;">YENEPOYA MEDICAL COLLEGE</h2>
                            <h3 style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">MANGALURU, INDIA</h3>
                        </td>
                        <td style="width: 85px; border: none; padding: 0;"></td>
                    </tr>
                </table>
                
                <div style="margin-top: 8px; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; line-height: 1.5;">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span><strong>Name:</strong> Dr. Shabeel Sulaiman, MBBS, MS (General Surgery)</span>
                        <span><strong>Designation:</strong> M.Ch. Urology Resident</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; margin-top: 2px; color: #334155;">
                        <span><strong>Training Programme:</strong> Master of Chirurgiae (M.Ch.) in Urology</span>
                        <span><strong>Training Institution:</strong> Yenepoya Medical College, Mangaluru, India</span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 10.5px; color: #64748b; padding: 0 4px;">
                    <span><strong>Category:</strong> ${selectedCategory} Procedures (${recordCountText} records)</span>
                    ${dateRangeText ? `<span><strong>Period:</strong> ${dateRangeText}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    if (isThrissur) {
        return `
            <div class="report-header" style="border-bottom: 2.5px solid #059669; padding-bottom: 12px; margin-bottom: 18px; text-align: center;">
                <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #065f46; letter-spacing: 0.02em; text-transform: uppercase;">LOGBOOK OF DR. SHABEEL SULAIMAN</h1>
                <h2 style="margin: 3px 0 0 0; font-size: 13.5px; font-weight: 700; color: #059669; text-transform: uppercase;">DEPARTMENT OF UROLOGY</h2>
                <h2 style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #111827; text-transform: uppercase;">GOVT. MEDICAL COLLEGE, THRISSUR</h2>
                
                <div style="margin-top: 8px; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <div>
                        <strong>Name:</strong> Dr. Shabeel Sulaiman &nbsp;|&nbsp; <strong>Designation:</strong> Assistant Professor of Urology
                    </div>
                    <div style="color: #475569;">
                        <strong>Category:</strong> ${selectedCategory} Procedures &nbsp;|&nbsp; <strong>Total:</strong> ${recordCountText}
                    </div>
                </div>
                ${dateRangeText ? `<div style="text-align: center; margin-top: 4px; font-size: 10.5px; color: #64748b;"><strong>Period:</strong> ${dateRangeText}</div>` : ''}
            </div>
        `;
    }
    
    if (isCalicut) {
        return `
            <div class="report-header" style="border-bottom: 2.5px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; text-align: center;">
                <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #0369a1; letter-spacing: 0.02em; text-transform: uppercase;">LOGBOOK OF DR. SHABEEL SULAIMAN</h1>
                <h2 style="margin: 3px 0 0 0; font-size: 13.5px; font-weight: 700; color: #0284c7; text-transform: uppercase;">DEPARTMENT OF UROLOGY</h2>
                <h2 style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #111827; text-transform: uppercase;">GOVT. MEDICAL COLLEGE, CALICUT (KOZHIKODE)</h2>
                
                <div style="margin-top: 8px; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <div>
                        <strong>Name:</strong> Dr. Shabeel Sulaiman &nbsp;|&nbsp; <strong>Designation:</strong> Assistant Professor of Urology
                    </div>
                    <div style="color: #475569;">
                        <strong>Category:</strong> ${selectedCategory} Procedures &nbsp;|&nbsp; <strong>Total:</strong> ${recordCountText}
                    </div>
                </div>
                ${dateRangeText ? `<div style="text-align: center; margin-top: 4px; font-size: 10.5px; color: #64748b;"><strong>Period:</strong> ${dateRangeText}</div>` : ''}
            </div>
        `;
    }
    
    // Default / All Institutions
    return `
        <div class="report-header" style="border-bottom: 2.5px solid #1e40af; padding-bottom: 12px; margin-bottom: 18px; text-align: center;">
            <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.02em; text-transform: uppercase;">UROLOGY CLINICAL & OPERATIVE LOGBOOK</h1>
            <h2 style="margin: 3px 0 0 0; font-size: 13.5px; font-weight: 700; color: #0284c7; text-transform: uppercase;">DEPARTMENT OF UROLOGY</h2>
            <h3 style="margin: 2px 0 0 0; font-size: 13px; font-weight: 700; color: #111827; text-transform: uppercase;">LOGBOOK OF DR. SHABEEL SULAIMAN</h3>
            
            <div style="margin-top: 8px; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                <div>
                    <strong>Name:</strong> Dr. Shabeel Sulaiman &nbsp;|&nbsp; <strong>Designation:</strong> Consultant Urologist
                </div>
                <div style="color: #475569;">
                    <strong>Category:</strong> ${selectedCategory} Procedures &nbsp;|&nbsp; <strong>Total:</strong> ${recordCountText}
                </div>
            </div>
            ${dateRangeText ? `<div style="text-align: center; margin-top: 4px; font-size: 10.5px; color: #64748b;"><strong>Period:</strong> ${dateRangeText}</div>` : ''}
        </div>
    `;
}

function generatePrintReport(patientsToPrint, startDate, endDate, format, includeEmptyFields, selectedCategory, selectedInstitution = 'All') {
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);
    const dateRangeText = `${startDateFormatted} to ${endDateFormatted}`;
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        createDownloadableReport(patientsToPrint, startDate, endDate, format, includeEmptyFields, selectedCategory, selectedInstitution);
        return;
    }
    
    const printWindow = window.open('', '_blank');
    
    let content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Procedure Report - Dr. Shabeel Sulaiman</title>
            <style>
                @page {
                    size: A4;
                    margin: 12mm 15mm;
                }
                body { 
                    font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                    margin: 0; 
                    padding: 15px;
                    color: #1e293b;
                    font-size: 11.5px;
                    line-height: 1.45;
                    width: 210mm;
                    box-sizing: border-box;
                }
                .compact-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 15px;
                    font-size: 11px;
                }
                .compact-table th, .compact-table td { 
                    border: 1px solid #cbd5e1; 
                    padding: 6px 8px; 
                    text-align: center;
                    vertical-align: middle;
                }
                .compact-table th { 
                    background: #f1f5f9; 
                    font-weight: 700;
                    color: #334155;
                    font-size: 10.5px;
                    text-transform: uppercase;
                }
                .patient-record { 
                    margin-bottom: 16px; 
                    page-break-inside: avoid; 
                    border: 1px solid #cbd5e1; 
                    border-radius: 6px; 
                    padding: 12px;
                    background: #ffffff;
                }
                .patient-header { 
                    background: #1e40af; 
                    color: white; 
                    padding: 7px 12px; 
                    margin: -12px -12px 10px -12px; 
                    border-radius: 5px 5px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .patient-header h3 { margin: 0; font-size: 13px; font-weight: 700; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
                @media print { 
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 0; }
                }
            </style>
        </head>
        <body>
            ${getInstitutionHeaderHtml(selectedInstitution, selectedCategory, `${patientsToPrint.length} Records`, dateRangeText)}
    `;
    
    if (format === 'summary') {
        content += generateSummaryReport(patientsToPrint, includeEmptyFields);
    } else if (format === 'compact') {
        content += generateCompactReport(patientsToPrint);
    } else {
        content += generateDetailedReport(patientsToPrint, includeEmptyFields);
    }
    
    content += `
        <div class="no-print" style="margin-top: 25px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 24px; background: #1e40af; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">
                🖨️ Print / Save as PDF
            </button>
        </div>
        </body></html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
}

function createDownloadableReport(patientsToPrint, startDate, endDate, format, includeEmptyFields, selectedCategory, selectedInstitution = 'All') {
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);
    const dateRangeText = `${startDateFormatted} to ${endDateFormatted}`;
    
    let content = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Procedure Report - Dr. Shabeel Sulaiman</title>
            <style>
                body { font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 15px; color: #1e293b; font-size: 12px; line-height: 1.45; }
                .compact-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
                .compact-table th, .compact-table td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: center; }
                .compact-table th { background: #f1f5f9; font-weight: bold; color: #334155; }
                .patient-record { margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; }
                .patient-header { background: #1e40af; color: white; padding: 6px 10px; margin: -12px -12px 10px -12px; border-radius: 5px 5px 0 0; }
                .print-btn { background: #1e40af; color: white; padding: 12px; border: none; border-radius: 6px; font-size: 15px; font-weight: bold; width: 100%; margin: 15px 0; cursor: pointer; }
                @media print { .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            ${getInstitutionHeaderHtml(selectedInstitution, selectedCategory, `${patientsToPrint.length} Records`, dateRangeText)}
    `;
    
    if (format === 'summary') {
        content += generateSummaryReport(patientsToPrint, includeEmptyFields);
    } else if (format === 'compact') {
        content += generateCompactReport(patientsToPrint);
    } else {
        content += generateDetailedReport(patientsToPrint, includeEmptyFields);
    }
    
    content += `
            <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </body>
        </html>
    `;
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procedure-report-${startDate}-to-${endDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Report generated and downloaded! Open the file to view or save as PDF.');
}

function printRecord(recordId) {
    let record = null;
    if (recordId) {
        record = records.find(r => (r.id || r.timestamp) === recordId);
    }
    if (!record && currentRecord) {
        record = currentRecord;
    }
    if (!record) {
        showError('No record selected for printing.');
        return;
    }

    const mappedInst = normalizeInstitution(record.hospital);
    const cat = record.category || sessionStorage.getItem('logbookCategory') || 'Major';
    const visitDateFormatted = formatDate(record.procedureDate || record.visitDate);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Procedure Record - ${escapeHtml(record.name || 'Patient')}</title>
            <style>
                @page { size: A4; margin: 15mm; }
                body { 
                    font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    margin: 0; padding: 20px; color: #1e293b; font-size: 12px; line-height: 1.5;
                    width: 210mm; box-sizing: border-box;
                }
                .record-box { border: 1.5px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-top: 15px; }
                .record-box-header { background: #1e40af; color: white; padding: 10px 15px; font-size: 14px; font-weight: bold; }
                .table-data { width: 100%; border-collapse: collapse; }
                .table-data td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                .table-data td.lbl { width: 25%; font-weight: bold; color: #475569; background: #f8fafc; }
                .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; margin-right: 5px; }
                .status-ind { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
                .status-sup { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
                .status-asst { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
                .status-obs { background: #cffafe; color: #155e75; border: 1px solid #a5f3fc; }
                .sign-row { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
                .sign-box { width: 200px; border-top: 1px solid #475569; padding-top: 6px; font-size: 11px; font-weight: bold; }
                @media print { .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            ${getInstitutionHeaderHtml(mappedInst, cat, 'Single Procedure Log', visitDateFormatted)}
            
            <div class="record-box">
                <div class="record-box-header">
                    Procedure Record Details
                </div>
                <table class="table-data">
                    <tr>
                        <td class="lbl">Patient Name:</td>
                        <td><strong>${escapeHtml(record.name || 'Unnamed')}</strong></td>
                        <td class="lbl">IP / Inpatient No.:</td>
                        <td><strong>${escapeHtml(record.ipNumber || '-')}</strong></td>
                    </tr>
                    <tr>
                        <td class="lbl">Age / Sex:</td>
                        <td>${record.age !== undefined ? record.age + ' Years' : '-'} / ${escapeHtml(record.sex || record.gender || '-')}</td>
                        <td class="lbl">Procedure Date:</td>
                        <td><strong>${visitDateFormatted}</strong></td>
                    </tr>
                    <tr>
                        <td class="lbl">Diagnosis:</td>
                        <td colspan="3"><strong>${escapeHtml(record.diagnosis || 'Not recorded')}</strong></td>
                    </tr>
                    <tr>
                        <td class="lbl">Procedure Done:</td>
                        <td colspan="3" style="color: #1e40af; font-size: 13px;"><strong>${escapeHtml(record.procedureDone || record.chiefComplaint || '-')}</strong></td>
                    </tr>
                    <tr>
                        <td class="lbl">Performance Status:</td>
                        <td colspan="3">
                            ${(record.independentlyPerformed || '').toLowerCase() === 'yes' ? '<span class="status-badge status-ind">✓ Independently Performed</span>' : ''}
                            ${(record.performedUnderSupervision || '').toLowerCase() === 'yes' ? '<span class="status-badge status-sup">✓ Under Supervision</span>' : ''}
                            ${(record.assisted || '').toLowerCase() === 'yes' ? '<span class="status-badge status-asst">✓ Assisted</span>' : ''}
                            ${(record.observed || '').toLowerCase() === 'yes' ? '<span class="status-badge status-obs">✓ Observed</span>' : ''}
                        </td>
                    </tr>
                    <tr>
                        <td class="lbl">Hospital / Institution:</td>
                        <td>${escapeHtml(mappedInst)}</td>
                        <td class="lbl">Supervisor / Consultant:</td>
                        <td>${escapeHtml(record.supervisor || 'Dr. Shabeel Sulaiman')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Remarks / Findings:</td>
                        <td colspan="3">${escapeHtml(record.remarks || 'No additional remarks')}</td>
                    </tr>
                </table>
            </div>

            <div class="sign-row">
                <div class="sign-box">
                    Signature of Candidate<br>
                    (Dr. Shabeel Sulaiman)
                </div>
                <div class="sign-box">
                    Signature of Consultant / HOD<br>
                    Department of Urology
                </div>
            </div>

            <div class="no-print" style="margin-top: 25px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 24px; background: #1e40af; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">
                    🖨️ Print Record
                </button>
            </div>
        </body>
        </html>
    `;

    if (isMobile) {
        const blob = new Blob([printHtml], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `procedure-${record.name || 'record'}-${visitDateFormatted}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showSuccess('Single record generated! Open the downloaded file to print or save as PDF.');
    } else {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printHtml);
        printWindow.document.close();
    }
}

function generateCompactReport(patientsToPrint) {
    return `
        <table class="compact-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Age/Sex</th>
                    <th>IP No.</th>
                    <th>Diagnosis</th>
                    <th>Procedure</th>
                    <th>Obs</th>
                    <th>Asst</th>
                    <th>Sup</th>
                    <th>Ind</th>
                </tr>
            </thead>
            <tbody>
                ${patientsToPrint.map((p, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${formatDate(p.procedureDate || p.visitDate)}</td>
                        <td><strong>${escapeHtml(p.name || 'Unnamed')}</strong></td>
                        <td>${p.age || '-'}/${p.sex || '-'}</td>
                        <td>${escapeHtml(p.ipNumber || '-')}</td>
                        <td>${escapeHtml(p.diagnosis || '-')}</td>
                        <td><strong>${escapeHtml(p.procedureDone || '-')}</strong></td>
                        <td>${(p.observed || '').toLowerCase() === 'yes' ? '✓' : '-'}</td>
                        <td>${(p.assisted || '').toLowerCase() === 'yes' ? '✓' : '-'}</td>
                        <td>${(p.performedUnderSupervision || '').toLowerCase() === 'yes' ? '✓' : '-'}</td>
                        <td>${(p.independentlyPerformed || '').toLowerCase() === 'yes' ? '✓' : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateSummaryReport(patientsToPrint, includeEmptyFields) {
    const indCount = patientsToPrint.filter(p => (p.independentlyPerformed || '').toLowerCase() === 'yes').length;
    const supCount = patientsToPrint.filter(p => (p.performedUnderSupervision || '').toLowerCase() === 'yes').length;
    const asstCount = patientsToPrint.filter(p => (p.assisted || '').toLowerCase() === 'yes').length;
    const obsCount = patientsToPrint.filter(p => (p.observed || '').toLowerCase() === 'yes').length;
    
    return `
        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #cbd5e1;">
            <h4 style="margin: 0 0 6px 0; color: #1e40af; font-size: 12px; text-transform: uppercase;">Performance Status Breakdown</h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; font-size: 11px;">
                <div><strong>Independently:</strong> <span style="color: #059669; font-weight: bold;">${indCount}</span></div>
                <div><strong>Under Supervision:</strong> <span style="color: #1d4ed8; font-weight: bold;">${supCount}</span></div>
                <div><strong>Assisted:</strong> <span style="color: #d97706; font-weight: bold;">${asstCount}</span></div>
                <div><strong>Observed:</strong> <span style="color: #0284c7; font-weight: bold;">${obsCount}</span></div>
            </div>
        </div>
        ${generateCompactReport(patientsToPrint)}
    `;
}

function generateDetailedReport(patientsToPrint, includeEmptyFields) {
    return patientsToPrint.map((p, idx) => `
        <div class="patient-record">
            <div class="patient-header">
                <span>#${idx + 1} - ${escapeHtml(p.name || 'Unnamed')}</span>
                <span>Date: ${formatDate(p.procedureDate || p.visitDate)}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
                <div><strong>Age / Sex:</strong> ${p.age || '-'} / ${p.sex || '-'}</div>
                <div><strong>IP Number:</strong> ${escapeHtml(p.ipNumber || '-')}</div>
                <div><strong>Procedure:</strong> <strong>${escapeHtml(p.procedureDone || '-')}</strong></div>
                <div><strong>Institution:</strong> ${escapeHtml(normalizeInstitution(p.hospital))}</div>
            </div>
            <div style="margin-top: 6px; font-size: 11px;">
                <div><strong>Diagnosis:</strong> ${escapeHtml(p.diagnosis || '-')}</div>
                <div style="margin-top: 3px;"><strong>Performance Status:</strong> 
                    ${p.independentlyPerformed === 'Yes' ? '<span style="color: #059669; font-weight: bold;">[Independently Performed]</span> ' : ''}
                    ${p.performedUnderSupervision === 'Yes' ? '<span style="color: #1d4ed8; font-weight: bold;">[Under Supervision]</span> ' : ''}
                    ${p.assisted === 'Yes' ? '<span style="color: #d97706; font-weight: bold;">[Assisted]</span> ' : ''}
                    ${p.observed === 'Yes' ? '<span style="color: #0284c7; font-weight: bold;">[Observed]</span> ' : ''}
                </div>
                ${p.remarks ? `<div style="margin-top: 3px;"><strong>Remarks:</strong> ${escapeHtml(p.remarks)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// Export functions for global access
window.showView = showView;
window.changeInstitution = changeInstitution;
window.selectInstitution = selectInstitution;
window.changeCategory = changeCategory;
window.selectCategory = selectCategory;
window.filterRecordsByInstitution = filterRecordsByInstitution;
window.filterRecordsByCategory = filterRecordsByCategory;
window.viewRecord = viewRecord;
window.editRecord = editRecord;
window.editRecordFromModal = editRecordFromModal;
window.cancelEdit = cancelEdit;
window.deleteRecord = deleteRecord;
window.deleteRecordFromModal = deleteRecordFromModal;
window.switchViewMode = switchViewMode;
window.filterByRole = filterByRole;
window.printRecord = printRecord;
window.loadRecords = loadRecords;
window.showPrintRangeModal = showPrintRangeModal;
window.printDateRange = printDateRange;
window.toggleTileStyle = toggleTileStyle;

