const mongoose = require('mongoose');

const blogSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String, // Short description/Excerpt
      required: true,
    },
    content: {
      type: String, // Rich text content
      required: true,
    },
    image: {
      type: String, // URL to the blog image
      required: false,
    },
    author: {
      type: String,
      required: false,
      default: 'Admin',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    seoTitle: {
      type: String,
      required: false,
    },
    seoDescription: {
      type: String,
      required: false,
    },
    seoKeywords: {
      type: String,
      required: false,
    },
    count: {
        type: Number,
        default: 0
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Blog', blogSchema);
