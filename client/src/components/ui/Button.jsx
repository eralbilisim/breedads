import React from 'react';

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40',
  secondary:
    'bg-dark-700 hover:bg-dark-600 text-white border border-dark-600 hover:border-dark-500',
  danger:
    'bg-danger-600 hover:bg-danger-500 text-white shadow-lg shadow-danger-500/25 hover:shadow-danger-500/40',
  ghost:
    'bg-transparent hover:bg-dark-700/50 text-dark-300 hover:text-white',
  outline:
    'bg-transparent border border-dark-600 hover:border-brand-500 text-dark-300 hover:text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      )}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
    </button>
  );
}
