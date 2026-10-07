import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import AuthShell from './AuthShell';

const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login({ email: email.trim(), password });
      login(response.token, response.user);
      toast.success(`Bienvenido, ${response.user.firstName}!`);
      navigate('/');
    } catch {
      toast.error('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Iniciar Sesión" subtitle="Ingresa a tu cuenta para comprar y ver tus pedidos.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">Contraseña</label>
          <input id="password" type="password" required autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6">
        ¿No tienes cuenta? <Link to="/register" className="text-blue-700 font-semibold hover:underline">Regístrate</Link>
      </p>
    </AuthShell>
  );
}
