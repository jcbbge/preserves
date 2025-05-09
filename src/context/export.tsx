import { createContext, createSignal, createEffect, JSX, useContext, onCleanup } from "solid-js";
import { createStore, Store } from "solid-js/store";

export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'paused' | 'complete' | 'error';

export interface ExportProgress {
  percentage: number;
  currentActivity: string;
  phase: 'discovery' | 'content' | 'media' | 'packaging';
  estimatedTimeRemaining: number;
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
  fromDate?: string;
  toDate?: string;
}

interface ExportContextValue {
  exportData: Store<ExportData>;
  setExportData: (value: ExportData | ((prev: ExportData) => ExportData) | Record<string, any>) => ExportData;
  startExport: (options?: ExportOptions) => Promise<void>;
  pauseExport: () => Promise<void>;
  resumeExport: () => Promise<void>;
  cancelExport: () => Promise<void>;
  retryExport: () => Promise<void>;
  resetExport: () => void;
}

const defaultProgress: ExportProgress = {
  percentage: 0,
  currentActivity: '',
  phase: 'discovery',
  estimatedTimeRemaining: 0,
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
  const [socket, setSocket] = createSignal<WebSocket | null>(null);

  // Mock functions for now - will be replaced with real API calls later
  const startExport = async (options?: ExportOptions) => {
    // Mock API call
    setExportData({
      jobId: 'mock-job-' + Date.now(),
      status: 'preparing',
      progress: {
        ...defaultProgress,
        estimatedTimeRemaining: 120
      },
      stats: null,
      downloadUrl: null,
      error: null,
      startTime: new Date(),
      completedTime: null
    });
    
    // Initial setup for the export context
    // The real values will be set by the download.ts process with the actual post count
    setTimeout(() => {
      setExportData('status', 'exporting');
      // We'll let the actual download process control the progress values
    }, 500);
  };

  const pauseExport = async () => {
    setExportData('status', 'paused');
  };

  const resumeExport = async () => {
    setExportData('status', 'exporting');
  };

  const cancelExport = async () => {
    resetExport();
  };

  const retryExport = async () => {
    setExportData('status', 'preparing');
    setExportData('error', null);
    
    // Mock retry behavior
    setTimeout(() => {
      setExportData('status', 'exporting');
    }, 1000);
  };

  const resetExport = () => {
    // Close socket if open
    if (socket()) {
      socket()!.close();
      setSocket(null);
    }
    
    // Reset to default state
    setExportData(defaultExportData);
  };
  
  // Clean up on unmount
  onCleanup(() => {
    if (socket()) {
      socket()!.close();
    }
  });

  const value: ExportContextValue = {
    exportData,
    setExportData, // Expose the setExportData function to allow components to update the store
    startExport,
    pauseExport,
    resumeExport,
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