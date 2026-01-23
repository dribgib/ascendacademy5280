-- Create class_packs table to track one-time class pack purchases
CREATE TABLE IF NOT EXISTS class_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    pack_type TEXT NOT NULL CHECK (pack_type IN ('10pack_45min', '20pack_45min', '10pack_75min', '20pack_75min')),
    credits_remaining INTEGER NOT NULL CHECK (credits_remaining >= 0),
    credits_total INTEGER NOT NULL CHECK (credits_total > 0),
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    stripe_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add class_pack_id column to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS class_pack_id UUID REFERENCES class_packs(id) ON DELETE SET NULL;

-- Index for faster lookups by child
CREATE INDEX idx_class_packs_child_id ON class_packs(child_id);

-- Index for finding active packs (has credits, app filters expiration)
CREATE INDEX idx_class_packs_active ON class_packs(child_id, expires_at, credits_remaining) 
    WHERE credits_remaining > 0;

-- Index for registrations by class pack
CREATE INDEX IF NOT EXISTS idx_registrations_class_pack ON registrations(class_pack_id) WHERE class_pack_id IS NOT NULL;

-- Enable RLS
ALTER TABLE class_packs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own children's class packs
CREATE POLICY "Users can view own children class packs"
    ON class_packs FOR SELECT
    USING (
        child_id IN (
            SELECT id FROM children WHERE parent_id = auth.uid()
        )
    );

-- Policy: Service role can do anything (for webhook)
CREATE POLICY "Service role has full access to class packs"
    ON class_packs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Admins can view all class packs
CREATE POLICY "Admins can view all class packs"
    ON class_packs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Policy: System can update class packs for credit tracking
CREATE POLICY "System can update class pack credits"
    ON class_packs FOR UPDATE
    USING (
        child_id IN (
            SELECT id FROM children WHERE parent_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_packs_updated_at_trigger
    BEFORE UPDATE ON class_packs
    FOR EACH ROW
    EXECUTE FUNCTION update_class_packs_updated_at();
