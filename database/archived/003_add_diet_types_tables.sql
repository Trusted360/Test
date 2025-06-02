-- Add diet types and member diets tables for the dietary preference system

-- Create diet_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS diet_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    restrictions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(name, tenant_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_diet_types_updated_at'
    ) THEN
        CREATE TRIGGER update_diet_types_updated_at BEFORE UPDATE ON diet_types
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_diet_types_tenant_id ON diet_types(tenant_id);

-- Create member_diets table if it doesn't exist
CREATE TABLE IF NOT EXISTS member_diets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    diet_type_id UUID NOT NULL REFERENCES diet_types(id) ON DELETE RESTRICT,
    starts_on DATE NOT NULL,
    ends_on DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_member_diets_updated_at'
    ) THEN
        CREATE TRIGGER update_member_diets_updated_at BEFORE UPDATE ON member_diets
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_diets_member_id ON member_diets(member_id);
CREATE INDEX IF NOT EXISTS idx_member_diets_diet_type_id ON member_diets(diet_type_id);
CREATE INDEX IF NOT EXISTS idx_member_diets_tenant_id ON member_diets(tenant_id);

-- Insert common diet types
INSERT INTO diet_types (id, name, description, restrictions, tenant_id)
SELECT 
    uuid_generate_v4(), name, description, restrictions, NULL
FROM (
    VALUES 
        ('No Restrictions', 'Standard diet with no specific restrictions', NULL),
        ('Vegetarian', 'Excludes meat, poultry, and seafood', '{"excluded_ingredients": ["meat", "poultry", "seafood"]}'),
        ('Vegan', 'Excludes all animal products including dairy and eggs', '{"excluded_ingredients": ["meat", "poultry", "seafood", "dairy", "eggs", "honey"]}'),
        ('Pescatarian', 'Vegetarian diet that includes seafood', '{"excluded_ingredients": ["meat", "poultry"], "included_ingredients": ["seafood"]}'),
        ('Gluten-Free', 'Excludes gluten-containing grains', '{"excluded_ingredients": ["wheat", "barley", "rye", "triticale"]}'),
        ('Dairy-Free', 'Excludes dairy products', '{"excluded_ingredients": ["milk", "cheese", "yogurt", "butter", "cream"]}'),
        ('Keto', 'High-fat, low-carb diet', '{"macros": {"fat": "high", "carbs": "very_low", "protein": "moderate"}}'),
        ('Paleo', 'Based on foods presumed to be available to paleolithic humans', '{"excluded_ingredients": ["grains", "legumes", "dairy", "refined_sugar", "processed_foods"]}'),
        ('Low-FODMAP', 'Restricts fermentable carbs for IBS management', '{"excluded_ingredients": ["onions", "garlic", "wheat", "certain_fruits"]}'),
        ('Nut-Free', 'Excludes nuts and sometimes seeds', '{"excluded_ingredients": ["nuts", "nut_oils", "nut_butters"]}')
) AS diet_types(name, description, restrictions)
WHERE NOT EXISTS (
    SELECT 1 FROM diet_types WHERE name = diet_types.name AND tenant_id IS NULL
);

-- Create food_allergies table if it doesn't exist
CREATE TABLE IF NOT EXISTS food_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    severity VARCHAR(50) NOT NULL, -- mild, moderate, severe
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(member_id, ingredient_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_food_allergies_updated_at'
    ) THEN
        CREATE TRIGGER update_food_allergies_updated_at BEFORE UPDATE ON food_allergies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_allergies_member_id ON food_allergies(member_id);
CREATE INDEX IF NOT EXISTS idx_food_allergies_ingredient_id ON food_allergies(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_food_allergies_tenant_id ON food_allergies(tenant_id);

-- Create food_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS food_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    preference_level INTEGER NOT NULL, -- -3 to +3 scale (-3: strong dislike, 0: neutral, +3: strong like)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(member_id, ingredient_id),
    CHECK (preference_level BETWEEN -3 AND 3)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_food_preferences_updated_at'
    ) THEN
        CREATE TRIGGER update_food_preferences_updated_at BEFORE UPDATE ON food_preferences
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_preferences_member_id ON food_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_food_preferences_ingredient_id ON food_preferences(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_food_preferences_tenant_id ON food_preferences(tenant_id);
