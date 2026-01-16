-- Add indexes for frequently queried fields

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON "User"("createdAt");

-- Wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON "Wallet"("userId");

-- Beneficiaries
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_beneficiary ON "Beneficiary"("userId", "beneficiaryId");
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_nickname ON "Beneficiary"("userId", "nickname");
CREATE INDEX IF NOT EXISTS idx_beneficiaries_created_at ON "Beneficiary"("createdAt");

-- Donations
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON "Donation"("donorId");
CREATE INDEX IF NOT EXISTS idx_donations_beneficiary_id ON "Donation"("beneficiaryId");
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON "Donation"("createdAt" DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_donations_donor_created ON "Donation"("donorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_donations_beneficiary_created ON "Donation"("beneficiaryId", "createdAt" DESC);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON "Transaction"("walletId");
CREATE INDEX IF NOT EXISTS idx_transactions_donation_id ON "Transaction"("donationId");
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON "Transaction"("createdAt" DESC);

-- Blacklisted tokens
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON "BlacklistedToken"("expiresAt");
CREATE INDEX IF NOT EXISTS idx_blacklist_token ON "BlacklistedToken"("token");
CREATE INDEX IF NOT EXISTS idx_blacklist_user ON "BlacklistedToken"("userId");

-- Refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON "RefreshToken"("expiresAt");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON "RefreshToken"("revoked");
