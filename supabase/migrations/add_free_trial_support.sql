-- Add free trial support to class_packs table

-- Add is_free_trial flag to class_packs
ALTER TABLE class_packs ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- Update pack_type constraint to allow 'free_trial'
ALTER TABLE class_packs DROP CONSTRAINT IF EXISTS class_packs_pack_type_check;
ALTER TABLE class_packs ADD CONSTRAINT class_packs_pack_type_check 
    CHECK (pack_type IN ('10pack_45min', '20pack_45min', '10pack_75min', '20pack_75min', 'free_trial'));

-- Index for checking if a child already has a free trial (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_packs_free_trial_unique 
    ON class_packs(child_id) WHERE is_free_trial = TRUE;

-- Policy: Users can insert free trial packs for their own children
CREATE POLICY "Users can create free trial for own children"
    ON class_packs FOR INSERT
    WITH CHECK (
        is_free_trial = TRUE
        AND child_id IN (
            SELECT id FROM children WHERE parent_id = auth.uid()
        )
    );
