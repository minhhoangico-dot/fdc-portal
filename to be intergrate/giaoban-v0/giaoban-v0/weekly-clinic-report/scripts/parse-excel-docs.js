
const XLSX = require('xlsx');
const path = require('path');

// Read invoice-based file
const invoiceWb = XLSX.readFile(path.join(__dirname, '../docs/base on invoice.xls'));
const invoiceSheet = invoiceWb.Sheets[invoiceWb.SheetNames[0]];
const invoiceData = XLSX.utils.sheet_to_json(invoiceSheet, { header: 1 });

// Read doctor-order-based file  
const orderWb = XLSX.readFile(path.join(__dirname, '../docs/based on doctor order.xls'));
const orderSheet = orderWb.Sheets[orderWb.SheetNames[0]];
const orderData = XLSX.utils.sheet_to_json(orderSheet, { header: 1 });

console.log('=== INVOICE-BASED FILE ===');
console.log('Sheet names:', invoiceWb.SheetNames);
console.log('Headers (Row 1):', invoiceData[0]);
console.log('Sample data (Row 2):', invoiceData[1]);
console.log('Sample data (Row 3):', invoiceData[2]);

console.log('\n=== DOCTOR ORDER-BASED FILE ===');
console.log('Sheet names:', orderWb.SheetNames);
console.log('Headers (Row 1):', orderData[0]);
console.log('Sample data (Row 2):', orderData[1]);
console.log('Sample data (Row 3):', orderData[2]);
