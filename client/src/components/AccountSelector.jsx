import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2, Layers } from 'lucide-react';
import useAccountStore from '../store/accountStore';

function MetaIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
        fill="#1877F2"
      />
    </svg>
  );
}

function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function AccountSelector() {
  const { accounts, selectedAccount, selectAccount, clearSelection, fetchAccounts } = useAccountStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccounts();
    }
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (accounts.length === 0) return null;

  const displayName = selectedAccount
    ? (selectedAccount.accountName || selectedAccount.name || 'Account')
    : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:bg-dark-800/70 hover:border-dark-600/50 transition-all text-sm"
      >
        {selectedAccount ? (
          <>
            {selectedAccount.platform === 'META' ? <MetaIcon size={16} /> : <GoogleIcon size={16} />}
            <span className="text-white max-w-[140px] truncate">{displayName}</span>
          </>
        ) : (
          <>
            <Layers size={16} className="text-dark-400" />
            <span className="text-dark-300">Tüm Hesaplar</span>
          </>
        )}
        <ChevronDown size={14} className={`text-dark-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-slideDown">
          <div className="px-3 py-2 border-b border-dark-700/50">
            <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">Reklam Hesabı</p>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {/* All accounts option */}
            <button
              onClick={() => { clearSelection(); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700/50 transition-colors ${!selectedAccount ? 'bg-dark-700/30' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center">
                <Layers size={16} className="text-dark-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Tüm Hesaplar</p>
                <p className="text-xs text-dark-400">{accounts.length} hesap</p>
              </div>
              {!selectedAccount && <Check size={16} className="text-brand-400" />}
            </button>

            {/* Individual accounts */}
            {accounts.map((account) => {
              const aid = account.id || account.accountId;
              const isSelected = selectedAccount && (selectedAccount.id || selectedAccount.accountId) === aid;
              return (
                <button
                  key={aid}
                  onClick={() => { selectAccount(account); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700/50 transition-colors ${isSelected ? 'bg-dark-700/30' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    account.platform === 'META' ? 'bg-[#1877F2]/10' : 'bg-white/5'
                  }`}>
                    {account.platform === 'META' ? <MetaIcon size={18} /> : <GoogleIcon size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {account.accountName || account.name || 'Ad Account'}
                    </p>
                    <p className="text-xs text-dark-400">
                      {account.platform} · {account.accountId || aid}
                    </p>
                  </div>
                  {isSelected && <Check size={16} className="text-brand-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
