'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';

type State = { error?: string } | undefined;

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(loginAction, undefined);

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <p className="admin-login-title">HighWise Admin</p>
        <p className="admin-login-sub">Sign in to manage the dataset and configuration.</p>

        {state?.error && (
          <div className="alert alert-error">{state.error}</div>
        )}

        <form action={formAction} className="admin-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
