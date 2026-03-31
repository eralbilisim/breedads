import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const iconBgGradients = {
  brand: 'from-brand-500/20 to-purple-500/20',
  green: 'from-accent-500/20 to-emerald-500/20',
  blue: 'from-blue-500/20 to-cyan-500/20',
  amber: 'from-warning-500/20 to-orange-500/20',
  red: 'from-danger-500/20 to-rose-500/20',
  purple: 'from-purple-500/20 to-pink-500/20',
};

const iconColors = {
  brand: 'text-brand-400',
  green: 'text-accent-400',
  blue: 'text-blue-400',
  amber: 'text-warning-400',
  red: 'text-danger-400',
  purple: 'text-purple-400',
};

export default function StatsCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  color = 'brand',
  className = '',
}) {
  const isPositive = change >= 0;

  return (
    <div
      className={`bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-6 transition-all duration-300 hover:bg-dark-800/70 hover:border-dark-600/50 group ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
            iconBgGradients[color] || iconBgGradients.brand
          } flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
        >
          {Icon && (
            <Icon
              size={22}
              className={iconColors[color] || iconColors.brand}
            />
          )}
        </div>
        {change !== undefined && change !== null && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              isPositive
                ? 'bg-accent-500/10 text-accent-400'
                : 'bg-danger-500/10 text-danger-400'
            }`}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}
            {change}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white mb-1">
          {value}
        </p>
        <p className="text-sm text-dark-400">
          {label}
          {changeLabel && (
            <span className="text-dark-500 ml-1">({changeLabel})</span>
          )}
        </p>
      </div>
    </div>
  );
}
