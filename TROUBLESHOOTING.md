# Troubleshooting Browser Error

## Current Error
```
SyntaxError: The requested module '/src/lib/api.ts' does not provide an export named 'refreshToken'
```

## Solution

This is likely a **browser cache issue**. The error is looking for an export that doesn't exist and shouldn't be imported anywhere.

### Quick Fix:

1. **Hard Refresh Your Browser**
   - Chrome/Edge: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Or: Open DevTools > Right-click refresh button > "Empty Cache and Hard Reload"

2. **Clear Vite Cache**
   ```bash
   # Stop your dev server (Ctrl+C)
   # Delete node_modules/.vite directory
   rm -rf node_modules/.vite
   # Or on Windows:
   rmdir /s /q node_modules\.vite
   
   # Restart dev server
   npm run dev
   ```

3. **Verify Import Statements**
   The `src/lib/auth.tsx` file should have these imports (which it does):
   ```typescript
   import {
     login as apiLogin,
     register as apiRegister,
     refreshTokenApi as apiRefreshToken,  // ✅ Correct
     setAuthHelpers,
   } from "@/lib/api";
   ```

   **NOT** this:
   ```typescript
   import { refreshToken } from "@/lib/api";  // ❌ Wrong
   ```

## What Was Cleaned Up

### Removed Files:
- ✅ All Booksy provider integration files
- ✅ Backend booking app
- ✅ Frontend booking provider abstraction
- ✅ Unused API files

### Kept Files:
- ✅ `src/lib/api.ts` - Main API client (unchanged)
- ✅ `src/lib/auth.tsx` - Authentication context (unchanged)
- ✅ `src/components/FreshaWidget.tsx` - New Fresha modal widget
- ✅ `src/pages/Book.tsx` - Simplified booking page

## Verify the Fix

After clearing cache:

1. Browser console should be clear of errors
2. Navigate to `/book` page
3. Should see the simplified booking interface
4. Clicking "Book Online" should open Fresha modal (if logged in)

## If Error Persists

1. **Check for TypeScript errors**
   ```bash
   npm run type-check
   # or
   npx tsc --noEmit
   ```

2. **Restart TypeScript server in VS Code**
   - Open Command Palette: `Ctrl+Shift+P`
   - Type: "TypeScript: Restart TS Server"
   - Press Enter

3. **Check actual imports**
   ```bash
   # Search for any incorrect imports
   grep -r "import.*refreshToken" src/
   ```

## Environment Setup Reminder

Don't forget to create `.env.local`:
```bash
VITE_FRESHA_URL=https://your-fresha-booking-url.com
```

Then restart your dev server.
