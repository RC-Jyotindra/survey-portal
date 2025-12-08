-- Update existing MATRIX questions to MATRIX_SINGLE
-- This handles the migration from the old MATRIX type to the new MATRIX_SINGLE type

UPDATE "Question" 
SET type = 'MATRIX_SINGLE' 
WHERE type = 'MATRIX';

-- Verify the update
SELECT type, COUNT(*) as count 
FROM "Question" 
WHERE type IN ('MATRIX', 'MATRIX_SINGLE', 'MATRIX_MULTIPLE')
GROUP BY type;
