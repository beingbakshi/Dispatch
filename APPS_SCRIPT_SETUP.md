# Google Apps Script Setup Instructions

## Step-by-Step Setup Guide

### 1. Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Mumuksh Impex Inventory" (or any name you prefer)
4. **Important**: Note down the Sheet ID from the URL
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the `SHEET_ID_HERE` part

### 2. Open Apps Script Editor
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. A new tab will open with the Apps Script editor
3. Delete any default code in the editor

### 3. Paste the Code
1. Open the file `apps-script.gs` from this project
2. Copy the entire contents
3. Paste it into the Apps Script editor
4. Click **Save** (💾 icon) or press `Ctrl+S`
5. Name your project: "Mumuksh Inventory Backend"

### 4. Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "Mumuksh Inventory API v1"
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone** (important for CORS)
5. Click **Deploy**
6. **IMPORTANT**: Copy the **Web App URL** that appears
   - It will look like: `https://script.google.com/macros/s/AKfycb.../exec`

### 5. Update Frontend API URL
1. Open `App.jsx` in your project
2. Find this line (around line 47):
   ```javascript
   const API_URL = "https://script.google.com/macros/s/AKfycbzMM1LIgPpCb0H4JitmD12p70l0wO682Q1IjvosMIR0fN8f2KaPTd-yitjHcVgfLaa0Fg/exec";
   ```
3. Replace it with your new Web App URL:
   ```javascript
   const API_URL = "YOUR_WEB_APP_URL_HERE";
   ```

### 6. Authorize the Script (First Time Only)
1. When you first run the script, Google will ask for authorization
2. Click **Review Permissions**
3. Choose your Google account
4. Click **Advanced** → **Go to [Project Name] (unsafe)**
5. Click **Allow**
6. This gives the script permission to read/write to your Google Sheet

### 7. Test the Setup
1. Go back to your React app
2. Try adding a material inward entry
3. Check your Google Sheet - you should see:
   - New sheets created automatically (Stock, Inward, Outward, etc.)
   - Data appearing in the sheets

## Sheet Structure

The script will automatically create these sheets:

### 1. **Stock** (Master Inventory)
- Material_ID, Name, Category, Current_Stock, Min_Stock, Unit
- Auto-updates when materials are added/issued

### 2. **Inward** (Material Receipts)
- All material inward transactions
- Includes: Timestamp, Date, Time, Category, Material_Type, Vendor, Quantities, etc.

### 3. **Outward** (Material Issues)
- All material issues to production floor
- Includes: Machine_No, Supervisor, Quantities, etc.

### 4. **FinishedGoods** (FG Production)
- All finished goods production records
- Includes: Product_Name, Size, Machine, Batch, Quantities, etc.

### 5. **LoadingProcess** (Vehicle Loading)
- All vehicle dispatch records
- Includes: Challan_No, Vehicle_No, Driver, Items, etc.

## API Endpoints

The script handles these actions:

- `GET_STOCK` - Fetch current stock levels
- `INWARD` - Record material inward
- `OUTWARD` - Record material issue
- `FINISHED_GOODS` - Record FG production
- `LOADING_PROCESS` - Record vehicle loading
- `GET_INWARD_REPORT` - Get inward report data
- `GET_OUTWARD_REPORT` - Get outward report data
- `GET_FG_REPORT` - Get FG production report
- `GET_LOADING_REPORT` - Get loading report data

## Troubleshooting

### Issue: "Script not authorized"
- **Solution**: Re-run the authorization steps (Step 6)

### Issue: "CORS error" in browser
- **Solution**: Make sure "Who has access" is set to **Anyone** in deployment settings

### Issue: "Sheets not created"
- **Solution**: The script creates sheets automatically on first API call. Try making a test API call.

### Issue: "Data not appearing"
- **Solution**: 
  1. Check Apps Script execution logs (View → Logs)
  2. Verify the Web App URL is correct in App.jsx
  3. Check that the deployment is active

### Issue: "Permission denied"
- **Solution**: Make sure you're the owner of the Google Sheet, or have edit permissions

## Security Notes

- The Web App URL is public but requires proper authentication
- Only authorized users can modify data
- Consider adding user authentication if needed
- Regularly backup your Google Sheet data

## Next Steps

1. Test all features (Inward, Outward, FG, Loading)
2. Verify data appears correctly in Google Sheets
3. Set minimum stock levels in the Stock sheet
4. Customize sheet formatting as needed
5. Set up automated backups if required

## Support

If you encounter issues:
1. Check Apps Script execution logs
2. Verify all setup steps were followed
3. Test with a simple API call first
4. Check browser console for errors
