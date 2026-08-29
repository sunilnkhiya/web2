const { setGlobalOptions } = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK using default App Engine / Functions service account credentials
if (!admin.apps.length) {
    admin.initializeApp();
}

setGlobalOptions({ maxInstances: 10 });

// Secret key for manual HTTP endpoint authorization (overridable via environment variable)
const ARCHIVE_ADMIN_SECRET = process.env.ARCHIVE_ADMIN_SECRET || process.env.ADMIN_SECRET || "A7_SATTA_SECURE_ARCHIVE_2026";

/**
 * 1. Accurate Previous Calendar Date Calculation in Asia/Kolkata timezone
 * @param {string|null} customDateStr - Optional date override in "DD-MM-YYYY" or "YYYY-MM-DD" format
 * @returns {Object} { dateDDMM, dateDDMMYYYY, fullISO }
 */
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

/**
 * 2. Unicode Normalization & Stable Game Key Mapping
 */
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

/**
 * Core Archive Logic (Idempotent & Non-Destructive)
 * @param {string|null} customDateStr - Optional custom date
 * @param {boolean} force - Force re-archive even if marker exists
 * @returns {Promise<Object>} Execution result metrics
 */
async function runArchiveDailyResults(customDateStr = null, force = false) {
    const db = admin.database();
    const rootRef = db.ref('a7satta');

    const target = getKolkataTargetDate(customDateStr);
    const { dateDDMM, dateDDMMYYYY, fullISO } = target;

    logger.info(`[ARCHIVE START] Target Archive Date: ${dateDDMMYYYY} (ISO: ${fullISO}, Monthly key: ${dateDDMM})`);

    // Fetch current database state
    const snapshot = await rootRef.once('value');
    const data = snapshot.val() || {};

    // 3. Idempotency Check via Archive Marker (a7satta/archive_status/YYYY-MM-DD)
    const archiveStatus = data.archive_status || {};
    const existingMarker = archiveStatus[fullISO];

    if (existingMarker && existingMarker.status === 'completed' && !force) {
        logger.info(`[ARCHIVE SKIPPED] Date ${dateDDMMYYYY} (${fullISO}) was already successfully archived at ${existingMarker.completedAt}. Skipping rollover.`);
        return {
            success: true,
            skipped: true,
            reason: `Date ${dateDDMMYYYY} is already archived.`,
            archiveDate: dateDDMMYYYY
        };
    }

    const primaryGames = Array.isArray(data.games_primary) ? data.games_primary : [];
    const secondaryGames = Array.isArray(data.games_secondary) ? data.games_secondary : [];
    const allGames = [...primaryGames, ...secondaryGames];

    if (allGames.length === 0) {
        logger.warn('[ARCHIVE CANCELLED] No games found in database.');
        return { success: false, message: 'No games found in database.' };
    }

    const sanitizeResult = (val) => {
        if (!val || typeof val !== 'string') return '-';
        const trimmed = val.trim();
        if (trimmed === '' || trimmed === '--' || trimmed === '-' || trimmed.toUpperCase() === 'WAIT') {
            return '-';
        }
        return trimmed;
    };

    // 4. Stable Game Results Mapping using Canonical Keys
    const gameResultMap = new Map();
    const missingGames = [];

    allGames.forEach(g => {
        const canonicalKey = getCanonicalGameKey(g);
        const resVal = sanitizeResult(g.today);
        gameResultMap.set(canonicalKey, resVal);

        // Also map by exact name and slug for fallback matching
        if (g.name) gameResultMap.set(normalizeGameName(g.name), resVal);
        if (g.slug) gameResultMap.set(normalizeGameName(g.slug), resVal);

        if (resVal === '-') {
            missingGames.push(g.name || g.slug || g.id);
        }
    });

    logger.info(`[ARCHIVE GAMES] Extracted ${allGames.length} games. Missing/Pending results for:`, missingGames);

    // Default column headers fallbacks
    const chart1Headers = Array.isArray(data.chart1_headers) ? data.chart1_headers : ["साइबर सिटी", "सदर बाजार", "ग्वालियर", "दिल्ली बाजार", "गांधी नगर"];
    const chart2Headers = Array.isArray(data.chart2_headers) ? data.chart2_headers : ["श्री गणेश", "करोल बाग", "फरीदाबाद", "कश्मीरी डे", "अलवर"];
    const chart3Headers = Array.isArray(data.chart3_headers) ? data.chart3_headers : ["गाज़ियाबाद", "गंगा नाइट", "गली", "दिसावर"];
    const fullChartHeaders = Array.isArray(data.fullchart_headers) ? data.fullchart_headers : [...chart1Headers, ...chart2Headers, ...chart3Headers];

    // Helper to get result for a header column
    const getResultForHeader = (headerName) => {
        const normHeader = normalizeGameName(headerName);
        const canonicalHeader = GAME_ALIASES[normHeader] || normHeader;

        if (gameResultMap.has(canonicalHeader)) return gameResultMap.get(canonicalHeader);
        if (gameResultMap.has(normHeader)) return gameResultMap.get(normHeader);
        return '-';
    };

    // 5. Non-Destructive Update Row Logic (Preserves existing valid values)
    const updateOrInsertRow = (chartArray, dateKey, headersList, prefix) => {
        const rows = Array.isArray(chartArray) ? [...chartArray] : [];
        const existingIdx = rows.findIndex(r => r && r.date === dateKey);

        if (existingIdx !== -1) {
            const existingRow = rows[existingIdx];
            const existingValues = Array.isArray(existingRow.values) ? existingRow.values : [];
            const mergedValues = headersList.map((header, idx) => {
                const newVal = getResultForHeader(header);
                const oldVal = existingValues[idx];

                // Rule: NEVER overwrite an existing valid result (e.g. "45") with "-" or ""
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
            logger.info(`[CHART UPDATE] Updated row for date "${dateKey}" in ${prefix} (Non-destructive merge)`);
        } else {
            const cleanKey = dateKey.replace(/-/g, '');
            const newValues = headersList.map(header => getResultForHeader(header));
            rows.push({
                id: `${prefix}_r${cleanKey}`,
                date: dateKey,
                values: newValues
            });
            logger.info(`[CHART INSERT] Created new row for date "${dateKey}" in ${prefix}`);
        }
        return rows;
    };

    // Process all monthly destination charts (year_chart_data is EXCLUDED from automatic archive)
    const updatedChart1Data = updateOrInsertRow(data.chart1_data, dateDDMM, chart1Headers, 'c1');
    const updatedChart2Data = updateOrInsertRow(data.chart2_data, dateDDMM, chart2Headers, 'c2');
    const updatedChart3Data = updateOrInsertRow(data.chart3_data, dateDDMM, chart3Headers, 'c3');
    const updatedFullChartData = updateOrInsertRow(data.fullchart_data, dateDDMM, fullChartHeaders, 'fc');

    // 6. Game state rollover: Move today -> yesterday and clear today for next day ONLY on confirmed archive
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

    // 7. Atomic Multi-Location Write to Firebase Realtime Database
    const updates = {};
    updates['games_primary'] = updatedPrimaryGames;
    if (secondaryGames.length > 0) updates['games_secondary'] = updatedSecondaryGames;
    updates['chart1_data'] = updatedChart1Data;
    updates['chart2_data'] = updatedChart2Data;
    updates['chart3_data'] = updatedChart3Data;
    updates['fullchart_data'] = updatedFullChartData;

    // Set archive status marker
    updates[`archive_status/${fullISO}`] = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        dateDDMMYYYY: dateDDMMYYYY,
        gamesArchived: allGames.length - missingGames.length,
        missingGamesCount: missingGames.length
    };

    await rootRef.update(updates);

    logger.info(`[ARCHIVE SUCCESS] Successfully archived results for date ${dateDDMMYYYY} (${fullISO}) into Firebase.`);

    return {
        success: true,
        archiveDate: dateDDMMYYYY,
        isoDate: fullISO,
        monthlyDateKey: dateDDMM,
        totalGames: allGames.length,
        archivedGames: allGames.length - missingGames.length,
        missingGames: missingGames,
        chartsUpdated: ['chart1_data', 'chart2_data', 'chart3_data', 'fullchart_data']
    };
}

/**
 * 1. Scheduled Cloud Function v2
 * Schedule: 02:00 AM IST (0 2 * * *) daily
 * Reason: Captures 100% of all daily game results including the 01:30 AM दिसावर result.
 */
exports.dailyArchiveResults = onSchedule({
    schedule: "0 2 * * *",
    timeZone: "Asia/Kolkata",
    retryCount: 3
}, async (event) => {
    logger.info("[SCHEDULED TRIGGER] Daily 02:00 AM IST Archive Started");
    try {
        const res = await runArchiveDailyResults();
        logger.info("[SCHEDULED TRIGGER SUCCESS]", res);
    } catch (err) {
        logger.error("[SCHEDULED TRIGGER FAILED]", err);
        throw err;
    }
});

/**
 * 2. SECURE HTTP Manual Test Trigger
 * Requires Authorization:
 * - Header: x-admin-secret matching ARCHIVE_ADMIN_SECRET
 * OR
 * - Authorization: Bearer <ID_TOKEN> verified via Firebase Admin Auth (admin claim required)
 */
exports.manualArchiveDailyResults = onRequest(async (req, res) => {
    try {
        let isAuthorized = false;

        // Check 1: Admin Secret Header or query parameter
        const reqSecret = req.headers['x-admin-secret'] || req.query.secret;
        if (reqSecret && reqSecret === ARCHIVE_ADMIN_SECRET) {
            isAuthorized = true;
        }

        // Check 2: Firebase Auth Admin Token
        if (!isAuthorized && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            const token = req.headers.authorization.split('Bearer ')[1];
            try {
                const decodedToken = await admin.auth().verifyIdToken(token);
                if (decodedToken && decodedToken.admin === true) {
                    isAuthorized = true;
                }
            } catch (authErr) {
                logger.warn('[HTTP AUTH WARNING] Invalid Bearer token:', authErr.message);
            }
        }

        if (!isAuthorized) {
            logger.warn('[HTTP AUTH REJECTED] Unauthorized manual archive attempt from IP:', req.ip);
            return res.status(401).json({
                error: "Unauthorized",
                message: "Valid x-admin-secret header or Admin Firebase Auth Bearer token is required."
            });
        }

        const customDate = req.query.date || null;
        const force = req.query.force === 'true';

        logger.info(`[MANUAL TRIGGER AUTHORIZED] Date: ${customDate || 'Kolkata Previous Day'}, Force: ${force}`);

        const result = await runArchiveDailyResults(customDate, force);
        res.status(200).json({
            message: "Manual archive executed successfully",
            result: result
        });
    } catch (err) {
        logger.error("[MANUAL TRIGGER FAILED]", err);
        res.status(500).json({
            error: "Archive failed",
            details: err.message
        });
    }
});
