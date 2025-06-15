import api from './api';

export interface Camera {
  id: number;
  property_id: number;
  name: string;
  feed_url: string;
  location: string;
  status: string;
  property_name: string;
  property_address: string;
  active_alerts: number;
}

export interface Alert {
  id: number;
  camera_id: number;
  alert_type_id: number;
  severity: string;
  status: string;
  alert_data_json: any;
  created_at: string;
  resolved_at?: string;
  camera_name: string;
  property_name: string;
  alert_type_name: string;
  severity_level: string;
}

export interface AlertType {
  id: number;
  name: string;
  description: string;
  severity_level: string;
  auto_create_ticket: boolean;
  auto_create_checklist: boolean;
  config_json: any;
  is_active: boolean;
}

export interface ServiceTicket {
  id: number;
  property_id: number;
  alert_id?: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to?: number;
  created_at: string;
  camera_name?: string;
  property_name: string;
  alert_type_name?: string;
}

export interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  resolved_alerts: number;
  alerts_today: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

class VideoService {
  // Camera Management
  async getCameras(propertyId?: number): Promise<ApiResponse<Camera[]>> {
    const params = propertyId ? { property_id: propertyId } : {};
    const response = await api.get('/video/cameras', { params });
    return response.data;
  }

  async getCameraById(id: number): Promise<ApiResponse<Camera>> {
    const response = await api.get(`/video/cameras/${id}`);
    return response.data;
  }

  async createCamera(cameraData: Partial<Camera>): Promise<ApiResponse<Camera>> {
    const response = await api.post('/video/cameras', cameraData);
    return response.data;
  }

  async updateCamera(id: number, cameraData: Partial<Camera>): Promise<ApiResponse<Camera>> {
    const response = await api.put(`/video/cameras/${id}`, cameraData);
    return response.data;
  }

  async deleteCamera(id: number): Promise<ApiResponse<void>> {
    const response = await api.delete(`/video/cameras/${id}`);
    return response.data;
  }

  // Alert Management
  async getAlerts(filters?: {
    status?: string;
    severity?: string;
    camera_id?: number;
    property_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Alert[]>> {
    const response = await api.get('/video/alerts', { params: filters });
    return response.data;
  }

  async getAlertById(id: number): Promise<ApiResponse<Alert>> {
    const response = await api.get(`/video/alerts/${id}`);
    return response.data;
  }

  async createAlert(alertData: Partial<Alert>): Promise<ApiResponse<Alert>> {
    const response = await api.post('/video/alerts', alertData);
    return response.data;
  }

  async resolveAlert(alertId: number, notes?: string): Promise<ApiResponse<Alert>> {
    const response = await api.put(`/video/alerts/${alertId}/resolve`, { notes });
    return response.data;
  }

  // Alert Types
  async getAlertTypes(): Promise<ApiResponse<AlertType[]>> {
    const response = await api.get('/video/alert-types');
    return response.data;
  }

  async createAlertType(alertTypeData: Partial<AlertType>): Promise<ApiResponse<AlertType>> {
    const response = await api.post('/video/alert-types', alertTypeData);
    return response.data;
  }

  // Service Tickets
  async getServiceTickets(filters?: {
    status?: string;
    priority?: string;
    property_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ServiceTicket[]>> {
    const response = await api.get('/video/service-tickets', { params: filters });
    return response.data;
  }

  async createServiceTicket(ticketData: Partial<ServiceTicket>): Promise<ApiResponse<ServiceTicket>> {
    const response = await api.post('/video/service-tickets', ticketData);
    return response.data;
  }

  // Statistics
  async getStats(propertyId?: number): Promise<ApiResponse<AlertStats>> {
    const params = propertyId ? { property_id: propertyId } : {};
    const response = await api.get('/video/stats', { params });
    return response.data;
  }

  // Property-specific endpoints
  async getCamerasForProperty(propertyId: number): Promise<ApiResponse<Camera[]>> {
    const response = await api.get(`/video/property/${propertyId}/cameras`);
    return response.data;
  }

  async getAlertsForProperty(propertyId: number): Promise<ApiResponse<Alert[]>> {
    const response = await api.get(`/video/property/${propertyId}/alerts`);
    return response.data;
  }

  // Demo/Testing
  async generateDemoAlert(): Promise<ApiResponse<Alert>> {
    const response = await api.post('/video/demo/generate-alert');
    return response.data;
  }
}

export const videoService = new VideoService();
