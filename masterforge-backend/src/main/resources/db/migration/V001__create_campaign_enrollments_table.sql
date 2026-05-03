-- Migration script for campaign enrollments table
-- This script is for reference - Hibernate will handle actual table creation with ddl-auto=update

-- Create campaign_enrollments table
CREATE TABLE IF NOT EXISTS campaign_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    UNIQUE(campaign_id, user_id)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_campaign_id ON campaign_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_user_id ON campaign_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_enrolled_at ON campaign_enrollments(enrolled_at);

-- Add comments for documentation
COMMENT ON TABLE campaign_enrollments IS 'Tracks user enrollments in campaigns with optional payment transaction references';
COMMENT ON COLUMN campaign_enrollments.campaign_id IS 'Foreign key to campaigns table';
COMMENT ON COLUMN campaign_enrollments.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN campaign_enrollments.enrolled_at IS 'Timestamp when user enrolled in the campaign';
COMMENT ON COLUMN campaign_enrollments.payment_transaction_id IS 'Optional reference to payment transaction for paid campaigns';