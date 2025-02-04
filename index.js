const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: '*', // Allow all origins (adjust for production)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const port = process.env.PORT || 3000;

// Initialize Razorpay with environment variables
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Basic health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: "active", message: "Payment API is working" });
});

// Create payment order endpoint
app.post('/api/create-payment-order', async (req, res) => {
  try {
    const { amount } = req.body;

    // Enhanced amount validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount. Please provide a positive number.' 
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise and ensure integer
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1 // Auto-capture payment
    };

    const response = await razorpayInstance.orders.create(options);
    
    res.status(201).json({
      success: true,
      orderId: response.id,
      currency: response.currency,
      amount: response.amount,
      createdAt: response.created_at
    });

  } catch (error) {
    console.error('Payment order error:', error.error || error);
    res.status(500).json({ 
      error: error.error?.description || 'Failed to create payment order' 
    });
  }
});

// Payment verification endpoint
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    // Validate required parameters
    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({ 
        error: 'Missing required payment verification parameters' 
      });
    }

    // Generate expected signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${order_id}|${payment_id}`);
    const generatedSignature = hmac.digest('hex');

    // Signature verification
    if (generatedSignature !== signature) {
      return res.status(400).json({ 
        error: 'Payment signature verification failed' 
      });
    }

    // Optional: Fetch payment details from Razorpay
    const payment = await razorpayInstance.payments.fetch(payment_id);

    res.json({
      success: true,
      status: 'Payment verified successfully',
      paymentDetails: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method
      }
    });

  } catch (error) {
    console.error('Verification error:', error.error || error);
    res.status(500).json({ 
      error: error.error?.description || 'Payment verification failed' 
    });
  }
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
