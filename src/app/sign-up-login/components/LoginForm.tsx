'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Copy, Check, LogIn, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { login, getMe, setTokens } from '@/lib/api';

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

const DEMO_CREDENTIALS = [
  {
    id: 'cred-ops-manager',
    role: 'Operations Manager',
    email: 'seth.owusu@cestos.io',
    password: 'CestosOps2026!',
    description: 'Full platform access',
  },
  {
    id: 'cred-storekeeper',
    role: 'Storekeeper',
    email: 'amara.diallo@cestos.io',
    password: 'StoreKpr2026!',
    description: 'Inventory & stores only',
  },
  {
    id: 'cred-hr-admin',
    role: 'HR Administrator',
    email: 'linda.mensah@cestos.io',
    password: 'HRAdmin2026!',
    description: 'Workforce & HR modules',
  },
];

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', remember: false },
  });

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleUseCredential = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    setLoginError('');
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setLoginError('');

    try {
      const tokens = await login({ email: data.email, password: data.password });
      setTokens(tokens.access_token, tokens.refresh_token);
      // Load user profile
      try { await getMe(); } catch { /* non-blocking */ }
      router.push('/');
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        setLoginError('Invalid email or password. Please check your credentials and try again.');
      } else if (status === 422) {
        setLoginError('Please enter a valid email address and password.');
      } else {
        // Fallback: allow demo credentials if backend is unreachable
        const validCreds = DEMO_CREDENTIALS.find(
          c => c.email === data.email && c.password === data.password
        );
        if (validCreds) {
          router.push('/');
        } else {
          setLoginError('Unable to connect to the server. Please check your network and try again.');
        }
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-background overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <AppLogo size={32} />
          <span className="font-700 text-lg text-foreground">Cestos Operations</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-700 text-foreground" style={{ letterSpacing: '-0.01em' }}>
            Sign in to your account
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Enter your credentials to access the operations platform.
          </p>
        </div>

        {/* Error banner */}
        {loginError && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded p-3.5 fade-in">
            <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-400">{loginError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="login-email">
              Work Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@cestos.io"
              className="input-field"
              {...register('email', {
                required: 'Email address is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
              })}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600 font-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-600 text-foreground" htmlFor="login-password">
                Password
              </label>
              <button type="button" className="text-xs text-primary hover:underline font-500">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                className="input-field pr-10"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600 font-400">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="login-remember"
              type="checkbox"
              className="w-4 h-4 accent-primary rounded"
              {...register('remember')}
            />
            <label htmlFor="login-remember" className="text-sm text-muted-foreground cursor-pointer">
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full justify-center py-2.5 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-border" />
            <span className="text-2xs font-600 text-muted-foreground uppercase tracking-wider">Demo Accounts</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-3 bg-muted border-b border-border">
              <div className="px-3 py-2 text-2xs font-600 uppercase tracking-wider text-muted-foreground">Role</div>
              <div className="px-3 py-2 text-2xs font-600 uppercase tracking-wider text-muted-foreground">Email</div>
              <div className="px-3 py-2 text-2xs font-600 uppercase tracking-wider text-muted-foreground text-right">Action</div>
            </div>
            {DEMO_CREDENTIALS.map(cred => (
              <div
                key={cred.id}
                className="grid grid-cols-3 items-center border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors px-3 py-2.5"
              >
                <div>
                  <p className="text-xs font-600 text-foreground">{cred.role}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">{cred.description}</p>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-2xs text-foreground truncate">{cred.email.split('@')[0]}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(cred.email, `email-${cred.id}`)}
                    className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                    aria-label="Copy email"
                  >
                    {copiedField === `email-${cred.id}` ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleUseCredential(cred.email, cred.password)}
                    className="text-2xs font-600 text-primary hover:text-primary/80 border border-primary/30 rounded px-2 py-1 hover:bg-secondary transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-2xs text-muted-foreground mt-2 text-center">
            Click &ldquo;Use&rdquo; to autofill credentials, then Sign In.
          </p>
        </div>
      </div>
    </div>
  );
}