import { create } from 'zustand';

interface LlmState {
  response: string;
  loading: boolean;
  error: string | null;
  setResponse: (response: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLlmStore = create<LlmState>((set) => ({
  response: '',
  loading: false,
  error: null,
  setResponse: (response) => set({ response }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ response: '', loading: false, error: null }),
}));
