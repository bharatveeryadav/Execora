#!/bin/bash
# Quick Email OTP Setup Script
# This script helps you set up the email OTP system

set -e

echo "📧 Email OTP Setup"
echo "================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    touch .env
fi

echo "Choose your email provider:"
echo ""
echo "1) Gmail (Recommended - Free)"
echo "2) SendGrid (Paid - More reliable)"
echo "3) Brevo (Affordable)"
echo "4) Custom SMTP"
echo ""

read -p "Select option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📧 Gmail Setup"
        echo "--------------"
        echo "1. Go to: https://myaccount.google.com/apppasswords"
        echo "2. Select Mail > Windows Computer"
        echo "3. Copy the 16-character password"
        echo ""
        read -p "Enter your Gmail address: " email
        read -sp "Enter 16-char app password (no spaces): " password
        echo ""
        
        # Add to .env
        {
            echo "EMAIL_HOST=smtp.gmail.com"
            echo "EMAIL_PORT=587"
            echo "EMAIL_SECURE=false"
            echo "EMAIL_USER=$email"
            echo "EMAIL_PASSWORD=$password"
            echo "EMAIL_FROM=\"Execora <$email>\""
        } >> .env
        ;;
        
    2)
        echo ""
        echo "📧 SendGrid Setup"
        echo "-----------------"
        echo "1. Get API key from: https://app.sendgrid.com/settings/api_keys"
        echo ""
        read -p "Enter SendGrid API key (SG.xxxxx): " apikey
        read -p "Enter sender email: " email
        
        {
            echo "EMAIL_HOST=smtp.sendgrid.net"
            echo "EMAIL_PORT=587"
            echo "EMAIL_SECURE=false"
            echo "EMAIL_USER=apikey"
            echo "EMAIL_PASSWORD=$apikey"
            echo "EMAIL_FROM=\"Execora <$email>\""
        } >> .env
        ;;
        
    3)
        echo ""
        echo "📧 Brevo Setup"
        echo "--------------"
        read -p "Enter Brevo SMTP login: " smtplogin
        read -sp "Enter Brevo SMTP password: " smtppass
        echo ""
        read -p "Enter sender email: " email
        
        {
            echo "EMAIL_HOST=smtp-relay.brevo.com"
            echo "EMAIL_PORT=587"
            echo "EMAIL_SECURE=false"
            echo "EMAIL_USER=$smtplogin"
            echo "EMAIL_PASSWORD=$smtppass"
            echo "EMAIL_FROM=\"Execora <$email>\""
        } >> .env
        ;;
        
    4)
        echo ""
        echo "📧 Custom SMTP Setup"
        echo "--------------------"
        read -p "Enter SMTP host: " host
        read -p "Enter SMTP port (default 587): " port
        port=${port:-587}
        read -p "Secure connection? (true/false, default false): " secure
        secure=${secure:-false}
        read -p "Enter SMTP username: " user
        read -sp "Enter SMTP password: " pass
        echo ""
        read -p "Enter sender email: " email
        
        {
            echo "EMAIL_HOST=$host"
            echo "EMAIL_PORT=$port"
            echo "EMAIL_SECURE=$secure"
            echo "EMAIL_USER=$user"
            echo "EMAIL_PASSWORD=$pass"
            echo "EMAIL_FROM=\"Execora <$email>\""
        } >> .env
        ;;
        
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Email configuration added to .env"
echo ""
echo "Next steps:"
echo "1. Rebuild: npm run build"
echo "2. Rebuild Docker: docker compose build app --no-cache"
echo "3. Restart app: docker compose up app -d"
echo "4. Add customer emails: npx prisma studio"
echo "5. Run verification: bash verify-email-setup.sh"
echo ""
