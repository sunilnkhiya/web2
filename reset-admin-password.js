const readline = require('readline');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const sa = require('./service-account.json');

initializeApp({ credential: cert(sa) });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter NEW password: ', async (password) => {
  try {
    const user = await getAuth().getUserByEmail('admin171233@gmail.com');
    await getAuth().updateUser(user.uid, { password });
    console.log('✅ PASSWORD UPDATED SUCCESSFULLY');
  } catch (e) {
    console.error('❌', e.message);
  }
  rl.close();
});
