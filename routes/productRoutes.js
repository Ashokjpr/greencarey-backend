const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
// const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, subCategory, minPrice, maxPrice, sort, search, pageNumber, limitNumber } = req.query;
    
    // Pagination defaults
    const page = Number(pageNumber) || 1;
    const limit = Number(limitNumber) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let query = {};

    if (category) {
       const Category = require('../models/Category');
       const categoryDoc = await Category.findOne({ slug: new RegExp(`^${category}$`, 'i') });
       
       if (categoryDoc) {
           query.category = categoryDoc._id;
       } else {
           return res.json({ products: [], page, pages: 0, total: 0 });
       }
    }

    // Filter by subcategory slug (stored in subCategories array on Product)
    if (subCategory) {
      query.subCategories = { $in: [subCategory] };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Determine total count for pagination
    const total = await Product.countDocuments(query);

    let productsQuery = Product.find(query).populate('category', 'name slug');

    // Sorting
    if (sort) {
      switch (sort) {
        case 'price-low-high':
          productsQuery = productsQuery.sort({ price: 1 });
          break;
        case 'price-high-low':
          productsQuery = productsQuery.sort({ price: -1 });
          break;
        case 'newest':
          productsQuery = productsQuery.sort({ createdAt: -1 });
          break;
        default:
          productsQuery = productsQuery.sort({ createdAt: -1 });
      }
    } else {
        productsQuery = productsQuery.sort({ createdAt: -1 });
    }

    // Apply pagination
    productsQuery = productsQuery.limit(limit).skip(skip);

    const products = await productsQuery;

    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    let query = isObjectId ? { _id: req.params.id } : { slug: req.params.id };

    const product = await Product.findOne(query).populate('category', 'name slug');

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', async (req, res) => {
  const {
    name, slug, price, salePrice, offerBadge,
    description, images, category, subCategories, stock,
    features, careInstructions, sizes, color, weight,
    plantHeight, potSize, sunlightRequirement, seo,
  } = req.body;

  try {
    let finalSlug = slug;
    const existing = await Product.findOne({ slug });
    if (existing) {
      let counter = 1;
      while (await Product.findOne({ slug: finalSlug })) {
        finalSlug = `${slug}-${counter++}`;
      }
    }

    const product = await Product.create({
      name, slug: finalSlug, price, salePrice, offerBadge,
      description, images, category,
      subCategories: subCategories || [],
      stock,
      features: features || [],
      careInstructions,
      sizes: sizes || [],
      color, weight, plantHeight, potSize, sunlightRequirement,
      seo: seo || {},
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', async (req, res) => {
  const {
    name, slug, price, salePrice, offerBadge,
    description, images, category, subCategories, stock,
    features, careInstructions, sizes, color, weight,
    plantHeight, potSize, sunlightRequirement, seo,
  } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Slug uniqueness check
    if (slug && slug !== product.slug) {
      const existingProduct = await Product.findOne({ slug });
      if (existingProduct) {
        let uniqueSlug = slug, counter = 1;
        while (await Product.findOne({ slug: uniqueSlug })) uniqueSlug = `${slug}-${counter++}`;
        product.slug = uniqueSlug;
      } else {
        product.slug = slug;
      }
    } else if (!product.slug && slug) {
      product.slug = slug;
    }

    product.name = name ?? product.name;
    product.price = price ?? product.price;
    product.salePrice = salePrice !== undefined ? salePrice : product.salePrice;
    product.offerBadge = offerBadge !== undefined ? offerBadge : product.offerBadge;
    product.description = description ?? product.description;
    product.images = images ?? product.images;
    product.category = category ?? product.category;
    product.subCategories = subCategories !== undefined ? subCategories : product.subCategories;
    product.stock = stock ?? product.stock;
    product.features = features !== undefined ? features : product.features;
    product.careInstructions = careInstructions !== undefined ? careInstructions : product.careInstructions;
    product.sizes = sizes !== undefined ? sizes : product.sizes;
    product.color = color !== undefined ? color : product.color;
    product.weight = weight !== undefined ? weight : product.weight;
    product.plantHeight = plantHeight !== undefined ? plantHeight : product.plantHeight;
    product.potSize = potSize !== undefined ? potSize : product.potSize;
    product.sunlightRequirement = sunlightRequirement !== undefined ? sunlightRequirement : product.sunlightRequirement;
    if (seo) product.seo = { ...product.seo, ...seo };

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a product review
// @route   POST /api/products/:id/reviews
// @access  Public (or Protected — remove comment to add auth)
router.post('/:id/reviews', async (req, res) => {
  const { name, rating, comment } = req.body;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const review = { name, rating: Number(rating), comment };
    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added', rating: product.rating, numReviews: product.numReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.deleteOne({ _id: product._id });
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
