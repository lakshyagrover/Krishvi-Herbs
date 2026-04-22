require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const { requireAuth } = require('./middleware/auth');
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');

const app = express();

// ─── MongoDB Connection ──────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishvi-herbs';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Middleware ──────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'krishvi-herbs-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Make session user available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.razorpayEnabled = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  res.locals.razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
  next();
});

// ─── Routes ──────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

app.use('/auth', authRoutes);
app.use('/', productRoutes);
app.use('/order', orderRoutes);
app.use('/admin', adminRoutes);

// Home page
app.get('/', (req, res) => {
  Product.find({}).then(products => {
    res.render('home', { products });
  });
});

// Cart page
app.get('/cart', (req, res) => {
  res.render('cart');
});

// Checkout page — requires login
app.get('/checkout', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/checkout');
  }
  User.findById(req.session.user._id).then(profile => {
    res.render('checkout', { profile });
  }).catch(() => {
    res.render('checkout', { profile: null });
  });
});

// Login page
app.get('/login', (req, res) => {
  const redirect = req.query.redirect || '/';
  res.render('login', { redirect });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// My Orders
app.get('/my-orders', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/my-orders');
  }
  const orders = await Order.find({ userId: req.session.user._id }).sort({ createdAt: -1 });
  res.render('my-orders', { orders });
});

app.get('/profile', requireAuth, async (req, res) => {
  try {
    const [profile, orders] = await Promise.all([
      User.findById(req.session.user._id),
      Order.find({ userId: req.session.user._id }).sort({ createdAt: -1 }).limit(3)
    ]);

    if (!profile) {
      req.session.destroy(() => res.redirect('/login'));
      return;
    }

    const allOrders = await Order.find({ userId: req.session.user._id });
    const stats = {
      totalOrders: allOrders.length,
      totalSpent: allOrders.filter(order => !order.cancelled).reduce((sum, order) => sum + order.totalAmount, 0),
      activeOrders: allOrders.filter(order => !['delivered', 'cancelled'].includes(order.orderStatus)).length
    };

    res.render('profile', { profile, orders, stats, query: req.query });
  } catch (err) {
    console.error('Profile page error:', err);
    res.status(500).send('Server error');
  }
});

app.post('/profile', requireAuth, async (req, res) => {
  try {
    const update = {
      name: (req.body.name || '').trim(),
      mobile: (req.body.mobile || '').trim(),
      address: {
        address: (req.body.address || '').trim(),
        city: (req.body.city || '').trim(),
        state: (req.body.state || '').trim(),
        pincode: (req.body.pincode || '').trim()
      }
    };

    const user = await User.findByIdAndUpdate(req.session.user._id, update, { new: true });
    if (!user) {
      return res.status(404).send('User not found');
    }

    req.session.user = {
      ...req.session.user,
      name: user.name,
      mobile: user.mobile,
      role: user.role
    };

    res.redirect('/profile?saved=1');
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).send('Failed to update profile');
  }
});

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404');
});

// ─── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌿 Krishvi Herbs running at http://localhost:${PORT}`);
});
