import { useEffect, useState } from 'react';
import Icon from './ui/Icon';

function remaining(endsAt: string) {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return { ms, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

const pad = (n: number) => n.toString().padStart(2, '0');

/** Contador regresivo de una oferta por tiempo limitado (HU-13). */
export default function Countdown({ endsAt, compact = false }: { endsAt: string; compact?: boolean }) {
  const [time, setTime] = useState(() => remaining(endsAt));

  useEffect(() => {
    const id = setInterval(() => setTime(remaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (time.ms <= 0) {
    return <span className="text-xs font-medium text-gray-500">Oferta finalizada</span>;
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
        <Icon name="clock" className="w-3.5 h-3.5" />
        {time.days > 0 ? `${time.days}d ` : ''}{pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
      </span>
    );
  }

  const blocks = [
    { value: time.days, label: 'días' },
    { value: time.hours, label: 'horas' },
    { value: time.minutes, label: 'min' },
    { value: time.seconds, label: 'seg' },
  ];

  return (
    <div className="flex items-center gap-2" aria-label="Tiempo restante de la oferta">
      {blocks.map(b => (
        <div key={b.label} className="bg-gray-900 text-white rounded-lg px-2.5 py-1.5 text-center min-w-[3.25rem]">
          <div className="text-lg font-bold tabular-nums leading-none">{pad(b.value)}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-300 mt-1">{b.label}</div>
        </div>
      ))}
    </div>
  );
}
