import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { usersApi } from '../../api/usersApi';
import { useAuth } from '../../context/AuthContext';
import { Profile, SaveAddressInput, SavedAddress } from '../../types';
import { apiErrorMessage, formatDate, isStrongPassword, passwordRules, PROVINCIAS } from '../../utils/format';
import Icon from '../../components/ui/Icon';

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500';
const emptyAddress: SaveAddressInput = { label: '', street: '', city: '', state: '', zipCode: '', country: 'Costa Rica', isDefault: false };

type Tab = 'datos' | 'direcciones' | 'seguridad';

/** Mi perfil: datos personales, libreta de direcciones y contraseña (HU-03). */
export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [tab, setTab] = useState<Tab>('datos');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);
  const [addressForm, setAddressForm] = useState<SaveAddressInput>(emptyAddress);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([usersApi.getProfile(), usersApi.getAddresses()])
      .then(([p, a]) => {
        setProfile(p);
        setForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? '' });
        setAddresses(a);
      })
      .catch(() => toast.error('Error cargando el perfil'));
  }, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({ firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined });
      setProfile(updated);
      updateUser({ firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone ?? undefined });
      toast.success('Perfil actualizado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo actualizar el perfil'));
    } finally {
      setSaving(false);
    }
  };

  const openAddress = (a: SavedAddress | 'new') => {
    setEditing(a);
    setAddressForm(a === 'new'
      ? { ...emptyAddress, isDefault: addresses.length === 0 }
      : { label: a.label ?? '', street: a.street, city: a.city, state: a.state, zipCode: a.zipCode, country: a.country, isDefault: a.isDefault });
  };

  const saveAddress = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') await usersApi.addAddress(addressForm);
      else if (editing) await usersApi.updateAddress(editing.id, addressForm);
      setAddresses(await usersApi.getAddresses());
      setEditing(null);
      toast.success('Dirección guardada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo guardar la dirección'));
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (a: SavedAddress) => {
    if (!window.confirm('¿Eliminar esta dirección?')) return;
    try {
      await usersApi.deleteAddress(a.id);
      setAddresses(await usersApi.getAddresses());
      toast.success('Dirección eliminada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo eliminar la dirección'));
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!isStrongPassword(passwords.next)) {
      toast.error('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSaving(true);
    try {
      await usersApi.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Contraseña actualizada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo cambiar la contraseña'));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="h-96 bg-white rounded-2xl border animate-pulse" />;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'datos', label: 'Datos personales', icon: 'user' },
    { id: 'direcciones', label: 'Direcciones', icon: 'pin' },
    { id: 'seguridad', label: 'Seguridad', icon: 'lock' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <span className="w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold flex items-center justify-center">
          {profile.firstName[0]}{profile.lastName[0]}
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi perfil</h1>
          <p className="text-gray-500">{profile.email} · Cliente desde {formatDate(profile.createdAt)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
        <nav className="bg-white rounded-2xl border border-gray-200 p-2 flex md:flex-col gap-1 overflow-x-auto" aria-label="Secciones del perfil">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap ${tab === t.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon name={t.icon} className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {tab === 'datos' && (
            <form onSubmit={saveProfile} className="space-y-4 max-w-xl">
              <h2 className="text-lg font-bold">Datos personales</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-1.5">Nombre</label>
                  <input id="firstName" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-1.5">Apellido</label>
                  <input id="lastName" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
                <input id="email" value={profile.email} disabled readOnly className={inputClass} />
                <p className="text-xs text-gray-500 mt-1">El email es tu identificador y no se puede cambiar.</p>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1.5">Teléfono</label>
                <input id="phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="8888-0000" className={inputClass} />
              </div>
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                Guardar
              </button>
            </form>
          )}

          {tab === 'direcciones' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Mis direcciones</h2>
                {!editing && (
                  <button onClick={() => openAddress('new')} className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
                    <Icon name="plus" className="w-4 h-4" /> Agregar dirección
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={saveAddress} className="space-y-3 max-w-xl">
                  <input placeholder="Nombre (ej. Casa, Oficina)" value={addressForm.label ?? ''} onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))}
                    className={inputClass} aria-label="Nombre de la dirección" />
                  <input required placeholder="Dirección exacta (calle, número, otras señas)" value={addressForm.street}
                    onChange={e => setAddressForm(f => ({ ...f, street: e.target.value }))} className={inputClass} aria-label="Dirección exacta" />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <select required value={addressForm.state} onChange={e => setAddressForm(f => ({ ...f, state: e.target.value }))} className={inputClass} aria-label="Provincia">
                      <option value="">Provincia</option>
                      {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input required placeholder="Cantón" value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} className={inputClass} aria-label="Cantón" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input required placeholder="Código postal" value={addressForm.zipCode} onChange={e => setAddressForm(f => ({ ...f, zipCode: e.target.value }))} className={inputClass} aria-label="Código postal" />
                    <input placeholder="País" value={addressForm.country} onChange={e => setAddressForm(f => ({ ...f, country: e.target.value }))} className={inputClass} aria-label="País" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="accent-blue-600" checked={addressForm.isDefault} onChange={e => setAddressForm(f => ({ ...f, isDefault: e.target.checked }))} />
                    Usar como dirección principal
                  </label>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">Guardar</button>
                    <button type="button" onClick={() => setEditing(null)} className="px-6 py-2.5 rounded-xl border border-gray-300 font-medium hover:bg-gray-50">Cancelar</button>
                  </div>
                </form>
              ) : addresses.length === 0 ? (
                <p className="text-gray-500 text-sm py-10 text-center">Aún no tienes direcciones guardadas.</p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-4">
                  {addresses.map(a => (
                    <li key={a.id} className={`p-4 rounded-xl border-2 ${a.isDefault ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'}`}>
                      <p className="font-semibold flex items-center gap-2">
                        {a.label || 'Dirección'}
                        {a.isDefault && <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Principal</span>}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{a.street}</p>
                      <p className="text-sm text-gray-600">{a.city}, {a.state} {a.zipCode}</p>
                      <p className="text-sm text-gray-600">{a.country}</p>
                      <div className="flex gap-4 mt-3 text-sm">
                        <button onClick={() => openAddress(a)} className="text-blue-700 hover:underline inline-flex items-center gap-1"><Icon name="edit" className="w-4 h-4" /> Editar</button>
                        <button onClick={() => deleteAddress(a)} className="text-rose-600 hover:underline inline-flex items-center gap-1"><Icon name="trash" className="w-4 h-4" /> Eliminar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'seguridad' && (
            <form onSubmit={changePassword} className="space-y-4 max-w-md">
              <h2 className="text-lg font-bold">Cambiar contraseña</h2>
              <div>
                <label htmlFor="current" className="block text-sm font-medium mb-1.5">Contraseña actual</label>
                <input id="current" type="password" required value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} className={inputClass} autoComplete="current-password" />
              </div>
              <div>
                <label htmlFor="next" className="block text-sm font-medium mb-1.5">Nueva contraseña</label>
                <input id="next" type="password" required value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} className={inputClass} autoComplete="new-password" />
                <ul className="mt-2 space-y-0.5 text-xs">
                  {passwordRules.map(r => (
                    <li key={r.label} className={`flex items-center gap-1 ${r.test(passwords.next) ? 'text-emerald-700' : 'text-gray-500'}`}>
                      <Icon name={r.test(passwords.next) ? 'check' : 'x'} className="w-3.5 h-3.5" /> {r.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">Confirmar nueva contraseña</label>
                <input id="confirm" type="password" required value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} className={inputClass} autoComplete="new-password" />
              </div>
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                Actualizar contraseña
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
