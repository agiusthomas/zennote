import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { BookOpen, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';

export default function AuthPage({ onBypassAuth }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isSupabaseConfigured) {
        // If not configured, alert and fail gracefully
        alert('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
        setLoading(false);
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (loginError) throw loginError;
    } catch (err) {
      console.error('Error logging in:', err);
      setError(err.message || 'An error occurred during authentication');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Dynamic Background Gradients */}
      <div className="auth-bg-glow glow-1"></div>
      <div className="auth-bg-glow glow-2"></div>

      <div className="auth-card">
        {/* Logo/Branding */}
        <div className="auth-logo-section">
          <div className="auth-logo-icon">
            <BookOpen size={32} />
          </div>
          <h1 className="auth-title">ZenNote</h1>
          <p className="auth-subtitle">Your minimalist, cloud-synced inline workspace</p>
        </div>

        {/* Status / Config Warnings */}
        {!isSupabaseConfigured && (
          <div className="auth-warning-banner">
            <AlertCircle size={20} className="warning-icon" />
            <div className="warning-text">
              <strong>Supabase environment variables not found!</strong>
              <p>To run in Cloud Sync mode, please add your keys to <code>.env.local</code>.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="auth-action-section">
          <button
            className="auth-btn google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  fill="#currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  fill="#currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  fill="#currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>

          {!isSupabaseConfigured && (
            <button className="auth-btn guest-btn" onClick={onBypassAuth}>
              <span>Continue in Local Mode (Offline/Guest)</span>
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="auth-footer">
          <HelpCircle size={14} />
          <span>Google Authentication is secured by Supabase Auth</span>
        </div>
      </div>
    </div>
  );
}
