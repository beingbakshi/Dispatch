/**
 * MUMUKSH IMPEX LLP - INVENTORY MANAGEMENT SYSTEM
 * Google Apps Script for Google Sheets Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Open Apps Script (Extensions > Apps Script)
 * 3. Paste this entire code
 * 4. Save the project
 * 5. Deploy as Web App:
 *    - Click "Deploy" > "New deployment"
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Click Deploy
 * 6. Copy the Web App URL and update API_URL in App.jsx
 */

// Configuration
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_NAMES = {
  STOCK: 'Stock',
  INWARD: 'Inward',
  OUTWARD: 'Outward',
  FINISHED_GOODS: 'FinishedGoods',
  LOADING_PROCESS: 'LoadingProcess'
};

/**
 * Main doGet function - handles GET requests (for testing and direct access)
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'GET_STOCK';
    
    let response;
    
    switch(action) {
      case 'GET_STOCK':
        response = getStock();
        break;
      case 'GET_INWARD_REPORT':
        response = getInwardReport();
        break;
      case 'GET_OUTWARD_REPORT':
        response = getOutwardReport();
        break;
      case 'GET_FG_REPORT':
        response = getFGReport();
        break;
      case 'GET_LOADING_REPORT':
        response = getLoadingReport();
        break;
      default:
        response = { status: 'error', message: 'Invalid action. Use POST for data modifications.' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main doPost function - handles all API requests
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    let response;
    
    switch(action) {
      case 'GET_STOCK':
        response = getStock();
        break;
      case 'INWARD':
        response = handleInward(requestData);
        break;
      case 'OUTWARD':
        response = handleOutward(requestData);
        break;
      case 'FINISHED_GOODS':
        response = handleFinishedGoods(requestData);
        break;
      case 'LOADING_PROCESS':
        response = handleLoadingProcess(requestData);
        break;
      case 'GET_INWARD_REPORT':
        response = getInwardReport();
        break;
      case 'GET_OUTWARD_REPORT':
        response = getOutwardReport();
        break;
      case 'GET_FG_REPORT':
        response = getFGReport();
        break;
      case 'GET_LOADING_REPORT':
        response = getLoadingReport();
        break;
      case 'DELETE_INWARD':
        response = deleteInward(requestData);
        break;
      case 'DELETE_OUTWARD':
        response = deleteOutward(requestData);
        break;
      case 'DELETE_FG':
        response = deleteFG(requestData);
        break;
      case 'DELETE_LOADING':
        response = deleteLoading(requestData);
        break;
      case 'UPDATE_INWARD':
        response = updateInward(requestData);
        break;
      case 'UPDATE_OUTWARD':
        response = updateOutward(requestData);
        break;
      case 'UPDATE_FG':
        response = updateFG(requestData);
        break;
      case 'UPDATE_LOADING':
        response = updateLoading(requestData);
        break;
      default:
        response = { status: 'error', message: 'Invalid action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Initialize sheets with headers if they don't exist
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Initialize Stock Sheet with Properties and Type columns
  let stockSheet = ss.getSheetByName(SHEET_NAMES.STOCK);
  if (!stockSheet) {
    stockSheet = ss.insertSheet(SHEET_NAMES.STOCK);
    stockSheet.getRange(1, 1, 1, 9).setValues([[
      'Material_ID', 'Name', 'Category', 'Material_Type', 'Properties', 'Type', 'Current_Stock', 'Min_Stock', 'Unit'
    ]]);
    stockSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    stockSheet.setFrozenRows(1);
  } else {
    // Check if headers need to be updated (for existing sheets)
    const headers = stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Properties') || !headers.includes('Material_Type')) {
      // Add new columns if they don't exist
      const lastCol = stockSheet.getLastColumn();
      let colIndex = lastCol;
      
      if (!headers.includes('Material_Type')) {
        stockSheet.getRange(1, colIndex + 1).setValue('Material_Type');
        colIndex++;
      }
      if (!headers.includes('Properties')) {
        stockSheet.getRange(1, colIndex + 1).setValue('Properties');
        colIndex++;
      }
      if (!headers.includes('Type')) {
        stockSheet.getRange(1, colIndex + 1).setValue('Type');
      }
      
      stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).setFontWeight('bold');
    }
  }
  
  // Initialize Inward Sheet
  let inwardSheet = ss.getSheetByName(SHEET_NAMES.INWARD);
  if (!inwardSheet) {
    inwardSheet = ss.insertSheet(SHEET_NAMES.INWARD);
    inwardSheet.getRange(1, 1, 1, 15).setValues([[
      'Timestamp', 'Date', 'Time', 'Category', 'Material_Type', 'Material_ID', 
      'Vendor', 'Qty_Rolls', 'Qty_KGs', 'Properties', 'HI_HO', 'NonWoven_UsedFor',
      'User', 'Action', 'ID'
    ]]);
    inwardSheet.getRange(1, 1, 1, 15).setFontWeight('bold');
    inwardSheet.setFrozenRows(1);
  }
  
  // Initialize Outward Sheet
  let outwardSheet = ss.getSheetByName(SHEET_NAMES.OUTWARD);
  if (!outwardSheet) {
    outwardSheet = ss.insertSheet(SHEET_NAMES.OUTWARD);
    outwardSheet.getRange(1, 1, 1, 16).setValues([[
      'Timestamp', 'Date', 'Time', 'Category', 'Material_Type', 'Material_ID',
      'Machine_No', 'Supervisor', 'Qty_Rolls', 'Qty_KGs', 'Properties', 'HI_HO',
      'NonWoven_UsedFor', 'User', 'Action', 'ID'
    ]]);
    outwardSheet.getRange(1, 1, 1, 16).setFontWeight('bold');
    outwardSheet.setFrozenRows(1);
  }
  
  // Initialize Finished Goods Sheet
  let fgSheet = ss.getSheetByName(SHEET_NAMES.FINISHED_GOODS);
  if (!fgSheet) {
    fgSheet = ss.insertSheet(SHEET_NAMES.FINISHED_GOODS);
    fgSheet.getRange(1, 1, 1, 12).setValues([[
      'Timestamp', 'Date', 'Time', 'Product_Name', 'Size', 'Machine_No',
      'Batch', 'Packs_Per_Ctn', 'Pcs_Per_Pack', 'Total_Ctn', 'Action', 'Dispatch_To', 'User'
    ]]);
    fgSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    fgSheet.setFrozenRows(1);
  }
  
  // Initialize Loading Process Sheet
  let loadingSheet = ss.getSheetByName(SHEET_NAMES.LOADING_PROCESS);
  if (!loadingSheet) {
    loadingSheet = ss.insertSheet(SHEET_NAMES.LOADING_PROCESS);
    loadingSheet.getRange(1, 1, 1, 13).setValues([[
      'Timestamp', 'Challan_No', 'Date', 'Dispatch_From', 'Dispatch_To',
      'Vehicle_No', 'Driver_Name', 'Driver_No', 'Transporter_Name', 'LR_No',
      'Items_JSON', 'Loading_Type', 'User'
    ]]);
    loadingSheet.getRange(1, 1, 1, 13).setFontWeight('bold');
    loadingSheet.setFrozenRows(1);
  } else {
    // Check if Loading_Type column exists
    const headers = loadingSheet.getRange(1, 1, 1, loadingSheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Loading_Type')) {
      const lastCol = loadingSheet.getLastColumn();
      loadingSheet.getRange(1, lastCol + 1).setValue('Loading_Type');
      loadingSheet.getRange(1, 1, 1, loadingSheet.getLastColumn()).setFontWeight('bold');
    }
  }
}

/**
 * Get Stock Data
 */
function getStock() {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const stockSheet = ss.getSheetByName(SHEET_NAMES.STOCK);
    
    if (!stockSheet) {
      return { status: 'success', data: [] };
    }
    
    const data = stockSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const stockData = rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    });
    
    return {
      status: 'success',
      data: stockData
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Handle Material Inward
 */
function handleInward(data) {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const inwardSheet = ss.getSheetByName(SHEET_NAMES.INWARD);
    
    const now = new Date();
    const timestamp = now.toISOString();
    const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm a');
    
    const rowData = [
      timestamp,
      date,
      time,
      data.category || '',
      data.materialType || '',
      data.id || '',
      data.vendor || '',
      parseFloat(data.qty_rolls || 0),
      parseFloat(data.qty_kgs || 0),
      data.properties || '',
      data.hiHo || '',
      data.nonWovenUsedFor || '',
      data.user || 'Store Head',
      'INWARD',
      Utilities.getUuid()
    ];
    
    inwardSheet.appendRow(rowData);
    
    // Update Stock
    updateStock(data, 'IN', parseFloat(data.qty_rolls || 0), parseFloat(data.qty_kgs || 0));
    
    return {
      status: 'success',
      message: 'Material inward recorded successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Handle Material Outward (Issue to Floor)
 */
function handleOutward(data) {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const outwardSheet = ss.getSheetByName(SHEET_NAMES.OUTWARD);
    
    const now = new Date();
    const timestamp = now.toISOString();
    const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm a');
    
    const rowData = [
      timestamp,
      date,
      time,
      data.category || '',
      data.materialType || '',
      data.id || '',
      data.machineNo || '',
      data.supervisor || '',
      parseFloat(data.qty_rolls || 0),
      parseFloat(data.qty_kgs || 0),
      data.properties || '',
      data.hiHo || '',
      data.nonWovenUsedFor || '',
      data.user || 'Store Head',
      'OUTWARD',
      Utilities.getUuid()
    ];
    
    outwardSheet.appendRow(rowData);
    
    // Update Stock (decrease)
    updateStock(data, 'OUT', parseFloat(data.qty_rolls || 0), parseFloat(data.qty_kgs || 0));
    
    return {
      status: 'success',
      message: 'Material issued successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Handle Finished Goods
 */
function handleFinishedGoods(data) {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const fgSheet = ss.getSheetByName(SHEET_NAMES.FINISHED_GOODS);
    
    const now = new Date();
    const timestamp = now.toISOString();
    const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm a');
    
    const rowData = [
      timestamp,
      date,
      time,
      data.productName || '',
      data.fgSize || '',
      data.machineNo || '',
      data.batch || '',
      parseFloat(data.fgPacksPerCtn || 0),
      parseFloat(data.fgPcsPerPack || 0),
      parseFloat(data.fg_qty || 0),
      data.fgAction || 'IN',
      data.fgDispatchTo || '',
      data.user || 'Store Head'
    ];
    
    fgSheet.appendRow(rowData);
    
    return {
      status: 'success',
      message: 'Finished goods recorded successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Handle Loading Process
 */
function handleLoadingProcess(data) {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const loadingSheet = ss.getSheetByName(SHEET_NAMES.LOADING_PROCESS);
    
    const now = new Date();
    const timestamp = now.toISOString();
    
    // Store both items and gradeItems / polyItems based on loadingType
    const itemsData = {
      type: data.loadingType === 'grade' ? 'grade' : 'regular',
      items: data.loadingType === 'grade' ? (data.gradeItems || []) : (data.items || []),
      polyItems: data.polyItems || []
    };
    
    const rowData = [
      timestamp,
      data.challanNo || '',
      data.date || '',
      data.dispatchFrom || '',
      data.dispatchTo || '',
      data.vehicleNo || '',
      data.driverName || '',
      data.driverNo || '',
      data.transporterName || '',
      data.lrNo || '',
      JSON.stringify(itemsData),
      data.loadingType || 'regular',
      data.user || 'Store Head'
    ];
    
    loadingSheet.appendRow(rowData);
    
    return {
      status: 'success',
      message: 'Loading process recorded successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Update Stock based on Inward/Outward
 * Improved matching logic with Properties and Type support
 */
function updateStock(data, action, qtyRolls, qtyKgs) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let stockSheet = ss.getSheetByName(SHEET_NAMES.STOCK);
    
    if (!stockSheet) {
      initializeSheets();
      stockSheet = ss.getSheetByName(SHEET_NAMES.STOCK);
    }
    
    // Ensure headers are correct
    const headers = stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).getValues()[0];
    const stockData = stockSheet.getDataRange().getValues();
    
    // Get column indices
    const materialIdIndex = headers.indexOf('Material_ID');
    const nameIndex = headers.indexOf('Name');
    const categoryIndex = headers.indexOf('Category');
    const materialTypeIndex = headers.indexOf('Material_Type');
    const propertiesIndex = headers.indexOf('Properties');
    const typeIndex = headers.indexOf('Type');
    const stockIndex = headers.indexOf('Current_Stock');
    const minStockIndex = headers.indexOf('Min_Stock');
    const unitIndex = headers.indexOf('Unit');
    
    // Determine quantity to use (prefer KGs, fallback to rolls)
    const quantity = qtyKgs > 0 ? qtyKgs : qtyRolls;
    const unit = qtyKgs > 0 ? 'KG' : 'Rolls';
    
    // Create a unique key for matching: Material_Type + Properties + Type (for raw materials)
    const matchKey = (data.materialType || '') + '_' + (data.properties || '') + '_' + (data.hiHo || '');
    
    let found = false;
    let foundRowIndex = -1;
    
    // Search for existing material
    if (stockData.length > 1) {
      for (let i = 1; i < stockData.length; i++) {
        const row = stockData[i];
        const existingId = row[materialIdIndex] || '';
        const existingName = row[nameIndex] || '';
        const existingMaterialType = row[materialTypeIndex] || '';
        const existingProperties = row[propertiesIndex] || '';
        const existingType = row[typeIndex] || '';
        const existingMatchKey = existingMaterialType + '_' + existingProperties + '_' + existingType;
        
        // Match by Material_ID (exact match) - highest priority
        if (data.id && existingId === data.id) {
          found = true;
          foundRowIndex = i;
          break;
        } 
        // Match by Material_Type + Properties + Type (for raw materials) - second priority
        else if (data.category === 'Raw Material' && existingMatchKey === matchKey && existingName === data.materialType) {
          found = true;
          foundRowIndex = i;
          break;
        } 
        // Fallback: match by name and material type only
        else if (!data.id && existingName === data.materialType && existingMaterialType === data.materialType) {
          found = true;
          foundRowIndex = i;
          break;
        }
      }
    }
    
    if (found && foundRowIndex > 0) {
      // Update existing stock
      const currentStock = parseFloat(stockData[foundRowIndex][stockIndex] || 0);
      const newStock = action === 'IN' 
        ? currentStock + quantity
        : Math.max(0, currentStock - quantity);
      
      stockSheet.getRange(foundRowIndex + 1, stockIndex + 1).setValue(newStock);
      
      // Update Properties and Type if they're empty and we have new data
      if (data.properties && (!stockData[foundRowIndex][propertiesIndex] || stockData[foundRowIndex][propertiesIndex] === '')) {
        stockSheet.getRange(foundRowIndex + 1, propertiesIndex + 1).setValue(data.properties);
      }
      if (data.hiHo && (!stockData[foundRowIndex][typeIndex] || stockData[foundRowIndex][typeIndex] === '')) {
        stockSheet.getRange(foundRowIndex + 1, typeIndex + 1).setValue(data.hiHo);
      }
      if (data.materialType && (!stockData[foundRowIndex][materialTypeIndex] || stockData[foundRowIndex][materialTypeIndex] === '')) {
        stockSheet.getRange(foundRowIndex + 1, materialTypeIndex + 1).setValue(data.materialType);
      }
    } else {
      // Add new entry
      const materialId = data.id || `${data.category}_${data.materialType}_${Date.now()}`;
      const materialName = data.materialType || 'Unknown Material';
      
      const newRow = [];
      newRow[materialIdIndex] = materialId;
      newRow[nameIndex] = materialName;
      newRow[categoryIndex] = data.category || '';
      newRow[materialTypeIndex] = data.materialType || '';
      newRow[propertiesIndex] = data.properties || '';
      newRow[typeIndex] = data.hiHo || '';
      newRow[stockIndex] = action === 'IN' ? quantity : 0;
      newRow[minStockIndex] = 0; // Min Stock
      newRow[unitIndex] = unit;
      
      // Fill empty cells to match column count
      const rowArray = [];
      for (let i = 0; i < headers.length; i++) {
        rowArray.push(newRow[i] !== undefined ? newRow[i] : '');
      }
      
      stockSheet.appendRow(rowArray);
    }
  } catch (error) {
    Logger.log('Error updating stock: ' + error.toString());
    // Don't throw error, just log it so the main operation can continue
  }
}

/**
 * Get Inward Report
 */
function getInwardReport() {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const inwardSheet = ss.getSheetByName(SHEET_NAMES.INWARD);
    
    if (!inwardSheet) {
      return { status: 'success', data: [] };
    }
    
    const data = inwardSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const reportData = rows.map((row, index) => {
      const item = { id: index + 1, rowIndex: index + 2 }; // +2 because row 1 is header
      headers.forEach((header, colIndex) => {
        if (header === 'Material_Type') {
          item.material = row[colIndex] || '';
          item.materialType = row[colIndex] || '';
        } else if (header === 'Vendor') {
          item.vendor = row[colIndex] || '';
        } else if (header === 'Qty_KGs') {
          const qty = row[colIndex] || 0;
          item.qty = qty > 0 ? qty + ' KG' : (row[headers.indexOf('Qty_Rolls')] || 0) + ' Rolls';
          item.qty_kgs = qty;
          item.qty_rolls = row[headers.indexOf('Qty_Rolls')] || 0;
        } else if (header === 'Date') {
          item.date = row[colIndex] || '';
        } else if (header === 'Time') {
          item.time = row[colIndex] || '';
        } else if (header === 'Category') {
          item.category = row[colIndex] || '';
        } else if (header === 'Material_ID') {
          item.id = row[colIndex] || '';
        } else if (header === 'Properties') {
          item.properties = row[colIndex] || '';
        } else if (header === 'HI_HO') {
          item.hiHo = row[colIndex] || '';
        } else if (header === 'NonWoven_UsedFor') {
          item.nonWovenUsedFor = row[colIndex] || '';
        }
      });
      return item;
    }).reverse(); // Most recent first
    
    return {
      status: 'success',
      data: reportData
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Get Outward Report
 */
function getOutwardReport() {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const outwardSheet = ss.getSheetByName(SHEET_NAMES.OUTWARD);
    
    if (!outwardSheet) {
      return { status: 'success', data: [] };
    }
    
    const data = outwardSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const reportData = rows.map((row, index) => {
      const item = { id: index + 1, rowIndex: index + 2 }; // +2 because row 1 is header
      headers.forEach((header, colIndex) => {
        if (header === 'Material_Type') {
          item.material = row[colIndex] || '';
          item.materialType = row[colIndex] || '';
        } else if (header === 'Machine_No') {
          item.machine = row[colIndex] || '';
          item.machineNo = row[colIndex] || '';
        } else if (header === 'Supervisor') {
          item.supervisor = row[colIndex] || '';
        } else if (header === 'Qty_KGs') {
          const qty = row[colIndex] || 0;
          item.qty = qty > 0 ? qty + ' KG' : (row[headers.indexOf('Qty_Rolls')] || 0) + ' Rolls';
          item.qty_kgs = qty;
          item.qty_rolls = row[headers.indexOf('Qty_Rolls')] || 0;
        } else if (header === 'Date') {
          item.date = row[colIndex] || '';
        } else if (header === 'Time') {
          item.time = row[colIndex] || '';
        } else if (header === 'Category') {
          item.category = row[colIndex] || '';
        } else if (header === 'Material_ID') {
          item.id = row[colIndex] || '';
        } else if (header === 'Properties') {
          item.properties = row[colIndex] || '';
        } else if (header === 'HI_HO') {
          item.hiHo = row[colIndex] || '';
        } else if (header === 'NonWoven_UsedFor') {
          item.nonWovenUsedFor = row[colIndex] || '';
        }
      });
      return item;
    }).reverse(); // Most recent first
    
    return {
      status: 'success',
      data: reportData
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Get Finished Goods Report
 */
function getFGReport() {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const fgSheet = ss.getSheetByName(SHEET_NAMES.FINISHED_GOODS);
    
    if (!fgSheet) {
      return { status: 'success', data: [] };
    }
    
    const data = fgSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const reportData = rows.map((row, index) => {
      const item = { id: index + 1, rowIndex: index + 2 }; // +2 because row 1 is header
      headers.forEach((header, colIndex) => {
        if (header === 'Product_Name') {
          item.product = row[colIndex] || '';
          item.productName = row[colIndex] || '';
        } else if (header === 'Size') {
          item.size = row[colIndex] || '';
          item.fgSize = row[colIndex] || '';
        } else if (header === 'Machine_No') {
          item.machine = row[colIndex] || '';
          item.machineNo = row[colIndex] || '';
        } else if (header === 'Batch') {
          item.batch = row[colIndex] || '';
        } else if (header === 'Total_Ctn') {
          item.qty = row[colIndex] ? row[colIndex] + ' Ctn' : '0 Ctn';
          item.fg_qty = row[colIndex] || 0;
        } else if (header === 'Date') {
          item.date = row[colIndex] || '';
        } else if (header === 'Time') {
          // Extract shift from time or use a default
          const time = row[colIndex] || '';
          item.shift = time.includes('AM') ? 'Shift A' : 'Shift B';
        } else if (header === 'Packs_Per_Ctn') {
          item.packsPerCtn = row[colIndex] || '';
          item.fgPacksPerCtn = row[colIndex] || '';
        } else if (header === 'Pcs_Per_Pack') {
          item.pcsPerPack = row[colIndex] || '';
          item.fgPcsPerPack = row[colIndex] || '';
        } else if (header === 'Action') {
          item.fgAction = row[colIndex] || 'IN';
        } else if (header === 'Dispatch_To') {
          item.fgDispatchTo = row[colIndex] || '';
        }
      });
      return item;
    }).reverse(); // Most recent first
    
    return {
      status: 'success',
      data: reportData
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Get Loading Process Report
 */
function getLoadingReport() {
  try {
    initializeSheets();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const loadingSheet = ss.getSheetByName(SHEET_NAMES.LOADING_PROCESS);
    
    if (!loadingSheet) {
      return { status: 'success', data: [] };
    }
    
    const data = loadingSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const reportData = rows.map((row, index) => {
      const item = { id: index + 1, rowIndex: index + 2 }; // +2 because row 1 is header
      let totalCtn = 0;
      let items = [];
      let loadingType = 'regular';
      let polyItems = [];
      
      headers.forEach((header, colIndex) => {
        if (header === 'Vehicle_No') {
          item.vehicleNo = row[colIndex] || '';
        } else if (header === 'Dispatch_To') {
          item.dispatchTo = row[colIndex] || '';
        } else if (header === 'Dispatch_From') {
          item.dispatchFrom = row[colIndex] || '';
        } else if (header === 'Driver_Name') {
          item.driverName = row[colIndex] || '';
        } else if (header === 'Driver_No') {
          item.driverNo = row[colIndex] || '';
        } else if (header === 'Challan_No') {
          item.challanNo = row[colIndex] || '';
        } else if (header === 'Date') {
          item.date = row[colIndex] || '';
        } else if (header === 'Transporter_Name') {
          item.transporterName = row[colIndex] || '';
        } else if (header === 'LR_No') {
          item.lrNo = row[colIndex] || '';
        } else if (header === 'Loading_Type') {
          loadingType = row[colIndex] || 'regular';
          item.loadingType = loadingType;
        } else if (header === 'Items_JSON') {
          try {
            const parsedData = JSON.parse(row[colIndex] || '{}');
            if (parsedData.type === 'grade') {
              items = parsedData.items || [];
              item.gradeItems = items;
              polyItems = parsedData.polyItems || [];
            } else {
              items = parsedData.items || [];
              totalCtn = items.reduce((sum, i) => sum + (parseFloat(i.totalCtn) || 0), 0);
            }
          } catch (e) {
            // Try old format (array directly)
            try {
              items = JSON.parse(row[colIndex] || '[]');
              totalCtn = items.reduce((sum, i) => sum + (parseFloat(i.totalCtn) || 0), 0);
            } catch (e2) {
              items = [];
            }
          }
        }
      });
      
      item.items = items;
      item.polyItems = polyItems;
      item.totalCtn = totalCtn;
      item.status = 'In Transit'; // Default status, can be updated manually
      
      return item;
    }).reverse(); // Most recent first
    
    return {
      status: 'success',
      data: reportData
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * Delete Inward Entry
 */
function deleteInward(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const inwardSheet = ss.getSheetByName(SHEET_NAMES.INWARD);
    
    if (!inwardSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      // Get the row data before deleting to update stock
      const rowData = inwardSheet.getRange(rowIndex, 1, 1, inwardSheet.getLastColumn()).getValues()[0];
      const headers = inwardSheet.getRange(1, 1, 1, inwardSheet.getLastColumn()).getValues()[0];
      
      const qtyKgsIndex = headers.indexOf('Qty_KGs');
      const qtyRollsIndex = headers.indexOf('Qty_Rolls');
      const materialTypeIndex = headers.indexOf('Material_Type');
      const categoryIndex = headers.indexOf('Category');
      const propertiesIndex = headers.indexOf('Properties');
      const hiHoIndex = headers.indexOf('HI_HO');
      const materialIdIndex = headers.indexOf('Material_ID');
      
      const deleteData = {
        category: rowData[categoryIndex],
        materialType: rowData[materialTypeIndex],
        id: rowData[materialIdIndex],
        properties: rowData[propertiesIndex],
        hiHo: rowData[hiHoIndex],
        qty_kgs: rowData[qtyKgsIndex] || 0,
        qty_rolls: rowData[qtyRollsIndex] || 0
      };
      
      // Update stock (reverse the inward)
      updateStock(deleteData, 'OUT', deleteData.qty_rolls, deleteData.qty_kgs);
      
      // Delete the row
      inwardSheet.deleteRow(rowIndex);
      
      return { status: 'success', message: 'Inward entry deleted successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * Delete Outward Entry
 */
function deleteOutward(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const outwardSheet = ss.getSheetByName(SHEET_NAMES.OUTWARD);
    
    if (!outwardSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      // Get the row data before deleting to update stock
      const rowData = outwardSheet.getRange(rowIndex, 1, 1, outwardSheet.getLastColumn()).getValues()[0];
      const headers = outwardSheet.getRange(1, 1, 1, outwardSheet.getLastColumn()).getValues()[0];
      
      const qtyKgsIndex = headers.indexOf('Qty_KGs');
      const qtyRollsIndex = headers.indexOf('Qty_Rolls');
      const materialTypeIndex = headers.indexOf('Material_Type');
      const categoryIndex = headers.indexOf('Category');
      const propertiesIndex = headers.indexOf('Properties');
      const hiHoIndex = headers.indexOf('HI_HO');
      const materialIdIndex = headers.indexOf('Material_ID');
      
      const deleteData = {
        category: rowData[categoryIndex],
        materialType: rowData[materialTypeIndex],
        id: rowData[materialIdIndex],
        properties: rowData[propertiesIndex],
        hiHo: rowData[hiHoIndex],
        qty_kgs: rowData[qtyKgsIndex] || 0,
        qty_rolls: rowData[qtyRollsIndex] || 0
      };
      
      // Update stock (reverse the outward - add back)
      updateStock(deleteData, 'IN', deleteData.qty_rolls, deleteData.qty_kgs);
      
      // Delete the row
      outwardSheet.deleteRow(rowIndex);
      
      return { status: 'success', message: 'Outward entry deleted successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * Delete Finished Goods Entry
 */
function deleteFG(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const fgSheet = ss.getSheetByName(SHEET_NAMES.FINISHED_GOODS);
    
    if (!fgSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      fgSheet.deleteRow(rowIndex);
      return { status: 'success', message: 'FG entry deleted successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * Delete Loading Process Entry
 */
function deleteLoading(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const loadingSheet = ss.getSheetByName(SHEET_NAMES.LOADING_PROCESS);
    
    if (!loadingSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      loadingSheet.deleteRow(rowIndex);
      return { status: 'success', message: 'Loading entry deleted successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * Update Inward Entry
 */
function updateInward(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const inwardSheet = ss.getSheetByName(SHEET_NAMES.INWARD);
    
    if (!inwardSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      // Get old data for stock reversal
      const oldRowData = inwardSheet.getRange(rowIndex, 1, 1, inwardSheet.getLastColumn()).getValues()[0];
      const headers = inwardSheet.getRange(1, 1, 1, inwardSheet.getLastColumn()).getValues()[0];
      
      // Reverse old stock
      const oldData = {
        category: oldRowData[headers.indexOf('Category')],
        materialType: oldRowData[headers.indexOf('Material_Type')],
        id: oldRowData[headers.indexOf('Material_ID')],
        properties: oldRowData[headers.indexOf('Properties')],
        hiHo: oldRowData[headers.indexOf('HI_HO')],
        qty_kgs: oldRowData[headers.indexOf('Qty_KGs')] || 0,
        qty_rolls: oldRowData[headers.indexOf('Qty_Rolls')] || 0
      };
      updateStock(oldData, 'OUT', oldData.qty_rolls, oldData.qty_kgs);
      
      // Update row with new data
      const now = new Date();
      const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm a');
      
      inwardSheet.getRange(rowIndex, 2).setValue(date);
      inwardSheet.getRange(rowIndex, 3).setValue(time);
      inwardSheet.getRange(rowIndex, 4).setValue(data.category || '');
      inwardSheet.getRange(rowIndex, 5).setValue(data.materialType || '');
      inwardSheet.getRange(rowIndex, 6).setValue(data.id || '');
      inwardSheet.getRange(rowIndex, 7).setValue(data.vendor || '');
      inwardSheet.getRange(rowIndex, 8).setValue(parseFloat(data.qty_rolls || 0));
      inwardSheet.getRange(rowIndex, 9).setValue(parseFloat(data.qty_kgs || 0));
      inwardSheet.getRange(rowIndex, 10).setValue(data.properties || '');
      inwardSheet.getRange(rowIndex, 11).setValue(data.hiHo || '');
      inwardSheet.getRange(rowIndex, 12).setValue(data.nonWovenUsedFor || '');
      
      // Update stock with new data
      updateStock(data, 'IN', parseFloat(data.qty_rolls || 0), parseFloat(data.qty_kgs || 0));
      
      return { status: 'success', message: 'Inward entry updated successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * Update Outward Entry
 */
function updateOutward(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const outwardSheet = ss.getSheetByName(SHEET_NAMES.OUTWARD);
    
    if (!outwardSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      // Get old data for stock reversal
      const oldRowData = outwardSheet.getRange(rowIndex, 1, 1, outwardSheet.getLastColumn()).getValues()[0];
      const headers = outwardSheet.getRange(1, 1, 1, outwardSheet.getLastColumn()).getValues()[0];
      
      // Reverse old stock (add back)
      const oldData = {
        category: oldRowData[headers.indexOf('Category')],
        materialType: oldRowData[headers.indexOf('Material_Type')],
        id: oldRowData[headers.indexOf('Material_ID')],
        properties: oldRowData[headers.indexOf('Properties')],
        hiHo: oldRowData[headers.indexOf('HI_HO')],
        qty_kgs: oldRowData[headers.indexOf('Qty_KGs')] || 0,
        qty_rolls: oldRowData[headers.indexOf('Qty_Rolls')] || 0
      };
      updateStock(oldData, 'IN', oldData.qty_rolls, oldData.qty_kgs);
      
      // Update row with new data
      const now = new Date();
      const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm a');
      
      outwardSheet.getRange(rowIndex, 2).setValue(date);
      outwardSheet.getRange(rowIndex, 3).setValue(time);
      outwardSheet.getRange(rowIndex, 4).setValue(data.category || '');
      outwardSheet.getRange(rowIndex, 5).setValue(data.materialType || '');
      outwardSheet.getRange(rowIndex, 6).setValue(data.id || '');
      outwardSheet.getRange(rowIndex, 7).setValue(data.machineNo || '');
      outwardSheet.getRange(rowIndex, 8).setValue(data.supervisor || '');
      outwardSheet.getRange(rowIndex, 9).setValue(parseFloat(data.qty_rolls || 0));
      outwardSheet.getRange(rowIndex, 10).setValue(parseFloat(data.qty_kgs || 0));
      outwardSheet.getRange(rowIndex, 11).setValue(data.properties || '');
      outwardSheet.getRange(rowIndex, 12).setValue(data.hiHo || '');
      outwardSheet.getRange(rowIndex, 13).setValue(data.nonWovenUsedFor || '');
      
      // Update stock with new data (subtract)
      updateStock(data, 'OUT', parseFloat(data.qty_rolls || 0), parseFloat(data.qty_kgs || 0));
      
      return { status: 'success', message: 'Outward entry updated successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * Update Finished Goods Entry
 */
function updateFG(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const fgSheet = ss.getSheetByName(SHEET_NAMES.FINISHED_GOODS);
    
    if (!fgSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      const now = new Date();
      const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm a');
      
      fgSheet.getRange(rowIndex, 2).setValue(date);
      fgSheet.getRange(rowIndex, 3).setValue(time);
      fgSheet.getRange(rowIndex, 4).setValue(data.productName || '');
      fgSheet.getRange(rowIndex, 5).setValue(data.fgSize || '');
      fgSheet.getRange(rowIndex, 6).setValue(data.machineNo || '');
      fgSheet.getRange(rowIndex, 7).setValue(data.batch || '');
      fgSheet.getRange(rowIndex, 8).setValue(parseFloat(data.fgPacksPerCtn || 0));
      fgSheet.getRange(rowIndex, 9).setValue(parseFloat(data.fgPcsPerPack || 0));
      fgSheet.getRange(rowIndex, 10).setValue(parseFloat(data.fg_qty || 0));
      fgSheet.getRange(rowIndex, 11).setValue(data.fgAction || 'IN');
      fgSheet.getRange(rowIndex, 12).setValue(data.fgDispatchTo || '');
      
      return { status: 'success', message: 'FG entry updated successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * Update Loading Process Entry
 */
function updateLoading(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const loadingSheet = ss.getSheetByName(SHEET_NAMES.LOADING_PROCESS);
    
    if (!loadingSheet) {
      return { status: 'error', message: 'Sheet not found' };
    }
    
    const rowIndex = parseInt(data.rowIndex);
    if (rowIndex && rowIndex > 1) {
      loadingSheet.getRange(rowIndex, 2).setValue(data.challanNo || '');
      loadingSheet.getRange(rowIndex, 3).setValue(data.date || '');
      loadingSheet.getRange(rowIndex, 4).setValue(data.dispatchFrom || '');
      loadingSheet.getRange(rowIndex, 5).setValue(data.dispatchTo || '');
      loadingSheet.getRange(rowIndex, 6).setValue(data.vehicleNo || '');
      loadingSheet.getRange(rowIndex, 7).setValue(data.driverName || '');
      loadingSheet.getRange(rowIndex, 8).setValue(data.driverNo || '');
      loadingSheet.getRange(rowIndex, 9).setValue(data.transporterName || '');
      loadingSheet.getRange(rowIndex, 10).setValue(data.lrNo || '');
      
      // Store both items and gradeItems / polyItems based on loadingType
      const itemsData = {
        type: data.loadingType === 'grade' ? 'grade' : 'regular',
        items: data.loadingType === 'grade' ? (data.gradeItems || []) : (data.items || []),
        polyItems: data.polyItems || []
      };
      
      loadingSheet.getRange(rowIndex, 11).setValue(JSON.stringify(itemsData));
      loadingSheet.getRange(rowIndex, 12).setValue(data.loadingType || 'regular');
      
      return { status: 'success', message: 'Loading entry updated successfully' };
    }
    
    return { status: 'error', message: 'Invalid row index' };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}
