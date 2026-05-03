-- Migration script for payment transactions table (Mock Payment System)
-- This script is for reference - Hibernate will handle actual table creation with ddl-auto=update

-- Create payment_transactions table for mock payment processing
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'CAMPAIGN_JOIN',
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mock_card_last_four VARCHAR(4),
    simulation_scenario VARCHAR(50) CHECK (simulation_scenario IN ('SUCCESS', 'INSUFFICIENT_FUNDS', 'CARD_DECLINED', 'NETWORK_ERROR', 'TIMEOUT')),
    academic_disclaimer VARCHAR(100) NOT NULL DEFAULT 'MOCK_TRANSACTION_FOR_ACADEMIC_PURPOSES_ONLY'
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_campaign_id ON payment_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_processed_at ON payment_transactions(processed_at);

-- Add comments for documentation
COMMENT ON TABLE payment_transactions IS 'Mock payment transactions for academic demonstration - NO REAL PAYMENTS PROCESSED';
COMMENT ON COLUMN payment_transactions.user_id IS 'User making the payment';
COMMENT ON COLUMN payment_transactions.campaign_id IS 'Campaign being paid for';
COMMENT ON COLUMN payment_transactions.amount IS 'Payment amount in decimal format';
COMMENT ON COLUMN payment_transactions.status IS 'Current status of the mock transaction';
COMMENT ON COLUMN payment_transactions.simulation_scenario IS 'Scenario being simulated for testing purposes';
COMMENT ON COLUMN payment_transactions.academic_disclaimer IS 'Disclaimer that this is for academic purposes only';