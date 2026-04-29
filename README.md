# 🌿 Krishvi Herbs — Premium Ayurvedic Skincare E-Commerce

Krishvi Herbs is a high-end, full-stack e-commerce platform dedicated to authentic Ayurvedic skincare. Built with modern web technologies, it offers a seamless shopping experience from product discovery to secure checkout and order tracking.

![Krishvi Herbs Banner](https://raw.githubusercontent.com/lakshyagrover/Krishvi-Herbs/main/public/images/hero-banner.png) *(Note: Replace with your actual banner link)*

---

## ✨ Key Features

### 🛍️ Shopping Experience
- **Premium UI/UX**: Clean, minimal, and glassmorphic design tailored for a luxury herbal brand.
- **Dynamic Product Catalog**: Browse products with categories, rich descriptions, and benefit listings.
- **Advanced Product Variants**: Support for multiple sizes/weights (e.g., 50g, 100g) with individual pricing and stock management.
- **Smart Shopping Cart**: Real-time cart updates without page refreshes.

### 🔐 Security & Auth
- **Passwordless Login**: Secure OTP-based authentication via email (no more forgotten passwords!).
- **Admin & User Roles**: Role-based access control (RBAC) to protect sensitive routes.
- **Protected Checkout**: Ensures only authenticated users can place orders.

### 💳 Payments & Orders
- **Razorpay Integration**: Supports UPI, Cards, Netbanking, and Wallets in both Test and Live modes.
- **Order Tracking**: Real-time order status updates (Placed → Confirmed → Shipped → Delivered).
- **Automated Invoicing**: Professional email confirmations sent via Nodemailer.
- **Profile Management**: Users can save addresses and track their entire order history.

### 🛠️ Admin Dashboard
- **Inventory Control**: Full CRUD (Create, Read, Update, Delete) functionality for products and variants.
- **Order Management**: Update shipping statuses and handle cancellations.
- **Analytics**: At-a-glance view of total sales, active orders, and customer growth.

---

## 🚀 Tech Stack

- **Backend**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (using [Mongoose](https://mongoosejs.com/))
- **Templating**: [EJS](https://ejs.co/) (Embedded JavaScript)
- **Styling**: Vanilla CSS3 (Custom Design System)
- **Payments**: [Razorpay API](https://razorpay.com/)
- **Mailing**: [Nodemailer](https://nodemailer.com/)
- **Session**: [Express-Session](https://www.npmjs.com/package/express-session) with MongoDB Storage

---

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lakshyagrover/Krishvi-Herbs.git
   cd Krishvi-Herbs
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_random_secret_key
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   PORT=3000
   ```

4. **Seed Initial Data** (Optional):
   ```bash
   npm run seed
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```
├── models/         # Mongoose Schemas (User, Product, Order)
├── routes/         # Express Routes (Auth, Admin, Orders, Products)
├── views/          # EJS Templates (Frontend)
│   ├── partials/   # Header, Footer, Navbar components
│   └── admin/      # Admin dashboard views
├── public/         # Static assets (CSS, Images, JS)
├── middleware/     # Auth & Role-based middlewares
├── server.js       # Main application entry point
└── seed.js         # Database initialization script
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.

---
*Developed with ❤️ by [Lakshya Grover](https://github.com/lakshyagrover)*
