-- Migration: Add Notification System Tables

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    scheduled_for TIMESTAMP,
    expires_at TIMESTAMP,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    tenant_id UUID NOT NULL
);

-- Notification Recipients table
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20) NOT NULL, -- 'household', 'member'
    recipient_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Notification Channels table
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'email', 'push', 'slack', 'telegram', 'in-app'
    config JSONB NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Notification Deliveries table
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES notification_recipients(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES notification_channels(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    delivered_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Notification Templates table
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    data_schema JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Notification Preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL, -- 'household', 'member'
    entity_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    channels JSONB NOT NULL, -- Array of channel IDs and their priorities
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    frequency_limit INTEGER, -- Max notifications per day
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL,
    UNIQUE(entity_type, entity_id, notification_type, tenant_id)
);

-- Add indexes for performance
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);

CREATE INDEX idx_notification_recipients_notification_id ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_recipient_id_type ON notification_recipients(recipient_id, recipient_type);
CREATE INDEX idx_notification_recipients_tenant_id ON notification_recipients(tenant_id);
CREATE INDEX idx_notification_recipients_status ON notification_recipients(status);

CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX idx_notification_deliveries_recipient_id ON notification_deliveries(recipient_id);
CREATE INDEX idx_notification_deliveries_channel_id ON notification_deliveries(channel_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_next_retry_at ON notification_deliveries(next_retry_at);
CREATE INDEX idx_notification_deliveries_tenant_id ON notification_deliveries(tenant_id);

CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_tenant_id ON notification_templates(tenant_id);

CREATE INDEX idx_notification_preferences_entity ON notification_preferences(entity_type, entity_id);
CREATE INDEX idx_notification_preferences_notification_type ON notification_preferences(notification_type);
CREATE INDEX idx_notification_preferences_tenant_id ON notification_preferences(tenant_id);

-- Enable row level security on all notification tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies that restrict access by tenant_id
CREATE POLICY tenant_isolation_notifications ON notifications
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_notification_recipients ON notification_recipients
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_notification_channels ON notification_channels
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_notification_deliveries ON notification_deliveries
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_notification_templates ON notification_templates
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
