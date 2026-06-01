# Step-by-Step Setup Guide

Since you're logged into your Google account in Chrome, follow these exact steps:

## Step 1: Create Google Sheet

1. **Open Google Sheets**: Click this link or copy/paste in Chrome
   https://sheetssheets.google.com

2. **Create New Sheet**: Click the "+ Blank" button

3. **Name the Sheet**: Click "Untitled spreadsheet" and name it "Doctor's Logbook"

4. **Get Spreadsheet ID**: Look at the URL in your browser
   - URL will look like: `https://docsdocs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUhptlbs74OgvE2upms/edit`
   - Copy the ID between `/d/` and `/edit` (e.g., `1BxiMVs0XRA5nFMdKvBdBZjgmUUhptlbs74OgvE2upms`)

5. **Share the Sheet**:
   - Click the "Share" button (top right)
   - Under "General access", select "Anyone with the link"
   - Change role to "Viewer"
   - Click "Done"

## Step 2: Setup Google Apps Script

1. **Open Google Apps Script**: Click this link
   https://://script.google.com

2. **Create New Project**: Click "New Project"

3. **Replace the Code**:
   - Delete all existing code in the editor
   - Copy the entire content from `GoogleAppsScript.gs` file
   - Paste it into the Apps Script editor

4. **Update Spreadsheet ID**:
   - Find this line: `const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';`
   - Replace `YOUR_SPREADSHEET_ID_HERE` with the ID you copied in Step 1

5. **Save the Project**: Click the floppy disk icon or Ctrl+S

## Step 3: Deploy as Web App

1. **Click Deploy**: In the top right, click "Deploy" > "New deployment"

2. **Select Web App**:
   - Click the gear icon next to "Select type"
   - Choose "Web app"

3. **Configure Web App**:
   - Description: `Doctor's Logbook API`
   - Execute as: `Me` (your Google account)
   - Who has access: `Anyone`

4. **Deploy**:
   - Click "Deploy"
   - You may need to authorize permissions (click "Authorize access")
   - Sign in with your Google account if prompted
   - Click "Allow" for all permissions

5. **Copy Web App URL**:
   - After deployment, you'll see a "Web app URL"
   - Copy this URL (it will look like: `https://scriptscript.google.com/macros/s/AKfycbx.../exec`)

## Step 4: Update Your Website

1. **Open script.js**: Open the `script.js` file in your project

2. **Update CONFIG**: Find this line:
   ```javascript
   const CONFIG = {
       SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',
       SHEET_NAME: 'PatientRecords'
   };
   ```

3. **Replace URL**: Replace `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with the Web app URL you copied

4. **Save the file**

## Step 5: Initialize the Sheet

1. **Go back to Apps Script** (in your browser tab)

2. **Run Setup Function**:
   - In the function dropdown (above the code), select `setup`
   - Click "Run"
   - Authorize if prompted

3. **Test the Connection**:
   - Select `test` from the function dropdown
   - Click "Run"
   - Check your Google Sheet - you should see a test patient entry

## Step 6: Test Your Website

1. **Open your website**: Go to `http://localhost:8000`

2. **Add a Test Patient**:
   - Fill in the patient form
   - Click "Save Patient"
   - Check your Google Sheet - the data should appear!

## Troubleshooting

### If you get "CORS error":
- Make sure the Web app is deployed with "Anyone" access
- Check that the SCRIPT_URL is correct in script.js

### If data doesn't save:
- Open browser developer tools (F12)
- Check the Console tab for error messages
- Verify the Apps Script deployment is active

### If Apps Script authorization fails:
- Make sure you're logged into the correct Google account
- Try refreshing the Apps Script page and redeploying

## Quick Copy-Paste Content

### Apps Script Code (already in GoogleAppsScript.gs):
Copy the entire content from the `GoogleAppsScript.gs` file and paste into Apps Script editor.

### CONFIG Update for script.js:
```javascript
const CONFIG = {
    SCRIPT_URL: 'PASTE_YOUR_WEB_APP_URL_HERE',
    SHEET_NAME: 'PatientRecords'
};
```

Once completed, your doctor's logbook will be fully functional with Google Sheets integration!
