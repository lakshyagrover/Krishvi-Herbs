const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/krishvi-herbs');
  console.log('Connected');
  const vendor = await User.findOne({ email: 'vendor@krishviherbs.com' });
  console.log('Vendor:', vendor.email, vendor._id);
  
  const products = await Product.find({ vendorId: vendor._id });
  console.log('Products count:', products.length);
  
  const allOrders = await Order.find({ 'items.vendorId': vendor._id }).sort({ createdAt: -1 });
  console.log('Orders count:', allOrders.length);
  
  try {
    const revenue = allOrders.filter(o => o.orderStatus === 'delivered' && !o.cancelled).reduce((sum, o) => {
      return sum + o.items.filter(i => String(i.vendorId) === String(vendor._id))
        .reduce((s, i) => s + (i.price * i.quantity), 0);
    }, 0);
    console.log('Revenue calc success. Revenue:', revenue);
  } catch (e) {
    console.error('Revenue calc crashed:', e);
  }
  process.exit(0);
}
test();
