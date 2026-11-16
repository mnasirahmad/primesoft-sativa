import React from 'react';
import sativaLogo from '../../assets/sativa-logo.webp';

interface SativaLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  variant?: 'light' | 'dark' | 'transparent';
}

export const SativaLogo: React.FC<SativaLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
  variant = 'transparent',
}) => {
  const sizeClasses = {
    xs: 'h-6 w-auto max-w-[80px]',
    sm: 'h-8 w-auto max-w-[100px]',
    md: 'h-10 w-auto max-w-[130px]',
    lg: 'h-14 w-auto max-w-[170px]',
    xl: 'h-20 w-auto max-w-[220px]',
  }[size];

  const containerBg = {
    light: 'bg-white p-1.5 rounded-lg shadow-2xs border border-stone-200',
    dark: 'bg-stone-900 p-1.5 rounded-lg border border-stone-700',
    transparent: '',
  }[variant];

  return (
    <div className={`inline-flex items-center gap-2.5 ${containerBg} ${className}`}>
      <img
        src={sativaLogo}
        alt="Sativa Cosmetics - No. 1 Cosmetics Brand"
        className={`${sizeClasses} object-contain shrink-0 drop-shadow-2xs`}
        loading="eager"
      />
      {showSubtitle && (
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Sativa Cosmetics
          </span>
          <span className="text-[10px] text-stone-500 font-medium tracking-tight">
            Vehari Manufacturing Plant
          </span>
        </div>
      )}
    </div>
  );
};

export default SativaLogo;
