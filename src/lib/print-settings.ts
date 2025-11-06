export type PaperSizeOption = '80mm' | '58mm' | 'a4' | 'custom';

export interface PrintSettings {
  printerName: string | null;
  printerPort: string | null;
  paperSize: PaperSizeOption;
  customPaperWidth?: number | null;
  lastUpdatedAt?: string;
}

const PRINT_SETTINGS_STORAGE_KEY = 'montshop_print_settings_v1';

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  printerName: null,
  printerPort: null,
  paperSize: '80mm',
  customPaperWidth: 48,
};

function isValidPaperSize(value: unknown): value is PaperSizeOption {
  return value === '80mm' || value === '58mm' || value === 'a4' || value === 'custom';
}

export function resolvePaperWidth(settings?: PrintSettings | null): number {
  const paperSize = settings?.paperSize ?? DEFAULT_PRINT_SETTINGS.paperSize;
  switch (paperSize) {
    case '58mm':
      return 32;
    case '80mm':
      return 48;
    case 'a4':
      return 80;
    case 'custom': {
      const width = settings?.customPaperWidth ?? DEFAULT_PRINT_SETTINGS.customPaperWidth ?? 48;
      return Math.max(16, Math.min(128, Number(width) || 48));
    }
    default:
      return 48;
  }
}

export function loadPrintSettings(): PrintSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PRINT_SETTINGS };
  }

  try {
    const stored = window.localStorage.getItem(PRINT_SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_PRINT_SETTINGS };
    }

    const parsed = JSON.parse(stored);
    const settings: PrintSettings = {
      printerName: typeof parsed?.printerName === 'string' ? parsed.printerName : null,
      printerPort: typeof parsed?.printerPort === 'string' ? parsed.printerPort : null,
      paperSize: isValidPaperSize(parsed?.paperSize) ? parsed.paperSize : DEFAULT_PRINT_SETTINGS.paperSize,
      customPaperWidth:
        parsed?.customPaperWidth !== undefined && parsed?.customPaperWidth !== null
          ? Number(parsed.customPaperWidth)
          : DEFAULT_PRINT_SETTINGS.customPaperWidth,
      lastUpdatedAt: typeof parsed?.lastUpdatedAt === 'string' ? parsed.lastUpdatedAt : undefined,
    };

    return settings;
  } catch (error) {
    console.error('[PrintSettings] Erro ao carregar configurações de impressão:', error);
    return { ...DEFAULT_PRINT_SETTINGS };
  }
}

export function savePrintSettings(nextSettings: Partial<PrintSettings>): PrintSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PRINT_SETTINGS, ...nextSettings };
  }

  const current = loadPrintSettings();
  const merged: PrintSettings = {
    ...current,
    ...nextSettings,
    paperSize: nextSettings.paperSize && isValidPaperSize(nextSettings.paperSize) ? nextSettings.paperSize : current.paperSize,
    customPaperWidth:
      nextSettings.customPaperWidth !== undefined
        ? nextSettings.customPaperWidth
        : current.customPaperWidth ?? DEFAULT_PRINT_SETTINGS.customPaperWidth,
    lastUpdatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('[PrintSettings] Erro ao salvar configurações de impressão:', error);
  }

  return merged;
}

export function clearPrintSettings(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(PRINT_SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.error('[PrintSettings] Erro ao limpar configurações de impressão:', error);
  }
}


