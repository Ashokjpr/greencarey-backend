const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
});

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  icon: {
    type: String,
  },
  color: {
    type: String,
  },
  subCategories: [subCategorySchema],
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
