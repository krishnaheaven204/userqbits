'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { login as storeLogin } from '@/utils/auth';

const CLIENT_LOGIN_ENDPOINT = 'https://qbits.quickestimate.co/api/v1/client/login';

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.82 21.82 0 0 1 5.06-6.94" />
    <path d="M9.88 9.88a3 3 0 1 1 4.24 4.24" />
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a10.94 10.94 0 0 1-4.06 5.94" />
    <path d="M1 1l22 22" />
  </svg>
);

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

      const clientPayload = data?.client || data?.data?.client || data?.user || data?.data?.user;
      const rawUserFlag =
        clientPayload?.user_flag ??
        data?.user_flag ??
        data?.data?.user_flag ??
        data?.user?.user_flag ??
        data?.data?.user?.user_flag;
      const userFlag = Number(rawUserFlag);
      const roleLabel = userFlag === 1 ? 'Dealer' : 'User';
      const role = data?.role || data?.data?.role || roleLabel;

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
    <div className="auth-shell">
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

            <div className="card shadow-sm auth-card">
              <div className="card-body p-4 p-md-5">
                <h1 className="h4 fw-bold mb-2 text-center">Welcome to Qbits Portal</h1>
                <p className="text-muted mb-4 text-center">Login or create your account</p>

                <form onSubmit={handleLogin} className="d-grid gap-3">
                  <div className="text-start">
                    <label
                      className="form-label"
                      style={{ fontSize: '14px', fontWeight: 600 }}
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      className="form-control auth-input"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={isLoading}
                      style={{ fontSize: '14px', fontWeight: 400 }}
                    />
                  </div>

                  <div className="text-start">
                    <label
                      className="form-label"
                      style={{ fontSize: '14px', fontWeight: 600 }}
                    >
                      Password
                    </label>
                    <div className="input-group password-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="form-control auth-input"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={isLoading}
                        style={{ fontSize: '14px', fontWeight: 400 }}
                      />
                      <button
                        type="button"
                        className="btn toggle-btn"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={isLoading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        <span className="visually-hidden">
                          {showPassword ? 'Hide password' : 'Show password'}
                        </span>
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
                    className="btn btn-lg text-white auth-primary"
                    style={{
                      backgroundColor: loginHover ? '#1dbb7d' : '#159F6C',
                      borderColor: loginHover ? '#1dbb7d' : '#159F6C',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '24px'
                    }}
                    onMouseEnter={() => setLoginHover(true)}
                    onMouseLeave={() => setLoginHover(false)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Login'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-lg auth-secondary"
                    style={{
                      color: '#159F6C',
                      backgroundColor: registerHover ? '#e6f7f0' : '#ffffff',
                      borderColor: '#159F6C',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '24px'
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

      <style jsx>{`
        .auth-shell {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 20%, rgba(21, 159, 108, 0.06), transparent 34%),
            radial-gradient(circle at 80% 0%, rgba(100, 116, 139, 0.05), transparent 28%),
            #f7f9fb;
        }

        .auth-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          background: #ffffff;
        }

        .auth-input {
          background-color: #f8fafc;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px 14px;
          transition: all 0.2s ease;
        }

        .auth-input:focus {
          background-color: #ffffff;
          border-color: #159f6c;
          box-shadow: 0 0 0 3px rgba(21, 159, 108, 0.12);
        }

        .auth-input:disabled {
          background-color: #f1f5f9;
        }

        .auth-input::placeholder {
          color: #9ca3af;
        }

        .password-group .auth-input {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }

        .toggle-btn {
          border: 1.5px solid #e5e7eb;
          border-left: 0;
          background: #f8fafc;
          color: #475569;
          border-top-right-radius: 10px;
          border-bottom-right-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
        }

        .toggle-btn:hover:not(:disabled) {
          background: #eef2f7;
          color: #0f172a;
        }

        .toggle-btn:focus {
          box-shadow: 0 0 0 3px rgba(21, 159, 108, 0.12);
        }

        .toggle-btn svg {
          stroke: currentColor;
        }

        .auth-primary {
          background: linear-gradient(135deg, #159f6c 0%, #0e8f61 100%);
          border: 1px solid #159f6c;
          border-radius: 12px;
          font-weight: 600;
        }

        .auth-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #12875b 0%, #0c7a52 100%);
        }

        .auth-primary:disabled {
          opacity: 0.7;
        }

        .auth-secondary {
          border-radius: 12px;
          border: 1.5px solid #159f6c;
          color: #159f6c;
          font-weight: 600;
        }

        .auth-secondary:hover:not(:disabled) {
          background: #e6f7f0;
        }

        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}
