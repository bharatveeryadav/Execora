#!/bin/bash
# Mobile App Naming Consistency Migration Script
# Fixes Billing/Invoice terminology across mobile app
# Run from workspace root: bash NAMING_FIX_SCRIPT.sh

set -e

echo "🔄 Starting Mobile App Naming Consistency Fix..."
echo "================================================"

cd apps/mobile/src

# ============================================================================
# PHASE 1: Update Navigation - BillingStack → InvoiceStack
# ============================================================================
echo "📍 Phase 1: Updating navigation/index.tsx..."

# Update remaining BillingStack references
sed -i 's/const BillingStack = createNativeStackNavigator<InvoiceStackParams>();/const InvoiceStack = createNativeStackNavigator<InvoiceStackParams>();/g' navigation/index.tsx
sed -i 's/<BillingStack\.Navigator/<InvoiceStack.Navigator/g' navigation/index.tsx
sed -i 's/\/\/ ── Billing stack/\/\/ ── Invoice stack/g' navigation/index.tsx
sed -i 's/name="BillingForm"/name="InvoiceForm"/g' navigation/index.tsx
sed -i 's/<\/BillingStack\.Navigator>/<\/InvoiceStack.Navigator>/g' navigation/index.tsx
sed -i 's/<BillingStack\.Screen/<InvoiceStack.Screen/g' navigation/index.tsx

echo "✅ Updated navigation/index.tsx"

# ============================================================================
# PHASE 2: Update BillingScreen.tsx - Import, Type, Usage
# ============================================================================
echo "📍 Phase 2: Updating features/billing/screens/BillingScreen.tsx..."

sed -i 's/import type { BillingStackParams }/import type { InvoiceStackParams }/g' features/billing/screens/BillingScreen.tsx
sed -i 's/import { useBillingForm }/import { useInvoiceForm }/g' features/billing/screens/BillingScreen.tsx
sed -i "s/import { useBillingForm } from \"..\/hooks\/useBillingForm\"/import { useInvoiceForm } from \"..\/hooks\/useInvoiceForm\"/g" features/billing/screens/BillingScreen.tsx
sed -i 's/type BillingProps = NativeStackScreenProps<BillingStackParams, "BillingForm">/type InvoiceProps = NativeStackScreenProps<InvoiceStackParams, "InvoiceForm">/g' features/billing/screens/BillingScreen.tsx
sed -i 's/export function BillingScreen(props: BillingProps)/export function BillingScreen(props: InvoiceProps)/g' features/billing/screens/BillingScreen.tsx
sed -i 's/} = useBillingForm(/} = useInvoiceForm(/g' features/billing/screens/BillingScreen.tsx
sed -i 's/\/\/ ── Form state (useBillingForm)/\/\/ ── Form state (useInvoiceForm)/g' features/billing/screens/BillingScreen.tsx
sed -i 's/\/\/ showInvoiceBarEdit is managed by useBillingForm/\/\/ showInvoiceBarEdit is managed by useInvoiceForm/g' features/billing/screens/BillingScreen.tsx
sed -i 's/\/\/ updateItem + removeItem come from useBillingForm/\/\/ updateItem + removeItem come from useInvoiceForm/g' features/billing/screens/BillingScreen.tsx

echo "✅ Updated features/billing/screens/BillingScreen.tsx"

# ============================================================================
# PHASE 3: Update Route Names in Other Screens
# ============================================================================
echo "📍 Phase 3: Updating route names in screen files..."

# InvoiceListScreen
sed -i 's/screen: "BillingForm"/screen: "InvoiceForm"/g' features/billing/screens/InvoiceListScreen.tsx
echo "✅ Updated features/billing/screens/InvoiceListScreen.tsx"

# BillsMenuScreen
sed -i 's/screen: "BillingForm"/screen: "InvoiceForm"/g' features/billing/screens/BillsMenuScreen.tsx
echo "✅ Updated features/billing/screens/BillsMenuScreen.tsx"

# DashboardScreen
sed -i 's/"BillingForm"/"InvoiceForm"/g' features/dashboard/screens/DashboardScreen.tsx
sed -i 's/navigateMoreStack("Billing")/navigateMoreStack("Invoice")/g' features/dashboard/screens/DashboardScreen.tsx
echo "✅ Updated features/dashboard/screens/DashboardScreen.tsx"

# ============================================================================
# PHASE 4: Update Navigation Functions & Stack References
# ============================================================================
echo "📍 Phase 4: Updating CustomerDetailScreen..."

sed -i 's/const navigateBilling = ()/const navigateInvoice = ()/g' features/customers/screens/CustomerDetailScreen.tsx
sed -i 's/navigate("BillingStack"/navigate("InvoiceStack"/g' features/customers/screens/CustomerDetailScreen.tsx
sed -i 's/screen: "BillingForm"/screen: "InvoiceForm"/g' features/customers/screens/CustomerDetailScreen.tsx
sed -i 's/onPress={navigateBilling}/onPress={navigateInvoice}/g' features/customers/screens/CustomerDetailScreen.tsx

echo "✅ Updated features/customers/screens/CustomerDetailScreen.tsx"

# ============================================================================
# PHASE 5: Update Backward-Compat Re-export
# ============================================================================
echo "📍 Phase 5: Updating backward-compat re-export..."

cat > hooks/useBillingForm.ts << 'EOF'
// DEPRECATED: Use @/features/billing/hooks/useInvoiceForm instead
// This is a backward-compatibility re-export only
export { useInvoiceForm as useBillingForm } from '../features/billing/hooks/useInvoiceForm';
EOF

echo "✅ Updated hooks/useBillingForm.ts"

# ============================================================================
# PHASE 6: Update API Method Names
# ============================================================================
echo "📍 Phase 6: Updating API method names..."

if [ -f "features/billing/api/invoiceExtApi.ts" ]; then
  sed -i 's/cancel:/cancelInvoice:/g' features/billing/api/invoiceExtApi.ts
  sed -i 's/update:/updateInvoice:/g' features/billing/api/invoiceExtApi.ts
  sed -i 's/sendEmail:/sendInvoiceEmail:/g' features/billing/api/invoiceExtApi.ts
  sed -i 's/sendSms:/sendInvoiceSms:/g' features/billing/api/invoiceExtApi.ts
  echo "✅ Updated features/billing/api/invoiceExtApi.ts"
elif [ -f "features/billing/api/invoiceApi.ts" ]; then
  # Check if invoiceExtApi is exported from invoiceApi.ts
  if grep -q "export const invoiceExtApi" features/billing/api/invoiceApi.ts; then
    sed -i 's/cancel:/cancelInvoice:/g' features/billing/api/invoiceApi.ts
    sed -i 's/update:/updateInvoice:/g' features/billing/api/invoiceApi.ts
    sed -i 's/sendEmail:/sendInvoiceEmail:/g' features/billing/api/invoiceApi.ts
    sed -i 's/sendSms:/sendInvoiceSms:/g' features/billing/api/invoiceApi.ts
    echo "✅ Updated features/billing/api/invoiceApi.ts"
  fi
fi

# ============================================================================
# PHASE 7: Update Storage Keys
# ============================================================================
echo "📍 Phase 7: Updating storage keys..."

if [ -f "features/billing/lib/storageKeys.ts" ]; then
  sed -i 's/DRAFT_KEY/INVOICE_DRAFT_KEY/g' features/billing/lib/storageKeys.ts
  echo "✅ Updated features/billing/lib/storageKeys.ts"
fi

# Also update usages in BillingScreen
sed -i 's/DRAFT_KEY/INVOICE_DRAFT_KEY/g' features/billing/screens/BillingScreen.tsx

echo "✅ Updated DRAFT_KEY usage in BillingScreen.tsx"

# ============================================================================
# PHASE 8: Update All Remaining API/Util Usages
# ============================================================================
echo "📍 Phase 8: Updating API method calls..."

# Find and replace method calls - be careful with context
find features -name "*.tsx" -o -name "*.ts" | xargs grep -l "invoiceExtApi\\.cancel\\|invoiceExtApi\\.update\\|invoiceExtApi\\.sendEmail" 2>/dev/null | while read file; do
  sed -i 's/invoiceExtApi\.cancel(/invoiceExtApi.cancelInvoice(/g' "$file"
  sed -i 's/invoiceExtApi\.update(/invoiceExtApi.updateInvoice(/g' "$file"
  sed -i 's/invoiceExtApi\.sendEmail(/invoiceExtApi.sendInvoiceEmail(/g' "$file"
  sed -i 's/invoiceExtApi\.sendSms(/invoiceExtApi.sendInvoiceSms(/g' "$file"
  echo "✅ Updated API calls in $file"
done

# ============================================================================
# VERIFICATION
# ============================================================================
echo ""
echo "================================================"
echo "✨ Migration Complete!"
echo "================================================"
echo ""
echo "🔍 Verification: Checking for any remaining 'BillingForm' references..."
count=$(find . -name "*.tsx" -o -name "*.ts" | xargs grep -c "BillingForm" 2>/dev/null || echo "0")
if [ "$count" -gt "0" ]; then
  echo "⚠️  Found $count references to 'BillingForm' - might need manual review"
  find . -name "*.tsx" -o -name "*.ts" | xargs grep -n "BillingForm" 2>/dev/null
else
  echo "✅ No remaining 'BillingForm' references found"
fi

echo ""
echo "🔍 Verification: Checking for any remaining 'useBillingForm' (non-import) references..."
# This should only match the backward-compat re-export
count=$(find . -name "*.tsx" -o -name "*.ts" | xargs grep -v "as useBillingForm" | xargs grep -c "useBillingForm" 2>/dev/null || echo "0")
if [ "$count" -gt "0" ]; then
  echo "⚠️  Found $count references to 'useBillingForm' - these should all be imports"
else
  echo "✅ All useBillingForm references are properly handled"
fi

echo ""
echo "📋 Next steps:"
echo "1. Run: npx tsc --noEmit"
echo "2. Run: git diff to verify all changes"
echo "3. Test the app: npm run android/ios"
echo "4. Run: git add -A && git commit -m 'fix: standardize Billing/Invoice naming'"
echo ""
