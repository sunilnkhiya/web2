/**
 * One-Time Script: Seed Missing Historical Year Chart Dummy Data (Merge Only)
 * Firebase Project ID: web2-ec085
 *
 * Target Date Range:
 * - 01-01-2024 to 31-12-2024
 * - 01-01-2025 to 31-12-2025
 * - 01-01-2026 to 30-06-2026
 *
 * Merges ONLY missing dates into a7satta/year_chart_data.
 * NEVER overwrites existing records.
 * NEVER deletes existing records.
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 1. Verify service account & project_id
const serviceAccountPath = path.join(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`❌ Error: service-account.json file not found at: ${serviceAccountPath}`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
if (serviceAccount.project_id !== 'web2-ec085') {
    console.error(`❌ Error: Expected project_id "web2-ec085", but got "${serviceAccount.project_id}".`);
    process.exit(1);
}

// 2. Parse Command Line Arguments
const isWriteMode = process.argv.includes('--write') || process.argv.includes('--commit');
const isDryRun = !isWriteMode;

// 3. Initialize Firebase Admin SDK
if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
        databaseURL: 'https://web2-ec085-default-rtdb.firebaseio.com/'
    });
}

const DEFAULT_FULLCHART_HEADERS = [
    "साइबर सिटी", "सदर बाजार", "ग्वालियर", "दिल्ली बाजार",
    "गांधी नगर", "श्री गणेश", "करोल बाग", "फरीदाबाद",
    "कश्मीरी डे", "अलवर", "गाज़ियाबाद", "गंगा नाइट",
    "गली", "दिसावर"
];

function generateHistoricalDates() {
    const dates = [];

    // 2024: 01-01-2024 to 31-12-2024 (Leap year = 366 days)
    const start2024 = new Date(2024, 0, 1);
    const end2024 = new Date(2024, 11, 31);
    for (let dt = new Date(start2024); dt <= end2024; dt.setDate(dt.getDate() + 1)) {
        const d = String(dt.getDate()).padStart(2, '0');
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = dt.getFullYear();
        dates.push(`${d}-${m}-${y}`);
    }

    // 2025: 01-01-2025 to 31-12-2025 (365 days)
    const start2025 = new Date(2025, 0, 1);
    const end2025 = new Date(2025, 11, 31);
    for (let dt = new Date(start2025); dt <= end2025; dt.setDate(dt.getDate() + 1)) {
        const d = String(dt.getDate()).padStart(2, '0');
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = dt.getFullYear();
        dates.push(`${d}-${m}-${y}`);
    }

    // 2026: 01-01-2026 to 30-06-2026 (181 days)
    const start2026 = new Date(2026, 0, 1);
    const end2026 = new Date(2026, 5, 30);
    for (let dt = new Date(start2026); dt <= end2026; dt.setDate(dt.getDate() + 1)) {
        const d = String(dt.getDate()).padStart(2, '0');
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = dt.getFullYear();
        dates.push(`${d}-${m}-${y}`);
    }

    return dates;
}

function getRandomJodi() {
    const num = Math.floor(Math.random() * 99) + 1;
    return num < 10 ? '0' + num : String(num);
}

function parseDateDDMMYYYY(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return 0;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    return new Date(year, month - 1, day).getTime();
}

async function main() {
    try {
        console.log('====================================================');
        console.log(' WEB1 HISTORICAL YEAR CHART SEEDER (MERGE ONLY)');
        console.log(` Mode: ${isDryRun ? '🔍 DRY RUN (NO FIREBASE WRITES)' : '⚡ REAL WRITE MODE'}`);
        console.log(' Target Firebase Project: web2-ec085');
        console.log(' Database URL:            https://web2-ec085-default-rtdb.firebaseio.com/');
        console.log(' Path:                    a7satta/year_chart_data');
        console.log('====================================================\n');

        const db = getDatabase();
        const yearChartRef = db.ref('a7satta/year_chart_data');
        const yearHeadersRef = db.ref('a7satta/year_chart_headers');

        // Fetch existing data
        const snapshot = await yearChartRef.once('value');
        const rawExisting = snapshot.val();
        let existingRows = [];
        if (Array.isArray(rawExisting)) {
            existingRows = rawExisting;
        } else if (rawExisting && typeof rawExisting === 'object') {
            existingRows = Object.values(rawExisting);
        }

        const headersSnap = await yearHeadersRef.once('value');
        const existingHeaders = headersSnap.val() || DEFAULT_FULLCHART_HEADERS;
        const columnCount = Array.isArray(existingHeaders) ? existingHeaders.length : 14;

        console.log(`📊 Existing Year Chart Row Count in Firebase: ${existingRows.length}`);

        // Set of existing dates
        const existingDateSet = new Set();
        existingRows.forEach(r => {
            if (r && r.date) {
                existingDateSet.add(r.date.trim());
            }
        });

        // Generate target historical dates
        const targetDates = generateHistoricalDates();
        console.log(`📅 Target Historical Dates Generated: ${targetDates.length}`);

        let addedCount = 0;
        let skippedCount = 0;
        const newRowsToAdd = [];

        targetDates.forEach(dateStr => {
            if (existingDateSet.has(dateStr)) {
                skippedCount++;
            } else {
                addedCount++;
                const parts = dateStr.split('-');
                const dayStr = parts[0];
                const monthStr = parts[1];
                const yearStr = parts[2];
                const values = [];
                for (let c = 0; c < columnCount; c++) {
                    values.push(getRandomJodi());
                }
                newRowsToAdd.push({
                    id: `yc_${yearStr}_${monthStr}_${dayStr}`,
                    date: dateStr,
                    values: values
                });
            }
        });

        // Merge existing and new rows (Preserve all existing rows intact)
        const finalMergedRows = [...existingRows, ...newRowsToAdd];

        // Sort chronologically by date
        finalMergedRows.sort((a, b) => {
            const timeA = parseDateDDMMYYYY(a.date);
            const timeB = parseDateDDMMYYYY(b.date);
            return timeA - timeB;
        });

        console.log('\n--- DRY RUN REPORT ---');
        console.log(`Existing Year Chart Rows:      ${existingRows.length}`);
        console.log(`Target Historical Source Rows: ${targetDates.length}`);
        console.log(`Duplicate/Existing (Skipped):  ${skippedCount}`);
        console.log(`New Missing Rows To Add:       ${addedCount}`);
        console.log(`Final Expected Merged Rows:    ${finalMergedRows.length}`);
        console.log('----------------------\n');

        if (isDryRun) {
            console.log('🔒 DRY RUN COMPLETE. No changes were made to Firebase.');
            console.log('To execute the real write, run with --write flag after approval.');
            process.exit(0);
        }

        // Real Write Mode
        console.log('🚀 Executing Real Write to Firebase RTDB path: a7satta/year_chart_data...');
        await yearChartRef.set(finalMergedRows);
        console.log('✅ SUCCESS: Successfully merged and updated a7satta/year_chart_data!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error during year chart seeding:', err);
        process.exit(1);
    }
}

main();
