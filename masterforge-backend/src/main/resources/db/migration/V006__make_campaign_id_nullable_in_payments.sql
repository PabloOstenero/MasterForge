-- Migration to make campaign_id nullable in payment_transactions
-- This is required to support SUBSCRIPTION payments which are not tied to a specific campaign.
ALTER TABLE payment_transactions ALTER COLUMN campaign_id DROP NOT NULL;
