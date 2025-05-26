-- Add Household Groups and Group Meal Planning Tables

-- Create household_groups table
CREATE TABLE IF NOT EXISTS household_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL,
    UNIQUE(household_id, name, tenant_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_household_groups_updated_at'
    ) THEN
        CREATE TRIGGER update_household_groups_updated_at BEFORE UPDATE ON household_groups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_household_groups_household_id ON household_groups(household_id);
CREATE INDEX IF NOT EXISTS idx_household_groups_tenant_id ON household_groups(tenant_id);

-- Create household_group_members table
CREATE TABLE IF NOT EXISTS household_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES household_groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL,
    UNIQUE(group_id, member_id, tenant_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_household_group_members_updated_at'
    ) THEN
        CREATE TRIGGER update_household_group_members_updated_at BEFORE UPDATE ON household_group_members
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_household_group_members_group_id ON household_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_household_group_members_member_id ON household_group_members(member_id);
CREATE INDEX IF NOT EXISTS idx_household_group_members_tenant_id ON household_group_members(tenant_id);

-- Create meal_plan_groups table
CREATE TABLE IF NOT EXISTS meal_plan_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES household_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL,
    UNIQUE(meal_plan_id, group_id, tenant_id)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_meal_plan_groups_updated_at'
    ) THEN
        CREATE TRIGGER update_meal_plan_groups_updated_at BEFORE UPDATE ON meal_plan_groups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_plan_groups_meal_plan_id ON meal_plan_groups(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_groups_group_id ON meal_plan_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_groups_tenant_id ON meal_plan_groups(tenant_id); 