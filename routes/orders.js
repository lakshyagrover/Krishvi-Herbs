const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// ─── Auth Middleware ─────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please login first' });
  }
  next();
}

// ─── Helper: Reduce stock on order ───────────────────────
async function reduceStock(items) {
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    if (item.variant && product.variants.length > 0) {
      const v = product.variants.find(v => v.name === item.variant);
      if (v) {
        v.stock = Math.max(0, v.stock - item.quantity);
      }
    } else {
      product.stock = Math.max(0, product.stock - item.quantity);
    }

    // Auto-update inStock based on total stock
    const totalStock = product.stock + product.variants.reduce((s, v) => s + v.stock, 0);
    product.inStock = totalStock > 0;
    await product.save();
  }
}

// ─── Helper: Restore stock on cancel ─────────────────────
async function restoreStock(items) {
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    if (item.variant && product.variants.length > 0) {
      const v = product.variants.find(v => v.name === item.variant);
      if (v) {
        v.stock += item.quantity;
      }
    } else {
      product.stock += item.quantity;
    }

    product.inStock = true;
    await product.save();
  }
}

// ─── Create Order ────────────────────────────────────────
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Validate stock against live product data
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product not found: ${item.name}` });
      }

      // Check stock
      if (item.variant && product.variants.length > 0) {
        const v = product.variants.find(v => v.name === item.variant);
        if (v && v.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `${item.name} (${item.variant}) is out of stock` });
        }
      } else if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `${item.name} is out of stock` });
      }
    }

    // If Razorpay
    if (paymentMethod === 'razorpay' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: 'order_' + Date.now()
      });

      const order = new Order({
        userId: req.session.user._id,
        items, totalAmount, shippingAddress,
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        razorpayOrderId: razorpayOrder.id,
        orderStatus: 'placed'
      });
      await order.save();
      await reduceStock(items);
      await User.findByIdAndUpdate(req.session.user._id, {
        name: shippingAddress.name,
        mobile: shippingAddress.mobile,
        address: {
          address: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode
        }
      });
      req.session.user = {
        ...req.session.user,
        name: shippingAddress.name,
        mobile: shippingAddress.mobile
      };

      return res.json({
        success: true,
        paymentMethod: 'razorpay',
        razorpayOrder,
        orderId: order._id
      });
    }

    // COD Order
    const order = new Order({
      userId: req.session.user._id,
      items, totalAmount, shippingAddress,
      paymentMethod: 'cod',
      paymentStatus: 'cod',
      orderStatus: 'placed'
    });
    await order.save();
    await reduceStock(items);
    await User.findByIdAndUpdate(req.session.user._id, {
      name: shippingAddress.name,
      mobile: shippingAddress.mobile,
      address: {
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode
      }
    });
    req.session.user = {
      ...req.session.user,
      name: shippingAddress.name,
      mobile: shippingAddress.mobile
    };

    res.json({ success: true, paymentMethod: 'cod', orderId: order._id });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// ─── Verify Razorpay Payment ─────────────────────────────
router.post('/verify-payment', requireAuth, async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Payment failed — restore stock
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = 'failed';
        await order.save();
        await restoreStock(order.items);
      }
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.orderStatus = 'confirmed';
    await order.save();

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
});

// ─── Cancel Order (restore stock) ────────────────────────
router.post('/cancel/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Ownership check — only the order owner can cancel
    if (order.userId.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }
    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel after shipping' });
    }

    order.orderStatus = 'cancelled';
    order.cancelled = true;
    order.cancelledBy = 'user';
    order.cancellationReason = 'Cancelled by customer request.';
    await order.save();
    await restoreStock(order.items);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Order Success Page ──────────────────────────────────
router.get('/success/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).render('404');
    // Ownership check — only the order owner can view success page
    if (order.userId.toString() !== req.session.user._id.toString()) {
      return res.status(403).render('403', { message: 'Not authorized to view this order' });
    }
    res.render('order-success', { order });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// ─── Track Order Page ────────────────────────────────────
router.get('/track/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).render('404');
    // Ownership check — only the order owner can track their order
    if (order.userId.toString() !== req.session.user._id.toString()) {
      return res.status(403).render('403', { message: 'Not authorized to view this order' });
    }
    res.render('track-order', { order });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// ─── Get Order Details (API) ─────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Ownership check — only the order owner or admin can view order details
    if (order.userId.toString() !== req.session.user._id.toString()
        && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
