import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  roles: string[];
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roles: string[];
}

export interface UpdateUserData {
  name: string;
  email: string;
  status: 'active' | 'inactive';
  roles: string[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

class UserService {
  async getUsers() {
    const response = await api.get('/users');
    return response.data;
  }

  async getUser(id: number) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  async createUser(data: CreateUserData) {
    const response = await api.post('/users', data);
    return response.data;
  }

  async updateUser(id: number, data: UpdateUserData) {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: number) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }

  async resetPassword(id: number, password: string) {
    const response = await api.post(`/users/${id}/reset-password`, { password });
    return response.data;
  }

  async getRoles() {
    const response = await api.get('/users/roles/list');
    return response.data;
  }
}

export const userService = new UserService();