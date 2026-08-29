// ============================================================
// Environment Configuration (js/env.js)
// Dedicated Firebase Project Configuration for NEW Website
// Project ID: web2-ec085
// ============================================================

const ENV_CONFIG = {
    // Site & Contact Config
    SITE_NAME: "A7 SATTA",
    WHATSAPP_PHONE: "917027405875",
    WHATSAPP_URL: "https://wa.me/message/WTOZYC4GBMWNC1",

    // REAL NEW Firebase Web App Configuration (web2-ec085)
    VITE_FIREBASE_API_KEY: "AIzaSyBL0ZveAfL7l6I8C7dO9B3-SHL-QXy4Mrk",
    VITE_FIREBASE_AUTH_DOMAIN: "web2-ec085.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "web2-ec085",
    VITE_FIREBASE_STORAGE_BUCKET: "web2-ec085.firebasestorage.app",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "687980468949",
    VITE_FIREBASE_APP_ID: "1:687980468949:web:85b5666d872dfcd7e3605c",
    VITE_FIREBASE_DATABASE_URL: "https://web2-ec085-default-rtdb.firebaseio.com/",

    // Compatibility Mappings
    FIREBASE_API_KEY: "AIzaSyBL0ZveAfL7l6I8C7dO9B3-SHL-QXy4Mrk",
    FIREBASE_DATABASE_URL: "https://web2-ec085-default-rtdb.firebaseio.com/",
    FIREBASE_PROJECT_ID: "web2-ec085",
    FIREBASE_AUTH_DOMAIN: "web2-ec085.firebaseapp.com",
    FIREBASE_STORAGE_BUCKET: "web2-ec085.firebasestorage.app",
    FIREBASE_MESSAGING_SENDER_ID: "687980468949",
    FIREBASE_APP_ID: "1:687980468949:web:85b5666d872dfcd7e3605c"
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ENV_CONFIG = ENV_CONFIG;
}
