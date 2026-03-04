const express = require('express');
const router = express.Router();
const axios = require('axios');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/authMiddleware');

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

// ─── Helper: Get Shiprocket Auth Token ───────────────────────────────────────
async function getShiprocketToken() {
  const response = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });
  if (!response.data.token) {
    throw new Error('Shiprocket authentication failed – check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in .env');
  }
  return response.data.token;
}

// ─── Helper: Build Shiprocket Order Payload ───────────────────────────────────
function buildShiprocketOrderPayload(order) {
  const addr = order.shippingAddress;

  // Ensure numeric values are proper numbers, not strings
  const sub_total = parseFloat(order.itemsPrice) || parseFloat(order.totalPrice) || 1;

  const orderItems = order.orderItems.map((item, idx) => ({
    name: (item.product ? item.product.name : 'Product').substring(0, 100),
    sku: item.product ? item.product._id.toString() : `SKU-${idx}-${Date.now()}`,
    units: parseInt(item.quantity) || 1,
    selling_price: parseFloat(item.price) || 1,
    discount: 0,
    tax: 0,
    hsn: 0,
  }));

  // Shiprocket needs a unique order_id – use MongoDB _id + timestamp to avoid duplicates across retries
  const uniqueOrderId = `${order._id.toString()}-${Date.now()}`;

  // Derive state from city if not saved separately (common for India)
  const state = addr.state || addr.city || 'Rajasthan';

  return {
    order_id: uniqueOrderId,
    order_date: new Date(order.createdAt).toISOString().split('T')[0],
    pickup_location: 'home',
    // DO NOT send channel_id if you don't have one – causes validation errors
    billing_customer_name: (addr.fullName || order.user?.name || 'Customer').split(' ')[0],
    billing_last_name: (addr.fullName || order.user?.name || '').split(' ').slice(1).join(' ') || '',
    billing_address: addr.address || '123 Main Street',
    billing_address_2: '',
    billing_city: addr.city || 'Jaipur',
    billing_pincode: addr.postalCode || '302001',
    billing_state: state || 'Rajasthan',
    billing_country: 'India', // Shiprocket only works in India
    billing_email: order.user ? order.user.email : 'customer@example.com',
    billing_phone: addr.phone || '9999999999',
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
    sub_total: sub_total,
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };
}

// ─── POST /api/shiprocket/create-order/:orderId ───────────────────────────────
// @desc  Create Shiprocket order + assign courier + generate AWB
// @access Private/Admin
// router.post('/create-order/:orderId', protect, admin, async (req, res) => {
  router.post('/create-order/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name _id');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.shiprocketOrderId) {
      return res.status(400).json({ message: 'Shipment already created for this order. Cancel it first to recreate.' });
    }

    // Step 1: Authenticate
    let token;
    try {
      token = await getShiprocketToken();
    } catch (authErr) {
      return res.status(401).json({
        message: 'Shiprocket authentication failed',
        details: authErr.message,
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 2: Build payload
    const payload = buildShiprocketOrderPayload(order);
    console.log('Shiprocket create-order payload:', JSON.stringify(payload, null, 2));

    // Step 3: Create order in Shiprocket
    let shiprocketOrderId, shipmentId;
    try {
      const createRes = await axios.post(
        `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
        payload,
        { headers }
      );
      console.log('Shiprocket create-order response:', JSON.stringify(createRes.data, null, 2));
      shiprocketOrderId = createRes.data.order_id;
      shipmentId = createRes.data.shipment_id;
    } catch (createErr) {
      console.error('Shiprocket create-order API error:', createErr?.response?.data);
      return res.status(500).json({
        message: 'Shiprocket rejected the order',
        details: createErr?.response?.data || createErr.message,
      });
    }

    if (!shiprocketOrderId || !shipmentId) {
      return res.status(500).json({
        message: 'Shiprocket did not return order_id/shipment_id',
        details: { shiprocketOrderId, shipmentId },
      });
    }

    // Step 4: Assign AWB (courier auto-assignment)
    let awbCode = null;
    let courierName = null;
    try {
      const awbRes = await axios.post(
        `${SHIPROCKET_BASE_URL}/courier/assign/awb`,
        { shipment_id: shipmentId.toString() },
        { headers }
      );
      console.log('Shiprocket AWB response:', JSON.stringify(awbRes.data, null, 2));
      const awbData = awbRes.data?.response?.data;
      awbCode = awbData?.awb_code || awbRes.data?.awb_code || null;
      courierName = awbData?.courier_name || awbRes.data?.courier_name || null;
    } catch (awbErr) {
      // AWB assignment failure is non-fatal – we still save the order
      console.warn('Shiprocket AWB assignment failed (non-fatal):', awbErr?.response?.data || awbErr.message);
    }

    // Step 5: Build tracking URL
    const trackingUrl = awbCode
      ? `https://shiprocket.co/tracking/${awbCode}`
      : `https://app.shiprocket.in/shipments/${shipmentId}`;

    // Step 6: Persist to DB
    order.shiprocketOrderId = shiprocketOrderId.toString();
    order.shipmentId = shipmentId.toString();
    order.awbCode = awbCode;
    order.courierName = courierName;
    order.trackingUrl = trackingUrl;
    order.status = 'Shipped';
    await order.save();

    res.json({
      message: awbCode
        ? 'Shipment created and AWB assigned successfully!'
        : 'Shipment created in Shiprocket (AWB will be assigned shortly)',
      shiprocketOrderId: shiprocketOrderId.toString(),
      shipmentId: shipmentId.toString(),
      awbCode,
      courierName,
      trackingUrl,
    });

  } catch (error) {
    console.error('Shiprocket create-order unexpected error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Unexpected error while creating shipment',
      details: error?.response?.data || error.message,
    });
  }
});

// ─── GET /api/shiprocket/track/:orderId ──────────────────────────────────────
// @desc  Get live tracking info for an order's AWB
// @access Private/Admin
router.get('/track/:orderId', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.awbCode) {
      return res.status(400).json({
        message: 'No AWB code yet. Shiprocket may assign it shortly. Refresh and try again.',
      });
    }

    const token = await getShiprocketToken();
    const headers = { Authorization: `Bearer ${token}` };

    const trackRes = await axios.get(
      `${SHIPROCKET_BASE_URL}/courier/track/awb/${order.awbCode}`,
      { headers }
    );

    res.json(trackRes.data);
  } catch (error) {
    console.error('Shiprocket track error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to fetch tracking info',
      details: error?.response?.data || error.message,
    });
  }
});

// ─── POST /api/shiprocket/cancel/:orderId ────────────────────────────────────
// @desc  Cancel a Shiprocket shipment
// @access Private/Admin
router.post('/cancel/:orderId', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.shiprocketOrderId) {
      return res.status(400).json({ message: 'No Shiprocket shipment found for this order' });
    }

    const token = await getShiprocketToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      await axios.post(
        `${SHIPROCKET_BASE_URL}/orders/cancel`,
        { ids: [parseInt(order.shiprocketOrderId)] },
        { headers }
      );
    } catch (cancelErr) {
      console.warn('Shiprocket cancel API warning:', cancelErr?.response?.data || cancelErr.message);
      // Continue and clear local data even if Shiprocket cancel fails – avoids stuck state
    }

    // Clear shiprocket fields
    order.shiprocketOrderId = null;
    order.shipmentId = null;
    order.awbCode = null;
    order.courierName = null;
    order.trackingUrl = null;
    order.status = 'Cancelled';
    await order.save();

    res.json({ message: 'Shipment cancelled and order updated' });
  } catch (error) {
    console.error('Shiprocket cancel error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to cancel shipment',
      details: error?.response?.data || error.message,
    });
  }
});

// ─── GET /api/shiprocket/sync-awb/:orderId ───────────────────────────────────
// @desc  Re-fetch AWB from Shiprocket if initial assignment was delayed
// @access Private/Admin
router.get('/sync-awb/:orderId', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.shipmentId) {
      return res.status(400).json({ message: 'No Shiprocket shipment found for this order' });
    }

    const token = await getShiprocketToken();
    const headers = { Authorization: `Bearer ${token}` };

    // Try to get shipment details to retrieve AWB
    const shipDetails = await axios.get(
      `${SHIPROCKET_BASE_URL}/shipments?id=${order.shipmentId}`,
      { headers }
    );

    console.log('Sync AWB shipment details:', JSON.stringify(shipDetails.data, null, 2));

    const shipmentData = shipDetails.data?.data?.[0] || shipDetails.data?.[0];
    const awbCode = shipmentData?.awb || shipmentData?.awb_code || order.awbCode;
    const courierName = shipmentData?.courier || shipmentData?.courier_name || order.courierName;

    if (awbCode && awbCode !== order.awbCode) {
      order.awbCode = awbCode;
      order.courierName = courierName;
      order.trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;
      await order.save();
    }

    res.json({
      awbCode: order.awbCode,
      courierName: order.courierName,
      trackingUrl: order.trackingUrl,
      updated: awbCode !== null && awbCode !== undefined,
    });
  } catch (error) {
    console.error('Shiprocket sync-awb error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to sync AWB',
      details: error?.response?.data || error.message,
    });
  }
});

module.exports = router;
