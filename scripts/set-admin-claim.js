/**
 * Firebase Admin Custom Claims Setter
 * Project ID: web2-ec085
 * Database URL: https://web2-ec085-default-rtdb.firebaseio.com/
 * 
 * Usage:
 *   node scripts/set-admin-claim.js <admin-email>
 */

const fs = require('fs');
const path = require('path');

const email = process.argv[2];
if (!email) {
    console.error('❌ Error: Admin email is required.\nUsage: node scripts/set-admin-claim.js <admin-email>');
    process.exit(1);
}

// 1. Resolve path to ../service-account.json relative to scripts directory
const serviceAccountPath = path.join(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error(`❌ Error: service-account.json file not found at: ${serviceAccountPath}`);
    console.error('Please place your Firebase service-account.json in the project root directory.');
    process.exit(1);
}

// 2. Read and parse service-account.json
let serviceAccount;
try {
    let rawContent = fs.readFileSync(serviceAccountPath, 'utf8');
    rawContent = rawContent.replace(/^\uFEFF/, '');
    serviceAccount = JSON.parse(rawContent);
} catch (err) {
    console.error(`❌ Error reading/parsing service-account.json at ${serviceAccountPath}:`);
    console.error(`Message: ${err.message}`);
    process.exit(1);
}

// 3. Verify Project ID & Credentials
if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('❌ Error: service-account.json is missing required fields (project_id, client_email, or private_key).');
    process.exit(1);
}

if (serviceAccount.project_id !== 'web2-ec085') {
    console.error(`❌ Error: service-account.json project_id is "${serviceAccount.project_id}", expected "web2-ec085".`);
    process.exit(1);
}

// Safe Diagnostics (Never print private_key)
console.log('--- FIREBASE ADMIN DIAGNOSTICS ---');
console.log('Key Path:         ', serviceAccountPath);
console.log('Project ID:       ', serviceAccount.project_id);
console.log('Client Email:     ', serviceAccount.client_email);
console.log('Target User Email:', email);
console.log('----------------------------------');

// 4. Initialize Firebase Admin SDK
let authService;
try {
    let initializeAppFn, certFn, getAppsFn, getAuthFn;

    try {
        const adminApp = require('firebase-admin/app');
        const adminAuth = require('firebase-admin/auth');
        initializeAppFn = adminApp.initializeApp;
        certFn = adminApp.cert;
        getAppsFn = adminApp.getApps;
        getAuthFn = adminAuth.getAuth;
    } catch (e) {
        const admin = require('firebase-admin');
        initializeAppFn = admin.initializeApp;
        certFn = admin.credential ? admin.credential.cert : admin.cert;
        getAppsFn = admin.getApps || (() => admin.apps || []);
        getAuthFn = admin.auth;
    }

    const existingApps = getAppsFn();
    let app;
    if (existingApps.length === 0) {
        app = initializeAppFn({
            credential: certFn(serviceAccount),
            databaseURL: 'https://web2-ec085-default-rtdb.firebaseio.com/'
        });
    } else {
        app = existingApps[0];
    }
    authService = getAuthFn(app);
} catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK:');
    console.error(`Error Message: ${err.message}`);
    console.error(`Error Code:    ${err.code || 'N/A'}`);
    process.exit(1);
}

// 5. Assign Custom Claim { admin: true }
authService.getUserByEmail(email)
    .then((user) => {
        return authService.setCustomUserClaims(user.uid, { admin: true }).then(() => user);
    })
    .then((user) => {
        console.log(`\n✔ SUCCESS! Custom claim { admin: true } successfully set for Firebase user:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  UID:   ${user.uid}`);
        console.log(`\nNext Step: Log out and log back in on the admin panel (login.html) OR click "Force-Refresh Auth Token" in Settings to activate the new token.`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed to set admin custom claim for email:', email);
        console.error('Error Code:   ', error.code || 'UNKNOWN');
        console.error('Error Message:', error.message);
        if (error.code === 'auth/user-not-found') {
            console.error(`\nTip: The user "${email}" does not exist in Firebase Authentication (project web2-ec085).`);
            console.error('Please create this user first under Firebase Console -> Authentication -> Users -> Add User.');
        }
        process.exit(1);
    });
