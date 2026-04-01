import { create } from 'zustand';
import api from '../services/api';

const useAccountStore = create((set, get) => {
  const stored = localStorage.getItem('breedads_selected_account');
  let selectedAccount = null;
  try {
    selectedAccount = stored ? JSON.parse(stored) : null;
  } catch {
    selectedAccount = null;
  }

  return {
    accounts: [],
    selectedAccount,
    loading: false,
    error: null,

    fetchAccounts: async () => {
      set({ loading: true, error: null });
      try {
        const [metaRes, googleRes] = await Promise.allSettled([
          api.get('/meta/accounts'),
          api.get('/google/accounts'),
        ]);

        const metaAccounts = metaRes.status === 'fulfilled'
          ? (Array.isArray(metaRes.value) ? metaRes.value : metaRes.value?.accounts || []).map(a => ({ ...a, platform: 'META' }))
          : [];

        const googleAccounts = googleRes.status === 'fulfilled'
          ? (Array.isArray(googleRes.value) ? googleRes.value : googleRes.value?.accounts || []).map(a => ({ ...a, platform: 'GOOGLE' }))
          : [];

        const accounts = [...metaAccounts, ...googleAccounts];
        set({ accounts, loading: false });

        // If selected account no longer exists, clear it
        const selected = get().selectedAccount;
        if (selected && !accounts.find(a => (a.id || a.accountId) === (selected.id || selected.accountId))) {
          set({ selectedAccount: null });
          localStorage.removeItem('breedads_selected_account');
        }
      } catch (error) {
        set({ loading: false, error: error?.message || 'Failed to load accounts' });
      }
    },

    selectAccount: (account) => {
      set({ selectedAccount: account });
      if (account) {
        localStorage.setItem('breedads_selected_account', JSON.stringify(account));
      } else {
        localStorage.removeItem('breedads_selected_account');
      }
    },

    clearSelection: () => {
      set({ selectedAccount: null });
      localStorage.removeItem('breedads_selected_account');
    },
  };
});

export default useAccountStore;
