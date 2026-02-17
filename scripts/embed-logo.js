const fs = require('fs');
const path = require('path');
const base64 = fs.readFileSync(path.join(__dirname, '../src/logo-base64.txt'), 'utf8').trim();
const out = `export const LOGO_DATA_URL = "data:image/png;base64,${base64}";`;
fs.writeFileSync(path.join(__dirname, '../src/logoDataUrl.js'), out);
console.log('logoDataUrl.js created');
