import { TransferProgress, TransferStatus } from '../types/transfer.types';

export class TransferUtils {
  private static readonly KB = 1024;
  private static readonly MB = 1024 * 1024;
  private static readonly GB = 1024 * 1024 * 1024;

  static formatSize(bytes: number): string {
    if (bytes < this.KB) {
      return `${bytes} B`;
    } else if (bytes < this.MB) {
      return `${(bytes / this.KB).toFixed(2)} KB`;
    } else if (bytes < this.GB) {
      return `${(bytes / this.MB).toFixed(2)} MB`;
    } else {
      return `${(bytes / this.GB).toFixed(2)} GB`;
    }
  }

  static formatSpeed(bytesPerSecond: number): string {
    return `${this.formatSize(bytesPerSecond)}/s`;
  }

  static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  static async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts) break;
        
        await new Promise(resolve => 
          setTimeout(resolve, delayMs * attempt)
        );
      }
    }
    
    throw lastError;
  }

  static createProgress(
    fileName: string,
    totalChunks: number,
    completedChunks: number,
    speed: number = 0,
    status: TransferStatus = TransferStatus.Idle,
    error?: string
  ): TransferProgress {
    return {
      fileName,
      totalChunks,
      completedChunks,
      speed,
      status,
      error,
      estimatedTimeRemaining: speed > 0 
        ? ((totalChunks - completedChunks) * 1000) / speed 
        : undefined
    };
  }

  static isFileSizeValid(size: number, maxSize: number = 100 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize;
  }

  static isFileTypeAllowed(type: string, allowedTypes?: string[]): boolean {
    if (!allowedTypes || allowedTypes.length === 0) return true;
    return allowedTypes.some(allowedType => 
      type.toLowerCase().startsWith(allowedType.toLowerCase())
    );
  }

  static async estimateTransferTime(
    fileSize: number,
    chunkSize: number,
    sampleSize: number = 5
  ): Promise<number> {
    const testData = new Uint8Array(chunkSize);
    const times: number[] = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const start = performance.now();
      await this.calculateChecksum(testData);
      times.push(performance.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const chunks = Math.ceil(fileSize / chunkSize);
    return avgTime * chunks;
  }
}
