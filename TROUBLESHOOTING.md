# Troubleshooting Guide - Patient Record Saving Error

## Step 1: Check Browser Console

1. **Open Developer Tools**: Press F12 or right-click → "Inspect"
2. **Go to Console tab**
3. **Try saving a patient** and watch for error messages
4. **Look for these specific logs**:
   - "Attempting to save patient: ..."
   - "Using Script URL: ..."
   - "Response status: ..."
   - Any red error messages

## Step 2: Common Issues & Solutions

### Issue 1: CORS Error
**Error**: "Access to fetch at '...' has been blocked by CORS policy"

**Solution**:
1. Go to your Google Apps Script project
2. Click "Deploy" > "Deployments"
3. Click the pencil icon to edit
4. Ensure "Who has access" is set to "Anyone"
5. Redeploy the web app

### Issue 2: Authorization Required
**Error**: "Authorization is required to perform that action"

**Solution**:
1. In Google Apps Script, run the `setup()` function
2. If prompted, authorize the permissions
3. Redeploy the web app

### Issue 3: Script URL Incorrect
**Error**: "HTTP error! status: 404"

**Solution**:
1. Verify your SCRIPT_URL in script.js matches the deployed web app URL
2. Check the URL ends with `/exec`
3. Ensure no typos in the URL

### Issue 4: Network Error
**Error**: "Failed to fetch" or "Network error"

**Solution**:
1. Check your internet connection
2. Try accessing the Apps Script URL directly in browser
3. Clear browser cache and reload

### Issue 5: Google Apps Script Error
**Error**: "Server error: ..."

**Solution**:
1. Check Google Apps Script execution logs
2. Go to Apps Script → Executions
3. Look for recent failed executions
4. Review error details

## Step 3: Quick Tests

### Test A: Direct URL Access
1. Copy your SCRIPT_URL from script.js
2. Paste directly in browser
3. Add `?action=getPatients` at the end
4. Should see JSON response or error message

### Test B: Apps Script Test Function
1. Go to Google Apps Script
2. Select `test` function from dropdown
3. Click "Run"
4. Check if test patient appears in Google Sheet

### Test C: Network Request Test
1. Open browser console
2. Paste this code and press Enter:
```javascript
fetch('YOUR_SCRIPT_URL?action=getPatients')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e))
```

## Step 4: Debug Information to Collect

If the issue persists, please provide:
1. **Console error messages** (screenshot or text)
2. **Network tab status** (F12 → Network → Try saving)
3. **Google Apps Script execution logs**
4. **Your SCRIPT_URL** (remove sensitive parts if needed)

## Step 5: Fallback Solution

If Google Apps Script continues to fail:
1. The app will automatically fall back to mock data
2. You can continue testing the UI functionality
3. Patient data will be stored locally (not persisted)

## Most Common Fix

90% of issues are resolved by:
1. **Redeploying the Apps Script** with "Anyone" access
2. **Updating the SCRIPT_URL** in script.js
3. **Refreshing the browser** after changes

## Need More Help?

If you're still seeing errors, please:
1. Open browser console (F12)
2. Try saving a patient
3. Share the exact error message you see
