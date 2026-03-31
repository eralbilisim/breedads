import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import CampaignCreate from './pages/CampaignCreate';
import Creatives from './pages/Creatives';
import Automation from './pages/Automation';
import Competitors from './pages/Competitors';
import LandingPages from './pages/LandingPages';
import Settings from './pages/Settings';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Public Route Wrapper (redirect if already logged in)
function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  if (token && user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Login Page
function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-4 shadow-lg shadow-brand-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">BreedAds</h1>
          <p className="text-dark-400">Sign in to your account</p>
        </div>
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-3 text-danger-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark w-full"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark w-full"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <p className="text-center text-dark-400 text-sm mt-6">
            {"Don't have an account? "}
            <a href="/register" className="text-brand-400 hover:text-brand-300 transition-colors">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Register Page
function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(formData);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-4 shadow-lg shadow-brand-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">BreedAds</h1>
          <p className="text-dark-400">Create your account</p>
        </div>
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-3 text-danger-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-dark w-full"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-dark w-full"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Company</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="input-dark w-full"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-dark w-full"
                placeholder="Min 8 characters"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          <p className="text-center text-dark-400 text-sm mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Analytics page imported from ./pages/Analytics

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#f1f5f9',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9',
            },
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes with Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/new" element={<CampaignCreate />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="creatives" element={<Creatives />} />
          <Route path="automation" element={<Automation />} />
          <Route path="competitors" element={<Competitors />} />
          <Route path="landing-pages" element={<LandingPages />} />
          <Route path="landing-pages/:id" element={<LandingPages />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
