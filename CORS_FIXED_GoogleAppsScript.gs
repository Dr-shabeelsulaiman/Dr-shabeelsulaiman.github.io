// Google Apps Script for Doctor's Logbook - CORS Fixed Version
// Deploy as Web App to get the URL for CONFIG.SCRIPT_URL

// Global configuration
const SPREADSHEET_ID = '1j6Ah6mIyYq0lOR3TW144O3yWj7PlJokvZszD4j0jpu4'; // Your Google Sheet ID
const SHEET_NAME = 'PatientRecords';

// Initialize the spreadsheet
function initializeSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Create headers
      const headers = [
        'ID',
        'Timestamp',
        'Name',
        'Age',
        'Gender',
        'Phone',
        'Email',
        'Visit Date',
        'Chief Complaint',
        'Diagnosis',
        'Treatment',
        'Notes'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
           .setFontWeight('bold')
           .setBackground('#f0f0f0');
    }
    
    return sheet;
  } catch (error) {
    Logger.log('Error initializing sheet: ' + error.toString());
    throw error;
  }
}

// Web app function - handles all requests
function doPost(e) {
  // Handle CORS preflight request
  if (e.parameter.method === 'OPTIONS') {
    return ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'addPatient':
        return addPatient(data.data);
      case 'updatePatient':
        return updatePatient(data.id, data.data);
      case 'deletePatient':
        return deletePatient(data.id);
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createResponse(false, 'Server error: ' + error.toString());
  }
}

// Web app function - handles GET requests
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getPatients':
        return getPatients();
      case 'getPatient':
        return getPatient(e.parameter.id);
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createResponse(false, 'Server error: ' + error.toString());
  }
}

// Add a new patient
function addPatient(patientData) {
  try {
    const sheet = initializeSheet();
    const id = generateId();
    const timestamp = new Date().toISOString();
    
    const row = [
      id,
      timestamp,
      patientData.name,
      patientData.age,
      patientData.gender,
      "'" + (patientData.phone || ''), // Prefix with apostrophe to prevent formula interpretation
      patientData.email || '',
      patientData.visitDate,
      patientData.chiefComplaint,
      patientData.diagnosis || '',
      patientData.treatment || '',
      patientData.notes || ''
    ];
    
    sheet.appendRow(row);
    
    // Format the new row
    const lastRow = sheet.getLastRow();
    formatRow(sheet, lastRow);
    
    return createResponse(true, 'Patient added successfully', { id: id });
  } catch (error) {
    Logger.log('Error adding patient: ' + error.toString());
    return createResponse(false, 'Error adding patient: ' + error.toString());
  }
}

// Get all patients
function getPatients() {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    // Skip header row and convert to objects
    const patients = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Skip empty rows
        patients.push({
          id: data[i][0],
          timestamp: data[i][1],
          name: data[i][2],
          age: data[i][3],
          gender: data[i][4],
          phone: data[i][5],
          email: data[i][6],
          visitDate: data[i][7],
          chiefComplaint: data[i][8],
          diagnosis: data[i][9],
          treatment: data[i][10],
          notes: data[i][11]
        });
      }
    }
    
    // Sort by visit date (newest first)
    patients.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    
    return createResponse(true, 'Patients retrieved successfully', { patients: patients });
  } catch (error) {
    Logger.log('Error getting patients: ' + error.toString());
    return createResponse(false, 'Error getting patients: ' + error.toString());
  }
}

// Get a specific patient
function getPatient(id) {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const patient = {
          id: data[i][0],
          timestamp: data[i][1],
          name: data[i][2],
          age: data[i][3],
          gender: data[i][4],
          phone: data[i][5],
          email: data[i][6],
          visitDate: data[i][7],
          chiefComplaint: data[i][8],
          diagnosis: data[i][9],
          treatment: data[i][10],
          notes: data[i][11]
        };
        return createResponse(true, 'Patient retrieved successfully', { patient: patient });
      }
    }
    
    return createResponse(false, 'Patient not found');
  } catch (error) {
    Logger.log('Error getting patient: ' + error.toString());
    return createResponse(false, 'Error getting patient: ' + error.toString());
  }
}

// Update a patient
function updatePatient(id, patientData) {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        // Update the row
        sheet.getRange(i + 1, 3).setValue(patientData.name);
        sheet.getRange(i + 1, 4).setValue(patientData.age);
        sheet.getRange(i + 1, 5).setValue(patientData.gender);
        sheet.getRange(i + 1, 6).setValue("'" + (patientData.phone || '')); // Add apostrophe prefix
        sheet.getRange(i + 1, 7).setValue(patientData.email || '');
        sheet.getRange(i + 1, 8).setValue(patientData.visitDate);
        sheet.getRange(i + 1, 9).setValue(patientData.chiefComplaint);
        sheet.getRange(i + 1, 10).setValue(patientData.diagnosis || '');
        sheet.getRange(i + 1, 11).setValue(patientData.treatment || '');
        sheet.getRange(i + 1, 12).setValue(patientData.notes || '');
        
        formatRow(sheet, i + 1);
        return createResponse(true, 'Patient updated successfully');
      }
    }
    
    return createResponse(false, 'Patient not found');
  } catch (error) {
    Logger.log('Error updating patient: ' + error.toString());
    return createResponse(false, 'Error updating patient: ' + error.toString());
  }
}

// Delete a patient
function deletePatient(id) {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return createResponse(true, 'Patient deleted successfully');
      }
    }
    
    return createResponse(false, 'Patient not found');
  } catch (error) {
    Logger.log('Error deleting patient: ' + error.toString());
    return createResponse(false, 'Error deleting patient: ' + error.toString());
  }
}

// Utility functions
function generateId() {
  return 'PAT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message
  };
  
  if (data) {
    response.data = data;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function formatRow(sheet, rowNum) {
  // Set alternating row colors
  if (rowNum % 2 === 0) {
    sheet.getRange(rowNum, 1, 1, sheet.getLastColumn())
         .setBackground('#f8f9fa');
  } else {
    sheet.getRange(rowNum, 1, 1, sheet.getLastColumn())
         .setBackground('#ffffff');
  }
  
  // Set text wrapping for long text fields
  sheet.getRange(rowNum, 9, 1, 4).setWrap(true); // Chief complaint, diagnosis, treatment, notes
  
  // Auto-resize columns
  sheet.autoResizeColumn(1); // ID
  sheet.autoResizeColumn(2); // Timestamp
  sheet.autoResizeColumn(3); // Name
  sheet.autoResizeColumn(4); // Age
  sheet.autoResizeColumn(5); // Gender
  sheet.autoResizeColumn(6); // Phone
  sheet.autoResizeColumn(7); // Email
  sheet.autoResizeColumn(8); // Visit Date
}

// Setup function - run this once to create the sheet
function setup() {
  try {
    const sheet = initializeSheet();
    
    // Set column widths
    sheet.setColumnWidth(1, 120);  // ID
    sheet.setColumnWidth(2, 150);  // Timestamp
    sheet.setColumnWidth(3, 200);  // Name
    sheet.setColumnWidth(4, 60);   // Age
    sheet.setColumnWidth(5, 80);   // Gender
    sheet.setColumnWidth(6, 120);  // Phone
    sheet.setColumnWidth(7, 180);  // Email
    sheet.setColumnWidth(8, 100);  // Visit Date
    sheet.setColumnWidth(9, 300);  // Chief Complaint
    sheet.setColumnWidth(10, 300); // Diagnosis
    sheet.setColumnWidth(11, 300); // Treatment
    sheet.setColumnWidth(12, 200); // Notes
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Add data validation for gender
    const genderRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Male', 'Female', 'Other'])
      .build();
    sheet.getRange(2, 5, sheet.getMaxRows() - 1, 1).setDataValidation(genderRule);
    
    Logger.log('Sheet setup completed successfully');
    return 'Sheet setup completed successfully';
  } catch (error) {
    Logger.log('Error in setup: ' + error.toString());
    return 'Error in setup: ' + error.toString();
  }
}

// Test function
function test() {
  const testData = {
    name: 'Test Patient',
    age: 35,
    gender: 'Male',
    phone: '+1 234-567-8900',
    email: 'test@example.com',
    visitDate: '2024-06-01',
    chiefComplaint: 'Test complaint',
    diagnosis: 'Test diagnosis',
    treatment: 'Test treatment',
    notes: 'Test notes'
  };
  
  return addPatient(testData);
}
