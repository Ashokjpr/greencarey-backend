const express = require('express');
const router = express.Router();
const {
  createContact,
  getAllContacts,
  getUnreadCount,
  getContact,
  markAsRead,
  deleteContact,
} = require('../controllers/contactController');

// Public route to submit contact form
router.post('/', createContact);

// Admin routes (should be protected in a real app, adding validation if middleware exists)
router.get('/', getAllContacts);
router.get('/unread', getUnreadCount);
router.get('/:id', getContact);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteContact);

module.exports = router;
