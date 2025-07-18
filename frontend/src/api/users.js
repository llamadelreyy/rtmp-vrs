// client/src/api/users.js
import api from './auth';
import { toast } from 'react-toastify';

// Get all users (admin only)
export const getUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch users';
    toast.error(message);
    throw new Error(message);
  }
};

// Get a specific user
export const getUser = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch user';
    toast.error(message);
    throw new Error(message);
  }
};

// Create a new user (admin only)
export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    toast.success('User created successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to create user';
    toast.error(message);
    throw new Error(message);
  }
};

// Update a user
export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`/users/${id}`, userData);
    toast.success('User updated successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to update user';
    toast.error(message);
    throw new Error(message);
  }
};

// Delete a user (admin only)
export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    toast.success('User deleted successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to delete user';
    toast.error(message);
    throw new Error(message);
  }
};

// Update current user profile
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/users/profile', profileData);
    toast.success('Profile updated successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to update profile';
    toast.error(message);
    throw new Error(message);
  }
};

// Change password
export const changePassword = async (passwordData) => {
  try {
    const response = await api.put('/users/password', passwordData);
    toast.success('Password changed successfully');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to change password';
    toast.error(message);
    throw new Error(message);
  }
};