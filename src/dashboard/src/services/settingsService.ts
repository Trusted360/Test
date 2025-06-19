import api from './api';

export interface GlobalSetting {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category: string;
}

export interface GlobalSettings {
  [key: string]: GlobalSetting;
}

export interface UserSettings {
  [key: string]: any;
}

export interface NotificationTarget {
  id: number;
  name: string;
  type: 'email' | 'sms' | 'webhook' | 'slack';
  target_address: string;
  config_json?: any;
  is_active: boolean;
  created_at: string;
}

export interface ServiceIntegration {
  id: number;
  name: string;
  integration_type: 'jira' | 'servicenow' | 'zendesk' | 'freshservice';
  base_url: string;
  username?: string;
  config_json?: any;
  is_active: boolean;
  auto_create_tickets: boolean;
  default_project_key?: string;
  default_issue_type?: string;
  created_at: string;
}

export interface CameraFeedSettings {
  id: number;
  camera_feed_id: number;
  property_id?: number;
  alert_rules?: any;
  recording_settings?: any;
  notification_settings?: any;
  motion_detection_enabled: boolean;
  person_detection_enabled: boolean;
  vehicle_detection_enabled: boolean;
  sensitivity_level: number;
  camera_name?: string;
  feed_url?: string;
  location?: string;
  camera_status?: string;
  property_name?: string;
}

export interface Property {
  id: number;
  name: string;
  address?: string;
  property_type_id?: number;
  status: string;
}

class SettingsService {
  // Global Settings
  async getGlobalSettings(category?: string): Promise<GlobalSettings> {
    const params = category ? { category } : {};
    const response = await api.get('/settings/global', { params });
    return response.data;
  }

  async updateGlobalSettings(settings: { [key: string]: { value: any; type?: string; description?: string; category?: string } }): Promise<void> {
    await api.put('/settings/global', { settings });
  }

  // User Settings
  async getUserSettings(): Promise<UserSettings> {
    const response = await api.get('/settings/user');
    return response.data;
  }

  async updateUserSettings(settings: UserSettings): Promise<void> {
    await api.put('/settings/user', { settings });
  }

  // Notification Targets
  async getNotificationTargets(): Promise<NotificationTarget[]> {
    const response = await api.get('/settings/notification-targets');
    return response.data;
  }

  async createNotificationTarget(target: Omit<NotificationTarget, 'id' | 'created_at'>): Promise<NotificationTarget> {
    const response = await api.post('/settings/notification-targets', target);
    return response.data;
  }

  async updateNotificationTarget(id: number, target: Partial<NotificationTarget>): Promise<NotificationTarget> {
    const response = await api.put(`/settings/notification-targets/${id}`, target);
    return response.data;
  }

  async deleteNotificationTarget(id: number): Promise<void> {
    await api.delete(`/settings/notification-targets/${id}`);
  }

  // Service Integrations
  async getServiceIntegrations(): Promise<ServiceIntegration[]> {
    const response = await api.get('/settings/service-integrations');
    return response.data;
  }

  async createServiceIntegration(integration: Omit<ServiceIntegration, 'id' | 'created_at'> & { api_key?: string }): Promise<ServiceIntegration> {
    const response = await api.post('/settings/service-integrations', integration);
    return response.data;
  }

  async updateServiceIntegration(id: number, integration: Partial<ServiceIntegration> & { api_key?: string }): Promise<ServiceIntegration> {
    const response = await api.put(`/settings/service-integrations/${id}`, integration);
    return response.data;
  }

  async deleteServiceIntegration(id: number): Promise<void> {
    await api.delete(`/settings/service-integrations/${id}`);
  }

  // Camera Feed Settings
  async getCameraFeedSettings(propertyId?: number): Promise<CameraFeedSettings[]> {
    const params = propertyId ? { propertyId } : {};
    const response = await api.get('/settings/camera-feeds', { params });
    return response.data;
  }

  async updateCameraFeedSettings(cameraFeedId: number, settings: Partial<CameraFeedSettings>): Promise<CameraFeedSettings> {
    const response = await api.put(`/settings/camera-feeds/${cameraFeedId}`, settings);
    return response.data;
  }

  // Helper methods for getting properties (for dropdowns)
  async getProperties(): Promise<Property[]> {
    const response = await api.get('/properties');
    return response.data;
  }

  async getCameras(): Promise<any[]> {
    const response = await api.get('/video/cameras');
    return response.data;
  }
}

export default new SettingsService();
