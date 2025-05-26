-- Add approval_status to meal_plans table
ALTER TABLE meal_plans ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Create meal_plan_versions table for tracking changes
CREATE TABLE meal_plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID, -- Member who created this version
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    data JSONB NOT NULL, -- Snapshot of the meal plan at this version
    tenant_id UUID NOT NULL
);

-- Create meal_plan_approvals table for member responses
CREATE TABLE meal_plan_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    member_id UUID NOT NULL, -- Member who approved/rejected
    version_number INTEGER NOT NULL, -- Which version they're responding to
    response VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'partially_approved'
    response_date TIMESTAMP NOT NULL DEFAULT NOW(),
    feedback TEXT,
    tenant_id UUID NOT NULL,
    UNIQUE(meal_plan_id, member_id, version_number, tenant_id)
);

-- Create meal_plan_item_approvals table for item-level responses
CREATE TABLE meal_plan_item_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_approval_id UUID NOT NULL REFERENCES meal_plan_approvals(id) ON DELETE CASCADE,
    meal_plan_item_id UUID NOT NULL, -- References the item in the meal plan
    response VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
    suggested_recipe_id UUID, -- Alternative recipe suggestion if rejected
    feedback TEXT,
    tenant_id UUID NOT NULL,
    UNIQUE(meal_plan_approval_id, meal_plan_item_id, tenant_id)
);

-- Create meal_plan_comments table for feedback
CREATE TABLE meal_plan_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    member_id UUID NOT NULL, -- Member who commented
    version_number INTEGER NOT NULL, -- Which version they're commenting on
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_meal_plan_versions_meal_plan_id ON meal_plan_versions(meal_plan_id);
CREATE INDEX idx_meal_plan_approvals_meal_plan_id ON meal_plan_approvals(meal_plan_id);
CREATE INDEX idx_meal_plan_item_approvals_meal_plan_approval_id ON meal_plan_item_approvals(meal_plan_approval_id);
CREATE INDEX idx_meal_plan_comments_meal_plan_id ON meal_plan_comments(meal_plan_id);

-- Add row-level security policies
ALTER TABLE meal_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_item_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_meal_plan_versions ON meal_plan_versions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_meal_plan_approvals ON meal_plan_approvals
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_meal_plan_item_approvals ON meal_plan_item_approvals
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_meal_plan_comments ON meal_plan_comments
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
