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
import '../styles/LoginPage.css';

const initialRegisterForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  nid: '',
  role: 'driver',
};

export default function LoginPage({ onBack }) {
  const { login, register } = useStore();

  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState(initialRegisterForm);

  const clearMessages = () => {
    setError('');
    setSuccess('');
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
  };

  const updateRegisterField = (field, value) => {
    setRegisterForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    clearMessages();

    const email = loginForm.email.trim();
    const password = loginForm.password.trim();

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Login failed.');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    clearMessages();

    const payload = {
      name: registerForm.name.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password.trim(),
      phone: registerForm.phone.trim(),
      nid: registerForm.nid.trim(),
      role: registerForm.role,
    };

    if (!payload.name || !payload.email || !payload.password || !payload.phone || !payload.nid) {
      setError('Please fill in all fields.');
      return;
    }

    if (payload.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!/^\d{11}$/.test(payload.phone)) {
      setError('Phone number must be 11 digits.');
      return;
    }

    setLoading(true);
    const result = await register(payload);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Registration failed.');
      return;
    }

    setSuccess('Registration successful! Please login.');
    setMode('login');

    setLoginForm({
      email: payload.email,
      password: '',
    });

    setRegisterForm(initialRegisterForm);
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
                <form onSubmit={handleLogin} className="login-form space-y-4">
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                      />
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
                        value={loginForm.password}
                        onChange={(event) => updateLoginField('password', event.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
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
                <form onSubmit={handleRegister} className="login-form space-y-4">
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                      />
                    </div>
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                      />
                    </div>
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
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                        />
                      </div>
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
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                        />
                      </div>
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
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
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
                  </div>

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