import { useState } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  CreditCard,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import useStore from '../store/useStore';
import { API_BASE_URL, tokenStorage } from '../lib/api';
import '../styles/LoginPage.css';

const initialRegisterForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  nid: '',
  role: 'driver',
};

const initialFieldErrors = {
  loginEmail: '',
  loginPassword: '',
  name: '',
  email: '',
  phone: '',
  nid: '',
  password: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^01\d{9}$/;

const getInputClass = (hasError = false) => {
  return `w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81] ${hasError ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
    }`;
};

const getPasswordInputClass = (hasError = false) => {
  return `w-full pl-10 pr-12 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81] ${hasError ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
    }`;
};

const getRegisterFailureMessage = (result) => {
  const message = String(result?.message || '').trim();

  if (!message) {
    return '';
  }

  const lowerMessage = message.toLowerCase();

  const failedKeywords = [
    'not found',
    'does not match',
    'did not match',
    'invalid',
    'failed',
    'forbidden',
    'not allowed',
    'already registered',
    'already exists',
    'required',
    'brta',
  ];

  const isFailureMessage = failedKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  return isFailureMessage ? message : '';
};

export default function LoginPage({ onBack }) {
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);

  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState(initialRegisterForm);

  const clearMessages = () => {
    setError('');
    setSuccess('');
    setFieldErrors(initialFieldErrors);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    clearMessages();
  };

  const handleBackHome = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }

    window.location.href = '/';
  };

  const updateLoginField = (field, value) => {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }));

    const errorKey = field === 'email' ? 'loginEmail' : 'loginPassword';

    setFieldErrors((current) => ({
      ...current,
      [errorKey]: '',
    }));

    setError('');
  };

  const updateRegisterField = (field, value) => {
    setRegisterForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }));

    setError('');
  };

  const validateLoginForm = () => {
    const nextErrors = { ...initialFieldErrors };
    const email = loginForm.email.trim();
    const password = loginForm.password.trim();

    if (!email) {
      nextErrors.loginEmail = 'Email address is required.';
    } else if (!emailPattern.test(email)) {
      nextErrors.loginEmail = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.loginPassword = 'Password is required.';
    }

    setFieldErrors(nextErrors);

    return !nextErrors.loginEmail && !nextErrors.loginPassword;
  };

  const validateRegisterForm = (payload) => {
    const nextErrors = { ...initialFieldErrors };

    if (!payload.name) {
      nextErrors.name = 'Full name is required.';
    }

    if (!payload.email) {
      nextErrors.email = 'Email address is required.';
    } else if (!emailPattern.test(payload.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!payload.phone) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!phonePattern.test(payload.phone)) {
      nextErrors.phone = 'Phone number must be 11 digits and start with 01.';
    }

    if (!payload.nid) {
      nextErrors.nid = 'NID number is required.';
    }

    if (!payload.password) {
      nextErrors.password = 'Password is required.';
    } else if (payload.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setFieldErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };


  const submitAuthRequest = async (endpoint, payload) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        data?.errors?.[0]?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  if (data?.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data?.data || data;
};



  const handleLogin = async (event) => {
  event.preventDefault();
  event.stopPropagation();

  setError('');
  setSuccess('');

  if (!validateLoginForm()) {
    setError('Please fix the highlighted fields and try again.');
    return;
  }

  const payload = {
    email: loginForm.email.trim(),
    password: loginForm.password.trim(),
  };

  try {
    setLoading(true);

    const data = await submitAuthRequest('/auth/login', payload);

    if (!data?.token || !data?.user) {
      throw new Error('Invalid email or password.');
    }

    tokenStorage.setToken(data.token);
    tokenStorage.setUser(data.user);
    setCurrentUser(data.user);

    try {
      await fetchDashboardData();
    } catch {
      // Dashboard data fail korleo login success thakbe
    }
  } catch (error) {
    setError(error?.message || 'Invalid email or password.');
  } finally {
    setLoading(false);
  }
};

  const handleRegister = async (event) => {
  event.preventDefault();
  event.stopPropagation();

  setError('');
  setSuccess('');

  const payload = {
    name: registerForm.name.trim(),
    email: registerForm.email.trim(),
    password: registerForm.password.trim(),
    phone: registerForm.phone.trim(),
    nid: registerForm.nid.trim(),
    role: registerForm.role,
  };

  if (!validateRegisterForm(payload)) {
    setError('Please fix the highlighted fields and try again.');
    return;
  }

  try {
    setLoading(true);

    await submitAuthRequest('/auth/register', payload);

    setSuccess('Registration successful! Please login.');
    setMode('login');

    setLoginForm({
      email: payload.email,
      password: '',
    });

    setRegisterForm(initialRegisterForm);
    setFieldErrors(initialFieldErrors);
  } catch (error) {
    setError(
      error?.message ||
        'BRTA information did not match. Please check your name, phone, and NID.'
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="login-wrapper min-h-screen bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f4c81]">
      <header className="login-brand-bar">
        <div className="login-brand-inner">
          <button
            type="button"
            onClick={handleBackHome}
            className="login-brand-left"
            aria-label="Back to landing page"
          >
            <div className="login-brand-icon">
              <Shield size={24} className="text-white" />
            </div>

            <div className="login-brand-text text-left">
              <h1 className="text-2xl font-black text-white tracking-tight">STVES</h1>
              <p className="text-xs font-medium text-blue-100">
                Smart Traffic Verification & Enforcement System
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleBackHome}
            className="login-home-button"
          >
            <ArrowLeft size={16} />
            Home
          </button>
        </div>
      </header>

      <main className="login-main">
        <section className="login-panel w-full max-w-md" aria-label="STVES authentication">
          <div className="login-auth-card bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="login-tab-wrapper flex border-b border-gray-100">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`login-tab-button flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'login'
                  ? 'text-[#0f4c81] border-b-2 border-[#0f4c81] bg-blue-50/50'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`login-tab-button flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'register'
                  ? 'text-[#0f4c81] border-b-2 border-[#0f4c81] bg-blue-50/50'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                Register
              </button>
            </div>

            <div className="login-form-area p-6">
              {error && (
                <div className="login-alert login-alert-error mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-fade-in">
                  {error}
                </div>
              )}

              {success && (
                <div className="login-alert login-alert-success mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 animate-fade-in">
                  {success}
                </div>
              )}

              {mode === 'login' ? (
                <form
                  onSubmit={handleLogin}
                  className="login-form space-y-4"
                  noValidate
                >
                  <div className="login-field-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>

                    <div className="login-input-wrap relative">
                      <Mail
                        size={18}
                        className="login-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(event) => updateLoginField('email', event.target.value)}
                        placeholder="Enter your email"
                        autoComplete="email"
                        className={getInputClass(Boolean(fieldErrors.loginEmail))}
                      />
                    </div>

                    {fieldErrors.loginEmail && (
                      <p className="login-field-error">{fieldErrors.loginEmail}</p>
                    )}
                  </div>

                  <div className="login-field-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Password
                    </label>

                    <div className="login-input-wrap relative">
                      <Lock
                        size={18}
                        className="login-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(event) => updateLoginField('password', event.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className={getPasswordInputClass(Boolean(fieldErrors.loginPassword))}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="login-password-toggle absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {fieldErrors.loginPassword && (
                      <p className="login-field-error">{fieldErrors.loginPassword}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-button w-full py-3 bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? 'Signing in...' : 'Sign In to STVES'}
                    <ChevronRight size={18} />
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleRegister}
                  className="login-form space-y-4"
                  noValidate
                >
                  <div className="login-field-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Register As
                    </label>

                    <div className="login-role-grid grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateRegisterField('role', 'driver')}
                        className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${registerForm.role === 'driver'
                          ? 'border-[#0f4c81] bg-blue-50 text-[#0f4c81]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        🚗 Driver
                      </button>

                      <button
                        type="button"
                        onClick={() => updateRegisterField('role', 'owner')}
                        className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${registerForm.role === 'owner'
                          ? 'border-[#0f4c81] bg-blue-50 text-[#0f4c81]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        🔑 Vehicle Owner
                      </button>
                    </div>
                  </div>

                  <div className="login-field-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>

                    <div className="login-input-wrap relative">
                      <User
                        size={18}
                        className="login-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="text"
                        value={registerForm.name}
                        onChange={(event) => updateRegisterField('name', event.target.value)}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        className={getInputClass(Boolean(fieldErrors.name))}
                      />
                    </div>

                    {fieldErrors.name && (
                      <p className="login-field-error">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div className="login-field-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>

                    <div className="login-input-wrap relative">
                      <Mail
                        size={18}
                        className="login-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(event) => updateRegisterField('email', event.target.value)}
                        placeholder="Enter your email"
                        autoComplete="email"
                        className={getInputClass(Boolean(fieldErrors.email))}
                      />
                    </div>

                    {fieldErrors.email && (
                      <p className="login-field-error">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="login-register-grid grid grid-cols-2 gap-3">
                    <div className="login-field-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone
                      </label>

                      <div className="login-input-wrap relative">
                        <Phone
                          size={18}
                          className="login-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          value={registerForm.phone}
                          onChange={(event) => updateRegisterField('phone', event.target.value)}
                          placeholder="01XXXXXXXXX"
                          autoComplete="tel"
                          className={getInputClass(Boolean(fieldErrors.phone))}
                        />
                      </div>

                      {fieldErrors.phone && (
                        <p className="login-field-error">{fieldErrors.phone}</p>
                      )}
                    </div>

                    <div className="login-field-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        NID Number
                      </label>

                      <div className="login-input-wrap relative">
                        <CreditCard
                          size={18}
                          className="login-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          value={registerForm.nid}
                          onChange={(event) => updateRegisterField('nid', event.target.value)}
                          placeholder="NID Number"
                          className={getInputClass(Boolean(fieldErrors.nid))}
                        />
                      </div>

                      {fieldErrors.nid && (
                        <p className="login-field-error">{fieldErrors.nid}</p>
                      )}
                    </div>
                  </div>

                  <div className="login-field-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Password
                    </label>

                    <div className="login-input-wrap relative">
                      <Lock
                        size={18}
                        className="login-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={registerForm.password}
                        onChange={(event) => updateRegisterField('password', event.target.value)}
                        placeholder="Minimum 6 characters"
                        autoComplete="new-password"
                        className={getPasswordInputClass(Boolean(fieldErrors.password))}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="login-password-toggle absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {fieldErrors.password && (
                      <p className="login-field-error">{fieldErrors.password}</p>
                    )}
                  </div>

                  <p className="login-brta-note rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                    Driver/Owner account will be created only when your name, phone, and NID match the BRTA mock database.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-button w-full py-3 bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                    <ChevronRight size={18} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <p className="text-xs text-white/50">
          © 2025 STVES — Smart Traffic Verification & Enforcement System
        </p>
        <p className="text-[10px] text-white/35 mt-1">
          CSE 436 Final Year Project | Metropolitan University, Sylhet
        </p>
      </footer>
    </div>
  );
}