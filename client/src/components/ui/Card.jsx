import React from 'react';

export default function Card({
  children,
  header,
  footer,
  className = '',
  hover = false,
  padding = true,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl overflow-hidden transition-all duration-300 ${
        hover
          ? 'hover:bg-dark-800/70 hover:border-dark-600/50 hover:shadow-xl hover:shadow-black/20 cursor-pointer'
          : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {header && (
        <div className="px-6 py-4 border-b border-dark-700/50">
          {typeof header === 'string' ? (
            <h3 className="text-lg font-semibold text-white">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className={padding ? 'p-6' : ''}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-dark-700/50 bg-dark-900/30">
          {footer}
        </div>
      )}
    </div>
  );
}

export function CardGrid({ children, cols = 3, className = '' }) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[cols] || gridCols[3]} gap-4 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
}
