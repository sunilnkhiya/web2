/**
 * Script to update Game Names and Timings in WEB1 Firebase Realtime Database
 * Project ID: web2-ec085
 * Database URL: https://web2-ec085-default-rtdb.firebaseio.com/
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

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

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
        databaseURL: 'https://web2-ec085-default-rtdb.firebaseio.com/'
    });
}

// Official 14 WEB2 Games & Timings
const OFFICIAL_GAMES = [
    { id: "gm_cyber-city",   slug: "cyber-city",   name: "साइबर सिटी",  time: "12:30 PM" },
    { id: "gm_sadar-bazar",  slug: "sadar-bazar",  name: "सदर बाजार",   time: "1:20 PM" },
    { id: "gm_gwalior",      slug: "gwalior",      name: "ग्वालियर",    time: "2:20 PM" },
    { id: "gm_delhi-bazar",  slug: "delhi-bazar",  name: "दिल्ली बाजार", time: "2:50 PM" },
    { id: "gm_gandhi-nagar", slug: "gandhi-nagar", name: "गांधी नगर",   time: "3:50 PM" },
    { id: "gm_shree-ganesh", slug: "shree-ganesh", name: "श्री गणेश",   time: "4:20 PM" },
    { id: "gm_karol-bagh",   slug: "karol-bagh",   name: "करोल बाग",    time: "5:25 PM" },
    { id: "gm_faridabad",    slug: "faridabad",    name: "फरीदाबाद",    time: "5:50 PM" },
    { id: "gm_kashmiri-day", slug: "kashmiri-day", name: "कश्मीरी डे",   time: "6:45 PM" },
    { id: "gm_alwar",        slug: "alwar",        name: "अलवर",        time: "7:15 PM" },
    { id: "gm_gaziyabad",    slug: "gaziyabad",    name: "गाज़ियाबाद",  time: "9:00 PM" },
    { id: "gm_ganga-night",  slug: "ganga-night",  name: "गंगा नाइट",   time: "10:25 PM" },
    { id: "gm_gali",         slug: "gali",         name: "गली",         time: "11:00 PM" },
    { id: "gm_disawar",      slug: "disawar",      name: "दिसावर",      time: "1:30 AM" }
];

const CHART1_HEADERS = ["साइबर सिटी", "सदर बाजार", "ग्वालियर", "दिल्ली बाजार", "गांधी नगर"];
const CHART2_HEADERS = ["श्री गणेश", "करोल बाग", "फरीदाबाद", "कश्मीरी डे", "अलवर"];
const CHART3_HEADERS = ["गाज़ियाबाद", "गंगा नाइट", "गली", "दिसावर"];
const FULLCHART_HEADERS = [
    "साइबर सिटी", "सदर बाजार", "ग्वालियर", "दिल्ली बाजार",
    "गांधी नगर", "श्री गणेश", "करोल बाग", "फरीदाबाद",
    "कश्मीरी डे", "अलवर", "गाज़ियाबाद", "गंगा नाइट",
    "गली", "दिसावर"
];

function compileAdContentFromSchedule(schedule) {
    if (!schedule) return '';
    let html = '';
    if (schedule.topHeader || schedule.khaiwalName) {
        html += `<div class="ad-header-box">\n`;
        if (schedule.topHeader) html += `<div class="ad-top-title">${schedule.topHeader}</div>\n`;
        if (schedule.khaiwalName) html += `<div class="ad-khaiwal-title">${schedule.khaiwalName}</div>\n`;
        html += `</div>\n`;
    }
    if (schedule.items && schedule.items.length) {
        html += `<div class="ad-schedule-list">\n`;
        schedule.items.forEach(item => {
            if (item.name) {
                const timeStr = item.time || '';
                html += `  <div class="ad-schedule-row">
                    <span class="ad-schedule-name"><span class="clock-icon">⏰</span> ${item.name}</span>
                    <span class="ad-schedule-leader"></span>
                    <span class="ad-schedule-time">${timeStr}</span>
                </div>\n`;
            }
        });
        html += `</div>\n`;
    }
    if (schedule.rateTitle || schedule.jodiRate || schedule.harufRate) {
        html += `<div class="ad-rate-card">\n`;
        if (schedule.rateTitle) html += `<div class="ad-rate-title">${schedule.rateTitle}</div>\n`;
        if (schedule.jodiRate) html += `<div class="ad-rate-item">${schedule.jodiRate}</div>\n`;
        if (schedule.harufRate) html += `<div class="ad-rate-item">${schedule.harufRate}</div>\n`;
        html += `</div>\n`;
    }
    if (schedule.bottomTitle) html += `<div class="ad-bottom-title">${schedule.bottomTitle}</div>\n`;
    if (schedule.linkText) {
        const linkUrl = schedule.whatsappUrl || (schedule.whatsappPhone ? `https://wa.me/${schedule.whatsappPhone}` : 'https://wa.me/message/WTOZYC4GBMWNC1');
        const waSvgIcon = `<svg class="ad-wa-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style="vertical-align:-4px;margin-right:8px;display:inline-block;"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.76.459 3.477 1.33 4.988l-1.414 5.163 5.281-1.385c1.458.796 3.104 1.215 4.79 1.216h.004c5.505 0 9.989-4.478 9.99-9.984 0-2.669-1.038-5.178-2.924-7.064a9.927 9.927 0 0 0-7.067-2.918zm0 1.834c4.493 0 8.151 3.658 8.153 8.15.001 2.181-.848 4.232-2.391 5.776-1.543 1.543-3.595 2.393-5.776 2.393h-.003c-1.479 0-2.923-.396-4.18-1.144l-.3-.178-3.109.815.829-3.029-.196-.312a8.106 8.106 0 0 1-1.246-4.321c.002-4.492 3.66-8.15 8.153-8.15zm-4.633 4.218c-.126 0-.327.047-.498.234-.171.188-.654.639-.654 1.558 0 .919.668 1.807.762 1.932.094.125 1.303 2.062 3.208 2.854.453.189.807.301 1.083.389.455.144.869.124 1.197.075.365-.054 1.125-.46 1.286-.905.161-.445.161-.826.113-.905-.047-.078-.171-.125-.36-.219-.188-.094-1.125-.555-1.3-.618-.175-.063-.303-.094-.431.094-.128.188-.498.639-.611.764-.113.125-.226.141-.414.047-.188-.094-.795-.293-1.514-.934-.56-.499-.938-1.116-1.048-1.304-.11-.188-.012-.29.082-.383.085-.084.188-.219.283-.328.094-.109.126-.188.188-.313.063-.125.031-.234-.016-.328-.047-.094-.431-1.037-.591-1.422-.156-.375-.315-.324-.431-.33h-.368z"/></svg>`;
        html += `<div class="ad-cta-container">
            <a href="${linkUrl}" target="_blank" class="ad-whatsapp-btn">
                ${waSvgIcon}<span>${schedule.linkText}</span>
            </a>
        </div>\n`;
    }
    return html;
}

async function updateDatabase() {
    try {
        const db = getDatabase();
        const rootRef = db.ref('a7satta');

        console.log('--- UPDATING WEB1 FIREBASE GAME NAMES & TIMINGS ---');
        console.log('Target Database: https://web2-ec085-default-rtdb.firebaseio.com/');
        console.log('Target Path:     a7satta/');
        console.log('----------------------------------------------------');

        const snapshot = await rootRef.once('value');
        const data = snapshot.val() || {};

        // 1. Update games_primary array
        let primaryGames = Array.isArray(data.games_primary) ? [...data.games_primary] : [];
        if (primaryGames.length === 0) {
            primaryGames = OFFICIAL_GAMES.map(g => ({
                id: g.id,
                slug: g.slug,
                name: g.name,
                time: g.time,
                yesterday: "--",
                today: ""
            }));
        } else {
            primaryGames = primaryGames.map((existingGame, idx) => {
                const official = OFFICIAL_GAMES[idx] || OFFICIAL_GAMES.find(og => og.id === existingGame.id || og.slug === existingGame.slug);
                if (official) {
                    return {
                        ...existingGame,
                        name: official.name,
                        time: official.time
                    };
                }
                return existingGame;
            });
        }

        // 2. Update ad_schedule items & compiled ad_content
        let adSchedule = data.ad_schedule || {
            topHeader: "--सीधे सट्टा कंपनी का No 1 खाईवाल--",
            khaiwalName: "",
            items: [],
            rateTitle: "? Rate list ?",
            jodiRate: "जोड़ी रेट 10-------960",
            harufRate: "हरूफ रेट 100-----960",
            bottomTitle: "",
            linkText: "Game play करने के लिये नीचे लिंक पर क्लिक करे",
            whatsappPhone: "917027405875",
            whatsappUrl: "https://wa.me/message/WTOZYC4GBMWNC1"
        };

        const updatedAdItems = OFFICIAL_GAMES.map((og, idx) => ({
            id: `ad_${idx + 1}`,
            name: og.name,
            time: og.time
        }));
        adSchedule.items = updatedAdItems;

        const updatedAdContent = compileAdContentFromSchedule(adSchedule);

        // 3. Multi-location atomic write of name/time fields & chart headers only
        const updates = {};
        updates['games_primary'] = primaryGames;
        updates['ad_schedule'] = adSchedule;
        updates['ad_content'] = updatedAdContent;
        updates['chart1_headers'] = CHART1_HEADERS;
        updates['chart2_headers'] = CHART2_HEADERS;
        updates['chart3_headers'] = CHART3_HEADERS;
        updates['fullchart_headers'] = FULLCHART_HEADERS;
        updates['prev_fullchart_headers'] = FULLCHART_HEADERS;

        await rootRef.update(updates);

        console.log('\n✔ SUCCESS: WEB1 Firebase Realtime Database updated with official game names and timings!');
        console.log('\nUpdated Fields:');
        console.log(' - games_primary (14 games updated: names & timings)');
        console.log(' - ad_schedule (14 advertisement schedule items updated)');
        console.log(' - ad_content (HTML advertisement compiled)');
        console.log(' - chart1_headers:', CHART1_HEADERS);
        console.log(' - chart2_headers:', CHART2_HEADERS);
        console.log(' - chart3_headers:', CHART3_HEADERS);
        console.log(' - fullchart_headers & prev_fullchart_headers updated');

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to update database:', err);
        process.exit(1);
    }
}

updateDatabase();
