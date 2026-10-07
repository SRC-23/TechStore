import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage, isStrongPassword, passwordRules } from '../../utils/format';
import Icon from '../../components/ui/Icon';
import AuthShell from './AuthShell';

const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none';

type FormFields = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (field: FormFields) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!isStrongPassword(form.password)) {
      toast.error('La contraseña debe incluir al menos una mayúscula y un número');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({ ...form, email: form.email.trim() });
      login(response.token, response.user);
      toast.success('Cuenta creada exitosamente!');
      navigate('/');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al registrar. El email puede estar en uso.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Crear Cuenta" subtitle="Regístrate gratis y empieza a comprar en minutos.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1.5">Nombre</label>
            <input id="firstName" required value={form.firstName} onChange={set('firstName')} className={inputClass} autoComplete="given-name" />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1.5">Apellido</label>
            <input id="lastName" required value={form.lastName} onChange={set('lastName')} className={inputClass} autoComplete="family-name" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
          <input id="email" type="email" required value={form.email} onChange={set('email')} placeholder="tu@email.com"
            className={inputClass} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">Contraseña</label>
          <input id="password" type="password" required value={form.password} onChange={set('password')}
            placeholder="Mínimo 8 caracteres" className={inputClass} autoComplete="new-password" />
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs">
            {passwordRules.map(rule => {
              const ok = rule.test(form.password);
              return (
                <li key={rule.label} className={`flex items-center gap-1 ${ok ? 'text-emerald-700' : 'text-gray-500'}`}>
                  <Icon name={ok ? 'check' : 'x'} className="w-3.5 h-3.5" /> {rule.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">Confirmar Contraseña</label>
          <input id="confirmPassword" type="password" required value={form.confirmPassword} onChange={set('confirmPassword')}
            className={inputClass} autoComplete="new-password" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6">
        ¿Ya tienes cuenta? <Link to="/login" className="text-blue-700 font-semibold hover:underline">Inicia sesión</Link>
      </p>
    </AuthShell>
  );
}
