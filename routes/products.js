const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// ─── All Products Page ───────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.render('products', { products });
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).send('Server error');
  }
});

// ─── Single Product Page ─────────────────────────────────
router.get('/products/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) {
      return res.status(404).render('404');
    }
    // Get related products (exclude current)
    const related = await Product.find({ _id: { $ne: product._id } }).limit(2);
    res.render('product-detail', { product, related });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).send('Server error');
  }
});

// ─── Products API (JSON) ────────────────────────────────
router.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
