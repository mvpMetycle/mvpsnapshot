-- Change container_number and seal_number from numeric to text
-- to support alphanumeric container identifiers (e.g., HLBU1071410)

ALTER TABLE bl_extraction_container 
ALTER COLUMN container_number TYPE text;

ALTER TABLE bl_extraction_container 
ALTER COLUMN seal_number TYPE text;