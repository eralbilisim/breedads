import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    icon: Icon,
    type = 'text',
    className = '',
    containerClassName = '',
    options,
    rows = 4,
    ...props
  },
  ref
) {
  const baseClasses =
    'w-full bg-dark-800 border text-white placeholder-dark-400 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500';
  const errorClasses = error
    ? 'border-danger-500 focus:ring-danger-500/50 focus:border-danger-500'
    : 'border-dark-600';
  const paddingClasses = Icon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5';

  const renderInput = () => {
    if (type === 'select') {
      return (
        <div className="relative">
          {Icon && (
            <Icon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"
            />
          )}
          <select
            ref={ref}
            className={`${baseClasses} ${errorClasses} ${paddingClasses} appearance-none cursor-pointer ${className}`}
            {...props}
          >
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          ref={ref}
          rows={rows}
          className={`${baseClasses} ${errorClasses} px-4 py-2.5 resize-none ${className}`}
          {...props}
        />
      );
    }

    return (
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"
          />
        )}
        <input
          ref={ref}
          type={type}
          className={`${baseClasses} ${errorClasses} ${paddingClasses} ${className}`}
          {...props}
        />
      </div>
    );
  };

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-dark-300">
          {label}
        </label>
      )}
      {renderInput()}
      {error && (
        <p className="text-xs text-danger-400 mt-1">{error}</p>
      )}
    </div>
  );
});

export default Input;
