/**
 * Safe One-Time Database Initialization Script for Web1
 * Firebase Project ID: web2-ec085
 * Realtime Database URL: https://web2-ec085-default-rtdb.firebaseio.com/
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 1. Resolve path to service-account.json
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

// 2. Define Web1 Default Data Values
const DEFAULT_GAMES_PRIMARY = [
    { id: "gm_cyber-city",    name: "साइबर सिटी",  slug: "cyber-city",    time: "12:30 PM", yesterday: "--", today: "" },
    { id: "gm_sadar-bazar",   name: "सदर बाजार",  slug: "sadar-bazar",   time: "1:20 PM",  yesterday: "--", today: "" },
    { id: "gm_gwalior",       name: "ग्वालियर",   slug: "gwalior",        time: "2:20 PM",  yesterday: "--", today: "" },
    { id: "gm_delhi-bazar",   name: "दिल्ली बाजार",slug: "delhi-bazar",   time: "2:50 PM",  yesterday: "--", today: "" },
    { id: "gm_gandhi-nagar",  name: "गांधी नगर",  slug: "gandhi-nagar",  time: "3:50 PM",  yesterday: "--", today: "" },
    { id: "gm_shree-ganesh",  name: "श्री गणेश",  slug: "shree-ganesh",   time: "4:20 PM",  yesterday: "--", today: "" },
    { id: "gm_karol-bagh",    name: "करोल बाग",   slug: "karol-bagh",     time: "5:25 PM",  yesterday: "--", today: "" },
    { id: "gm_faridabad",     name: "फरीदाबाद",   slug: "faridabad",      time: "5:50 PM",  yesterday: "--", today: "" },
    { id: "gm_kashmiri-day",  name: "कश्मीरी डे",  slug: "kashmiri-day",  time: "6:45 PM",  yesterday: "--", today: "" },
    { id: "gm_alwar",         name: "अलवर",       slug: "alwar",          time: "7:15 PM",  yesterday: "--", today: "" },
    { id: "gm_gaziyabad",     name: "गाज़ियाबाद", slug: "gaziyabad",       time: "9:00 PM",  yesterday: "--", today: "" },
    { id: "gm_ganga-night",   name: "गंगा नाइट",   slug: "ganga-night",   time: "10:25 PM", yesterday: "--", today: "" },
    { id: "gm_gali",          name: "गली",        slug: "gali",           time: "11:00 PM", yesterday: "--", today: "" },
    { id: "gm_disawar",       name: "दिसावर",     slug: "disawar",        time: "1:30 AM",  yesterday: "--", today: "" }
];

const DEFAULT_GAMES_SECONDARY = [];

const DEFAULT_FEATURED = {
    id: "featured_disawar",
    name: "दिसावर",
    slug: "disawar",
    time: "05:10 AM",
    previous: "93",
    current: "51"
};

const DEFAULT_MARQUEE = "A7 Satta King, A7-Satta, A7 सट्टा, Satta king chart, Satta Record Chart, Old Result Chart, Satta king online result, Satta king online, Satta king result today, Gali result, Desawar result, Faridabad result, Gaziyabad result, Satta matka king, Satta king up, Satta king desawar, Satta king gali, Satta king 2019 chart, Satta baba king, Gali live result, Disawar live result, Satta Number, Matka Number, Satta.com, Satta Game, Gali Number, Delhi Satta king, Satta Bazar, Satta king 2017, satta king 2018, Gali Leak Number, Gali Single Jodi, Black Satta Result, Black satta king, Satta King India";

const DEFAULT_HINDI_TEXT = "हा भाई यही आती हे सबसे पहले खबर रूको और देखो";

const DEFAULT_AD_SCHEDULE = {
    topHeader: "--सीधे सट्टा कंपनी का No 1 खाईवाल--",
    khaiwalName: "",
    items: [
        { id: "ad_1",  name: "साइबर सिटी",  time: "12:30 PM" },
        { id: "ad_2",  name: "सदर बाजार",  time: "1:20 PM" },
        { id: "ad_3",  name: "ग्वालियर",   time: "2:20 PM" },
        { id: "ad_4",  name: "दिल्ली बाजार",time: "2:50 PM" },
        { id: "ad_5",  name: "गांधी नगर",  time: "3:50 PM" },
        { id: "ad_6",  name: "श्री गणेश",  time: "4:20 PM" },
        { id: "ad_7",  name: "करोल बाग",   time: "5:25 PM" },
        { id: "ad_8",  name: "फरीदाबाद",   time: "5:50 PM" },
        { id: "ad_9",  name: "कश्मीरी डे",  time: "6:45 PM" },
        { id: "ad_10", name: "अलवर",       time: "7:15 PM" },
        { id: "ad_11", name: "गाज़ियाबाद", time: "9:00 PM" },
        { id: "ad_12", name: "गंगा नाइट",   time: "10:25 PM" },
        { id: "ad_13", name: "गली",        time: "11:00 PM" },
        { id: "ad_14", name: "दिसावर",     time: "1:30 AM" }
    ],
    rateTitle: "? Rate list ?",
    jodiRate: "जोड़ी रेट 10-------960",
    harufRate: "हरूफ रेट 100-----960",
    bottomTitle: "",
    linkText: "Game play करने के लिये नीचे लिंक पर क्लिक करे",
    whatsappPhone: "917027405875",
    whatsappUrl: "https://wa.me/message/WTOZYC4GBMWNC1"
};

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

const DEFAULT_AD_CONTENT = compileAdContentFromSchedule(DEFAULT_AD_SCHEDULE);

const DEFAULT_CHART1_HEADERS = ["साइबर सिटी", "सदर बाजार", "ग्वालियर", "दिल्ली बाजार", "गांधी नगर"];
const DEFAULT_CHART1_DATA = [
    { id: "c1_r0108", date: "01-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c1_r0208", date: "02-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c1_r0308", date: "03-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c1_r0408", date: "04-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c1_r0508", date: "05-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c1_rtoday", date: "आज",   values: ["-", "-", "-", "-", "-"] }
];

const DEFAULT_CHART2_HEADERS = ["श्री गणेश", "करोल बाग", "फरीदाबाद", "कश्मीरी डे", "अलवर"];
const DEFAULT_CHART2_DATA = [
    { id: "c2_r0108", date: "01-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c2_r0208", date: "02-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c2_r0308", date: "03-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c2_r0408", date: "04-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c2_r0508", date: "05-08", values: ["-", "-", "-", "-", "-"] },
    { id: "c2_rtoday", date: "आज",   values: ["-", "-", "-", "-", "-"] }
];

const DEFAULT_CHART3_HEADERS = ["गाज़ियाबाद", "गंगा नाइट", "गली", "दिसावर"];
const DEFAULT_CHART3_DATA = [
    { id: "c3_r0108", date: "01-08", values: ["-", "-", "-", "-"] },
    { id: "c3_r0208", date: "02-08", values: ["-", "-", "-", "-"] },
    { id: "c3_r0308", date: "03-08", values: ["-", "-", "-", "-"] },
    { id: "c3_r0408", date: "04-08", values: ["-", "-", "-", "-"] },
    { id: "c3_r0508", date: "05-08", values: ["-", "-", "-", "-"] },
    { id: "c3_rtoday", date: "आज",   values: ["-", "-", "-", "-"] }
];

const DEFAULT_FULLCHART_HEADERS = [
    "साइबर सिटी", "सदर बाजार", "ग्वालियर", "दिल्ली बाजार",
    "गांधी नगर", "श्री गणेश", "करोल बाग", "फरीदाबाद",
    "कश्मीरी डे", "अलवर", "गाज़ियाबाद", "गंगा नाइट",
    "गली", "दिसावर"
];

const DEFAULT_FULLCHART_DATA = [
    { id: "fc_r0108", date: "01-08", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "fc_r0208", date: "02-08", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "fc_r0308", date: "03-08", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "fc_r0408", date: "04-08", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "fc_r0508", date: "05-08", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "fc_rtoday", date: "आज",   values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] }
];

const DEFAULT_PREV_FULLCHART_HEADERS = DEFAULT_FULLCHART_HEADERS;
const DEFAULT_PREV_FULLCHART_DATA = [
    { id: "pfc_r0107", date: "01-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0207", date: "02-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0307", date: "03-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0407", date: "04-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0507", date: "05-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0607", date: "06-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0707", date: "07-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0807", date: "08-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r0907", date: "09-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1007", date: "10-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1107", date: "11-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1207", date: "12-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1307", date: "13-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1407", date: "14-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1507", date: "15-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1607", date: "16-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1707", date: "17-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1807", date: "18-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r1907", date: "19-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2007", date: "20-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2107", date: "21-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2207", date: "22-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2307", date: "23-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2407", date: "24-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2507", date: "25-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2607", date: "26-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2707", date: "27-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2807", date: "28-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r2907", date: "29-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r3007", date: "30-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] },
    { id: "pfc_r3107", date: "31-07", values: ["-","-","-","-","-","-","-","-","-","-","-","-","-","-"] }
];

const DEFAULT_DISCLAIMER = "!! DISCLAIMER:- This is a demo website. Viewing This Website Is Your Own Risk, All The Information Shown On Website Is Sponsored And We Warn You That Matka Gambling/Satta May Be Banned Or Illegal In Your Country..., We Are Not Responsible For Any Issues Or Scam..., We Respect All Country Rules/Laws... If You Not Agree With Our Site Disclaimer... Please Quit Our Site Right Now. Thank You.";

const DEFAULT_DATA_MAP = {
    games_primary: DEFAULT_GAMES_PRIMARY,
    games_secondary: DEFAULT_GAMES_SECONDARY,
    featured: DEFAULT_FEATURED,
    chart1_headers: DEFAULT_CHART1_HEADERS,
    chart1_data: DEFAULT_CHART1_DATA,
    chart2_headers: DEFAULT_CHART2_HEADERS,
    chart2_data: DEFAULT_CHART2_DATA,
    chart3_headers: DEFAULT_CHART3_HEADERS,
    chart3_data: DEFAULT_CHART3_DATA,
    fullchart_headers: DEFAULT_FULLCHART_HEADERS,
    fullchart_data: DEFAULT_FULLCHART_DATA,
    prev_fullchart_headers: DEFAULT_PREV_FULLCHART_HEADERS,
    prev_fullchart_data: DEFAULT_PREV_FULLCHART_DATA,
    marquee: DEFAULT_MARQUEE,
    hindi_text: DEFAULT_HINDI_TEXT,
    ad_schedule: DEFAULT_AD_SCHEDULE,
    ad_content: DEFAULT_AD_CONTENT,
    disclaimer: DEFAULT_DISCLAIMER
};

async function main() {
    try {
        const db = getDatabase();
        const rootRef = db.ref('a7satta');

        console.log('--- INITIALIZING WEB1 FIREBASE REALTIME DATABASE ---');
        console.log('Target Database: https://web2-ec085-default-rtdb.firebaseio.com/');
        console.log('Target Path:     a7satta/');
        console.log('----------------------------------------------------');

        const snapshot = await rootRef.once('value');
        const existingData = snapshot.val() || {};

        const createdKeys = [];
        const skippedKeys = [];
        const updates = {};

        Object.keys(DEFAULT_DATA_MAP).forEach((key) => {
            const currentVal = existingData[key];
            if (currentVal !== undefined && currentVal !== null) {
                skippedKeys.push(key);
            } else {
                updates[key] = DEFAULT_DATA_MAP[key];
                createdKeys.push(key);
            }
        });

        if (Object.keys(updates).length === 0) {
            console.log('\nℹ Database already initialized! All keys exist.');
            console.log('Existing Keys (Skipped):', skippedKeys.join(', '));
            console.log('\nZero keys were overwritten.');
            process.exit(0);
        }

        await rootRef.update(updates);

        console.log('\n✔ DATABASE INITIALIZATION SUCCESSFUL!');
        console.log('Created Keys: ', createdKeys.join(', '));
        if (skippedKeys.length > 0) {
            console.log('Skipped Keys: ', skippedKeys.join(', '));
        }
        console.log(`\nTotal created: ${createdKeys.length}, Total skipped: ${skippedKeys.length}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
        process.exit(1);
    }
}

main();
