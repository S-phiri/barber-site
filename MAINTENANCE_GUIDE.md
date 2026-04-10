# Google Calendar Booking System - Maintenance Guide

## 🎯 **Overview**
This guide covers the simple maintenance routine for your Google Calendar booking system.

## 📅 **Daily Maintenance (5 minutes)**

### 1. Health Check
```bash
# Check if your server is running
curl http://localhost:8000/health

# Expected response: {"status": "ok"}
```

### 2. Check Error Logs
```bash
# Look for any errors in the last 24 hours
tail -n 50 /var/log/your-app.log | grep ERROR
```

## 📅 **Weekly Maintenance (15 minutes)**

### 1. Database Backup (Automated)
```bash
# This should be automated via cron job
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Keep last 30 days of backups
find . -name "backup_*.sql" -mtime +30 -delete
```

### 2. Google API Status Check
- Visit: https://status.cloud.google.com/
- Look for any Calendar API issues (rare)

### 3. Review Error Alerts
- Check email for any automated error alerts
- Most issues resolve themselves

## 📅 **Monthly Maintenance (30 minutes)**

### 1. Update Dependencies
```bash
# Backend updates
pip install -r requirements.txt --upgrade

# Frontend updates  
npm update

# Test that everything still works
npm run build
```

### 2. OAuth Token Health
- Your Google Calendar service automatically refreshes tokens
- Check dashboard for any "re-authorization needed" messages

### 3. Booking Statistics Review
- Check your admin dashboard
- Look for any unusual patterns or errors

## 📅 **Quarterly Maintenance (2 hours)**

### 1. Security Updates
```bash
# Update server OS
sudo apt update && sudo apt upgrade

# Update Python packages
pip install -r requirements.txt --upgrade

# Update Node.js packages
npm audit fix
```

### 2. Google API Changes (Rare)
- Check Google Calendar API changelog
- Usually no action needed

### 3. End-to-End Testing
- Test complete booking flow
- Test Google Calendar sync
- Test payment processing

## 🚨 **Troubleshooting Common Issues**

### Issue: "Google Calendar API Error"
**Solution:**
1. Check Google API status page
2. Verify OAuth credentials are valid
3. Check if barber needs to re-authorize

### Issue: "Booking Not Syncing to Calendar"
**Solution:**
1. Check if barber has connected Google Calendar
2. Verify OAuth token is valid
3. Check server logs for specific error

### Issue: "Payment Failed"
**Solution:**
1. Check PayFast status
2. Verify webhook endpoint is accessible
3. Check payment logs

## 📊 **Monitoring Setup**

### 1. Health Check Endpoint
Your app already has: `GET /health`

### 2. Error Monitoring
```python
# Add to your logging configuration
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'app.log',
        },
        'email': {
            'class': 'logging.handlers.SMTPHandler',
            'mailhost': 'localhost',
            'fromaddr': 'admin@yourbarbershop.com',
            'toaddrs': ['admin@yourbarbershop.com'],
            'subject': 'Booking System Error',
        },
    },
    'loggers': {
        'your_app': {
            'handlers': ['file', 'email'],
            'level': 'ERROR',
        },
    },
}
```

### 3. Automated Backup
```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/backup_script.sh
```

## 🎯 **Maintenance Time Summary**

- **Daily**: 5 minutes
- **Weekly**: 15 minutes  
- **Monthly**: 30 minutes
- **Quarterly**: 2 hours

**Total per month**: ~2 hours

## 💡 **Pro Tips**

1. **Automate Everything** - Use cron jobs for backups and health checks
2. **Monitor Early** - Set up error alerts before issues become problems
3. **Keep It Simple** - Don't over-engineer monitoring
4. **Document Changes** - Keep notes of any manual fixes

## 🆘 **Emergency Contacts**

- **Google Calendar API Issues**: Google Cloud Support
- **PayFast Issues**: PayFast Support
- **Server Issues**: Your hosting provider support
- **Code Issues**: Your development team (you!)

## 📈 **Success Metrics**

Track these to ensure your system is healthy:
- Booking success rate: >95%
- Google Calendar sync rate: >99%
- Payment success rate: >98%
- Server uptime: >99%

---

**Remember**: This system is designed to be low-maintenance. Most issues resolve themselves or are handled automatically by Google's robust infrastructure.
