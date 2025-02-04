const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();  // Ensure .env file is loaded

const app = express();
app.use(express.json());
app.use(cors());

const port = 3000;

// Initialize Razorpay instance with your test API keys
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,    // Razorpay Test Key ID
  key_secret: process.env.RAZORPAY_KEY_SECRET,  // Razorpay Test Secret Key
});

app.get('/', (req, res) => {
  res.send("API is working");
});

// Create Razorpay order
app.post('/api/create-payment-order', async (req, res) => {
  const { amount } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Razorpay expects the amount in paise, so multiply the amount by 100
  const options = {
    amount: amount * 100, // in paise
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const response = await razorpayInstance.orders.create(options);
    res.json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Verify Razorpay payment signature
app.post('/api/verify-payment', (req, res) => {
  const { order_id, payment_id, signature } = req.body;

  try {
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(order_id + "|" + payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === signature) {
      return res.json({ status: 'success' });
    } else {
      return res.status(400).json({ error: 'Signature verification failed' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
