import React from 'react';

/**
 * Affiche une plaque d'immatriculation.
 * Format marocain "NNNNN | أ | NN" rendu en 3 segments avec la lettre
 * arabe centrée (comme sur la vraie plaque). Sinon, texte brut.
 */
export const LicensePlate: React.FC<{ value?: string | null; className?: string }> = ({
  value,
  className = '',
}) => {
  const plate = (value || '').trim();
  const match = plate.match(/^(\d{1,6})\s*\|\s*([\u0600-\u06FF])\s*\|\s*(\d{1,2})$/);

  if (!match) {
    return <span className={className}>{plate || '-'}</span>;
  }

  return (
    <span
      dir="ltr"
      className={`inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-extrabold text-slate-900 ${className}`}
    >
      <span className="text-sm">{match[1]}</span>
      <span className="border-x border-slate-300 px-1.5 text-emerald-700">{match[2]}</span>
      <span className="text-sm">{match[3]}</span>
    </span>
  );
};
