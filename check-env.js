require('dotenv').config();
console.log('KEY:', process.env.RAZORPAY_KEY_ID);
console.log('SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'EMPTY');
console.log('ENABLED:', !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET));
process.exit(0);
