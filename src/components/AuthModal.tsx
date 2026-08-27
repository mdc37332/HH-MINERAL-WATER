import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendResetPassword
} from '../lib/firebase';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  Droplets,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    openAuthModal,
    authActionPrompt,
    showToast
  } = useStore();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  if (!isAuthModalOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setMobileNumber('');
    setErrorMessage('');
    setResetSuccessMessage('');
  };

  const handleSwitchTab = (tab: 'login' | 'signup' | 'forgot_password') => {
    setErrorMessage('');
    setResetSuccessMessage('');
    openAuthModal(tab, authActionPrompt);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const user = await loginWithGoogle();
      showToast('Welcome!', `Logged in successfully as ${user.displayName || user.email}.`, 'success');
      closeAuthModal();
      resetForm();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithEmail(email.trim(), password);
      showToast('Welcome back!', `Logged in as ${user.displayName || user.email}.`, 'success');
      closeAuthModal();
      resetForm();
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed attempts. Please try again later or reset your password.');
      } else {
        setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number for delivery communication.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithEmail(
        email.trim(),
        password,
        fullName.trim(),
        cleanPhone.length === 10 ? `+91 ${cleanPhone}` : mobileNumber.trim()
      );
      showToast('Account Created!', `Welcome to HH Mineral Water, ${fullName}!`, 'success');
      closeAuthModal();
      resetForm();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 6 characters.');
      } else {
        setErrorMessage(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccessMessage('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetPassword(email.trim());
      setResetSuccessMessage(`A password reset link has been dispatched to ${email.trim()}. Please check your inbox and spam folder.`);
      showToast('Reset Link Sent', 'Check your email to reset your password.', 'info');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setErrorMessage('No customer account found with this email.');
      } else {
        setErrorMessage(err.message || 'Unable to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900 via-sky-900 to-blue-900 px-6 py-5 text-white relative">
          <button
            onClick={() => {
              closeAuthModal();
              resetForm();
            }}
            className="absolute top-4 right-4 p-2 rounded-full text-cyan-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-black tracking-tight text-white">
                HH <span className="text-cyan-300">CUSTOMER PORTAL</span>
              </h3>
              <p className="text-xs text-cyan-200">
                {authModalTab === 'login' && 'Sign in to access your orders & checkout'}
                {authModalTab === 'signup' && 'Create your customer account'}
                {authModalTab === 'forgot_password' && 'Reset your account password'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Prompt notice if triggered by checkout or design upload */}
        {authActionPrompt && (
          <div className="bg-cyan-50 border-b border-cyan-100 px-6 py-3 flex items-start gap-2.5 text-xs text-cyan-900">
            <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
            <span>{authActionPrompt}</span>
          </div>
        )}

        <div className="p-6">
          {/* Main Tab Buttons */}
          {authModalTab !== 'forgot_password' && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                  authModalTab === 'login'
                    ? 'bg-white text-cyan-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('signup')}
                className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                  authModalTab === 'signup'
                    ? 'bg-white text-cyan-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Google One-Click Auth */}
          {authModalTab !== 'forgot_password' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 font-bold text-sm py-3 px-4 rounded-xl shadow-2xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
                  Or with email
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Reset Password Success Banner */}
          {resetSuccessMessage && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <p>{resetSuccessMessage}</p>
            </div>
          )}

          {/* Form: LOGIN */}
          {authModalTab === 'login' && (
            <form onSubmit={handleEmailLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSwitchTab('forgot_password')}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-800 cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-sm py-3 rounded-xl shadow-md shadow-cyan-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form: SIGN UP (Registration) */}
          {authModalTab === 'signup' && (
            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    placeholder="10-digit mobile (e.g. 9876543210)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-sm py-3 rounded-xl shadow-md shadow-cyan-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Customer Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form: FORGOT PASSWORD */}
          {authModalTab === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered email address below. We'll send you a secure link to reset your account password.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-sm py-3 rounded-xl shadow-md shadow-cyan-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Send Reset Email</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-800 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit SSL Encrypted Customer Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
