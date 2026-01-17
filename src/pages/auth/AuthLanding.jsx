'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { login as storeLogin } from '@/utils/auth';

const CLIENT_LOGIN_ENDPOINT = 'https://qbits.quickestimate.co/api/v1/client/login';

export default function AuthLanding() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginHover, setLoginHover] = useState(false);
  const [registerHover, setRegisterHover] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Username and password are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const identifier = formData.username.trim();

      const response = await fetch(CLIENT_LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          email: identifier,
          username: identifier,
          user_id: identifier,
          password: formData.password
        })
      });

      let data = {};
      let rawText = '';
      try {
        rawText = await response.text();
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        // If parse fails, keep raw text to show meaningful info
        data = { message: rawText || 'Unexpected response from server.' };
      }

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          data?.errors?.[0] ||
          rawText ||
          'Login failed. Please check your credentials.';
        setError(message);
        setIsLoading(false);
        return;
      }

      const token =
        data?.token ||
        data?.access_token ||
        data?.data?.token ||
        data?.data?.access_token;

      const clientPayload = data?.client || data?.data?.client;
      const roleFromClient = clientPayload?.user_flag ? 'client' : 'user';
      const role = data?.role || data?.data?.role || roleFromClient || 'client';

      if (!token) {
        setError('Login failed: no token returned.');
        setIsLoading(false);
        return;
      }

      // Persist token and role; store client payload if present for later use
      storeLogin(identifier, token, role, false);
      if (typeof window !== 'undefined' && clientPayload) {
        localStorage.setItem('clientProfile', JSON.stringify(clientPayload));
      }

      router.push('/station-list');
    } catch (err) {
      const fallback = err?.message || 'An error occurred. Please try again.';
      setError(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => router.push('/register');

  return (
    <div className="container min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="row w-100 justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 col-xl-5">
          <div className="text-center mb-4">
            <Image
              src="/Qbits.svg"
              alt="Qbits Portal"
              width={220}
              height={130}
              priority
            />
          </div>

          <div className="card shadow-sm">
            <div className="card-body p-4 p-md-5">
              <h1 className="h4 fw-bold mb-2 text-center">Welcome to Qbits Portal</h1>
              <p className="text-muted mb-4 text-center">Login or create your account</p>

              <form onSubmit={handleLogin} className="d-grid gap-3">
                <div className="text-start">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    className="form-control"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="text-start">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className="form-control"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={isLoading}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger mb-0" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-lg text-white"
                  style={{
                    backgroundColor: loginHover ? '#1dbb7d' : '#159F6C',
                    borderColor: loginHover ? '#1dbb7d' : '#159F6C'
                  }}
                  onMouseEnter={() => setLoginHover(true)}
                  onMouseLeave={() => setLoginHover(false)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Login'}
                </button>
                <button
                  type="button"
                  className="btn btn-lg"
                  style={{
                    color: '#159F6C',
                    backgroundColor: registerHover ? '#e6f7f0' : '#ffffff',
                    borderColor: '#159F6C'
                  }}
                  onMouseEnter={() => setRegisterHover(true)}
                  onMouseLeave={() => setRegisterHover(false)}
                  onClick={handleRegister}
                  disabled={isLoading}
                >
                  Register
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
