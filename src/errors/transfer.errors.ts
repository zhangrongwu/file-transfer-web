export class FileTransferError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'FileTransferError';
  }
}

export class InvalidHeaderError extends FileTransferError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_HEADER', details);
    this.name = 'InvalidHeaderError';
  }
}

export class ChunkValidationError extends FileTransferError {
  constructor(message: string, details?: any) {
    super(message, 'CHUNK_VALIDATION', details);
    this.name = 'ChunkValidationError';
  }
}

export class FileIntegrityError extends FileTransferError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_INTEGRITY', details);
    this.name = 'FileIntegrityError';
  }
}

export class TransferTimeoutError extends FileTransferError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSFER_TIMEOUT', details);
    this.name = 'TransferTimeoutError';
  }
}

export class InsufficientStorageError extends FileTransferError {
  constructor(message: string, details?: any) {
    super(message, 'INSUFFICIENT_STORAGE', details);
    this.name = 'InsufficientStorageError';
  }
}

export class UnsupportedFileTypeError extends FileTransferError {
  constructor(message: string, details?: any) {
    super(message, 'UNSUPPORTED_FILE_TYPE', details);
    this.name = 'UnsupportedFileTypeError';
  }
}
