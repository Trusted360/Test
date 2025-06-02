-- Add units table and enhance shopping list functionality

-- Create store_sections table
CREATE TABLE store_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(name, tenant_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_store_sections_updated_at BEFORE UPDATE ON store_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_store_sections_tenant_id ON store_sections(tenant_id);

-- Create units table
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL, -- volume, weight, count, etc.
    base_unit_id UUID REFERENCES units(id), -- for conversion
    conversion_factor DECIMAL(10, 6), -- multiply by this to convert to base unit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(name, tenant_id),
    UNIQUE(symbol, tenant_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_units_tenant_id ON units(tenant_id);
CREATE INDEX idx_units_base_unit_id ON units(base_unit_id);

-- Update recipe_ingredients to use unit_id instead of unit string
ALTER TABLE recipe_ingredients 
ADD COLUMN unit_id UUID REFERENCES units(id),
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Update shopping_list_items to use unit_id instead of unit string
ALTER TABLE shopping_list_items 
ADD COLUMN unit_id UUID REFERENCES units(id),
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add generated_on column to shopping_lists if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_lists' AND column_name = 'generated_on'
    ) THEN
        ALTER TABLE shopping_lists ADD COLUMN generated_on TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add store_section_order column to shopping_list_items for custom ordering
ALTER TABLE shopping_list_items ADD COLUMN store_section_order INTEGER;

-- Create common units for volume
INSERT INTO units (id, name, symbol, category, base_unit_id, conversion_factor, tenant_id)
VALUES 
    -- Volume base unit (milliliter)
    (uuid_generate_v4(), 'milliliter', 'ml', 'volume', NULL, NULL, NULL),
    -- Other volume units
    (uuid_generate_v4(), 'liter', 'L', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 1000, NULL),
    (uuid_generate_v4(), 'cup', 'cup', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 236.588, NULL),
    (uuid_generate_v4(), 'tablespoon', 'tbsp', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 14.7868, NULL),
    (uuid_generate_v4(), 'teaspoon', 'tsp', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 4.92892, NULL),
    (uuid_generate_v4(), 'fluid ounce', 'fl oz', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 29.5735, NULL),
    (uuid_generate_v4(), 'pint', 'pt', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 473.176, NULL),
    (uuid_generate_v4(), 'quart', 'qt', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 946.353, NULL),
    (uuid_generate_v4(), 'gallon', 'gal', 'volume', (SELECT id FROM units WHERE name = 'milliliter'), 3785.41, NULL);

-- Create common units for weight
INSERT INTO units (id, name, symbol, category, base_unit_id, conversion_factor, tenant_id)
VALUES 
    -- Weight base unit (gram)
    (uuid_generate_v4(), 'gram', 'g', 'weight', NULL, NULL, NULL),
    -- Other weight units
    (uuid_generate_v4(), 'kilogram', 'kg', 'weight', (SELECT id FROM units WHERE name = 'gram'), 1000, NULL),
    (uuid_generate_v4(), 'ounce', 'oz', 'weight', (SELECT id FROM units WHERE name = 'gram'), 28.3495, NULL),
    (uuid_generate_v4(), 'pound', 'lb', 'weight', (SELECT id FROM units WHERE name = 'gram'), 453.592, NULL);

-- Create common units for count
INSERT INTO units (id, name, symbol, category, base_unit_id, conversion_factor, tenant_id)
VALUES 
    -- Count base unit (count)
    (uuid_generate_v4(), 'count', '', 'count', NULL, NULL, NULL),
    -- Other count units
    (uuid_generate_v4(), 'piece', 'pc', 'count', (SELECT id FROM units WHERE name = 'count'), 1, NULL),
    (uuid_generate_v4(), 'dozen', 'doz', 'count', (SELECT id FROM units WHERE name = 'count'), 12, NULL);

-- Create common store sections
INSERT INTO store_sections (id, name, display_order, tenant_id)
SELECT 
    uuid_generate_v4(), name, display_order, NULL
FROM (
    VALUES 
        ('Produce', 10),
        ('Meat & Seafood', 20),
        ('Dairy & Eggs', 30),
        ('Bakery', 40),
        ('Frozen Foods', 50),
        ('Canned Goods', 60),
        ('Dry Goods & Pasta', 70),
        ('Condiments & Sauces', 80),
        ('Snacks', 90),
        ('Beverages', 100),
        ('Baking', 110),
        ('Spices & Herbs', 120),
        ('International', 130),
        ('Health & Personal Care', 140),
        ('Household', 150),
        ('Other', 999)
) AS sections(name, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM store_sections WHERE name = sections.name AND tenant_id IS NULL
);
