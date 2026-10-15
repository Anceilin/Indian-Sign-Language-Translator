import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('isl_token') || '');
  const [loading, setLoading] = useState(true);

  // Verify stored token on app initialization
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
          setUser(data.user);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'Login failed. Please check credentials.');
    }

    localStorage.setItem('isl_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  // Register handler
  const register = async (name, email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();

    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'Registration failed.');
    }

    localStorage.setItem('isl_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('isl_token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
