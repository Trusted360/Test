-- Add full-text search capabilities to recipes table

-- Create GIN indexes for full-text search
CREATE INDEX idx_recipes_title_tsvector ON recipes USING GIN (to_tsvector('english', title));
CREATE INDEX idx_recipes_description_tsvector ON recipes USING GIN (to_tsvector('english', description));
CREATE INDEX idx_recipes_instructions_tsvector ON recipes USING GIN (to_tsvector('english', instructions));

-- Create a function to generate a combined tsvector for recipes
CREATE OR REPLACE FUNCTION recipe_search_vector(title TEXT, description TEXT, instructions TEXT) 
RETURNS tsvector AS $$
BEGIN
  RETURN setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
         setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
         setweight(to_tsvector('english', COALESCE(instructions, '')), 'C');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add a search_vector column to the recipes table
ALTER TABLE recipes ADD COLUMN search_vector tsvector;

-- Update existing recipes with search vector
UPDATE recipes SET search_vector = recipe_search_vector(title, description, instructions);

-- Create a trigger to automatically update the search_vector column
CREATE OR REPLACE FUNCTION update_recipe_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := recipe_search_vector(NEW.title, NEW.description, NEW.instructions);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipe_search_vector_trigger
BEFORE INSERT OR UPDATE ON recipes
FOR EACH ROW
EXECUTE FUNCTION update_recipe_search_vector();

-- Create GIN index on the search_vector column
CREATE INDEX idx_recipes_search_vector ON recipes USING GIN (search_vector);

-- Add additional indexes for filtering
CREATE INDEX idx_recipes_difficulty ON recipes (difficulty);
CREATE INDEX idx_recipes_prep_time ON recipes (prep_time);
CREATE INDEX idx_recipes_cook_time ON recipes (cook_time);
CREATE INDEX idx_recipes_total_time ON recipes (total_time);

-- Create a view for recipe search results with additional metadata
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

-- Create a function for advanced recipe search
CREATE OR REPLACE FUNCTION search_recipes(
  search_query TEXT,
  filter_tags TEXT[],
  filter_difficulty TEXT,
  min_rating NUMERIC,
  max_prep_time INTEGER,
  max_total_time INTEGER,
  filter_ingredients TEXT[],
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
      WHERE r.tenant_id = $12
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
    )
    SELECT 
      id, title, description, prep_time, cook_time, total_time, 
      difficulty, image_url, tags, average_rating, rating_count, 
      ingredient_count, search_rank, highlight_title, highlight_description,
      created_at, updated_at
    FROM filtered_recipes
    ORDER BY ' || 
      CASE 
        WHEN query_tsquery IS NOT NULL AND sort_column = 'relevance' THEN 'search_rank DESC'
        ELSE quote_ident(sort_column) || ' ' || sort_order
      END || '
    LIMIT $10 OFFSET $11
  ' USING 
    query_tsquery, 
    filter_tags, 
    filter_difficulty, 
    min_rating, 
    max_prep_time, 
    max_total_time, 
    filter_ingredients, 
    sort_by, 
    sort_direction, 
    p_limit, 
    p_offset,
    p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to count search results
CREATE OR REPLACE FUNCTION count_search_recipes(
  search_query TEXT,
  filter_tags TEXT[],
  filter_difficulty TEXT,
  min_rating NUMERIC,
  max_prep_time INTEGER,
  max_total_time INTEGER,
  filter_ingredients TEXT[],
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
    WHERE r.tenant_id = $8
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
  ' INTO result_count USING 
    query_tsquery, 
    filter_tags, 
    filter_difficulty, 
    min_rating, 
    max_prep_time, 
    max_total_time, 
    filter_ingredients,
    p_tenant_id;

  RETURN result_count;
END;
$$ LANGUAGE plpgsql;
