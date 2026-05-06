-- Extend the spells table with all new D&D 5e spell fields
ALTER TABLE spells
    ADD COLUMN casting_time        VARCHAR(100)  NOT NULL DEFAULT '',
    ADD COLUMN range               VARCHAR(100)  NOT NULL DEFAULT '',
    ADD COLUMN duration            VARCHAR(100)  NOT NULL DEFAULT '',
    ADD COLUMN verbal              BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN somatic             BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN material            BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN material_component  VARCHAR(500),
    ADD COLUMN concentration       BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN ritual              BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN damage_types        VARCHAR(500),
    ADD COLUMN saving_throw        VARCHAR(50),
    ADD COLUMN spell_classes       VARCHAR(500),
    ADD COLUMN higher_level_description TEXT;

-- Remove the temporary defaults (columns are now populated)
ALTER TABLE spells
    ALTER COLUMN casting_time DROP DEFAULT,
    ALTER COLUMN range        DROP DEFAULT,
    ALTER COLUMN duration     DROP DEFAULT;
