#!/bin/bash
# Email OTP Setup Verification Script
# Run this after you've added EMAIL_* variables to your .env file

echo "🔍 Email OTP Configuration Check"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Check each required variable
echo "Checking .env variables..."
echo ""

check_var() {
    local var=$1
    local value=$(grep "^${var}=" .env | cut -d= -f2-)
    
    if [ -z "$value" ]; then
        echo "  ❌ $var: NOT SET"
        return 1
    else
        # Mask passwords
        if [[ $var == *"PASSWORD"* ]]; then
            echo "  ✅ $var: ******* (set, length: ${#value})"
        else
            echo "  ✅ $var: $value"
        fi
        return 0
    fi
}

check_var "EMAIL_HOST"
check_var "EMAIL_PORT"
check_var "EMAIL_SECURE"
check_var "EMAIL_USER"
check_var "EMAIL_PASSWORD"
check_var "EMAIL_FROM"

echo ""
echo "Checking application setup..."
echo ""

# Check if TypeScript builds
echo -n "  Building TypeScript... "
if npm run build > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo "    Run: npm run build"
fi

# Check if Docker can build
echo -n "  Docker image built... "
if docker image inspect execora-app > /dev/null 2>&1; then
    echo "✅"
else
    echo "⚠️  Need to rebuild: docker compose build app --no-cache"
fi

# Check if app is running
echo -n "  App is running... "
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo "    Start with: docker compose up app -d"
fi

# Check if email service initialized
echo -n "  Email service initialized... "
if docker compose logs app 2>/dev/null | grep -q "Email service initialized"; then
    echo "✅"
else
    echo "⚠️  Check with: docker compose logs app | grep -i email"
fi

# Check if customers have emails
echo -n "  Customers with email addresses... "
if command -v psql &> /dev/null; then
    count=$(psql -U postgres -d execora -c "SELECT COUNT(*) FROM customers WHERE email IS NOT NULL;" 2>/dev/null | grep -oE '[0-9]+' | tail -1)
    if [ -n "$count" ] && [ "$count" -gt "0" ]; then
        echo "✅ ($count customers)"
    else
        echo "⚠️  0 customers (add with: npx prisma studio)"
    fi
else
    echo "⚠️  psql not found"
fi

echo ""
echo "=================================="
echo "✅ Setup verification complete!"
echo ""
echo "Next: Test the deletion flow"
echo "  1. Connect to WebSocket: wscat -c ws://localhost:3000/ws"
echo "  2. Send: {\"type\": \"voice_message\", \"text\": \"Bharat ka data delete karo\"}"
echo "  3. Check email for OTP code"
echo "  4. Say: Delete mere data, OTP hai [code]"
