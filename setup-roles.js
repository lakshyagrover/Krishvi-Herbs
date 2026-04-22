require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishvi-herbs';

async function setup() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  // Setup standard admin account
  let adminUser = await User.findOne({ email: 'admin@krishviherbs.com' });
  if (!adminUser) {
    adminUser = new User({ email: 'admin@krishviherbs.com', name: 'Admin', role: 'admin' });
    await adminUser.save();
    console.log('Created admin: admin@krishviherbs.com');
  } else {
    adminUser.role = 'admin';
    await adminUser.save();
    console.log('Updated admin: admin@krishviherbs.com');
  }
  
  // Also make the user's specific email an admin
  const personalAdmin = await User.findOneAndUpdate(
    { email: 'groverlakshya123@gmail.com' }, 
    { role: 'admin' },
    { new: true }
  );
  if (personalAdmin) {
    console.log('Made groverlakshya123@gmail.com an admin!');
  }

  // List all users
  const users = await User.find({}, 'email name role');
  console.log('\nCurrent Users:');
  users.forEach(u => console.log(`  ${u.email} | ${u.name || '-'} | ${u.role}`));

  process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
