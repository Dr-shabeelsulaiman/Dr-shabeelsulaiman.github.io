# Doctor's Logbook - Patient Management System

A responsive web application for doctors to manage patient records, built with Bootstrap and optimized for Mac and iPhone devices. Data is stored in Google Sheets using Google Apps Script, and the site can be hosted on GitHub Pages.

## Features

- **Responsive Design**: Optimized for Mac, iPhone, and all devices
- **Patient Management**: Add, view, and search patient records
- **Google Sheets Integration**: Secure data storage using Google Apps Script
- **PDF Printing**: Generate printable patient records
- **Modern UI**: Clean Bootstrap interface with smooth animations
- **Search & Filter**: Quickly find patients by name, phone, or complaint
- **Form Validation**: Client-side validation for data integrity

## Demo

The application includes mock data for testing. Configure Google Apps Script to enable full functionality.

## Setup Instructions

### 1. Google Sheets Setup

1. Create a new Google Sheet: [Google Sheets](https://sheets.google.com)
2. Name it "Doctor's Logbook" or your preferred name
3. Copy the Spreadsheet ID from the URL (e.g., `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`)
4. Share the sheet with anyone who has the link (can view)

### 2. Google Apps Script Setup

1. Open [Google Apps Script](https://script.google.com)
2. Create a new project
3. Replace the default code with the content from `GoogleAppsScript.gs`
4. Update the `SPREADSHEET_ID` variable with your sheet ID
5. Save the project

### 3. Deploy Google Apps Script

1. In Apps Script, click "Deploy" > "New deployment"
2. Select "Web app" as the deployment type
3. Configure:
   - Description: "Doctor's Logbook API"
   - Execute as: "Me" (your Google account)
   - Who has access: "Anyone"
4. Click "Deploy"
5. Copy the Web app URL (this is your `SCRIPT_URL`)
6. Update `CONFIG.SCRIPT_URL` in `script.js` with this URL

### 4. Initialize the Sheet

1. In Apps Script, run the `setup()` function once to create headers and formatting
2. Test the connection by running the `test()` function

### 5. GitHub Pages Setup

1. Create a new GitHub repository
2. Upload all files (`index.html`, `styles.css`, `script.js`, `README.md`)
3. Go to repository Settings > Pages
4. Source: "Deploy from a branch"
5. Branch: `main` or `master`, folder: `/root`
6. Save and wait for deployment (usually takes a few minutes)
7. Your site will be available at `https://username.github.io/repository-name`

## File Structure

```
doctor-logbook/
├── index.html              # Main HTML file
├── styles.css              # Custom CSS styles
├── script.js               # JavaScript functionality
├── GoogleAppsScript.gs     # Google Apps Script backend
└── README.md               # This file
```

## Configuration

### Update Configuration in `script.js`

```javascript
const CONFIG = {
    SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE', // Replace with your deployed Apps Script URL
    SHEET_NAME: 'PatientRecords'
};
```

### Update Configuration in `GoogleAppsScript.gs`

```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Replace with your Google Sheet ID
const SHEET_NAME = 'PatientRecords';
```

## Usage

1. **Add Patient**: Fill in the patient details form and click "Save Patient"
2. **View Records**: Browse all patient records in the table below
3. **Search**: Use the search box to filter patients
4. **View Details**: Click the eye icon to see complete patient information
5. **Print**: Click the printer icon to generate a printable PDF

## Features in Detail

### Patient Form Fields
- Name (required)
- Age (required)
- Gender (required)
- Phone number
- Email
- Visit date (required)
- Chief complaint (required)
- Diagnosis
- Treatment plan
- Additional notes

### Data Storage
- All data is stored in Google Sheets
- Each patient gets a unique ID
- Timestamps are automatically added
- Data is backed up by Google's infrastructure

### Security
- Google Apps Script handles authentication
- No sensitive data is stored in the browser
- CORS is properly configured
- Input sanitization prevents XSS attacks

## Browser Support

- Safari (Mac/iPhone) - Primary target
- Chrome (Mac/iPhone)
- Firefox
- Edge
- All modern mobile browsers

## Responsive Design

The application is specifically optimized for:
- **Mac Desktop**: Full-featured interface with large screen layout
- **iPhone**: Touch-friendly interface with optimized form inputs
- **iPad**: Tablet-optimized layout
- **Other devices**: Responsive design adapts to any screen size

## Troubleshooting

### Common Issues

1. **CORS Error**: Make sure your Google Apps Script is deployed with "Anyone" access
2. **Data Not Saving**: Check that the SCRIPT_URL is correctly configured
3. **Form Validation**: Ensure all required fields are filled before submitting
4. **Print Issues**: Make sure pop-ups are allowed for print functionality

### Test the Setup

1. Open the browser developer console
2. Try adding a test patient
3. Check for any error messages in the console
4. Verify data appears in your Google Sheet

## Customization

### Adding New Fields

1. Update the HTML form in `index.html`
2. Update the form fields in `script.js` (`getFormData()` function)
3. Update the Google Apps Script headers and data handling
4. Update the display functions in `script.js`

### Styling Changes

- Modify `styles.css` for visual changes
- Bootstrap classes can be customized
- Color scheme is defined in CSS variables

## Support

For issues and questions:
1. Check the troubleshooting section
2. Verify your Google Apps Script deployment
3. Ensure proper sharing settings on Google Sheets
4. Test with browser developer tools

## License

This project is open source and available under the MIT License.
