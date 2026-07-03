ALTER TABLE challenge_types ADD COLUMN IF NOT EXISTS volume_ml integer;
UPDATE challenge_types SET name = '25 cl', volume_ml = 250  WHERE id = '4a5e7a4e-441a-40ee-9540-89c4979bd658';
UPDATE challenge_types SET name = '50 cl', volume_ml = 500  WHERE id = '371140a5-8ce5-4037-8adb-8f35362771d4';
UPDATE challenge_types SET name = '1 L',   volume_ml = 1000 WHERE id = '2d3ad48c-e8cb-42b7-ab82-9e932b0ece93';
