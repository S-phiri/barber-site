import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5174;

// Middleware
app.use(cors({
  origin: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory store for bookings (replace with database later)
const bookings: Record<string, any> = {};

// PayFast configuration
const PAYFAST_CONFIG = {
  merchantId: process.env.PAYFAST_MERCHANT_ID,
  merchantKey: process.env.PAYFAST_MERCHANT_KEY,
  passphrase: process.env.PAYFAST_PASSPHRASE,
  mode: process.env.PAYFAST_MODE || 'sandbox'
};

// Validate required environment variables
const requiredEnvVars = ['PAYFAST_MERCHANT_ID', 'PAYFAST_MERCHANT_KEY', 'PAYFAST_PASSPHRASE'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`⚠️  Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Helper functions
function pfEndpoint(mode: string): string {
  return mode === 'live' 
    ? 'https://www.payfast.co.za/eng/process' 
    : 'https://sandbox.payfast.co.za/eng/process';
}

function generateSignature(payload: Record<string, any>, passphrase?: string): string {
  // Create parameter string for signature
  let parameterString = '';
  Object.keys(payload)
    .sort()
    .forEach(key => {
      if (payload[key] !== '' && payload[key] !== null && payload[key] !== undefined) {
        parameterString += `${key}=${encodeURIComponent(payload[key])}&`;
      }
    });
  
  // Remove last &
  parameterString = parameterString.slice(0, -1);
  
  // Add passphrase if provided
  if (passphrase) {
    parameterString += `&passphrase=${encodeURIComponent(passphrase)}`;
  }
  
  return crypto.createHash('md5').update(parameterString).digest('hex');
}

function buildPayFastUrl(payload: Record<string, any>): string {
  const signature = generateSignature(payload, PAYFAST_CONFIG.passphrase);
  payload.signature = signature;
  
  const endpoint = pfEndpoint(PAYFAST_CONFIG.mode);
  const queryString = Object.keys(payload)
    .map(key => `${key}=${encodeURIComponent(payload[key])}`)
    .join('&');
  
  return `${endpoint}?${queryString}`;
}

// Routes
app.post('/api/checkout', async (req, res) => {
  try {
    const { booking } = req.body;
    
    if (!booking) {
      return res.status(400).json({ error: 'Booking data is required' });
    }

    // Generate booking ID
    const bookingId = uuidv4();
    
    // Store booking in memory
    bookings[bookingId] = {
      id: bookingId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...booking
    };

    // Build PayFast payload
    const payfastPayload = {
      merchant_id: PAYFAST_CONFIG.merchantId,
      merchant_key: PAYFAST_CONFIG.merchantKey,
      return_url: `${process.env.PUBLIC_BASE_URL}/success?bookingId=${bookingId}`,
      cancel_url: `${process.env.PUBLIC_BASE_URL}/cancel?bookingId=${bookingId}`,
      notify_url: `${process.env.SERVER_BASE_URL}/api/payfast/ipn`,
      name_first: booking.customer.name.split(' ')[0] || '',
      name_last: booking.customer.name.split(' ').slice(1).join(' ') || '',
      email_address: booking.customer.email,
      cell_number: booking.customer.phone,
      m_payment_id: bookingId,
      amount: booking.price.toString(),
      item_name: `${booking.serviceName} - ${booking.barberName}`,
      item_description: `Appointment with ${booking.barberName} on ${new Date(booking.dateISO).toLocaleDateString()} at ${new Date(booking.startISO).toLocaleTimeString()}`,
      custom_int1: booking.serviceId,
      custom_str1: booking.barberId,
      custom_str2: booking.dateISO,
      custom_str3: booking.startISO,
      custom_str4: booking.endISO
    };

    // Generate PayFast URL
    const redirectUrl = buildPayFastUrl(payfastPayload);

    console.log(`💰 Created checkout for booking ${bookingId}:`, {
      service: booking.serviceName,
      barber: booking.barberName,
      amount: booking.price,
      customer: booking.customer.name
    });

    res.json({ redirectUrl, bookingId });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

app.post('/api/payfast/ipn', (req, res) => {
  try {
    const data = req.body;
    const bookingId = data.m_payment_id;
    
    console.log(`📨 PayFast IPN received for booking ${bookingId}:`, {
      payment_status: data.payment_status,
      amount_gross: data.amount_gross,
      pf_payment_id: data.pf_payment_id
    });

    // Verify signature
    const signature = generateSignature(data, PAYFAST_CONFIG.passphrase);
    if (signature !== data.signature) {
      console.error('❌ Invalid PayFast signature');
      return res.status(400).send('Invalid signature');
    }

    // Update booking status
    if (bookingId && bookings[bookingId]) {
      if (data.payment_status === 'COMPLETE') {
        bookings[bookingId].status = 'paid';
        bookings[bookingId].paidAt = new Date().toISOString();
        bookings[bookingId].pfPaymentId = data.pf_payment_id;
        
        console.log(`✅ Payment completed for booking ${bookingId}`);
      } else if (data.payment_status === 'FAILED' || data.payment_status === 'CANCELLED') {
        bookings[bookingId].status = 'failed';
        bookings[bookingId].failedAt = new Date().toISOString();
        
        console.log(`❌ Payment ${data.payment_status.toLowerCase()} for booking ${bookingId}`);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ IPN processing error:', error);
    res.status(500).send('Error processing IPN');
  }
});

app.get('/api/bookings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const booking = bookings[id];
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);

  } catch (error) {
    console.error('❌ Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    bookings: Object.keys(bookings).length
  });
});

app.listen(PORT, () => {
  console.log(`🚀 PayFast server running on http://localhost:${PORT}`);
  console.log(`📊 PayFast mode: ${PAYFAST_CONFIG.mode}`);
  console.log(`🔗 CORS enabled for: ${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}`);
  
  if (missingEnvVars.length > 0) {
    console.log(`⚠️  Please set missing environment variables: ${missingEnvVars.join(', ')}`);
  }
});
