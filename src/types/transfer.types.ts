export interface FileHeader {
  name: string;
  total_chunks: number;
  hash?: string;
  size: number;
  timestamp: number;
  type?: string;
}

export interface ChunkData {
  index: number;
  data: string;
  total_chunks: number;
  name?: string;
  checksum?: string;
}

export interface TransferProgress {
  fileName: string;
  totalChunks: number;
  completedChunks: number;
  speed: number;
  status: TransferStatus;
  error?: string;
  estimatedTimeRemaining?: number;
}

export enum TransferStatus {
  Idle = 'idle',
  Preparing = 'preparing',
  Transferring = 'transferring',
  Paused = 'paused',
  Completed = 'completed',
  Error = 'error',
}

export interface TransferOptions {
  chunkSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  validateChecksum?: boolean;
  onProgress?: (progress: TransferProgress) => void;
}
