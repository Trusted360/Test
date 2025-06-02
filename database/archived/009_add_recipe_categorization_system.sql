-- Add Recipe Categorization System

-- Create category_groups table for organizing categories
CREATE TABLE IF NOT EXISTS category_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    icon VARCHAR(100),
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
        WHERE tgname = 'update_category_groups_updated_at'
    ) THEN
        CREATE TRIGGER update_category_groups_updated_at BEFORE UPDATE ON category_groups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_category_groups_tenant_id ON category_groups(tenant_id);

-- Create categories table for recipe categorization
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_group_id UUID REFERENCES category_groups(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    icon VARCHAR(100),
    color VARCHAR(20),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(name, category_group_id, tenant_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_categories_updated_at'
    ) THEN
        CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_category_group_id ON categories(category_group_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);

-- Create recipe_categories junction table
CREATE TABLE IF NOT EXISTS recipe_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(recipe_id, category_id, tenant_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_recipe_categories_updated_at'
    ) THEN
        CREATE TRIGGER update_recipe_categories_updated_at BEFORE UPDATE ON recipe_categories
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_categories_recipe_id ON recipe_categories(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_category_id ON recipe_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_tenant_id ON recipe_categories(tenant_id);

-- Create category_rules table for automatic categorization
CREATE TABLE IF NOT EXISTS category_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'tag', 'ingredient', 'name_contains', 'custom'
    rule_value JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    conditions JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_category_rules_updated_at'
    ) THEN
        CREATE TRIGGER update_category_rules_updated_at BEFORE UPDATE ON category_rules
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_rules_category_id ON category_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_category_rules_tenant_id ON category_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_category_rules_priority ON category_rules(priority);
CREATE INDEX IF NOT EXISTS idx_category_rules_conditions ON category_rules USING GIN (conditions);

-- Insert default category groups
INSERT INTO category_groups (id, name, description, display_order, icon, tenant_id)
SELECT 
    uuid_generate_v4(), name, description, display_order, icon, NULL
FROM (
    VALUES 
        ('Meal Type', 'Categories based on when a meal is typically served', 1, 'restaurant'),
        ('Cuisine', 'Categories based on regional or cultural cooking styles', 2, 'public'),
        ('Dish Type', 'Categories based on the type of dish', 3, 'category'),
        ('Dietary', 'Categories based on dietary requirements or preferences', 4, 'health_and_safety'),
        ('Cooking Method', 'Categories based on how the dish is prepared', 5, 'cooking'),
        ('Occasion', 'Categories based on events or special occasions', 6, 'celebration'),
        ('Seasonal', 'Categories based on seasons or holidays', 7, 'event')
) AS category_groups(name, description, display_order, icon)
WHERE NOT EXISTS (
    SELECT 1 FROM category_groups WHERE name = category_groups.name AND tenant_id IS NULL
);

-- Insert default categories for Meal Type
INSERT INTO categories (id, name, description, category_group_id, display_order, icon, color, is_default, tenant_id)
SELECT 
    uuid_generate_v4(), cat.name, cat.description, cg.id, cat.display_order, cat.icon, cat.color, cat.is_default, NULL
FROM (
    VALUES 
        ('Breakfast', 'Morning meals', 1, 'breakfast_dining', '#FFA726', false),
        ('Lunch', 'Midday meals', 2, 'lunch_dining', '#66BB6A', false),
        ('Dinner', 'Evening meals', 3, 'dinner_dining', '#5C6BC0', true),
        ('Brunch', 'Late morning meals combining breakfast and lunch', 4, 'brunch_dining', '#FFCA28', false),
        ('Snack', 'Small meals between main meals', 5, 'cookie', '#EF5350', false),
        ('Dessert', 'Sweet dishes typically served after a meal', 6, 'cake', '#EC407A', false),
        ('Appetizer', 'Small dishes served before a main meal', 7, 'tapas', '#7E57C2', false)
) AS cat(name, description, display_order, icon, color, is_default)
CROSS JOIN (SELECT id FROM category_groups WHERE name = 'Meal Type' AND tenant_id IS NULL LIMIT 1) AS cg
WHERE NOT EXISTS (
    SELECT 1 FROM categories c 
    JOIN category_groups cg ON c.category_group_id = cg.id 
    WHERE c.name = cat.name AND cg.name = 'Meal Type' AND c.tenant_id IS NULL
);

-- Create function to automatically categorize recipes based on rules
CREATE OR REPLACE FUNCTION auto_categorize_recipe()
RETURNS TRIGGER AS $$
DECLARE
    rule RECORD;
    match BOOLEAN;
    tag_value TEXT;
    ingredient_value TEXT;
BEGIN
    -- Process each category rule
    FOR rule IN 
        SELECT cr.id, cr.category_id, cr.rule_type, cr.rule_value, cr.tenant_id
        FROM category_rules cr
        WHERE cr.tenant_id = NEW.tenant_id
        ORDER BY cr.priority DESC
    LOOP
        match := FALSE;
        
        -- Check rule type and apply matching logic
        IF rule.rule_type = 'tag' THEN
            -- Check if recipe has the specified tag
            IF EXISTS (
                SELECT 1 FROM recipe_tags rt
                JOIN tags t ON rt.tag_id = t.id
                WHERE rt.recipe_id = NEW.id
                AND t.name = rule.rule_value->>'tag_name'
                AND rt.tenant_id = NEW.tenant_id
            ) THEN
                match := TRUE;
            END IF;
            
        ELSIF rule.rule_type = 'ingredient' THEN
            -- Check if recipe contains the specified ingredient
            IF EXISTS (
                SELECT 1 FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.recipe_id = NEW.id
                AND i.name = rule.rule_value->>'ingredient_name'
                AND ri.tenant_id = NEW.tenant_id
            ) THEN
                match := TRUE;
            END IF;
            
        ELSIF rule.rule_type = 'name_contains' THEN
            -- Check if recipe name contains the specified text
            IF NEW.title ILIKE '%' || (rule.rule_value->>'text') || '%' THEN
                match := TRUE;
            END IF;
            
        ELSIF rule.rule_type = 'custom' THEN
            -- Custom rules would be handled by application logic
            -- This is a placeholder for future extension
            match := FALSE;
        END IF;
        
        -- If rule matches, add recipe to category
        IF match THEN
            INSERT INTO recipe_categories (
                id, recipe_id, category_id, created_at, updated_at, tenant_id
            ) VALUES (
                uuid_generate_v4(), NEW.id, rule.category_id, NOW(), NOW(), NEW.tenant_id
            ) ON CONFLICT (recipe_id, category_id, tenant_id) DO NOTHING;
        END IF;
    END LOOP;
    
    -- Add recipe to default categories if no categories were assigned
    IF NOT EXISTS (
        SELECT 1 FROM recipe_categories WHERE recipe_id = NEW.id AND tenant_id = NEW.tenant_id
    ) THEN
        INSERT INTO recipe_categories (
            id, recipe_id, category_id, created_at, updated_at, tenant_id
        )
        SELECT 
            uuid_generate_v4(), NEW.id, c.id, NOW(), NOW(), NEW.tenant_id
        FROM categories c
        WHERE c.is_default = TRUE AND c.tenant_id = NEW.tenant_id
        ON CONFLICT (recipe_id, category_id, tenant_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically categorize recipes when created
CREATE TRIGGER auto_categorize_recipe_trigger
AFTER INSERT ON recipes
FOR EACH ROW
EXECUTE FUNCTION auto_categorize_recipe();

-- Create function to update recipe search results view to include categories
CREATE OR REPLACE FUNCTION get_recipe_categories(recipe_id UUID)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    category_group_id UUID,
    category_group_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS category_id,
        c.name AS category_name,
        cg.id AS category_group_id,
        cg.name AS category_group_name
    FROM recipe_categories rc
    JOIN categories c ON rc.category_id = c.id
    JOIN category_groups cg ON c.category_group_id = cg.id
    WHERE rc.recipe_id = recipe_id;
END;
$$ LANGUAGE plpgsql;

-- Update recipe_search_results view to include categories
CREATE OR REPLACE VIEW recipe_search_results AS
SELECT 
  r.id,
  r.title,
  r.description,
  r.prep_time,
  r.cook_time,
  r.total_time,
  r.difficulty,
  r.image_url,
  r.tenant_id,
  r.created_at,
  r.updated_at,
  ARRAY(
    SELECT t.name 
    FROM recipe_tags rt 
    JOIN tags t ON rt.tag_id = t.id 
    WHERE rt.recipe_id = r.id
  ) AS tags,
  ARRAY(
    SELECT json_build_object(
      'id', category_id,
      'name', category_name,
      'group_id', category_group_id,
      'group_name', category_group_name
    )
    FROM get_recipe_categories(r.id)
  ) AS categories,
  COALESCE(
    (SELECT AVG(rr.rating) 
     FROM recipe_ratings rr 
     WHERE rr.recipe_id = r.id), 
    0
  ) AS average_rating,
  (SELECT COUNT(*) 
   FROM recipe_ratings rr 
   WHERE rr.recipe_id = r.id) AS rating_count,
  (SELECT COUNT(*) 
   FROM recipe_ingredients ri 
   WHERE ri.recipe_id = r.id) AS ingredient_count
FROM recipes r;

-- Update search_recipes function to include category filtering
CREATE OR REPLACE FUNCTION search_recipes(
  search_query TEXT,
  filter_tags TEXT[],
  filter_difficulty TEXT,
  min_rating NUMERIC,
  max_prep_time INTEGER,
  max_total_time INTEGER,
  filter_ingredients TEXT[],
  filter_categories UUID[],
  sort_by TEXT,
  sort_direction TEXT,
  p_limit INTEGER,
  p_offset INTEGER,
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  total_time INTEGER,
  difficulty TEXT,
  image_url TEXT,
  tags TEXT[],
  categories JSON[],
  average_rating NUMERIC,
  rating_count BIGINT,
  ingredient_count BIGINT,
  search_rank REAL,
  highlight_title TEXT,
  highlight_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  query_tsquery tsquery;
  sort_column TEXT;
  sort_order TEXT;
BEGIN
  -- Convert search query to tsquery if provided
  IF search_query IS NOT NULL AND search_query <> '' THEN
    query_tsquery := plainto_tsquery('english', search_query);
  ELSE
    query_tsquery := NULL;
  END IF;

  -- Set default sort if not provided
  IF sort_by IS NULL OR sort_by = '' THEN
    sort_column := 'created_at';
  ELSE
    sort_column := sort_by;
  END IF;

  -- Set default sort direction if not provided
  IF sort_direction IS NULL OR sort_direction = '' THEN
    sort_order := 'DESC';
  ELSE
    sort_order := sort_direction;
  END IF;

  RETURN QUERY EXECUTE '
    WITH filtered_recipes AS (
      SELECT 
        r.id,
        r.title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.difficulty,
        r.image_url,
        r.tags,
        r.categories,
        r.average_rating,
        r.rating_count,
        r.ingredient_count,
        r.created_at,
        r.updated_at,
        ' || CASE WHEN query_tsquery IS NOT NULL THEN 'ts_rank(recipes.search_vector, $1)' ELSE '0' END || ' AS search_rank,
        ' || CASE WHEN query_tsquery IS NOT NULL THEN 
          'ts_headline(''english'', r.title, $1, ''StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=50, MinWords=5'')'
          ELSE 'r.title' END || ' AS highlight_title,
        ' || CASE WHEN query_tsquery IS NOT NULL THEN 
          'ts_headline(''english'', r.description, $1, ''StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=50, MinWords=5'')'
          ELSE 'r.description' END || ' AS highlight_description
      FROM recipe_search_results r
      JOIN recipes ON recipes.id = r.id
      WHERE r.tenant_id = $13
        ' || CASE WHEN query_tsquery IS NOT NULL THEN 'AND recipes.search_vector @@ $1' ELSE '' END || '
        ' || CASE WHEN filter_tags IS NOT NULL AND array_length(filter_tags, 1) > 0 THEN 'AND r.tags && $2' ELSE '' END || '
        ' || CASE WHEN filter_difficulty IS NOT NULL AND filter_difficulty <> '''' THEN 'AND r.difficulty = $3' ELSE '' END || '
        ' || CASE WHEN min_rating IS NOT NULL AND min_rating > 0 THEN 'AND r.average_rating >= $4' ELSE '' END || '
        ' || CASE WHEN max_prep_time IS NOT NULL AND max_prep_time > 0 THEN 'AND r.prep_time <= $5' ELSE '' END || '
        ' || CASE WHEN max_total_time IS NOT NULL AND max_total_time > 0 THEN 'AND r.total_time <= $6' ELSE '' END || '
        ' || CASE WHEN filter_ingredients IS NOT NULL AND array_length(filter_ingredients, 1) > 0 THEN '
          AND EXISTS (
            SELECT 1 FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.recipe_id = r.id AND i.name = ANY($7)
          )' ELSE '' END || '
        ' || CASE WHEN filter_categories IS NOT NULL AND array_length(filter_categories, 1) > 0 THEN '
          AND EXISTS (
            SELECT 1 FROM recipe_categories rc
            WHERE rc.recipe_id = r.id AND rc.category_id = ANY($8)
          )' ELSE '' END || '
    )
    SELECT 
      id, title, description, prep_time, cook_time, total_time, 
      difficulty, image_url, tags, categories, average_rating, rating_count, 
      ingredient_count, search_rank, highlight_title, highlight_description,
      created_at, updated_at
    FROM filtered_recipes
    ORDER BY ' || 
      CASE 
        WHEN query_tsquery IS NOT NULL AND sort_column = 'relevance' THEN 'search_rank DESC'
        ELSE quote_ident(sort_column) || ' ' || sort_order
      END || '
    LIMIT $11 OFFSET $12
  ' USING 
    query_tsquery, 
    filter_tags, 
    filter_difficulty, 
    min_rating, 
    max_prep_time, 
    max_total_time, 
    filter_ingredients,
    filter_categories,
    sort_by, 
    sort_direction, 
    p_limit, 
    p_offset,
    p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Update count_search_recipes function to include category filtering
CREATE OR REPLACE FUNCTION count_search_recipes(
  search_query TEXT,
  filter_tags TEXT[],
  filter_difficulty TEXT,
  min_rating NUMERIC,
  max_prep_time INTEGER,
  max_total_time INTEGER,
  filter_ingredients TEXT[],
  filter_categories UUID[],
  p_tenant_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  query_tsquery tsquery;
  result_count BIGINT;
BEGIN
  -- Convert search query to tsquery if provided
  IF search_query IS NOT NULL AND search_query <> '' THEN
    query_tsquery := plainto_tsquery('english', search_query);
  ELSE
    query_tsquery := NULL;
  END IF;

  EXECUTE '
    SELECT COUNT(*)
    FROM recipe_search_results r
    JOIN recipes ON recipes.id = r.id
    WHERE r.tenant_id = $9
      ' || CASE WHEN query_tsquery IS NOT NULL THEN 'AND recipes.search_vector @@ $1' ELSE '' END || '
      ' || CASE WHEN filter_tags IS NOT NULL AND array_length(filter_tags, 1) > 0 THEN 'AND r.tags && $2' ELSE '' END || '
      ' || CASE WHEN filter_difficulty IS NOT NULL AND filter_difficulty <> '''' THEN 'AND r.difficulty = $3' ELSE '' END || '
      ' || CASE WHEN min_rating IS NOT NULL AND min_rating > 0 THEN 'AND r.average_rating >= $4' ELSE '' END || '
      ' || CASE WHEN max_prep_time IS NOT NULL AND max_prep_time > 0 THEN 'AND r.prep_time <= $5' ELSE '' END || '
      ' || CASE WHEN max_total_time IS NOT NULL AND max_total_time > 0 THEN 'AND r.total_time <= $6' ELSE '' END || '
      ' || CASE WHEN filter_ingredients IS NOT NULL AND array_length(filter_ingredients, 1) > 0 THEN '
        AND EXISTS (
          SELECT 1 FROM recipe_ingredients ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.recipe_id = r.id AND i.name = ANY($7)
        )' ELSE '' END || '
      ' || CASE WHEN filter_categories IS NOT NULL AND array_length(filter_categories, 1) > 0 THEN '
        AND EXISTS (
          SELECT 1 FROM recipe_categories rc
          WHERE rc.recipe_id = r.id AND rc.category_id = ANY($8)
        )' ELSE '' END || '
  ' INTO result_count USING 
    query_tsquery, 
    filter_tags, 
    filter_difficulty, 
    min_rating, 
    max_prep_time, 
    max_total_time, 
    filter_ingredients,
    filter_categories,
    p_tenant_id;

  RETURN result_count;
END;
$$ LANGUAGE plpgsql;

-- Add custom rule type support
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'rule_type'
    ) THEN
        CREATE TYPE rule_type AS ENUM ('tag', 'ingredient', 'name_contains', 'custom');
    END IF;
END $$;

-- Update category_rules table to use the enum type
ALTER TABLE category_rules
ALTER COLUMN rule_type TYPE rule_type USING rule_type::rule_type;

-- Add trigger to validate rule conditions
CREATE OR REPLACE FUNCTION validate_rule_conditions()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate conditions JSON structure
    IF NEW.conditions IS NOT NULL THEN
        -- Check if conditions is an array
        IF jsonb_typeof(NEW.conditions) != 'array' THEN
            RAISE EXCEPTION 'conditions must be a JSON array';
        END IF;

        -- Validate each condition
        FOR i IN 0..jsonb_array_length(NEW.conditions) - 1 LOOP
            DECLARE
                condition jsonb := NEW.conditions->i;
            BEGIN
                -- Check required fields
                IF NOT (condition ? 'rule_type' AND condition ? 'rule_value') THEN
                    RAISE EXCEPTION 'each condition must have rule_type and rule_value';
                END IF;

                -- Validate rule type
                IF condition->>'rule_type' NOT IN ('tag', 'ingredient', 'name_contains', 'custom') THEN
                    RAISE EXCEPTION 'invalid rule type in condition: %', condition->>'rule_type';
                END IF;

                -- Validate rule value based on type
                CASE condition->>'rule_type'
                    WHEN 'tag' THEN
                        IF NOT (condition->'rule_value' ? 'tag_name') THEN
                            RAISE EXCEPTION 'tag rule must have tag_name in rule_value';
                        END IF;
                    WHEN 'ingredient' THEN
                        IF NOT (condition->'rule_value' ? 'ingredient_name') THEN
                            RAISE EXCEPTION 'ingredient rule must have ingredient_name in rule_value';
                        END IF;
                    WHEN 'name_contains' THEN
                        IF NOT (condition->'rule_value' ? 'text') THEN
                            RAISE EXCEPTION 'name_contains rule must have text in rule_value';
                        END IF;
                    WHEN 'custom' THEN
                        IF NOT (condition->'rule_value' ? 'description') THEN
                            RAISE EXCEPTION 'custom rule must have description in rule_value';
                        END IF;
                END CASE;

                -- Validate operator if present
                IF condition ? 'operator' THEN
                    IF condition->>'operator' NOT IN ('AND', 'OR') THEN
                        RAISE EXCEPTION 'invalid operator in condition: %', condition->>'operator';
                    END IF;
                END IF;
            END;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rule conditions validation
DROP TRIGGER IF EXISTS validate_rule_conditions_trigger ON category_rules;
CREATE TRIGGER validate_rule_conditions_trigger
BEFORE INSERT OR UPDATE ON category_rules
FOR EACH ROW
EXECUTE FUNCTION validate_rule_conditions();
