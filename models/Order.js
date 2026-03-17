const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
  },  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  }],
  shippingAddress: {
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true },
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String,
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false,
  },
  paidAt: {
    type: Date,
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false,
  },
  deliveredAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },
  // Shiprocket Shipment Fields
  shiprocketOrderId: { type: String, default: null },
  shipmentId: { type: String, default: null },
  awbCode: { type: String, default: null },
  courierName: { type: String, default: null },
  trackingUrl: { type: String, default: null },
}, { timestamps: true });


//  AUTO ORDER ID GENERATOR
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    try {
      const lastOrder = await mongoose
        .model("Order")
        .findOne()
        .sort({ createdAt: -1 });

      let nextNumber = 1001;

      if (lastOrder && lastOrder.orderId) {
        const lastNumber = parseInt(lastOrder.orderId.replace("GC", ""));
        nextNumber = lastNumber + 1;
      }

      this.orderId = `GC${nextNumber}`;

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Order', orderSchema);
