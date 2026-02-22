const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { pageNumber, limitNumber, status, search, startDate, endDate } = req.query;

    const page = Number(pageNumber) || 1;
    const limit = Number(limitNumber) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    // Date Filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day to include orders created on that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      // Search by Order ID or User Name
      // Since 'user' is a ref, we can't easily regex search it in a single query without aggregation or separate queries.
      // For simplicity/performance, let's search by ID direct match OR regex match if valid ObjectId
      // And we can try to search user separately if needed, but let's stick to ID for now or basic aggregation if critical.
      // Actually, plan said "Search by Order ID or User Name".
      
      // Check if search is a valid ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      
      if (isObjectId) {
         query.$or = [{ _id: search }, { user: search }];
      } else {
         // If not ID, maybe searching for user name?
         // This requires finding users first or aggregation.
         // Let's keep it simple for now: Search matches strict ID or basic attempt at finding user
         // A common pattern is to lookup users first.
         const User = require('../models/User');
         const users = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id');
         const userIds = users.map(u => u._id);
         
         if (userIds.length > 0) {
             query.user = { $in: userIds };
         } else {
             // If no user found and not a valid ID, return empty (unless we want to support other fields)
             // But if specific search logic is needed, we can expand.
             // Let's assume mostly ID search or User Name.
             if(!query.$or) query.$or = [];
             // Ensure we don't return everything if nothing matched
             query.$or.push({ _id: null }); // Force empty result if nothing matches
         }
      }
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'id name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const statusCounts = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      orders,
      page,
      pages: Math.ceil(total / limit),
      total,
      statusCounts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paymentResult,
    isPaid,
    paidAt,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400).json({ message: 'No order items' });
    return;
  } else {
    const order = new Order({
      orderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      paymentResult,
      isPaid,
      paidAt,
    });

    const createdOrder = await order.save();

    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    ).populate('orderItems.product', 'name images price');

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
router.get('/myorders/:userid', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userid }).populate('orderItems.product', 'name images price');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = status;
      if (status === 'Delivered') {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      } else {
        order.isDelivered = false;
        order.deliveredAt = null;
      }

      if (status === 'Paid') { // Optional manual payment mark
          order.isPaid = true;
          order.paidAt = Date.now();
      }

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
