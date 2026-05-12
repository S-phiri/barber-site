# Fresha Integration Setup Guide

## Step 1: Environment Configuration

Create a `.env.local` file in your project root with the following:

```bash
# Fresha Booking URL
VITE_FRESHA_URL=https://your-fresha-booking-url.com

# API Configuration
VITE_API_URL=http://localhost:8000

# Payment Configuration (if needed)
VITE_PAYMENT_LINK=https://your-payment-link.com
```

## Step 2: Get Your Fresha Booking URL

1. **Sign up for Fresha**
   - Go to [fresha.com](https://fresha.com)
   - Create a business account
   - Complete your business profile

2. **Get Your Booking Link**
   - In your Fresha dashboard, go to Settings > Booking
   - Copy your booking widget URL
   - It should look like: `https://booking.fresha.com/your-business-name`

3. **Configure Services**
   - Set up your services (haircuts, styling, etc.)
   - Add your barbers/staff members
   - Configure pricing and durations

## Step 3: Test the Integration

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Navigate to the booking page**
   - Go to `/book` in your application
   - Click "Book Online" (you need to be logged in)
   - The Fresha widget should open in a modal

3. **Test the booking flow**
   - Complete a test booking through Fresha
   - Verify the booking appears in your Fresha dashboard

## Step 4: Customize the Widget

The `FreshaWidget` component can be customized:

```tsx
// In src/components/FreshaWidget.tsx
<iframe
  src={freshaUrl}
  className="w-full h-[70vh] border-0"
  title="Fresha Booking Widget"
  allow="camera; microphone; geolocation"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
/>
```

### Customization Options:

1. **Modal Size**
   - Change `max-w-4xl` to adjust width
   - Change `h-[70vh]` to adjust iframe height

2. **Styling**
   - Modify the dialog appearance
   - Add your brand colors
   - Customize the close button

3. **Additional Features**
   - Add loading states
   - Handle booking completion events
   - Add success/error messages

## Step 5: Production Deployment

1. **Update Environment Variables**
   - Set production Fresha URL
   - Update API URLs for production
   - Configure proper CORS settings

2. **Test in Production**
   - Verify booking flow works
   - Test on mobile devices
   - Check iframe security settings

## Troubleshooting

### Common Issues

1. **Widget Not Loading**
   - Check if Fresha URL is correct
   - Verify CORS settings
   - Check browser console for errors

2. **Modal Not Opening**
   - Ensure user is logged in
   - Check if `useAuth` hook is working
   - Verify button click handler

3. **Iframe Security Issues**
   - Check iframe sandbox attributes
   - Verify Fresha allows embedding
   - Test in different browsers

### Debug Commands

```bash
# Check environment variables
console.log(import.meta.env.VITE_FRESHA_URL)

# Test Fresha URL directly
# Open the URL in a new tab to verify it works
```

## Features

### Current Implementation:
- ✅ Modal-based Fresha widget
- ✅ Login requirement for booking
- ✅ Responsive design
- ✅ Fallback for missing URL
- ✅ Clean UI with service overview

### Future Enhancements:
- 🔄 Booking completion callbacks
- 🔄 Integration with your user system
- 🔄 Custom styling options
- 🔄 Multiple booking methods
- 🔄 Analytics tracking

## Security Considerations

1. **Iframe Sandbox**
   - Current sandbox allows necessary permissions
   - Prevents malicious scripts
   - Allows forms and popups

2. **Authentication**
   - Users must be logged in to book
   - Redirects to login if not authenticated

3. **URL Validation**
   - Validates Fresha URL exists
   - Shows fallback if URL missing

## Support

If you encounter issues:

1. Check Fresha documentation
2. Verify your booking URL
3. Test in different browsers
4. Check browser console for errors
5. Contact Fresha support if needed
