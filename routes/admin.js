const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

router.use(requireAdmin);

// ─── Dashboard ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [orders, products, users] = await Promise.all([
      Order.find({}).sort({ createdAt: -1 }).limit(10),
      Product.countDocuments(),
      User.countDocuments()
    ]);
    const allOrders = await Order.find({});
    const stats = {
      totalOrders: allOrders.length,
      totalProducts: products,
      totalUsers: users,
      revenue: allOrders.filter(o => !o.cancelled).reduce((s, o) => s + o.totalAmount, 0),
      newOrders: allOrders.filter(o => o.orderStatus === 'placed').length,
      delivered: allOrders.filter(o => o.orderStatus === 'delivered').length,
      cancelled: allOrders.filter(o => o.cancelled).length
    };
    res.render('admin/dashboard', { orders, stats, page: 'dashboard' });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Server error');
  }
});

// ─── Analytics ───────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const allOrders = await Order.find({}).sort({ createdAt: 1 });
    const now = new Date();

    // Daily sales (last 30 days)
    const dailySales = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];
      const dayOrders = allOrders.filter(o => {
        const d = new Date(o.createdAt).toISOString().split('T')[0];
        return d === dayStr && !o.cancelled;
      });
      dailySales.push({
        date: dayStr,
        label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
        orders: dayOrders.length
      });
    }

    // Weekly sales (last 12 weeks)
    const weeklySales = [];
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const weekOrders = allOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= weekStart && d <= weekEnd && !o.cancelled;
      });
      weeklySales.push({
        label: 'W' + (12 - i),
        revenue: weekOrders.reduce((s, o) => s + o.totalAmount, 0),
        orders: weekOrders.length
      });
    }

    // Monthly sales (last 6 months)
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthOrders = allOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= month && d <= monthEnd && !o.cancelled;
      });
      monthlySales.push({
        label: month.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0),
        orders: monthOrders.length
      });
    }

    // Summary stats
    const totalRevenue = allOrders.filter(o => !o.cancelled).reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders = allOrders.length;
    const cancelledOrders = allOrders.filter(o => o.cancelled).length;
    const activeUsers = await User.countDocuments();
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid').length;
    const codOrders = allOrders.filter(o => o.paymentMethod === 'cod' && !o.cancelled).length;

    // Low stock products
    const lowStockProducts = await Product.find({ stock: { $lt: 10 }, inStock: true });

    res.render('admin/analytics', {
      page: 'analytics',
      dailySales: JSON.stringify(dailySales),
      weeklySales: JSON.stringify(weeklySales),
      monthlySales: JSON.stringify(monthlySales),
      totalRevenue, totalOrders, cancelledOrders, activeUsers,
      paidOrders, codOrders, lowStockProducts
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).send('Server error');
  }
});

// ─── Products ────────────────────────────────────
router.get('/products', async (req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 });
  res.render('admin/products', { products, page: 'products', query: req.query });
});

router.get('/products/add', (req, res) => {
  res.render('admin/product-form', { product: null, page: 'products' });
});

router.post('/products', async (req, res) => {
  try {
    const { name, price, originalPrice, shortDescription, description, ingredients, benefits, howToUse, image, weight, stock, variantNames, variantPrices, variantStocks } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    // Build variants array
    const variants = [];
    if (variantNames && Array.isArray(variantNames)) {
      for (let i = 0; i < variantNames.length; i++) {
        if (variantNames[i] && variantNames[i].trim()) {
          variants.push({
            name: variantNames[i].trim(),
            price: Number(variantPrices[i]) || Number(price),
            stock: Number(variantStocks[i]) || 50
          });
        }
      }
    }

    const product = new Product({
      name, slug, price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      shortDescription, description,
      ingredients: ingredients ? ingredients.split(',').map(s => s.trim()) : [],
      benefits: benefits ? benefits.split(',').map(s => s.trim()) : [],
      howToUse, image: image || '/images/product-rose-glow.png',
      weight: weight || '100g',
      stock: Number(stock) || 50,
      variants
    });
    await product.save();
    res.redirect('/admin/products?toast=product-added');
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).send('Failed to add product');
  }
});

router.get('/products/edit/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('admin/product-form', { product, page: 'products' });
});

router.post('/products/edit/:id', async (req, res) => {
  try {
    const { name, price, originalPrice, shortDescription, description, ingredients, benefits, howToUse, image, weight, inStock, stock, variantNames, variantPrices, variantStocks } = req.body;

    // Build variants
    const variants = [];
    if (variantNames) {
      const names = Array.isArray(variantNames) ? variantNames : [variantNames];
      const prices = Array.isArray(variantPrices) ? variantPrices : [variantPrices];
      const stocks = Array.isArray(variantStocks) ? variantStocks : [variantStocks];
      for (let i = 0; i < names.length; i++) {
        if (names[i] && names[i].trim()) {
          variants.push({
            name: names[i].trim(),
            price: Number(prices[i]) || Number(price),
            stock: Number(stocks[i]) || 0
          });
        }
      }
    }

    await Product.findByIdAndUpdate(req.params.id, {
      name, price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      shortDescription, description,
      ingredients: ingredients ? ingredients.split(',').map(s => s.trim()) : [],
      benefits: benefits ? benefits.split(',').map(s => s.trim()) : [],
      howToUse, image, weight,
      stock: Number(stock) || 0,
      inStock: inStock === 'on' || inStock === 'true',
      variants
    });
    res.redirect('/admin/products?toast=product-updated');
  } catch (err) {
    console.error('Edit product error:', err);
    res.status(500).send('Failed to update product');
  }
});

// Quick stock update API
router.post('/products/:id/stock', async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false });
    product.stock = Number(stock);
    product.inStock = Number(stock) > 0;
    await product.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.post('/products/delete/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ─── Orders ──────────────────────────────────────
router.get('/orders', async (req, res) => {
  const filter = req.query.status ? { orderStatus: req.query.status } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.render('admin/orders', { orders, page: 'orders', currentFilter: req.query.status || 'all' });
});

router.get('/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).send('Order not found');
  res.render('admin/order-detail', { order, page: 'orders' });
});

router.post('/orders/:id/status', async (req, res) => {
  try {
    const { orderStatus, cancellationReason } = req.body;
    console.log('Status update request:', { orderId: req.params.id, orderStatus, cancellationReason });
    const valid = ['placed', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!valid.includes(orderStatus)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    console.log('--- Status Update Start ---');
    console.log('Target Status:', orderStatus);
    console.log('Current Order State:', { 
      id: order._id, 
      status: order.orderStatus, 
      cancelled: order.cancelled,
      cancelledBy: order.cancelledBy 
    });

    if (orderStatus === 'cancelled' && !order.cancelled) {
      console.log('Action: Cancelling order...');
      const trimmedReason = String(cancellationReason || '').trim();
      if (!trimmedReason) {
        console.log('Error: Cancellation reason missing');
        return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
      }

      order.cancelled = true;
      order.cancelledBy = 'admin';
      order.cancellationReason = trimmedReason;
      
      console.log('Action: Restoring stock for items:', order.items.length);
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.productId);
          if (product) {
            if (item.variant && product.variants && product.variants.length > 0) {
              const v = product.variants.find(v => v.name === item.variant);
              if (v) {
                v.stock += item.quantity;
                console.log(`Restored variant stock: ${product.name} (${v.name}) +${item.quantity}`);
              }
            } else {
              product.stock += item.quantity;
              console.log(`Restored product stock: ${product.name} +${item.quantity}`);
            }
            product.inStock = true;
            await product.save();
          }
        } catch (itemErr) {
          console.error('Error restoring stock for item:', item.productId, itemErr);
        }
      }
    } else if (orderStatus === 'cancelled' && order.cancelled) {
      console.log('Action: Updating cancellation reason');
      const trimmedReason = String(cancellationReason || '').trim();
      if (trimmedReason) {
        order.cancellationReason = trimmedReason;
      }
    } else if (orderStatus !== 'cancelled' && order.cancelled) {
      console.log('Action: Restoring order from cancelled status');
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.productId);
          if (product) {
            if (item.variant && product.variants && product.variants.length > 0) {
              const v = product.variants.find(v => v.name === item.variant);
              if (v) {
                v.stock = Math.max(0, v.stock - item.quantity);
                console.log(`Reduced variant stock: ${product.name} (${v.name}) -${item.quantity}`);
              }
            } else {
              product.stock = Math.max(0, product.stock - item.quantity);
              console.log(`Reduced product stock: ${product.name} -${item.quantity}`);
            }
            
            const totalStock = (product.variants && product.variants.length > 0) 
              ? product.variants.reduce((sum, v) => sum + v.stock, 0)
              : product.stock;
            
            product.inStock = totalStock > 0;
            await product.save();
          }
        } catch (itemErr) {
          console.error('Error reducing stock for item:', item.productId, itemErr);
        }
      }
      order.cancelled = false;
      order.cancelledBy = null;
      order.cancellationReason = '';
    }

    order.orderStatus = orderStatus;
    
    // Auto-mark as paid if delivered
    if (orderStatus === 'delivered') {
      order.paymentStatus = 'paid';
      console.log('Action: Auto-marking as paid (delivered)');
    }

    console.log('Action: Saving order...');
    await order.save();
    console.log('--- Status Update Success ---');
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (err) {
    console.error('--- Status Update FAILED ---');
    console.error('Error details:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
  }
});

// ─── Users ───────────────────────────────────────
router.get('/users', async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });
  users.forEach(user => {
    if (user.role !== 'admin') {
      user.role = 'user';
    }
  });
  res.render('admin/users', { users, page: 'users' });
});

router.post('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
