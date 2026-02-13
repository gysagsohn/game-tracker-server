require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.development'
});

const mongoose = require('mongoose');
const Notification = require('../models/NotificationModel');

async function clearNotifications() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to MongoDB');
    
    const result = await Notification.deleteMany({});
    console.log(`Deleted ${result.deletedCount} notifications`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clearNotifications();