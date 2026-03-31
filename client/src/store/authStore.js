import { create } from 'zustand';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

const useAuthStore = create((set, get) => {
  const token = localStorage.getItem('breedads_token');
  const storedUser = localStorage.getItem('breedads_user');
  let parsedUser = null;
  try {
    parsedUser = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    parsedUser = null;
  }

  api.interceptors.request.use((config) => {
    const currentToken = get().token;
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        get().logout();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return {
    user: parsedUser,
    token: token || null,
    loading: false,
    error: null,

    get isAuthenticated() {
      return !!this.token && !!this.user;
    },

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const { data } = await api.post('/auth/login', { email, password });
        const { token: newToken, user } = data.data || data;
        localStorage.setItem('breedads_token', newToken);
        localStorage.setItem('breedads_user', JSON.stringify(user));
        set({ user, token: newToken, loading: false, error: null });
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.message || 'Login failed';
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    register: async (userData) => {
      set({ loading: true, error: null });
      try {
        const { data } = await api.post('/auth/register', userData);
        const { token: newToken, user } = data.data || data;
        localStorage.setItem('breedads_token', newToken);
        localStorage.setItem('breedads_user', JSON.stringify(user));
        set({ user, token: newToken, loading: false, error: null });
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.message || 'Registration failed';
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
        const { data } = await api.put('/auth/profile', profileData);
        const updatedUser = data.data || data;
        localStorage.setItem('breedads_user', JSON.stringify(updatedUser));
        set({ user: updatedUser, loading: false });
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.message || 'Update failed';
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    fetchProfile: async () => {
      try {
        const { data } = await api.get('/auth/me');
        const user = data.data || data;
        localStorage.setItem('breedads_user', JSON.stringify(user));
        set({ user });
      } catch {
        // silently fail, interceptor handles 401
      }
    },
  };
});

export default useAuthStore;
