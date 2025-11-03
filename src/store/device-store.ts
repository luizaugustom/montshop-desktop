import { create } from 'zustand';

interface DeviceState {
  barcodeBuffer: string;
  scanSuccess: boolean;
  printerStatus: 'connected' | 'disconnected' | 'checking' | 'error';
  printerName: string | null;
  scaleConnected: boolean;
  scalePort: string | null;
  scannerActive: boolean;
  setBarcodeBuffer: (buffer: string | ((prev: string) => string)) => void;
  setScanSuccess: (success: boolean) => void;
  setPrinterStatus: (status: 'connected' | 'disconnected' | 'checking' | 'error') => void;
  setPrinterName: (name: string | null) => void;
  setScaleConnected: (connected: boolean) => void;
  setScalePort: (port: string | null) => void;
  setScannerActive: (active: boolean) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  barcodeBuffer: '',
  scanSuccess: false,
  printerStatus: 'disconnected',
  printerName: null,
  scaleConnected: false,
  scalePort: null,
  scannerActive: false,

  setBarcodeBuffer: (buffer) => set((state) => ({ barcodeBuffer: typeof buffer === 'function' ? buffer(state.barcodeBuffer) : buffer })),
  setScanSuccess: (success) => set({ scanSuccess: success }),
  setPrinterStatus: (status) => set({ printerStatus: status }),
  setPrinterName: (name) => set({ printerName: name }),
  setScaleConnected: (connected) => set({ scaleConnected: connected }),
  setScalePort: (port) => set({ scalePort: port }),
  setScannerActive: (active) => set({ scannerActive: active }),
}));

