-- Create the ingredient_availability table for managing user's pantry
CREATE TABLE IF NOT EXISTS pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(household_id, ingredient_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_pantry_items_updated_at'
    ) THEN
        CREATE TRIGGER update_pantry_items_updated_at BEFORE UPDATE ON pantry_items
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pantry_items_household_id ON pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_ingredient_id ON pantry_items(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_tenant_id ON pantry_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expiry_date ON pantry_items(expiry_date);

-- Add ingredient categories for better organization
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES category_groups(id) ON DELETE SET NULL;

-- Create ingredient search functionality via GIN index (if using PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING GIN (name gin_trgm_ops);

-- Create view for available ingredients with their details
CREATE OR REPLACE VIEW available_ingredients AS
SELECT 
    p.id,
    p.household_id,
    p.ingredient_id,
    i.name as ingredient_name,
    i.category as ingredient_category,
    p.quantity,
    p.unit_id,
    u.name as unit_name,
    u.symbol as unit_symbol,
    p.expiry_date,
    p.notes,
    p.created_at,
    p.updated_at,
    p.tenant_id
FROM 
    pantry_items p
JOIN 
    ingredients i ON p.ingredient_id = i.id
LEFT JOIN 
    units u ON p.unit_id = u.id;

-- Create view for soon-to-expire ingredients
CREATE OR REPLACE VIEW expiring_ingredients AS
SELECT *
FROM available_ingredients
WHERE expiry_date IS NOT NULL 
AND expiry_date > CURRENT_DATE
AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY expiry_date ASC; 