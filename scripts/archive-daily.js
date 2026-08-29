const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const path = require('path');

// 1. Initialize Firebase Admin SDK using Environment Secret or Local Fallback File
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : process.env.FIREBASE_SERVICE_ACCOUNT;
        console.log('[FIREBASE ADMIN] Loaded service account credentials from process.env.FIREBASE_SERVICE_ACCOUNT');
    } catch (err) {
        console.error('[FIREBASE ADMIN ERROR] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON env variable:', err.message);
        process.exit(1);
    }
} else {
    try {
        const localSaPath = path.join(__dirname, '../service-account.json');
        serviceAccount = require(localSaPath);
        console.log('[FIREBASE ADMIN] Loaded local service account key file from:', localSaPath);
    } catch (err) {
        console.error('[FIREBASE ADMIN ERROR] No FIREBASE_SERVICE_ACCOUNT env var or local service-account.json file found:', err.message);
        process.exit(1);
    }
}

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
        databaseURL: "https://web2-ec085-default-rtdb.firebaseio.com/"
    });
}

// 2. Accurate Previous Calendar Date Calculation in Asia/Kolkata timezone
function getKolkataTargetDate(customDateStr = null) {
    if (customDateStr && typeof customDateStr === 'string') {
        const trimmed = customDateStr.trim();
        if (trimmed.includes('-')) {
            const parts = trimmed.split('-');
            let d, m, y;
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                [y, m, d] = parts;
            } else if (parts.length >= 3) {
                // DD-MM-YYYY
                [d, m, y] = parts;
            } else if (parts.length === 2) {
                // DD-MM
                [d, m] = parts;
                y = String(new Date().getFullYear());
            }

            if (d && m && y) {
                const pd = String(d).padStart(2, '0');
                const pm = String(m).padStart(2, '0');
                const py = String(y);
                return {
                    dateDDMM: `${pd}-${pm}`,
                    dateDDMMYYYY: `${pd}-${pm}-${py}`,
                    fullISO: `${py}-${pm}-${pd}`
                };
            }
        }
    }

    // Default: Calculate previous calendar date in Asia/Kolkata timezone
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    const currentDateStr = formatter.format(new Date());

    const [curYear, curMonth, curDay] = currentDateStr.split('-').map(Number);
    // Subtract 1 calendar day safely using UTC Date math
    const prevDate = new Date(Date.UTC(curYear, curMonth - 1, curDay - 1));

    const py = String(prevDate.getUTCFullYear());
    const pm = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
    const pd = String(prevDate.getUTCDate()).padStart(2, '0');

    return {
        dateDDMM: `${pd}-${pm}`,
        dateDDMMYYYY: `${pd}-${pm}-${py}`,
        fullISO: `${py}-${pm}-${pd}`
    };
}

// 3. Unicode Normalization & Stable Game Key Mapping
function normalizeGameName(name) {
    if (!name) return '';
    return String(name)
        .normalize('NFC')
        .trim()
        .toLowerCase()
        .replace(/[\s\-_]/g, '');
}

const GAME_ALIASES = {
    'cyber-city': 'cyber-city',
    'cybercity': 'cyber-city',
    'साइबरसिटी': 'cyber-city',
    'mumbai-day': 'cyber-city',
    'mumbaiday': 'cyber-city',
    'chennaiday': 'cyber-city',
    'चेन्नईडे': 'cyber-city',
    'मुंबईडे': 'cyber-city',
    'sadar-bazar': 'sadar-bazar',
    'sadarbazar': 'sadar-bazar',
    'सदरबाजार': 'sadar-bazar',
    'gwalior': 'gwalior',
    'ग्वालियर': 'gwalior',
    'delhi-bazar': 'delhi-bazar',
    'delhibazar': 'delhi-bazar',
    'दिल्लीबाजार': 'delhi-bazar',
    'gandhi-nagar': 'gandhi-nagar',
    'gandhinagar': 'gandhi-nagar',
    'गांधीनगर': 'gandhi-nagar',
    'bhopal-city': 'gandhi-nagar',
    'bhopalcity': 'gandhi-nagar',
    'udaipurtown': 'gandhi-nagar',
    'उदयपुरटाउन': 'gandhi-nagar',
    'भोपालसिटी': 'gandhi-nagar',
    'shree-ganesh': 'shree-ganesh',
    'shreeganesh': 'shree-ganesh',
    'श्रीगणेश': 'shree-ganesh',
    'karol-bagh': 'karol-bagh',
    'karolbagh': 'karol-bagh',
    'करोलबाग': 'karol-bagh',
    'jaipur-city': 'karol-bagh',
    'jaipurcity': 'karol-bagh',
    'bombaycity': 'karol-bagh',
    'बॉम्बेसिटी': 'karol-bagh',
    'जयपुरसिटी': 'karol-bagh',
    'faridabad': 'faridabad',
    'फरीदाबाद': 'faridabad',
    'kashmiri-day': 'kashmiri-day',
    'kashmiriday': 'kashmiri-day',
    'कश्मीरीडे': 'kashmiri-day',
    'surat': 'kashmiri-day',
    'suratcity': 'kashmiri-day',
    'dehradunbazar': 'kashmiri-day',
    'देहरादूनबाजार': 'kashmiri-day',
    'कश्मीरी डे': 'kashmiri-day',
    'alwar': 'alwar',
    'अलवर': 'alwar',
    'gaziyabad': 'gaziyabad',
    'गाज़ियाबाद': 'gaziyabad',
    'गाज़ियाबाद': 'gaziyabad',
    'ganga-night': 'ganga-night',
    'ganganight': 'ganga-night',
    'गंगानाइट': 'ganga-night',
    'गंगानाईट': 'ganga-night',
    'pune-night': 'ganga-night',
    'punenight': 'ganga-night',
    'ayodhyanagari': 'ganga-night',
    'अयोध्यानगरी': 'ganga-night',
    'पुणेनाईट': 'ganga-night',
    'gali': 'gali',
    'गली': 'gali',
    'disawar': 'disawar',
    'दिसावर': 'disawar'
};

function getCanonicalGameKey(gameObj) {
    if (!gameObj) return '';
    if (gameObj.id) {
        const normId = normalizeGameName(gameObj.id);
        if (GAME_ALIASES[normId]) return GAME_ALIASES[normId];
    }
    if (gameObj.slug) {
        const normSlug = normalizeGameName(gameObj.slug);
        if (GAME_ALIASES[normSlug]) return GAME_ALIASES[normSlug];
    }
    if (gameObj.name) {
        const normName = normalizeGameName(gameObj.name);
        if (GAME_ALIASES[normName]) return GAME_ALIASES[normName];
        return normName;
    }
    return '';
}

// 4. Main Archive Execution Function
async function main() {
    try {
        const db = getDatabase();
        const rootRef = db.ref('a7satta');

        const customDateArg = process.argv[2] || null;
        const forceFlag = process.argv.includes('--force');

        const target = getKolkataTargetDate(customDateArg);
        const { dateDDMM, dateDDMMYYYY, fullISO } = target;

        console.log(`\n======================================================`);
        console.log(`[ARCHIVE SCRIPT] Starting Daily Result Archiving`);
        console.log(`[ARCHIVE SCRIPT] Target Date: ${dateDDMMYYYY} (ISO: ${fullISO}, Monthly key: ${dateDDMM})`);
        console.log(`======================================================\n`);

        const snapshot = await rootRef.once('value');
        const data = snapshot.val() || {};

        // Idempotency Check via Archive Marker
        const archiveStatus = data.archive_status || {};
        const existingMarker = archiveStatus[fullISO];

        if (existingMarker && existingMarker.status === 'completed' && !forceFlag) {
            console.log(`[ARCHIVE SKIPPED] Date ${dateDDMMYYYY} (${fullISO}) was already successfully archived at ${existingMarker.completedAt}. Skipping rollover.`);
            console.log(`[ARCHIVE SUCCESS] No action needed.`);
            process.exit(0);
        }

        const primaryGames = Array.isArray(data.games_primary) ? data.games_primary : [];
        const secondaryGames = Array.isArray(data.games_secondary) ? data.games_secondary : [];
        const allGames = [...primaryGames, ...secondaryGames];

        if (allGames.length === 0) {
            console.warn('[ARCHIVE CANCELLED] No games found in database at a7satta/games_primary.');
            process.exit(0);
        }

        const sanitizeResult = (val) => {
            if (!val || typeof val !== 'string') return '-';
            const trimmed = val.trim();
            if (trimmed === '' || trimmed === '--' || trimmed === '-' || trimmed.toUpperCase() === 'WAIT') {
                return '-';
            }
            return trimmed;
        };

        const gameResultMap = new Map();
        const missingGames = [];

        allGames.forEach(g => {
            const canonicalKey = getCanonicalGameKey(g);
            const resVal = sanitizeResult(g.today);
            gameResultMap.set(canonicalKey, resVal);

            if (g.name) gameResultMap.set(normalizeGameName(g.name), resVal);
            if (g.slug) gameResultMap.set(normalizeGameName(g.slug), resVal);

            if (resVal === '-') {
                missingGames.push(g.name || g.slug || g.id);
            }
        });

        console.log(`[ARCHIVE GAMES] Extracted ${allGames.length} games.`);
        if (missingGames.length > 0) {
            console.log(`[ARCHIVE GAMES] Missing/Pending results for ${missingGames.length} games:`, missingGames.join(', '));
        }

        const chart1Headers = Array.isArray(data.chart1_headers) ? data.chart1_headers : ["साइबर सिटी", "सदर बाजार", "ग्वालियर", "दिल्ली बाजार", "गांधी नगर"];
        const chart2Headers = Array.isArray(data.chart2_headers) ? data.chart2_headers : ["श्री गणेश", "करोल बाग", "फरीदाबाद", "कश्मीरी डे", "अलवर"];
        const chart3Headers = Array.isArray(data.chart3_headers) ? data.chart3_headers : ["गाज़ियाबाद", "गंगा नाइट", "गली", "दिसावर"];
        const fullChartHeaders = Array.isArray(data.fullchart_headers) ? data.fullchart_headers : [...chart1Headers, ...chart2Headers, ...chart3Headers];

        const getResultForHeader = (headerName) => {
            const normHeader = normalizeGameName(headerName);
            const canonicalHeader = GAME_ALIASES[normHeader] || normHeader;

            if (gameResultMap.has(canonicalHeader)) return gameResultMap.get(canonicalHeader);
            if (gameResultMap.has(normHeader)) return gameResultMap.get(normHeader);
            return '-';
        };

        // Non-Destructive Update Row Logic (NEVER overwrite existing valid values with "-")
        const updateOrInsertRow = (chartArray, dateKey, headersList, prefix) => {
            const rows = Array.isArray(chartArray) ? [...chartArray] : [];
            const existingIdx = rows.findIndex(r => r && r.date === dateKey);

            if (existingIdx !== -1) {
                const existingRow = rows[existingIdx];
                const existingValues = Array.isArray(existingRow.values) ? existingRow.values : [];
                const mergedValues = headersList.map((header, idx) => {
                    const newVal = getResultForHeader(header);
                    const oldVal = existingValues[idx];

                    if (newVal === '-' || newVal === '') {
                        if (oldVal && oldVal !== '-' && oldVal !== '' && oldVal !== 'WAIT') {
                            return oldVal; // PRESERVE existing valid result!
                        }
                    }
                    return newVal;
                });

                rows[existingIdx] = {
                    ...existingRow,
                    values: mergedValues
                };
                console.log(`[CHART UPDATE] Updated row for date "${dateKey}" in ${prefix} (Non-destructive merge)`);
            } else {
                const cleanKey = dateKey.replace(/-/g, '');
                const newValues = headersList.map(header => getResultForHeader(header));
                rows.push({
                    id: `${prefix}_r${cleanKey}`,
                    date: dateKey,
                    values: newValues
                });
                console.log(`[CHART INSERT] Created new row for date "${dateKey}" in ${prefix}`);
            }
            return rows;
        };

        // 1. Process target day's results into current monthly charts FIRST
        const updatedChart1Data = updateOrInsertRow(data.chart1_data, dateDDMM, chart1Headers, 'c1');
        const updatedChart2Data = updateOrInsertRow(data.chart2_data, dateDDMM, chart2Headers, 'c2');
        const updatedChart3Data = updateOrInsertRow(data.chart3_data, dateDDMM, chart3Headers, 'c3');
        const updatedFullChartData = updateOrInsertRow(data.fullchart_data, dateDDMM, fullChartHeaders, 'fc');

        // ============================================================
        // 5. MONTH-END ROLLOVER CHECK & PROCESS
        // ============================================================
        const [targetYearStr, targetMonthStr, targetDayStr] = fullISO.split('-');
        const targetYearMonthKey = `${targetYearStr}-${targetMonthStr}`;

        const kolkataFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
        const currentKolkataDateStr = kolkataFormatter.format(new Date());
        const [curKolkataYearStr, curKolkataMonthStr, curKolkataDayStr] = currentKolkataDateStr.split('-');
        const currentYearMonthKey = `${curKolkataYearStr}-${curKolkataMonthStr}`;

        const monthRolloverStatus = data.month_rollover_status || {};
        const isMonthAlreadyRolledOver = monthRolloverStatus[targetYearMonthKey] && monthRolloverStatus[targetYearMonthKey].status === 'completed';

        // Check if current Kolkata month is later than the target archive month
        const isNewMonthBoundary = currentYearMonthKey > targetYearMonthKey;

        let finalChart1Data = updatedChart1Data;
        let finalChart2Data = updatedChart2Data;
        let finalChart3Data = updatedChart3Data;
        let finalFullChartData = updatedFullChartData;

        let finalPrevFullChartHeaders = data.prev_fullchart_headers || fullChartHeaders;
        let finalPrevFullChartData = data.prev_fullchart_data || [];
        let finalYearChartData = Array.isArray(data.year_chart_data) ? [...data.year_chart_data] : [];

        if (isNewMonthBoundary && !isMonthAlreadyRolledOver) {
            console.log(`\n======================================================`);
            console.log(`[MONTH ROLLOVER] Performing Month-End Rollover for Completed Month ${targetYearMonthKey}`);
            console.log(`======================================================\n`);

            // A. Move/Copy completed month's fullchart_data to Previous Month Chart
            finalPrevFullChartHeaders = fullChartHeaders;
            finalPrevFullChartData = updatedFullChartData.map(row => {
                const cleanDate = row.date ? row.date.replace(/-/g, '') : '';
                return {
                    id: `pfc_r${cleanDate}`,
                    date: row.date,
                    values: Array.isArray(row.values) ? [...row.values] : []
                };
            });
            console.log(`[MONTH ROLLOVER] Copied ${finalPrevFullChartData.length} rows to Previous Month Chart (prev_fullchart_data).`);

            // B. Copy completed month's fullchart_data to Year Chart (year_chart_data)
            updatedFullChartData.forEach(row => {
                if (!row || !row.date) return;
                let dayNum = row.date;
                let monthNum = targetMonthStr;
                if (row.date.includes('-')) {
                    const p = row.date.split('-');
                    dayNum = p[0];
                    if (p.length >= 2) monthNum = p[1];
                }
                const fullDateKey = `${dayNum.padStart(2, '0')}-${monthNum.padStart(2, '0')}-${targetYearStr}`;
                const ycRowId = `yc_${targetYearStr}_${monthNum.padStart(2, '0')}_${dayNum.padStart(2, '0')}`;

                const existingYcIdx = finalYearChartData.findIndex(r => r && r.date === fullDateKey);
                const rowValues = Array.isArray(row.values) ? [...row.values] : [];

                if (existingYcIdx !== -1) {
                    const existingRow = finalYearChartData[existingYcIdx];
                    const existingVals = Array.isArray(existingRow.values) ? existingRow.values : [];
                    const mergedVals = rowValues.map((v, idx) => {
                        const oldV = existingVals[idx];
                        if (v === '-' || v === '' || v === null || v === undefined) {
                            if (oldV && oldV !== '-' && oldV !== '' && oldV !== 'WAIT') {
                                return oldV;
                            }
                        }
                        return v;
                    });

                    finalYearChartData[existingYcIdx] = {
                        ...existingRow,
                        values: mergedVals
                    };
                } else {
                    finalYearChartData.push({
                        id: ycRowId,
                        date: fullDateKey,
                        values: rowValues
                    });
                }
            });

            // Sort year_chart_data chronologically by date (YYYY-MM-DD)
            finalYearChartData.sort((a, b) => {
                if (!a || !a.date) return -1;
                if (!b || !b.date) return 1;
                const parseDate = (dStr) => {
                    const p = dStr.split('-');
                    if (p.length === 3) {
                        return `${p[2]}-${p[1]}-${p[0]}`;
                    }
                    return dStr;
                };
                return parseDate(a.date).localeCompare(parseDate(b.date));
            });

            console.log(`[MONTH ROLLOVER] Merged completed month data into Year Chart (year_chart_data). Total rows now: ${finalYearChartData.length}.`);

            // C. Reset current monthly charts for the new month (start empty)
            finalChart1Data = [];
            finalChart2Data = [];
            finalChart3Data = [];
            finalFullChartData = [];
            console.log(`[MONTH ROLLOVER] Current monthly charts reset for fresh month.`);
        }

        // Game state rollover: Move today -> yesterday and clear today for next day ONLY on confirmed archive
        const updatedPrimaryGames = primaryGames.map(g => {
            const todayVal = sanitizeResult(g.today);
            const newYesterday = (todayVal !== '-') ? todayVal : (g.yesterday || '--');
            return {
                ...g,
                yesterday: newYesterday,
                today: ''
            };
        });

        const updatedSecondaryGames = secondaryGames.map(g => {
            const todayVal = sanitizeResult(g.today);
            const newYesterday = (todayVal !== '-') ? todayVal : (g.yesterday || '--');
            return {
                ...g,
                yesterday: newYesterday,
                today: ''
            };
        });

        // Atomic Multi-Location Write to Firebase Realtime Database
        const updates = {};
        updates['games_primary'] = updatedPrimaryGames;
        if (secondaryGames.length > 0) updates['games_secondary'] = updatedSecondaryGames;
        updates['chart1_data'] = finalChart1Data;
        updates['chart2_data'] = finalChart2Data;
        updates['chart3_data'] = finalChart3Data;
        updates['fullchart_data'] = finalFullChartData;

        if (isNewMonthBoundary && !isMonthAlreadyRolledOver) {
            updates['prev_fullchart_headers'] = finalPrevFullChartHeaders;
            updates['prev_fullchart_data'] = finalPrevFullChartData;
            updates['year_chart_data'] = finalYearChartData;
            updates[`month_rollover_status/${targetYearMonthKey}`] = {
                status: 'completed',
                month: targetMonthStr,
                year: targetYearStr,
                completedAt: new Date().toISOString(),
                rowsCount: updatedFullChartData.length
            };
        }

        // Set daily archive status marker
        updates[`archive_status/${fullISO}`] = {
            status: 'completed',
            completedAt: new Date().toISOString(),
            dateDDMMYYYY: dateDDMMYYYY,
            gamesArchived: allGames.length - missingGames.length,
            missingGamesCount: missingGames.length
        };

        await rootRef.update(updates);

        console.log(`\n✔ [SUCCESS] Successfully archived results for date ${dateDDMMYYYY} (${fullISO}) into Realtime Database.`);
        if (isNewMonthBoundary && !isMonthAlreadyRolledOver) {
            console.log(`✔ [SUCCESS] Month Rollover completed for ${targetYearMonthKey}: Copied to Previous Month & Year Chart, reset current monthly charts.`);
        }
        process.exit(0);
    } catch (err) {
        console.error(`\n❌ [ERROR] Archiving failed:`, err);
        process.exit(1);
    }
}

main();
