import { useState } from 'react';
import Icon from './ui/Icon';
import { parseImages } from '../utils/format';

/** Ícono y color de fondo por categoría, usados cuando el producto no tiene foto. */
export const categoryStyles: Record<string, { icon: string; bg: string; fg: string }> = {
  Laptops: { icon: 'laptop', bg: 'from-sky-50 to-blue-100', fg: 'text-blue-600' },
  Smartphones: { icon: 'phone', bg: 'from-violet-50 to-purple-100', fg: 'text-violet-600' },
  Tablets: { icon: 'tablet', bg: 'from-fuchsia-50 to-pink-100', fg: 'text-fuchsia-600' },
  Monitores: { icon: 'monitor', bg: 'from-cyan-50 to-teal-100', fg: 'text-teal-600' },
  'Periféricos': { icon: 'mouse', bg: 'from-amber-50 to-orange-100', fg: 'text-orange-600' },
  Audio: { icon: 'headphones', bg: 'from-rose-50 to-red-100', fg: 'text-rose-600' },
  Componentes: { icon: 'cpu', bg: 'from-emerald-50 to-green-100', fg: 'text-emerald-700' },
  Almacenamiento: { icon: 'storage', bg: 'from-slate-50 to-slate-200', fg: 'text-slate-600' },
  Gaming: { icon: 'gamepad', bg: 'from-indigo-50 to-indigo-100', fg: 'text-indigo-600' },
  Redes: { icon: 'wifi', bg: 'from-sky-50 to-cyan-100', fg: 'text-sky-600' },
  Smartwatches: { icon: 'watch', bg: 'from-lime-50 to-green-100', fg: 'text-lime-700' },
  Accesorios: { icon: 'plug', bg: 'from-stone-50 to-stone-200', fg: 'text-stone-600' },
};

const fallbackStyle = { icon: 'box', bg: 'from-gray-50 to-gray-200', fg: 'text-gray-500' };

export function getCategoryStyle(category?: string) {
  return (category && categoryStyles[category]) || fallbackStyle;
}

interface Props {
  imageUrls?: string | null;
  category?: string;
  name: string;
  className?: string;
  iconClassName?: string;
}

export default function ProductImage({ imageUrls, category, name, className = '', iconClassName = 'w-16 h-16' }: Props) {
  const [failed, setFailed] = useState(false);
  const image = parseImages(imageUrls)[0];
  const style = getCategoryStyle(category);

  if (image && !failed) {
    return (
      <div className={`bg-white flex items-center justify-center overflow-hidden ${className}`}>
        <img src={image} alt={name} loading="lazy" onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  return (
    <div className={`bg-linear-to-br ${style.bg} flex items-center justify-center ${className}`} role="img" aria-label={name}>
      <Icon name={style.icon} className={`${iconClassName} ${style.fg} opacity-80`} strokeWidth={1.4} />
    </div>
  );
}
