// Google Apps Script for Doctor's Logbook - Surgical Procedure Log
// Deploy as Web App to get the URL for CONFIG.SCRIPT_URL

// Global configuration
const SPREADSHEET_ID = '1j6Ah6mIyYq0lOR3TW144O3yWj7PlJokvZSqD4j0jpu4'; // Your Google Sheet ID
const SHEET_NAME = 'ProcedureRecords';

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
        'Category',
        'Name',
        'Age',
        'Sex',
        'IP No.',
        'Procedure Date',
        'Diagnosis',
        'Procedure Done',
        'Observed',
        'Assisted',
        'Performed Under Supervision',
        'Independently Performed',
        'Hospital',
        'Supervising Consultant',
        'Remarks'
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

// Main function - handles GET requests
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'addRecord':
        return addRecord(e.parameter);
      case 'getRecords':
        return getRecords();
      case 'getRecord':
        return getRecord(e.parameter.id);
      case 'updateRecord':
        return updateRecord(e.parameter);
      case 'deleteRecord':
        return deleteRecord(e.parameter.id);
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createResponse(false, 'Server error: ' + error.toString());
  }
}

// Add a new procedure record
function addRecord(params) {
  try {
    const sheet = initializeSheet();
    const id = generateId();
    const timestamp = new Date().toISOString();
    
    const recordData = {
      category: params.category || 'Minor',
      name: params.name,
      age: parseInt(params.age),
      sex: params.sex,
      ipNumber: params.ipNumber || '',
      procedureDate: params.procedureDate,
      diagnosis: params.diagnosis || '',
      procedureDone: params.procedureDone || '',
      observed: params.observed || 'No',
      assisted: params.assisted || 'No',
      performedUnderSupervision: params.performedUnderSupervision || 'No',
      independentlyPerformed: params.independentlyPerformed || 'No',
      hospital: params.hospital || '',
      supervisor: params.supervisor || '',
      remarks: params.remarks || ''
    };
    
    const row = [
      id,
      timestamp,
      recordData.category,
      recordData.name,
      recordData.age,
      recordData.sex,
      "'" + (recordData.ipNumber || ''), // Prefix with apostrophe to prevent formula interpretation
      recordData.procedureDate,
      recordData.diagnosis,
      recordData.procedureDone,
      recordData.observed,
      recordData.assisted,
      recordData.performedUnderSupervision,
      recordData.independentlyPerformed,
      recordData.hospital,
      recordData.supervisor,
      recordData.remarks
    ];
    
    sheet.appendRow(row);
    
    // Format the new row
    const lastRow = sheet.getLastRow();
    formatRow(sheet, lastRow);
    
    return createResponse(true, 'Procedure record added successfully', { id: id });
  } catch (error) {
    Logger.log('Error adding record: ' + error.toString());
    return createResponse(false, 'Error adding record: ' + error.toString());
  }
}

// Get all records
function getRecords() {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    // Skip header row and convert to objects
    const records = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Skip empty rows
        records.push({
          id: data[i][0],
          timestamp: data[i][1],
          category: data[i][2],
          name: data[i][3],
          age: data[i][4],
          sex: data[i][5],
          ipNumber: data[i][6],
          procedureDate: data[i][7],
          diagnosis: data[i][8],
          procedureDone: data[i][9],
          observed: data[i][10],
          assisted: data[i][11],
          performedUnderSupervision: data[i][12],
          independentlyPerformed: data[i][13],
          hospital: data[i][14],
          supervisor: data[i][15],
          remarks: data[i][16]
        });
      }
    }
    
    // Sort by procedure date (newest first)
    records.sort((a, b) => new Date(b.procedureDate) - new Date(a.procedureDate));
    
    return createResponse(true, 'Records retrieved successfully', { records: records });
  } catch (error) {
    Logger.log('Error getting records: ' + error.toString());
    return createResponse(false, 'Error getting records: ' + error.toString());
  }
}

// Get a specific record
function getRecord(id) {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const record = {
          id: data[i][0],
          timestamp: data[i][1],
          category: data[i][2],
          name: data[i][3],
          age: data[i][4],
          sex: data[i][5],
          ipNumber: data[i][6],
          procedureDate: data[i][7],
          diagnosis: data[i][8],
          procedureDone: data[i][9],
          observed: data[i][10],
          assisted: data[i][11],
          performedUnderSupervision: data[i][12],
          independentlyPerformed: data[i][13],
          hospital: data[i][14],
          supervisor: data[i][15],
          remarks: data[i][16]
        };
        return createResponse(true, 'Record retrieved successfully', { record: record });
      }
    }
    
    return createResponse(false, 'Record not found');
  } catch (error) {
    Logger.log('Error getting record: ' + error.toString());
    return createResponse(false, 'Error getting record: ' + error.toString());
  }
}

// Update a record
function updateRecord(params) {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === params.id) {
        // Update the row
        sheet.getRange(i + 1, 3).setValue(params.category || 'Minor');
        sheet.getRange(i + 1, 4).setValue(params.name);
        sheet.getRange(i + 1, 5).setValue(parseInt(params.age));
        sheet.getRange(i + 1, 6).setValue(params.sex);
        sheet.getRange(i + 1, 7).setValue("'" + (params.ipNumber || '')); // Add apostrophe prefix
        sheet.getRange(i + 1, 8).setValue(params.procedureDate);
        sheet.getRange(i + 1, 9).setValue(params.diagnosis || '');
        sheet.getRange(i + 1, 10).setValue(params.procedureDone || '');
        sheet.getRange(i + 1, 11).setValue(params.observed || 'No');
        sheet.getRange(i + 1, 12).setValue(params.assisted || 'No');
        sheet.getRange(i + 1, 13).setValue(params.performedUnderSupervision || 'No');
        sheet.getRange(i + 1, 14).setValue(params.independentlyPerformed || 'No');
        sheet.getRange(i + 1, 15).setValue(params.hospital || '');
        sheet.getRange(i + 1, 16).setValue(params.supervisor || '');
        sheet.getRange(i + 1, 17).setValue(params.remarks || '');
        
        formatRow(sheet, i + 1);
        return createResponse(true, 'Record updated successfully');
      }
    }
    
    return createResponse(false, 'Record not found');
  } catch (error) {
    Logger.log('Error updating record: ' + error.toString());
    return createResponse(false, 'Error updating record: ' + error.toString());
  }
}

// Delete a record
function deleteRecord(id) {
  try {
    const sheet = initializeSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return createResponse(true, 'Record deleted successfully');
      }
    }
    
    return createResponse(false, 'Record not found');
  } catch (error) {
    Logger.log('Error deleting record: ' + error.toString());
    return createResponse(false, 'Error deleting record: ' + error.toString());
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
    .setMimeType(ContentService.MimeType.JSON);
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
  sheet.getRange(rowNum, 9, 1, 9).setWrap(true); // Diagnosis through Remarks
  
  // Auto-resize columns
  sheet.autoResizeColumn(1); // ID
  sheet.autoResizeColumn(2); // Timestamp
  sheet.autoResizeColumn(3); // Category
  sheet.autoResizeColumn(4); // Name
  sheet.autoResizeColumn(5); // Age
  sheet.autoResizeColumn(6); // Sex
  sheet.autoResizeColumn(7); // IP No.
  sheet.autoResizeColumn(8); // Procedure Date
}

// Setup function - run this once to create the sheet
function setup() {
  try {
    const sheet = initializeSheet();
    
    // Set column widths
    sheet.setColumnWidth(1, 120);  // ID
    sheet.setColumnWidth(2, 150);  // Timestamp
    sheet.setColumnWidth(3, 100);  // Category
    sheet.setColumnWidth(4, 200);  // Name
    sheet.setColumnWidth(5, 60);   // Age
    sheet.setColumnWidth(6, 80);   // Sex
    sheet.setColumnWidth(7, 120);  // IP No.
    sheet.setColumnWidth(8, 120);  // Procedure Date
    sheet.setColumnWidth(9, 250);  // Diagnosis
    sheet.setColumnWidth(10, 250); // Procedure Done
    sheet.setColumnWidth(11, 100); // Observed
    sheet.setColumnWidth(12, 100); // Assisted
    sheet.setColumnWidth(13, 150); // Performed Under Supervision
    sheet.setColumnWidth(14, 150); // Independently Performed
    sheet.setColumnWidth(15, 200); // Hospital
    sheet.setColumnWidth(16, 200); // Supervising Consultant
    sheet.setColumnWidth(17, 200); // Remarks
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Add data validation for sex
    const sexRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Male', 'Female', 'Other'])
      .build();
    sheet.getRange(2, 6, sheet.getMaxRows() - 1, 1).setDataValidation(sexRule);
    
    // Add data validation for performance status checkboxes
    const yesNoRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Yes', 'No'])
      .build();
    sheet.getRange(2, 11, sheet.getMaxRows() - 1, 1).setDataValidation(yesNoRule);
    sheet.getRange(2, 12, sheet.getMaxRows() - 1, 1).setDataValidation(yesNoRule);
    sheet.getRange(2, 13, sheet.getMaxRows() - 1, 1).setDataValidation(yesNoRule);
    sheet.getRange(2, 14, sheet.getMaxRows() - 1, 1).setDataValidation(yesNoRule);
    
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
    category: 'Minor',
    name: 'Test Patient',
    age: 35,
    sex: 'Male',
    ipNumber: 'IP-TEST-001',
    procedureDate: '2024-06-01',
    diagnosis: 'Test diagnosis',
    procedureDone: 'Wound Dressing',
    observed: 'Yes',
    assisted: 'No',
    performedUnderSupervision: 'Yes',
    independentlyPerformed: 'No',
    hospital: 'Test Hospital',
    supervisor: 'Dr. Test Supervisor',
    remarks: 'Test remarks'
  };
  
  return addRecord(testData);
}
