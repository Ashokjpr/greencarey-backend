const express = require('express');
const router = express.Router();
const {
  createBlog,
  getAllBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
router.get('/', getAllBlogs);

// @desc    Get single blog by slug or ID
// @route   GET /api/blogs/:id
// @access  Public
router.get('/:id', getBlog);

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private/Admin
router.post('/', createBlog);

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
router.put('/:id', updateBlog);

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
router.delete('/:id', deleteBlog);

module.exports = router;
