/**
 * Safe Monthly Chart Importer Utility (Phase 2 - Strict Validation & Safe Apply)
 * Project: WEB2 (https://web2-ec085-default-rtdb.firebaseio.com/)
 * 
 * Target Firebase Datasets:
 * 1. a7satta/year_chart_data (DD-MM-YYYY format)
 * 2. a7satta/prev_fullchart_data (DD-MM format)
 * 
 * Safety Guarantees:
 * - Default execution mode is strictly DRY-RUN (0 Firebase writes).
 * - Firebase writes occur ONLY when --apply flag is explicitly provided AND all strict validation guards pass.
 * - Automatic complete local JSON backup created under backups/ before any write.
 * - In-memory pre-write verification guarantees zero regression on unrelated rows.
 * - Atomic multi-location Firebase update targets ONLY a7satta/year_chart_data and a7satta/prev_fullchart_data.
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 1. Parse Command Line Arguments
function parseArgs() {
    const args = {};
    const rawArgs = process.argv.slice(2);
    for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const nextArg = rawArgs[i + 1];
            if (nextArg && !nextArg.startsWith('--')) {
                args[key] = nextArg;
                i++;
            } else {
                args[key] = true;
            }
        }
    }
    return args;
}

// 2. Initialize Firebase Admin SDK
function initFirebase() {
    let serviceAccount = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
                ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
                : process.env.FIREBASE_SERVICE_ACCOUNT;
        } catch (err) {
            console.error('❌ [FIREBASE INIT ERROR] Invalid FIREBASE_SERVICE_ACCOUNT env JSON:', err.message);
            process.exit(1);
        }
    } else {
        const saPath = path.join(__dirname, '../service-account.json');
        if (!fs.existsSync(saPath)) {
            console.error(`❌ [FIREBASE INIT ERROR] service-account.json not found at: ${saPath}`);
            process.exit(1);
        }
        serviceAccount = require(saPath);
    }

    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount),
            databaseURL: 'https://web2-ec085-default-rtdb.firebaseio.com/'
        });
    }

    return getDatabase();
}

// 3. Simple CSV Parser supporting quotes and trim
function parseCSV(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`CSV file does not exist at path: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);

    if (lines.length === 0) {
        throw new Error(`CSV file is empty: ${filePath}`);
    }

    const parseLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(cur.replace(/^"|"$/g, ''));
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.replace(/^"|"$/g, ''));
        return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map((line, idx) => ({
        lineNumber: idx + 2,
        raw: line,
        fields: parseLine(line)
    }));

    return { headers, rows };
}

// 4. Real Calendar Date Validator
function isValidCalendarDate(day, month, year) {
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12 || day < 1) return false;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInMonth = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= daysInMonth[month];
}

// 5. Result Value Validator (Exact "-" or "01"-"99" allowed; blank, "00", single digits, & whitespace forbidden)
function isValidResultValue(val) {
    if (typeof val !== 'string') return false;
    // Reject any leading or trailing whitespace
    if (val !== val.trim()) return false;
    // Reject blank
    if (val === '') return false;
    // Accept exact "-"
    if (val === '-') return true;
    // Reject "00"
    if (val === '00') return false;
    // Must be exact 2-digit number from "01" to "99"
    return /^(0[1-9]|[1-9][0-9])$/.test(val);
}

// Helper: Get immediately previous calendar month & year in Asia/Kolkata timezone
function getKolkataPreviousMonth() {
    const kolkataDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const now = new Date(kolkataDateStr);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
        year: prevDate.getFullYear(),
        month: prevDate.getMonth() + 1
    };
}

// 6. Automatic Local Backup Creation
function executeLocalBackup(yearChartData, prevChartData, year, month) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const paddedMonth = String(month).padStart(2, '0');
        const backupFile = path.join(backupDir, `backup_web2_import_${year}_${paddedMonth}_${timestamp}.json`);
        
        const payload = {
            timestamp,
            year,
            month,
            a7satta: {
                year_chart_data: yearChartData,
                prev_fullchart_data: prevChartData
            }
        };
        fs.writeFileSync(backupFile, JSON.stringify(payload, null, 2), 'utf8');
        return backupFile;
    } catch (err) {
        throw new Error(`Failed to create local backup: ${err.message}`);
    }
}

// 7. Main Importer Routine
async function runImporter() {
    console.log('==================================================');
    console.log(' WEB2 SAFE MONTHLY CHART IMPORTER (PHASE 2)');
    console.log('==================================================');

    const args = parseArgs();

    if (args.help || !args.year || !args.month || !args.file) {
        console.log(`
Usage:
  node scripts/safe-chart-import.js --year <YYYY> --month <M/MM> --file <path-to-csv> [--apply]

Examples:
  # Dry-run analysis (default, zero writes):
  node scripts/safe-chart-import.js --year 2026 --month 8 --file august-2026.csv

  # Explicit apply mode (creates backup & writes ONLY if 0 validation errors exist):
  node scripts/safe-chart-import.js --year 2026 --month 8 --file august-2026.csv --apply

Options:
  --year   Target year (e.g. 2026)
  --month  Target month number (1-12)
  --file   Path to input CSV file
  --apply  Explicit flag to write to Firebase (requires 0 validation blockers)
`);
        process.exit(args.help ? 0 : 1);
    }

    const yearNum = parseInt(args.year, 10);
    const monthNum = parseInt(args.month, 10);
    const filePath = path.resolve(args.file);
    const isApplyMode = Boolean(args.apply);

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        console.error(`❌ Invalid --year argument: "${args.year}". Expected 4-digit year (e.g., 2026).`);
        process.exit(1);
    }

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        console.error(`❌ Invalid --month argument: "${args.month}". Expected 1 to 12.`);
        process.exit(1);
    }

    const paddedMonth = String(monthNum).padStart(2, '0');

    console.log(`📋 Target Configuration:`);
    console.log(`   - Selected Year:  ${yearNum}`);
    console.log(`   - Selected Month: ${monthNum} (${paddedMonth})`);
    console.log(`   - Input CSV File: ${filePath}`);
    console.log(`   - Mode:           ${isApplyMode ? '⚡ EXPLICIT APPLY MODE' : '🔒 DRY-RUN ONLY (Default, 0 writes)'}`);

    // Load CSV
    let csvData;
    try {
        csvData = parseCSV(filePath);
        console.log(`   - CSV Header Count: ${csvData.headers.length}`);
        console.log(`   - CSV Data Row Count: ${csvData.rows.length}`);
    } catch (err) {
        console.error(`❌ Failed to read CSV file: ${err.message}`);
        process.exit(1);
    }

    // Connect to Firebase
    console.log('\n🔥 Connecting to Firebase RTDB...');
    const db = initFirebase();

    console.log('📥 Fetching current Firebase data...');
    const yearChartSnap = await db.ref('a7satta/year_chart_data').once('value');
    const prevChartSnap = await db.ref('a7satta/prev_fullchart_data').once('value');
    const dbHeadersSnap = await db.ref('a7satta/fullchart_headers').once('value');
    const dbGamesPrimarySnap = await db.ref('a7satta/games_primary').once('value');

    const yearChartData = yearChartSnap.val() || [];
    const prevChartData = prevChartSnap.val() || [];
    const dbHeaders = dbHeadersSnap.val() || (dbGamesPrimarySnap.val() ? dbGamesPrimarySnap.val().map(g => g.name) : []);

    console.log(`   - Existing Year Chart Rows: ${yearChartData.length}`);
    console.log(`   - Existing Prev Chart Rows: ${prevChartData.length}`);
    console.log(`   - DB Game Headers (${dbHeaders.length}):`, dbHeaders.join(', '));

    // ==================================================
    // STRICT VALIDATION CHECKS
    // ==================================================
    const validationErrors = [];

    // 0. Previous Month Year Safety Guard
    const prevMonthInfo = getKolkataPreviousMonth();
    const isTargetingCurrentPrevMonth = (yearNum === prevMonthInfo.year && monthNum === prevMonthInfo.month);

    if (!isTargetingCurrentPrevMonth) {
        validationErrors.push({
            type: 'PREV_MONTH_YEAR_SAFETY',
            message: `prev_fullchart_data cannot safely represent historical year (${yearNum}) because its dates contain no year.`
        });
    }

    // 1. CSV Header vs DB Headers Validation
    const csvDateColName = csvData.headers[0];
    const csvGameHeaders = csvData.headers.slice(1);

    const headersMatchExactly = JSON.stringify(csvGameHeaders) === JSON.stringify(dbHeaders);
    if (!headersMatchExactly) {
        validationErrors.push({
            type: 'HEADER_MISMATCH',
            message: `CSV headers do not EXACTLY match Firebase headers in order or names. Expected (${dbHeaders.length}): [${dbHeaders.join(', ')}], Found (${csvGameHeaders.length}): [${csvGameHeaders.join(', ')}]`
        });
    }

    // 2. Row-by-Row Validation
    const dateSeen = new Map();
    const duplicateDates = [];
    const invalidRows = [];
    const rowsOutsideMonth = [];
    const validCsvRows = [];

    csvData.rows.forEach(r => {
        const dateVal = r.fields[0];
        const resultVals = r.fields.slice(1);

        if (!dateVal) {
            invalidRows.push({ line: r.lineNumber, reason: 'Empty date value', raw: r.raw });
            return;
        }

        // Check duplicate dates
        if (dateSeen.has(dateVal)) {
            duplicateDates.push({ date: dateVal, line1: dateSeen.get(dateVal), line2: r.lineNumber });
        } else {
            dateSeen.set(dateVal, r.lineNumber);
        }

        // Check result column count
        if (resultVals.length !== dbHeaders.length) {
            invalidRows.push({
                line: r.lineNumber,
                date: dateVal,
                reason: `Column count mismatch (Expected ${dbHeaders.length}, got ${resultVals.length})`,
                raw: r.raw
            });
            return;
        }

        // Validate result values ("-" or "01"-"99" allowed; blank/empty and "00" are forbidden)
        resultVals.forEach((val, colIdx) => {
            if (!isValidResultValue(val)) {
                invalidRows.push({
                    line: r.lineNumber,
                    date: dateVal,
                    reason: `Invalid result value "${val}" at game "${dbHeaders[colIdx] || colIdx}" (Allowed: "-" or "01" through "99"; blank/empty and "00" are forbidden)`,
                    raw: r.raw
                });
            }
        });

        // Strict Date Format Check (must be exact DD-MM-YYYY format, e.g. "01-08-2026")
        if (!/^\d{2}-\d{2}-\d{4}$/.test(dateVal)) {
            invalidRows.push({
                line: r.lineNumber,
                date: dateVal,
                reason: `Invalid date format "${dateVal}". Dates must strictly match DD-MM-YYYY format (e.g., "01-08-2026").`,
                raw: r.raw
            });
            return;
        }

        const [dayStr, monthStr, yearStr] = dateVal.split('-');
        const dayNum = parseInt(dayStr, 10);
        const dateMonth = parseInt(monthStr, 10);
        const dateYear = parseInt(yearStr, 10);

        // Real Calendar Date Check (e.g., reject 31-02-2026)
        if (!isValidCalendarDate(dayNum, dateMonth, dateYear)) {
            invalidRows.push({
                line: r.lineNumber,
                date: dateVal,
                reason: `Invalid calendar date "${dateVal}" (${dayNum} is not a valid day for month ${dateMonth} in year ${dateYear})`,
                raw: r.raw
            });
            return;
        }

        // Target Month & Year Match Check
        if (dateMonth !== monthNum) {
            rowsOutsideMonth.push({
                line: r.lineNumber,
                date: dateVal,
                reason: `Date month (${dateMonth}) does not match selected month (${monthNum})`
            });
            return;
        }

        if (dateYear !== yearNum) {
            rowsOutsideMonth.push({
                line: r.lineNumber,
                date: dateVal,
                reason: `Date year (${dateYear}) does not match selected year (${yearNum})`
            });
            return;
        }

        const yearChartDateKey = dateVal; // Exact DD-MM-YYYY date string from CSV without normalization
        const prevChartDateKey = `${dayStr}-${monthStr}`; // Derived DD-MM for prev_fullchart_data only

        validCsvRows.push({
            lineNumber: r.lineNumber,
            rawDate: dateVal,
            dayStr,
            monthStr,
            yearStr,
            yearChartDateKey,
            prevChartDateKey,
            values: resultVals // Exact original CSV values, NO trim() or normalization
        });
    });

    if (duplicateDates.length > 0) {
        duplicateDates.forEach(d => {
            validationErrors.push({
                type: 'DUPLICATE_DATE',
                message: `Duplicate date "${d.date}" found on CSV lines ${d.line1} and ${d.line2}`
            });
        });
    }

    if (invalidRows.length > 0) {
        invalidRows.forEach(i => {
            validationErrors.push({
                type: 'INVALID_ROW',
                message: `Line ${i.line} (Date "${i.date || 'N/A'}"): ${i.reason}`
            });
        });
    }

    if (rowsOutsideMonth.length > 0) {
        rowsOutsideMonth.forEach(o => {
            validationErrors.push({
                type: 'ROW_OUTSIDE_MONTH',
                message: `Line ${o.line} (Date "${o.date}"): ${o.reason}`
            });
        });
    }

    // ==================================================
    // IN-MEMORY SAFE MERGE PREPARATION
    // ==================================================
    const finalYearChart = JSON.parse(JSON.stringify(yearChartData));
    const finalPrevChart = JSON.parse(JSON.stringify(prevChartData));

    const yearChartChanges = [];
    const prevChartChanges = [];

    validCsvRows.forEach(row => {
        // Merge into Year Chart (DD-MM-YYYY)
        const ycIdx = finalYearChart.findIndex(r => r && r.date === row.yearChartDateKey);
        if (ycIdx !== -1) {
            const existingRow = finalYearChart[ycIdx];
            const isIdentical = JSON.stringify(existingRow.values) === JSON.stringify(row.values);
            if (!isIdentical) {
                yearChartChanges.push({ type: 'UPDATE', date: row.yearChartDateKey, oldVals: existingRow.values, newVals: row.values });
                finalYearChart[ycIdx] = {
                    ...existingRow,
                    values: row.values
                };
            }
        } else {
            yearChartChanges.push({ type: 'ADD', date: row.yearChartDateKey, newVals: row.values });
            finalYearChart.push({
                id: `yc_r${row.dayStr}${row.monthStr}${row.yearStr}`,
                date: row.yearChartDateKey,
                values: row.values
            });
        }

        // Merge into Previous Month (DD-MM)
        const pfcIdx = finalPrevChart.findIndex(r => r && r.date === row.prevChartDateKey);
        if (pfcIdx !== -1) {
            const existingRow = finalPrevChart[pfcIdx];
            const isIdentical = JSON.stringify(existingRow.values) === JSON.stringify(row.values);
            if (!isIdentical) {
                prevChartChanges.push({ type: 'UPDATE', date: row.prevChartDateKey, oldVals: existingRow.values, newVals: row.values });
                finalPrevChart[pfcIdx] = {
                    ...existingRow,
                    values: row.values
                };
            }
        } else {
            prevChartChanges.push({ type: 'ADD', date: row.prevChartDateKey, newVals: row.values });
            finalPrevChart.push({
                id: `pfc_r${row.dayStr}${row.monthStr}`,
                date: row.prevChartDateKey,
                values: row.values
            });
        }
    });

    // ==================================================
    // IN-MEMORY PRE-WRITE VERIFICATION
    // ==================================================
    const preWriteErrors = [];

    // Verify Year Chart rows outside target month/year are byte-for-byte unchanged
    const initialYcUnrelated = yearChartData.filter(r => r && r.date && !r.date.endsWith(`-${paddedMonth}-${yearNum}`));
    const finalYcUnrelated = finalYearChart.filter(r => r && r.date && !r.date.endsWith(`-${paddedMonth}-${yearNum}`));

    if (JSON.stringify(initialYcUnrelated) !== JSON.stringify(finalYcUnrelated)) {
        preWriteErrors.push('Year Chart rows outside target month/year were altered in memory!');
    }

    // Verify Prev Chart rows outside target month are byte-for-byte unchanged
    const initialPfcUnrelated = prevChartData.filter(r => r && r.date && !r.date.endsWith(`-${paddedMonth}`));
    const finalPfcUnrelated = finalPrevChart.filter(r => r && r.date && !r.date.endsWith(`-${paddedMonth}`));

    if (JSON.stringify(initialPfcUnrelated) !== JSON.stringify(finalPfcUnrelated)) {
        preWriteErrors.push('Previous Month rows outside target month were altered in memory!');
    }

    // Verify no rows were deleted
    if (finalYearChart.length < yearChartData.length) {
        preWriteErrors.push(`Year Chart row count decreased (${finalYearChart.length} vs initial ${yearChartData.length})!`);
    }
    if (finalPrevChart.length < prevChartData.length) {
        preWriteErrors.push(`Prev Chart row count decreased (${finalPrevChart.length} vs initial ${prevChartData.length})!`);
    }

    // ==================================================
    // PRINT REPORT
    // ==================================================
    console.log('\n==================================================');
    console.log(` IMPORTER REPORT (${isApplyMode ? 'APPLY MODE' : 'DRY-RUN MODE'})`);
    console.log('==================================================');

    console.log(`\n1. HEADER VALIDATION:`);
    if (headersMatchExactly) {
        console.log(`   ✅ CSV Game Headers match DB Headers perfectly in order and names.`);
    } else {
        console.log(`   ❌ BLOCKING ERROR: CSV Game Headers do NOT match DB Headers!`);
    }

    console.log(`\n2. VALIDATION & SAFETY CHECKS:`);
    console.log(`   - Total CSV Rows:            ${csvData.rows.length}`);
    console.log(`   - Valid Target Month Rows:   ${validCsvRows.length}`);
    console.log(`   - Total Validation Blockers: ${validationErrors.length}`);

    if (validationErrors.length > 0) {
        console.log(`\n   ❌ BLOCKING VALIDATION ERRORS (${validationErrors.length}):`);
        validationErrors.forEach((e, idx) => console.log(`      ${idx + 1}. [${e.type}] ${e.message}`));
    }

    console.log(`\n3. YEAR CHART PROPOSED IMPACT (a7satta/year_chart_data):`);
    console.log(`   - Existing DB Rows for Target Month: ${yearChartData.filter(r => r && r.date && r.date.endsWith(`-${paddedMonth}-${yearNum}`)).length}`);
    console.log(`   - Rows to Add:    ${yearChartChanges.filter(c => c.type === 'ADD').length}`);
    console.log(`   - Rows to Update: ${yearChartChanges.filter(c => c.type === 'UPDATE').length}`);

    console.log(`\n4. PREVIOUS MONTH PROPOSED IMPACT (a7satta/prev_fullchart_data):`);
    console.log(`   - Existing DB Rows for Target Month: ${prevChartData.filter(r => r && r.date && r.date.endsWith(`-${paddedMonth}`)).length}`);
    console.log(`   - Rows to Add:    ${prevChartChanges.filter(c => c.type === 'ADD').length}`);
    console.log(`   - Rows to Update: ${prevChartChanges.filter(c => c.type === 'UPDATE').length}`);

    // ==================================================
    // EXECUTION GATE: APPLY vs DRY-RUN
    // ==================================================
    if (!isApplyMode) {
        console.log('\n==================================================');
        console.log(' DRY-RUN COMPLETE — 0 WRITES PERFORMED TO FIREBASE');
        console.log(' Pass --apply flag to execute writes (if 0 validation errors).');
        console.log('==================================================\n');
        process.exit(0);
    }

    // IF APPLY MODE: Check blocking errors
    if (validationErrors.length > 0 || preWriteErrors.length > 0) {
        console.error('\n==================================================');
        console.error(' ❌ IMPORT ABORTED: BLOCKING ERRORS DETECTED');
        console.error(' ZERO WRITES WERE EXECUTED TO FIREBASE.');
        if (preWriteErrors.length > 0) {
            console.error(' Pre-write memory verification failures:', preWriteErrors);
        }
        console.error('==================================================\n');
        process.exit(1);
    }

    // NO-CHANGE SAFETY GUARD: Exit cleanly without backup or Firebase write if 0 changes detected
    if (yearChartChanges.length === 0 && prevChartChanges.length === 0) {
        console.log('\n==================================================');
        console.log(' NO CHANGES DETECTED — ZERO FIREBASE WRITES REQUIRED.');
        console.log('==================================================\n');
        process.exit(0);
    }

    // CREATE AUTOMATIC LOCAL BACKUP BEFORE WRITE
    console.log('\n💾 Creating automatic local JSON backup before writing...');
    let backupFilePath;
    try {
        backupFilePath = executeLocalBackup(yearChartData, prevChartData, yearNum, monthNum);
        console.log(`   ✅ BACKUP SUCCESSFUL: ${backupFilePath}`);
    } catch (err) {
        console.error(`\n❌ BACKUP FAILED: ${err.message}`);
        console.error(' ❌ IMPORT ABORTED: ZERO WRITES EXECUTED TO FIREBASE.');
        process.exit(1);
    }

    // ATOMIC MULTI-LOCATION FIREBASE UPDATE
    console.log('\n🚀 Performing atomic multi-location update to Firebase RTDB...');
    const updates = {};
    updates['a7satta/year_chart_data'] = finalYearChart;
    updates['a7satta/prev_fullchart_data'] = finalPrevChart;

    try {
        await db.ref().update(updates);
        console.log('   ✅ FIREBASE WRITE SUCCESSFUL.');
    } catch (err) {
        console.error(`\n❌ FIREBASE WRITE FAILED: ${err.message}`);
        process.exit(1);
    }

    // POST-WRITE VERIFICATION
    console.log('\n🔍 Performing post-write verification from Firebase...');
    const postYearSnap = await db.ref('a7satta/year_chart_data').once('value');
    const postPrevSnap = await db.ref('a7satta/prev_fullchart_data').once('value');
    const postYearData = postYearSnap.val() || [];
    const postPrevData = postPrevSnap.val() || [];

    const yearMatch = JSON.stringify(postYearData) === JSON.stringify(finalYearChart);
    const prevMatch = JSON.stringify(postPrevData) === JSON.stringify(finalPrevChart);

    console.log('\n==================================================');
    console.log(' POST-WRITE VERIFICATION REPORT');
    console.log('==================================================');
    console.log(` - Year Chart Verification:  ${yearMatch ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(` - Prev Chart Verification:  ${prevMatch ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(` - Backup File Created:      ${backupFilePath}`);
    console.log('==================================================\n');

    process.exit(yearMatch && prevMatch ? 0 : 1);
}

runImporter().catch(err => {
    console.error('❌ Importer execution error:', err);
    process.exit(1);
});
