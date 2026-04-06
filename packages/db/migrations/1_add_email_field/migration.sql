-- Add email field to customers table
ALTER TABLE "customers" ADD COLUMN "email" TEXT;

-- Create index on email for faster lookups
CREATE INDEX "customers_email_idx" ON "customers"("email");
