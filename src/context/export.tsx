import { createContext, JSX, useContext } from "solid-js";
import { createStore, Store } from "solid-js/store";

export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'complete' | 'error';

export interface ExportProgress {
  percentage: number;
  currentActivity: string;
  phase: 'discovery' | 'content' | 'media' | 'packaging';
  completedItems: number;
  totalItems: number;
}

export interface ExportStats {
  postsProcessed: number;
  mediaProcessed: number;
  totalSize: number;
  processingTime: number;
}

export interface ExportError {
  code: string;
  message: string;
  retryable: boolean;
  details?: any;
}

export interface ExportData {
  jobId: string | null;
  status: ExportStatus;
  progress: ExportProgress;
  stats: ExportStats | null;
  downloadUrl: string | null;
  error: ExportError | null;
  startTime: Date | null;
  completedTime: Date | null;
}

export interface ExportOptions {
  includeMedia?: boolean;
  includeComments?: boolean;
}

interface ExportContextValue {
  exportData: Store<ExportData>;
  setExportData: (value: ExportData | ((prev: ExportData) => ExportData) | Record<string, any>) => ExportData;
  startExport: (options?: ExportOptions) => Promise<void>;
  cancelExport: () => void;
  retryExport: () => void;
  resetExport: () => void;
}

const defaultProgress: ExportProgress = {
  percentage: 0,
  currentActivity: 'Preparing to export data',
  phase: 'discovery',
  completedItems: 0,
  totalItems: 0
};

const defaultExportData: ExportData = {
  jobId: null,
  status: 'idle',
  progress: defaultProgress,
  stats: null,
  downloadUrl: null,
  error: null,
  startTime: null,
  completedTime: null
};

export const ExportContext = createContext<ExportContextValue>();

export function ExportProvider(props: { children: JSX.Element }) {
  const [exportData, setExportData] = createStore<ExportData>(defaultExportData);

  // Real API integration functions
  const startExport = async (options?: ExportOptions) => {
    // Initialize the export process
    setExportData({
      jobId: 'export-' + Date.now(),
      status: 'preparing',
      progress: {
        ...defaultProgress,
        currentActivity: 'Preparing to export your Peach data'
      },
      stats: null,
      downloadUrl: null,
      error: null,
      startTime: new Date(),
      completedTime: null
    });

    // Move to exporting state - download.ts will handle the actual progress updates
    setExportData('status', 'exporting');
  };

  const cancelExport = () => {
    resetExport();
  };

  const retryExport = () => {
    setExportData('status', 'preparing');
    setExportData('error', null);
    setExportData('status', 'exporting');
  };

  const resetExport = () => {
    // Reset to default state
    setExportData(defaultExportData);
  };

  const value: ExportContextValue = {
    exportData,
    setExportData,
    startExport,
    cancelExport,
    retryExport,
    resetExport
  };

  return (
    <ExportContext.Provider value={value}>
      {props.children}
    </ExportContext.Provider>
  );
}

export const useExport = () => {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error("useExport must be used within an ExportProvider");
  }
  return context;
};