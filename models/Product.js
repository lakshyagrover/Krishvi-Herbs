const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },   // e.g. "50g", "100g", "200g"
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: null },
  stock: { type: Number, default: 50 }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true
  },
  ingredients: [String],
  benefits: [String],
  howToUse: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    required: true
  },
  weight: {
    type: String,
    default: '100g'
  },
  stock: {
    type: Number,
    default: 50
  },
  inStock: {
    type: Boolean,
    default: true
  },
  variants: [variantSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);
