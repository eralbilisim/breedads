import React from 'react';

const colorMap = {
  green: {
    bg: 'bg-accent-500/10',
    text: 'text-accent-400',
    border: 'border-accent-500/20',
    dot: 'bg-accent-400',
  },
  yellow: {
    bg: 'bg-warning-500/10',
    text: 'text-warning-400',
    border: 'border-warning-500/20',
    dot: 'bg-warning-400',
  },
  red: {
    bg: 'bg-danger-500/10',
    text: 'text-danger-400',
    border: 'border-danger-500/20',
    dot: 'bg-danger-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
  },
  gray: {
    bg: 'bg-dark-600/30',
    text: 'text-dark-300',
    border: 'border-dark-500/20',
    dot: 'bg-dark-400',
  },
};

export default function Badge({
  children,
  color = 'gray',
  dot = false,
  className = '',
}) {
  const colors = colorMap[color] || colorMap.gray;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} animate-pulse-slow`} />
      )}
      {children}
    </span>
  );
}
