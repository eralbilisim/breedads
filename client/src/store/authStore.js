import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => {
  const token = localStorage.getItem('breedads_token');
  const storedUser = localStorage.getItem('breedads_user');
  let parsedUser = null;
  try {
    parsedUser = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    parsedUser = null;
  }

  return {
    user: parsedUser,
    token: token || null,
    loading: false,
    error: null,

    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const data = await api.post('/auth/login', { email, password });
        const user = data.user;
        const newToken = data.token;
        localStorage.setItem('breedads_token', newToken);
        localStorage.setItem('breedads_user', JSON.stringify(user));
        set({ user, token: newToken, loading: false, error: null });
        return { success: true };
      } catch (error) {
        const message = error?.error || error?.message || 'Login failed';
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    register: async (userData) => {
      set({ loading: true, error: null });
      try {
        const data = await api.post('/auth/register', userData);
        const user = data.user;
        const newToken = data.token;
        localStorage.setItem('breedads_token', newToken);
        localStorage.setItem('breedads_user', JSON.stringify(user));
        set({ user, token: newToken, loading: false, error: null });
        return { success: true };
      } catch (error) {
        const message = error?.error || error?.message || 'Registration failed';
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    logout: () => {
      localStorage.removeItem('breedads_token');
      localStorage.removeItem('breedads_user');
      set({ user: null, token: null, error: null });
    },

    updateProfile: async (profileData) => {
      set({ loading: true, error: null });
      try {
        const data = await api.put('/auth/me', profileData);
        const updatedUser = data.user || data;
        localStorage.setItem('breedads_user', JSON.stringify(updatedUser));
        set({ user: updatedUser, loading: false });
        return { success: true };
      } catch (error) {
        const message = error?.error || error?.message || 'Update failed';
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    fetchProfile: async () => {
      try {
        const data = await api.get('/auth/me');
        const user = data.user || data;
        localStorage.setItem('breedads_user', JSON.stringify(user));
        set({ user });
      } catch {
        // silently fail
      }
    },
  };
});

export default useAuthStore;
