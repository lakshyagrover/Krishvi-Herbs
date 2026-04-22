require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishvi-herbs';

const products = [
  {
    name: 'Tulsi Mulethi Rose Glow Powder',
    slug: 'tulsi-mulethi-rose-glow-powder',
    price: 299,
    originalPrice: 449,
    description: 'Unlock your natural radiance with our Tulsi Mulethi Rose Glow Powder — a luxurious Ayurvedic blend crafted from the finest Tulsi (Holy Basil), Mulethi (Licorice Root), and pure Rose petals. This handcrafted face powder deeply nourishes your skin, evens out complexion, and leaves a dewy, radiant glow that lasts all day. Formulated using traditional Ayurvedic wisdom, each ingredient is ethically sourced and sun-dried to preserve its potency. Free from chemicals, parabens, and artificial fragrances.',
    shortDescription: 'A luxurious Ayurvedic glow powder with Tulsi, Mulethi & Rose for radiant, glowing skin.',
    ingredients: ['Tulsi (Holy Basil) Powder', 'Mulethi (Licorice) Root Powder', 'Rose Petal Powder', 'Chandan (Sandalwood) Powder', 'Haldi (Turmeric) Extract'],
    benefits: [
      'Gives natural, radiant glow to skin',
      'Reduces dark spots and pigmentation',
      'Anti-inflammatory and anti-bacterial properties',
      'Evens out skin tone naturally',
      'Deeply nourishes and hydrates skin',
      'Suitable for all skin types'
    ],
    howToUse: 'Mix 1-2 teaspoons of powder with rose water or raw milk to form a smooth paste. Apply evenly on face and neck. Leave for 15-20 minutes until semi-dry. Wash off with lukewarm water. Use 2-3 times a week for best results.',
    image: '/images/product-rose-glow.png',
    weight: '100g',
    inStock: true
  },
  {
    name: 'Tulsi Mulethi Face Pack',
    slug: 'tulsi-mulethi-face-pack',
    price: 249,
    originalPrice: 399,
    description: 'Revitalize your skin with our classic Tulsi Mulethi Face Pack — a time-tested Ayurvedic formula that combines the purifying power of Tulsi with the skin-brightening magic of Mulethi. This gentle yet effective face pack cleanses deep within pores, fights acne-causing bacteria, and reveals your skin\'s natural luminosity. Made with 100% natural, organically grown herbs, hand-blended in small batches to ensure the highest quality. No chemicals, no preservatives — just pure herbal goodness.',
    shortDescription: 'A classic Ayurvedic face pack combining Tulsi & Mulethi for deep cleansing and brightening.',
    ingredients: ['Tulsi (Holy Basil) Powder', 'Mulethi (Licorice) Root Powder', 'Multani Mitti (Fuller\'s Earth)', 'Neem Leaf Powder', 'Aloe Vera Extract'],
    benefits: [
      'Deep cleanses pores and removes impurities',
      'Fights acne and prevents breakouts',
      'Brightens and lightens skin naturally',
      'Reduces inflammation and redness',
      'Tightens pores for smoother skin',
      'Controls excess oil production'
    ],
    howToUse: 'Take 2 tablespoons of face pack powder. Mix with rose water, honey, or curd to create a thick paste. Apply generously on clean face and neck. Relax for 15-20 minutes. Gently scrub while washing off for mild exfoliation. Pat dry and apply moisturizer.',
    image: '/images/product-face-pack.png',
    weight: '100g',
    inStock: true
  },
  {
    name: 'Tulsi Mulethi Chukunder Face Pack',
    slug: 'tulsi-mulethi-chukunder-face-pack',
    price: 279,
    originalPrice: 429,
    description: 'Experience the rosy radiance of nature with our Tulsi Mulethi Chukunder (Beetroot) Face Pack. This unique Ayurvedic formulation harnesses the rich antioxidants and natural pigments of beetroot combined with the healing power of Tulsi and Mulethi. The result is a face pack that delivers an instant natural blush, deep nourishment, and long-lasting hydration. Beetroot\'s natural iron and folate content helps improve blood circulation to facial skin, giving you a healthy, pinkish glow that looks and feels completely natural.',
    shortDescription: 'An innovative beetroot-infused face pack with Tulsi & Mulethi for a natural rosy glow.',
    ingredients: ['Tulsi (Holy Basil) Powder', 'Mulethi (Licorice) Root Powder', 'Chukunder (Beetroot) Powder', 'Gulab (Rose) Petal Powder', 'Vitamin E Oil'],
    benefits: [
      'Gives instant natural pinkish glow',
      'Rich in antioxidants for anti-aging benefits',
      'Improves blood circulation to skin',
      'Deep hydration and nourishment',
      'Natural skin brightening without chemicals',
      'Reduces fine lines and wrinkles'
    ],
    howToUse: 'Mix 2 tablespoons of the face pack with rose water and a few drops of honey. Apply a thick, even coat on face and neck while avoiding the eye area. Leave on for 20 minutes. Rinse off with cold water for a refreshing finish. Use 2-3 times a week.',
    image: '/images/product-chukunder.png',
    weight: '100g',
    inStock: true
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    // Insert new products
    await Product.insertMany(products);
    console.log('🌱 Seeded 3 products successfully!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
