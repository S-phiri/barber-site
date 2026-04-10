# PayFast Integration - Testing Checklist

## 🚀 **Setup Instructions**

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp ENV_EXAMPLE.md .env.local

# Edit .env.local with your PayFast credentials:
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_MODE=sandbox
```

### 3. Run Both Servers
```bash
# Terminal 1: Start Express server (PayFast backend)
npm run server

# Terminal 2: Start Vite frontend
npm run dev

# OR run both simultaneously:
npm run dev:full
```

## 🧪 **Testing Checklist**

### **Phase 1: Server Setup**

#### 1. Express Server Health
- [ ] Server starts without errors on `http://localhost:5174`
- [ ] Health check: `GET http://localhost:5174/api/health` returns 200
- [ ] Console shows: "🚀 PayFast server running on http://localhost:5174"
- [ ] Console shows: "📊 PayFast mode: sandbox"

#### 2. Environment Variables
- [ ] No missing environment variable warnings in console
- [ ] PayFast credentials are loaded correctly
- [ ] CORS enabled for `http://localhost:5173`

### **Phase 2: Frontend Integration**

#### 3. Booking Flow (Google Embed Mode)
- [ ] Navigate to `http://localhost:5173/book`
- [ ] Complete Steps 1-2: Select service and barber
- [ ] Step 3: Select date
- [ ] Step 4: See Google embed interface with "Pick Time on Google" button
- [ ] Click "Pick Time on Google" → Modal opens with Google Appointment Schedule
- [ ] Complete Google appointment selection
- [ ] Step 5: Fill in customer details (name, phone, email)

#### 4. PayFast Checkout Creation
- [ ] Click "Confirm Booking" button
- [ ] See toast: "Redirecting to Payment"
- [ ] Browser redirects to PayFast sandbox URL
- [ ] PayFast page loads with correct booking details:
  - [ ] Service name and price
  - [ ] Customer details
  - [ ] Booking description

### **Phase 3: PayFast Payment Testing**

#### 5. Sandbox Payment (Success)
- [ ] On PayFast page, use test card: `4000000000000002`
- [ ] Fill in test details (any valid info)
- [ ] Complete payment
- [ ] Redirected to success page: `http://localhost:5173/success?bookingId=...`
- [ ] Success page shows:
  - [ ] Green checkmark icon
  - [ ] "Payment Successful!" message
  - [ ] Booking details (service, barber, date, time, customer)
  - [ ] Payment confirmation with timestamp

#### 6. Sandbox Payment (Cancel)
- [ ] Start new booking flow
- [ ] Get to PayFast page
- [ ] Click "Cancel" or close browser
- [ ] Redirected to cancel page: `http://localhost:5173/cancel?bookingId=...`
- [ ] Cancel page shows:
  - [ ] Orange X icon
  - [ ] "Payment Cancelled" message
  - [ ] Booking details
  - [ ] "Complete Payment Now" button

#### 7. Sandbox Payment (Failed)
- [ ] Start new booking flow
- [ ] Get to PayFast page
- [ ] Use test card: `4000000000000119` (declined card)
- [ ] Payment fails
- [ ] Check server logs for failed payment status

### **Phase 4: Backend Verification**

#### 8. Server Logs
- [ ] Checkout creation logs:
  ```
  💰 Created checkout for booking [id]: { service, barber, amount, customer }
  ```
- [ ] Payment success logs:
  ```
  📨 PayFast IPN received for booking [id]: { payment_status: 'COMPLETE' }
  ✅ Payment completed for booking [id]
  ```
- [ ] Payment failure logs:
  ```
  📨 PayFast IPN received for booking [id]: { payment_status: 'FAILED' }
  ❌ Payment failed for booking [id]
  ```

#### 9. Booking Storage
- [ ] Check `GET http://localhost:5174/api/bookings/[bookingId]`
- [ ] Pending booking has `status: 'pending'`
- [ ] Paid booking has `status: 'paid'` and `paidAt` timestamp
- [ ] Failed booking has `status: 'failed'`

### **Phase 5: Error Handling**

#### 10. Missing Environment Variables
- [ ] Remove `PAYFAST_MERCHANT_ID` from `.env.local`
- [ ] Restart server
- [ ] Console shows warning: "⚠️ Missing required environment variables: PAYFAST_MERCHANT_ID"
- [ ] Checkout creation fails gracefully

#### 11. Invalid Booking Data
- [ ] Try booking with missing customer details
- [ ] See validation error: "Please fill in all required fields"
- [ ] No PayFast redirect occurs

#### 12. Network Errors
- [ ] Stop Express server
- [ ] Try to complete booking
- [ ] See error toast: "There was an error creating your booking"
- [ ] No crash, graceful error handling

### **Phase 6: UI/UX Testing**

#### 13. Responsive Design
- [ ] Success page works on mobile
- [ ] Cancel page works on mobile
- [ ] PayFast page works on mobile
- [ ] All buttons and forms are accessible

#### 14. Loading States
- [ ] Booking form shows loading spinner during checkout creation
- [ ] Success/cancel pages show loading while fetching booking details
- [ ] Error states display appropriate messages

#### 15. Navigation
- [ ] "Book Another Appointment" redirects to `/book`
- [ ] "View Dashboard" redirects to `/dashboard`
- [ ] "Complete Payment Now" redirects to `/book`
- [ ] "Go Home" redirects to `/`

## 🔧 **Troubleshooting**

### Common Issues:

#### Server Won't Start
```bash
# Check if port 5174 is available
netstat -an | grep 5174

# Try different port
PORT=5175 npm run server
```

#### PayFast Redirect Issues
- [ ] Check `SERVER_BASE_URL` and `PUBLIC_BASE_URL` in `.env.local`
- [ ] Verify PayFast credentials are correct
- [ ] Ensure PayFast mode is set to `sandbox`

#### CORS Errors
- [ ] Verify `PUBLIC_BASE_URL=http://localhost:5173` in server
- [ ] Check browser console for CORS errors
- [ ] Ensure both servers are running

#### Booking Not Found
- [ ] Check server logs for booking creation
- [ ] Verify booking ID in URL matches stored booking
- [ ] Check in-memory storage (restart server clears it)

## ✅ **Success Criteria**

All tests should pass for production readiness:

- [ ] ✅ Complete booking flow works end-to-end
- [ ] ✅ PayFast integration processes payments correctly
- [ ] ✅ Success and cancel pages display booking details
- [ ] ✅ Server handles all payment statuses (paid, failed, cancelled)
- [ ] ✅ Error handling is graceful and user-friendly
- [ ] ✅ Mobile responsive design works
- [ ] ✅ No console errors or warnings
- [ ] ✅ Clean user experience throughout

## 🚀 **Production Checklist**

When moving to production:

- [ ] Change `PAYFAST_MODE=live`
- [ ] Update PayFast credentials to live credentials
- [ ] Set `SERVER_BASE_URL` to production domain
- [ ] Set `PUBLIC_BASE_URL` to production domain
- [ ] Replace in-memory storage with database
- [ ] Set up proper logging and monitoring
- [ ] Test with real payment methods (small amounts)
- [ ] Configure webhook endpoints for production
