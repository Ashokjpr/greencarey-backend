const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { pageNumber, limitNumber, search } = req.query;

    const page = Number(pageNumber) || 1;
    const limit = Number(limitNumber) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password') // Exclude password from result
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      users,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update user role to admin
// @route   PUT /api/users/:id/role
// @access  Private/Admin
router.put('/:id/role', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Use role from body or default to 'admin' (for backward compatibility if needed)
      // Validate that role is either 'user' or 'admin'
      const newRole = req.body.role || 'admin';
      
      if (newRole !== 'user' && newRole !== 'admin') {
          return res.status(400).json({ message: 'Invalid role' });
      }

      user.role = newRole;
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
