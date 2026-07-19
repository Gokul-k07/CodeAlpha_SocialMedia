import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', username: '', fullname: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login({ identifier: form.email, password: form.password });
        addToast('Welcome back to NovaSocial', 'success');
      } else {
        await register(form);
        addToast('Account created successfully', 'success');
      }
      navigate('/');
    } catch (error) {
      addToast(error.response?.data?.message || 'Something went wrong', 'error');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="brand">NovaSocial</div>
          <h1>Share moments. Build connections.</h1>
          <p>A polished social platform for creators, founders, and communities.</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="switch-row">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
          </div>
          {mode === 'signup' && (
            <>
              <input value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} placeholder="Full name" />
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username" />
            </>
          )}
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email or username" />
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
          <button className="primary-btn" type="submit">{mode === 'login' ? 'Continue' : 'Create account'}</button>
        </form>
      </div>
    </div>
  );
}
