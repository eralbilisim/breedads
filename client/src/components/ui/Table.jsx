import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export default function Table({
  columns,
  data,
  loading = false,
  sortable = true,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !data) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-dark-500" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={14} className="text-brand-400" />
    ) : (
      <ChevronDown size={14} className="text-brand-400" />
    );
  };

  // Skeleton rows for loading state
  if (loading) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-dark-700/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-dark-700 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-700">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={`px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider ${
                  col.sortable !== false && sortable
                    ? 'cursor-pointer hover:text-white transition-colors select-none'
                    : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {col.sortable !== false && sortable && renderSortIcon(col.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!sortedData || sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-dark-400 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-dark-700/50 transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-dark-700/30'
                    : 'hover:bg-dark-800/50'
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-dark-200">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
