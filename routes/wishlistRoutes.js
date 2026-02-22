const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');

    if (!wishlist) {
      return res.json([]);
    }

    res.json(wishlist.products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
router.post('/', protect, async (req, res) => {
  const { productId } = req.body;

  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (wishlist) {
      // Check if product already exists
      const alreadyExists = wishlist.products.find(
        (p) => p.toString() === productId
      );

      if (alreadyExists) {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }

      wishlist.products.push(productId);
      await wishlist.save();
    } else {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [productId],
      });
    }

    await wishlist.populate('products');
    res.json(wishlist.products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
  const productId = req.params.productId;

  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (wishlist) {
      wishlist.products = wishlist.products.filter(
        (p) => p.toString() !== productId
      );
      await wishlist.save();
      await wishlist.populate('products');
      res.json(wishlist.products);
    } else {
      res.status(404).json({ message: 'Wishlist not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
