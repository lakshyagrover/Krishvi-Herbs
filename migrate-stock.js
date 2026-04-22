require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishvi-herbs';

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  // Add stock field to all products that don't have it
  const products = await Product.find({});
  
  for (const product of products) {
    let changed = false;

    // Add default stock if missing
    if (product.stock === undefined || product.stock === null) {
      product.stock = 50;
      changed = true;
    }

    // Add sample variants if none exist
    if (!product.variants || product.variants.length === 0) {
      product.variants = [
        { name: '50g', price: Math.round(product.price * 0.6), stock: 30 },
        { name: '100g', price: product.price, stock: 50 },
        { name: '200g', price: Math.round(product.price * 1.7), stock: 20 }
      ];
      changed = true;
    }

    if (changed) {
      await product.save();
      console.log('Updated:', product.name, '- Stock:', product.stock, '- Variants:', product.variants.length);
    }
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
