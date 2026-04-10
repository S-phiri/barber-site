#!/usr/bin/env python3
"""
Google OAuth Setup Script for BBIT Barbershop
This script helps you set up Google Calendar OAuth credentials
"""

import os
import webbrowser
from pathlib import Path

def main():
    print("🎯 Google Calendar OAuth Setup for BBIT Barbershop")
    print("=" * 50)
    
    print("\n📋 Step 1: Google Cloud Console Setup")
    print("1. Go to: https://console.cloud.google.com/")
    print("2. Create a new project: 'BBIT Barbershop'")
    print("3. Enable Google Calendar API")
    print("4. Go to APIs & Services → Credentials")
    print("5. Click 'Create Credentials' → 'OAuth 2.0 Client ID'")
    print("6. Application type: 'Web application'")
    print("7. Name: 'BBIT Barbershop Booking'")
    print("8. Authorized redirect URIs:")
    print("   - http://localhost:8000/api/barber/google-calendar/callback/")
    print("   - https://yourdomain.com/api/barber/google-calendar/callback/")
    
    input("\nPress Enter when you've completed Step 1...")
    
    print("\n📋 Step 2: Get Your Credentials")
    client_id = input("Enter your Client ID: ").strip()
    client_secret = input("Enter your Client Secret: ").strip()
    
    if not client_id or not client_secret:
        print("❌ Error: Both Client ID and Client Secret are required")
        return
    
    print("\n📋 Step 3: Update Environment File")
    
    # Check if .env file exists
    env_file = Path("backend/.env")
    if not env_file.exists():
        print("Creating backend/.env file...")
        env_file.parent.mkdir(exist_ok=True)
        env_file.write_text("")
    
    # Read existing .env content
    env_content = env_file.read_text()
    
    # Update or add Google OAuth credentials
    lines = env_content.split('\n')
    updated_lines = []
    google_client_id_found = False
    google_client_secret_found = False
    
    for line in lines:
        if line.startswith('GOOGLE_CLIENT_ID='):
            updated_lines.append(f'GOOGLE_CLIENT_ID={client_id}')
            google_client_id_found = True
        elif line.startswith('GOOGLE_CLIENT_SECRET='):
            updated_lines.append(f'GOOGLE_CLIENT_SECRET={client_secret}')
            google_client_secret_found = True
        else:
            updated_lines.append(line)
    
    # Add missing credentials
    if not google_client_id_found:
        updated_lines.append(f'GOOGLE_CLIENT_ID={client_id}')
    if not google_client_secret_found:
        updated_lines.append(f'GOOGLE_CLIENT_SECRET={client_secret}')
    
    # Add redirect URI if not present
    if not any(line.startswith('GOOGLE_REDIRECT_URI=') for line in updated_lines):
        updated_lines.append('GOOGLE_REDIRECT_URI=http://localhost:8000/api/barber/google-calendar/callback/')
    
    # Write updated .env file
    env_file.write_text('\n'.join(updated_lines))
    
    print("✅ Environment file updated successfully!")
    
    print("\n📋 Step 4: Test the Setup")
    print("1. Start your backend server:")
    print("   cd backend && python manage.py runserver")
    print("2. Start your frontend server:")
    print("   npm run dev")
    print("3. Go to: http://localhost:5173/book")
    print("4. Try creating a booking")
    
    print("\n🎉 Setup Complete!")
    print("Your Google Calendar integration is now ready!")
    
    print("\n📚 Next Steps:")
    print("1. Test the booking flow")
    print("2. Connect a barber's Google Calendar")
    print("3. Create a test booking")
    print("4. Verify it appears in Google Calendar")
    
    print("\n🔧 Maintenance:")
    print("- Check MAINTENANCE_GUIDE.md for routine maintenance")
    print("- Google OAuth tokens auto-refresh")
    print("- Monitor logs for any issues")

if __name__ == "__main__":
    main()
