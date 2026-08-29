// ============================================================
// A7 SATTA - Dedicated Firebase Realtime Sync Integration
// NEW Website Dedicated Project: web2-ec085
// Realtime Database URL: https://web2-ec085-default-rtdb.firebaseio.com/
// ============================================================

const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCWCfT2AIdqjx0gqizLCIzavcNo4DUS-5Q",
    authDomain: "web2-ec085.firebaseapp.com",
    databaseURL: "https://web2-ec085-default-rtdb.firebaseio.com/",
    projectId: "web2-ec085",
    storageBucket: "web2-ec085.firebasestorage.app",
    messagingSenderId: "687980468949",
    appId: "1:687980468949:web:85b5666d872dfcd7e3605c"
};

let firebaseInitialized = false;
let firebaseDb = null;

// Get Firebase configuration (Always uses dedicated web2-ec085 real configuration)
function getFirebaseConfig() {
    let apiKey = DEFAULT_FIREBASE_CONFIG.apiKey;
    let dbUrl = DEFAULT_FIREBASE_CONFIG.databaseURL;
    let projId = DEFAULT_FIREBASE_CONFIG.projectId;
    let authDom = DEFAULT_FIREBASE_CONFIG.authDomain;
    let storageBkt = DEFAULT_FIREBASE_CONFIG.storageBucket;
    let msgSenderId = DEFAULT_FIREBASE_CONFIG.messagingSenderId;
    let appId = DEFAULT_FIREBASE_CONFIG.appId;

    if (typeof window !== 'undefined' && window.ENV_CONFIG) {
        const env = window.ENV_CONFIG;
        if (env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY) {
            apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
        }
        if (env.VITE_FIREBASE_DATABASE_URL || env.FIREBASE_DATABASE_URL) {
            dbUrl = env.VITE_FIREBASE_DATABASE_URL || env.FIREBASE_DATABASE_URL;
        }
        if (env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID) {
            projId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID;
        }
        if (env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN) {
            authDom = env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN;
        }
        if (env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET) {
            storageBkt = env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET;
        }
        if (env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID) {
            msgSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID;
        }
        if (env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID) {
            appId = env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID;
        }
    }
    
    return {
        apiKey: apiKey,
        databaseURL: dbUrl,
        projectId: projId,
        authDomain: authDom,
        storageBucket: storageBkt,
        messagingSenderId: msgSenderId,
        appId: appId
    };
}

function initFirebaseSync() {
    const config = getFirebaseConfig();
    if (!config || !config.apiKey || !config.databaseURL) {
        console.error('[A7 Firebase] Firebase configuration incomplete.');
        firebaseInitialized = false;
        return false;
    }

    if (typeof firebase === 'undefined') {
        console.warn('[A7 Firebase] Firebase SDK not loaded.');
        firebaseInitialized = false;
        return false;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }
        firebaseDb = firebase.database();
        firebaseInitialized = true;

        console.log('[A7 Firebase] Initialized successfully with NEW Firebase Project!');
        console.log('[A7 Firebase] Verified Active Project ID: ' + (config.projectId || 'web2-ec085'));
        console.log('[A7 Firebase] Verified Active Database URL: ' + config.databaseURL);
        console.log('[A7 Firebase] Verified Messaging Sender ID: ' + config.messagingSenderId);
        console.log('[A7 Firebase] Verified App ID: ' + config.appId);
        
        listenToFirebaseUpdates();
        return true;
    } catch (err) {
        console.error('[A7 Firebase] Initialization error:', err);
        firebaseInitialized = false;
        return false;
    }
}

// Push data state to Firebase Database (Returns Promise. Rejects if user is unauthenticated or on Firebase error!)
function pushToFirebase(key, value) {
    if (!firebaseInitialized || !firebaseDb) {
        var initialized = initFirebaseSync();
        if (!initialized || !firebaseDb) {
            console.error('[RESULT SAVE] Firebase error: Database is disconnected or not initialized!');
            return Promise.reject(new Error('[A7 Firebase] Database connection failed. Save operation aborted.'));
        }
    }

    const authUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!authUser) {
        console.error('[RESULT SAVE] Access Denied: Unauthenticated user cannot write to database.');
        return Promise.reject(new Error('[A7 Firebase] Access Denied: Only authenticated admin users can modify database records.'));
    }

    const path = 'a7satta/' + key;
    console.log('[RESULT SAVE] Executing WRITE to Database path:', path);
    console.log('[RESULT SAVE] Active Project ID:', DEFAULT_FIREBASE_CONFIG.projectId);
    console.log('[RESULT SAVE] Auth Admin User:', authUser.email);

    return firebaseDb.ref(path).set(value)
        .then(function() {
            console.log('[RESULT SAVE] Database WRITE CONFIRMED BY FIREBASE for path:', path);
            return true;
        })
        .catch(function(err) {
            console.error('[RESULT SAVE] Database WRITE REJECTED BY FIREBASE for path:', path, err);
            throw err;
        });
}

// Delete key or path from Firebase Database (Returns Promise. Rejects if user is unauthenticated or on Firebase error!)
function deleteFromFirebase(key) {
    if (!firebaseInitialized || !firebaseDb) {
        var initialized = initFirebaseSync();
        if (!initialized || !firebaseDb) {
            console.error('[RESULT DELETE] Firebase error: Database is disconnected or not initialized!');
            return Promise.reject(new Error('[A7 Firebase] Database connection failed. Delete operation aborted.'));
        }
    }

    const authUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!authUser) {
        console.error('[RESULT DELETE] Access Denied: Unauthenticated user cannot delete database records.');
        return Promise.reject(new Error('[A7 Firebase] Access Denied: Only authenticated admin users can delete database records.'));
    }

    const path = 'a7satta/' + key;
    console.log('[RESULT DELETE] Executing DELETE on Database path:', path);
    console.log('[RESULT DELETE] Active Project ID:', DEFAULT_FIREBASE_CONFIG.projectId);
    console.log('[RESULT DELETE] Auth Admin User:', authUser.email);

    return firebaseDb.ref(path).remove()
        .then(function() {
            console.log('[RESULT DELETE] Database DELETE CONFIRMED BY FIREBASE for path:', path);
            return true;
        })
        .catch(function(err) {
            console.error('[RESULT DELETE] Database DELETE REJECTED BY FIREBASE for path:', path, err);
            throw err;
        });
}

// Listen to changes from Firebase and update local cache + UI (Firebase is Source of Truth)
function listenToFirebaseUpdates() {
    if (!firebaseInitialized || !firebaseDb) return;

    const ref = firebaseDb.ref('a7satta');
    ref.on('value', function(snapshot) {
        const val = snapshot.val();
        if (!val) {
            console.log('[RESULT FETCH] Database returned empty snapshot.');
            return;
        }

        console.log('[RESULT FETCH] Received real-time update from Database (web2-ec085).');
        let hasChanges = false;

        Object.keys(val).forEach(function(key) {
            const remoteVal = val[key];
            if (remoteVal === undefined || remoteVal === null) return;

            const localValStr = localStorage.getItem('a7_' + key);
            const remoteValStr = typeof remoteVal === 'object' ? JSON.stringify(remoteVal) : remoteVal;

            if (localValStr !== remoteValStr) {
                localStorage.setItem('a7_' + key, remoteValStr);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            if (typeof renderPrimaryTable === 'function' && document.getElementById('primary-table-body')) {
                renderPrimaryTable();
            }
            if (typeof renderSecondaryTable === 'function' && document.getElementById('secondary-table-body')) {
                renderSecondaryTable();
            }
            if (typeof renderLiveResults === 'function' && document.getElementById('live-results')) {
                renderLiveResults();
            }
            if (typeof renderFullChart === 'function' && document.getElementById('fullchart-table')) {
                renderFullChart('fullchart-table', 'fullchart_headers', 'fullchart_data');
            }
            if (typeof renderYearChart === 'function' && document.getElementById('yearchart-table')) {
                renderYearChart();
            }
            if (typeof renderAdminYearChart === 'function' && document.getElementById('admin-yearchart-body')) {
                renderAdminYearChart();
            }
        }
    }, function(error) {
        console.error('[RESULT FETCH] Realtime subscription error:', error);
    });
}

// Initialize Firebase Sync on script load
initFirebaseSync();
document.addEventListener('DOMContentLoaded', function() {
    initFirebaseSync();
});
