const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

const seoSchema = new mongoose.Schema({
  metaTitle: { type: String },
  metaDescription: { type: String },
  keywords: [{ type: String }],
  canonicalUrl: { type: String },
  ogImage: { type: String },
}, { _id: false });

const productSchema = new mongoose.Schema({
  // ── Basic ───────────────────────────────────────────
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },

  // ── Pricing ─────────────────────────────────────────
  price: { type: Number, required: true },
  salePrice: { type: Number },          // sale / discounted price
  offerBadge: { type: String },         // e.g. "Best Seller", "New Arrival"

  // ── Stock & Category ────────────────────────────────
  stock: { type: Number, required: true, default: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategories: [{ type: String }],    // subcategory slugs

  // ── Media ───────────────────────────────────────────
  images: [{ type: String }],

  // ── Attributes ──────────────────────────────────────
  features: [{ type: String }],         // bullet-point list
  careInstructions: { type: String },
  sizes: [{ type: String }],            // e.g. ["Small","Medium","Large"]
  color: { type: String },
  weight: { type: String },             // e.g. "500g"

  // ── Plant-specific ──────────────────────────────────
  plantHeight: { type: String },        // e.g. "30–45 cm"
  potSize: { type: String },            // e.g. "6 inch"
  sunlightRequirement: { type: String },// e.g. "Indirect sunlight"

  // ── Reviews ─────────────────────────────────────────
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },

  // ── SEO ─────────────────────────────────────────────
  seo: { type: seoSchema, default: () => ({}) },

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
