import React from 'react';

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'default',
}) {
  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-500/25'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {tab.icon && <tab.icon size={16} />}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-dark-600 text-dark-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`border-b border-dark-700 ${className}`}>
      <div className="flex items-center gap-0 -mb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative px-5 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {tab.icon && <tab.icon size={16} />}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      isActive
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-dark-700 text-dark-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 to-purple-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
