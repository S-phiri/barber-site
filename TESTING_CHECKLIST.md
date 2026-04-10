# Google Embed Integration - Testing Checklist

## 🎯 **Setup Testing**

### 1. Environment Configuration
- [ ] Create `.env.local` file with:
  ```bash
  VITE_BOOKING_PROVIDER=google-embed
  VITE_GCAL_APPT_RAMAD=https://calendar.app.google/your-actual-link
  ```
- [ ] Restart development server after adding env variables
- [ ] Verify no console errors on page load

### 2. Provider Detection
- [ ] Console log shows `bookingProvider: "google-embed"`
- [ ] `isGoogleEmbed()` returns `true`
- [ ] Other provider flags return `false`

## 🧪 **Booking Flow Testing**

### 3. Steps 1-2 (Service & Barber Selection)
- [ ] Step 1: Service selection works normally
- [ ] Step 2: Barber selection works normally
- [ ] Barber key is properly stored in state
- [ ] Progress indicator shows correct steps

### 4. Step 3 (Date Selection)
- [ ] Date picker works normally
- [ ] Selected date is displayed correctly
- [ ] Can navigate back to barber selection

### 5. Step 4 (Google Embed Interface)
- [ ] Shows Google embed interface (not time grid)
- [ ] Displays selected date and barber info
- [ ] "Pick Time on Google" button is enabled
- [ ] Button shows correct barber name
- [ ] Console shows no warnings about missing URLs

### 6. Google Modal Testing
- [ ] Clicking "Pick Time on Google" opens modal
- [ ] Modal displays correct barber appointment URL
- [ ] Modal has proper title with barber name
- [ ] ESC key closes modal
- [ ] Clicking overlay closes modal
- [ ] Close button (X) works
- [ ] "Close" button works
- [ ] Modal has proper iframe with Google appointment page

### 7. Step 5 (Customer Details)
- [ ] After closing modal, proceeds to Step 5
- [ ] Customer details form displays correctly
- [ ] All input fields work properly
- [ ] Form validation works for required fields

### 8. Booking Submission
- [ ] "Confirm Booking" button works
- [ ] Shows "Booking Request Submitted!" message
- [ ] Redirects to dashboard
- [ ] No API calls made (embed-only mode)

## 🔄 **Provider Switching Testing**

### 9. Custom Provider Mode
- [ ] Change `VITE_BOOKING_PROVIDER=custom` in `.env.local`
- [ ] Restart dev server
- [ ] Step 4 shows original time grid (not Google embed)
- [ ] Time selection works normally
- [ ] Booking submission uses original API logic

### 10. Fresha Provider Mode
- [ ] Change `VITE_BOOKING_PROVIDER=fresha` in `.env.local`
- [ ] Restart dev server
- [ ] Booking flow uses Fresha integration

## 🚨 **Error Handling Testing**

### 11. Missing Barber URL
- [ ] Set `VITE_GCAL_APPT_RAMAD=""` (empty)
- [ ] Try to open Google modal
- [ ] Shows error toast: "Appointment scheduling is not available"
- [ ] Modal does not open

### 12. Missing Barber Key
- [ ] Select service but not barber
- [ ] Try to proceed to time selection
- [ ] "Pick Time on Google" button is disabled

### 13. Invalid Barber Key
- [ ] Modify barber mapping to return invalid key
- [ ] Try to open Google modal
- [ ] Shows appropriate error message

## 📱 **Responsive Testing**

### 14. Mobile View
- [ ] Google modal displays properly on mobile
- [ ] Iframe is responsive
- [ ] Close buttons are accessible
- [ ] Modal doesn't break layout

### 15. Desktop View
- [ ] Modal is properly centered
- [ ] Iframe has correct dimensions
- [ ] All interactions work smoothly

## 🔧 **Browser Compatibility**

### 16. Chrome
- [ ] All functionality works
- [ ] No console errors
- [ ] Google appointment page loads correctly

### 17. Firefox
- [ ] All functionality works
- [ ] Modal displays correctly
- [ ] Iframe works properly

### 18. Safari (if available)
- [ ] Basic functionality works
- [ ] Modal interactions work
- [ ] No layout issues

## ✅ **Success Criteria**

All tests should pass for a successful integration:

- [ ] Google embed mode works without errors
- [ ] Original booking flow still works in custom mode
- [ ] Provider switching works correctly
- [ ] Error handling is graceful
- [ ] Mobile responsive
- [ ] No console errors or warnings
- [ ] Clean user experience

## 🚀 **Ready for Production**

When all tests pass:

- [ ] Environment variables are properly configured
- [ ] Google appointment schedules are set up
- [ ] All barber URLs are working
- [ ] No console errors in production build
- [ ] Mobile experience is smooth
