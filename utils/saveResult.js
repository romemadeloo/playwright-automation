import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

/**
 * Save test results to an Excel sheet with timestamped filename.
 * Automatically creates folder based on account (sg or osp) and environment (dev/live)
 * 
 * @param {Array<Object>} results - The test result data to export
 * @param {string} env - The environment ("dev" or "live")
 * @param {string} account - The account name ("sg" or "osp")
 * @param {string} testName - The name of the test, e.g., "ButtonBadges"
 */
export function saveResultSheet(results, env, account, testName = 'TestResults') {
  try {
    // 🧭 Base path (your preferred test-results folder)
    const basePath = 'playwright-automation/test-results';

    // 🧭 Build subfolder (e.g., test-results/sg_live_test-sheets-results)
    const accountName = `${account}_${env}`;
    const folderName = path.join(basePath, `${accountName}_test-sheets-results`);

    // ✅ Ensure folder exists
    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName, { recursive: true });
      console.log(`📁 Created folder: ${folderName}`);
    }

    // 🕒 Timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${testName}Results_${timestamp}.xlsx`;
    const filePath = path.join(folderName, fileName);

    // 📄 Generate Excel file
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, testName);
    XLSX.writeFile(workbook, filePath);

    console.log(`📊 Saved results to: ${filePath}`);
  } catch (err) {
    console.error(`⚠️ Failed to save Excel: ${err.message}`);
  }

  console.log('🎯 Test completed (with or without errors).');
}
