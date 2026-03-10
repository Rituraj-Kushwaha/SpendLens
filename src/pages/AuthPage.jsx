import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import SegmentedControl from '../components/SegmentedControl';
import './AuthPage.css';

export default function AuthPage() {
    const navigate = useNavigate();
    const { login, register, user, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const [mode, setMode] = useState('Login');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
    });

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    // Prevent flash of login form during silent refresh
    if (authLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</span>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'Login') {
                await login(form.email, form.password);
            } else {
                await register(form.name, form.email, form.password, form.password);
            }
            navigate('/dashboard');
        } catch (err) {
            addToast && addToast(err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    return (
        <div className="auth-page">
            {/* Left Brand Panel */}
            <div className="auth-brand">
                <div className="auth-brand__circles">
                    <div className="auth-brand__circle auth-brand__circle--amber" />
                    <div className="auth-brand__circle auth-brand__circle--blue" />
                    <div className="auth-brand__circle auth-brand__circle--green" />
                </div>
                <div className="auth-brand__content">
                    <div className="auth-brand__logo">
                        <svg viewBox="0 0 32 32" fill="none" width="40" height="40">
                            <circle cx="16" cy="16" r="14" stroke="#E8C547" strokeWidth="2.5" />
                            <circle cx="16" cy="16" r="6" stroke="#E8C547" strokeWidth="2" />
                            <line x1="22" y1="22" x2="28" y2="28" stroke="#E8C547" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        <span className="auth-brand__logo-text">SpendLens</span>
                    </div>
                    <h1 className="auth-brand__tagline">
                        Finally know where your money actually goes.
                    </h1>
                    <p className="auth-brand__desc">
                        Track bills, detect overspending, and get ahead of your finances — all in one calm dashboard.
                    </p>
                    <div className="auth-brand__pills">
                        <span className="auth-brand__pill">🔒 Secure & Private</span>
                        <span className="auth-brand__pill">📊 Real Insights</span>
                        <span className="auth-brand__pill">⚡ Instant Alerts</span>
                    </div>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="auth-form-panel">
                <div className="auth-form-container">
                    {/* Mobile logo */}
                    <div className="auth-form__mobile-logo">
                        <svg viewBox="0 0 32 32" fill="none" width="32" height="32">
                            <circle cx="16" cy="16" r="14" stroke="#E8C547" strokeWidth="2.5" />
                            <circle cx="16" cy="16" r="6" stroke="#E8C547" strokeWidth="2" />
                            <line x1="22" y1="22" x2="28" y2="28" stroke="#E8C547" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        <span>SpendLens</span>
                    </div>

                    <p className="auth-form__subtitle">
                        {mode === 'Login' ? 'Welcome back' : 'Create your account'}
                    </p>
                    <h2 className="auth-form__title">
                        {mode === 'Login' ? 'Sign in to SpendLens' : 'Join SpendLens'}
                    </h2>

                    <div className="auth-form__toggle">
                        <SegmentedControl
                            options={['Login', 'Register']}
                            value={mode}
                            onChange={setMode}
                        />
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {mode === 'Register' && (
                            <FormInput
                                label="Full Name"
                                value={form.name}
                                onChange={updateField('name')}
                            />
                        )}
                        <FormInput
                            type="email"
                            label="Email Address"
                            value={form.email}
                            onChange={updateField('email')}
                        />
                        <FormInput
                            type="password"
                            label="Password"
                            value={form.password}
                            onChange={updateField('password')}
                            showToggle
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={loading}
                        >
                            {mode === 'Login' ? 'Sign In' : 'Create Account'}
                        </Button>

                        {mode === 'Login' && (
                            <a href="#" className="auth-form__forgot">Forgot password?</a>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
