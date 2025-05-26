-- Create meal_history table for tracking meal plan execution
CREATE TABLE meal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- 'completed', 'partially_completed'
    completion_percentage INTEGER NOT NULL DEFAULT 0, -- 0-100
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create meal_history_items table for tracking individual meal execution
CREATE TABLE meal_history_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_history_id UUID NOT NULL REFERENCES meal_history(id) ON DELETE CASCADE,
    meal_plan_item_id UUID NOT NULL, -- References the original meal plan item
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    planned_date DATE NOT NULL,
    actual_date DATE, -- When the meal was actually prepared (null if not prepared)
    meal_type VARCHAR(20) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
    was_prepared BOOLEAN NOT NULL DEFAULT false, -- Whether the meal was actually prepared
    was_substituted BOOLEAN NOT NULL DEFAULT false, -- Whether a different recipe was used
    substituted_recipe_id UUID REFERENCES recipes(id), -- The recipe that was actually prepared
    servings INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create meal_feedback table for tracking feedback on prepared meals
CREATE TABLE meal_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_history_item_id UUID NOT NULL REFERENCES meal_history_items(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), -- 1-5 star rating
    feedback_text TEXT,
    consumed_all BOOLEAN NOT NULL DEFAULT true, -- Whether the member consumed their entire portion
    would_eat_again BOOLEAN NOT NULL DEFAULT true, -- Whether the member would eat this again
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL,
    UNIQUE(meal_history_item_id, member_id, tenant_id)
);

-- Create meal_insights table for storing insights derived from meal history
CREATE TABLE meal_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'preference', 'pattern', 'suggestion'
    insight_data JSONB NOT NULL, -- Structured data about the insight
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 100), -- Confidence level (1-100)
    is_applied BOOLEAN NOT NULL DEFAULT false, -- Whether this insight has been applied to recommendations
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_meal_history_meal_plan_id ON meal_history(meal_plan_id);
CREATE INDEX idx_meal_history_household_id ON meal_history(household_id);
CREATE INDEX idx_meal_history_items_meal_history_id ON meal_history_items(meal_history_id);
CREATE INDEX idx_meal_history_items_recipe_id ON meal_history_items(recipe_id);
CREATE INDEX idx_meal_feedback_meal_history_item_id ON meal_feedback(meal_history_item_id);
CREATE INDEX idx_meal_feedback_member_id ON meal_feedback(member_id);
CREATE INDEX idx_meal_insights_household_id ON meal_insights(household_id);

-- Add row-level security policies
ALTER TABLE meal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_history_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_meal_history ON meal_history
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_meal_history_items ON meal_history_items
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_meal_feedback ON meal_feedback
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_meal_insights ON meal_insights
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
