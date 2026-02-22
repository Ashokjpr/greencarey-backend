const Blog = require('../models/Blog');

// @desc    Create a new blog
// @route   POST /api/blogs
// @access  Private (Admin)
exports.createBlog = async (req, res) => {
  try {
    let { 
        title, 
        slug, 
        description, 
        content, 
        image, 
        isPublished,
        seoTitle,
        seoDescription,
        seoKeywords
    } = req.body;

    // Ensure slug is unique
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
        let uniqueSlug = slug;
        let counter = 1;
        while (await Blog.findOne({ slug: uniqueSlug })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }
        slug = uniqueSlug;
    }

    const blog = await Blog.create({
      title,
      slug,
      description,
      content,
      image,
      isPublished,
      seoTitle,
      seoDescription,
      seoKeywords
    });

    res.status(201).json({
      success: true,
      data: blog,
      message: 'Blog created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get single blog by ID or Slug
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlog = async (req, res) => {
  try {
    // Check if the parameter is a valid ObjectId, otherwise treat as slug
    const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
    
    let blog;
    if (isObjectId) {
        blog = await Blog.findById(req.params.id);
    } else {
        blog = await Blog.findOne({ slug: req.params.id });
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Increment view count if viewed publicly (optional logic)
    blog.count = (blog.count || 0) + 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error ' + error.message,
    });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private (Admin)
exports.updateBlog = async (req, res) => {
  try {
    let blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Handle slug uniqueness if slug is being updated
    if (req.body.slug && req.body.slug !== blog.slug) {
        const existingBlog = await Blog.findOne({ slug: req.body.slug });
        if (existingBlog) {
             let uniqueSlug = req.body.slug;
             let counter = 1;
             while (await Blog.findOne({ slug: uniqueSlug })) {
                 uniqueSlug = `${req.body.slug}-${counter}`;
                 counter++;
             }
             req.body.slug = uniqueSlug;
        }
    }

    blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: blog,
      message: 'Blog updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private (Admin)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
