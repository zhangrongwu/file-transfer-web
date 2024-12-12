import { createHash } from 'crypto';

interface FileHeader {
  name: string;
  total_chunks: number;  // 与 Flutter 版本保持一致
  hash?: string;
}

interface ChunkData {
  index: number;
  data: string;
  total_chunks: number;  // 与 Flutter 版本保持一致
  name?: string;
}

export class FileTransferService {
  // 减小分块大小，适应二维码限制
  private static readonly CHUNK_SIZE = 200; // 从1000减小到200字节

  // 解析文件头信息
  static parseHeader(data: string): FileHeader {
    try {
      const header = JSON.parse(data) as FileHeader;
      if (!header.name || !header.total_chunks) {
        throw new Error('Invalid header format');
      }
      return header;
    } catch (e) {
      throw new Error('Invalid header data');
    }
  }

  // 将文件分割成二维码数据块
  static async fileToQRChunks(file: File): Promise<string[]> {
    const chunks: string[] = [];
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    // 计算文件哈希
    const fileHash = await this.calculateFileHash(uint8Array);

    // 文件头信息
    const header: FileHeader = {
      name: file.name,
      total_chunks: Math.ceil(file.size / this.CHUNK_SIZE),
      hash: fileHash,
    };
    chunks.push(JSON.stringify(header));

    // 分块处理
    for (let i = 0; i < uint8Array.length; i += this.CHUNK_SIZE) {
      const chunk = uint8Array.slice(i, i + this.CHUNK_SIZE);
      const chunkData: ChunkData = {
        index: Math.floor(i / this.CHUNK_SIZE),
        data: this.arrayBufferToBase64(chunk),
        total_chunks: Math.ceil(uint8Array.length / this.CHUNK_SIZE),
        name: file.name,
      };
      chunks.push(JSON.stringify(chunkData));
    }

    return chunks;
  }

  // 从二维码数据块重建文件
  static async qrChunksToFile(chunks: string[], fileName?: string): Promise<File> {
    if (chunks.length === 0) {
      throw new Error('No chunks provided');
    }

    // 解析文件头
    const headerChunk = chunks.find(chunk => {
      const parsed = JSON.parse(chunk);
      return parsed.total_chunks && parsed.name;
    });

    if (!headerChunk) {
      throw new Error('No valid file header found');
    }

    const header = JSON.parse(headerChunk) as FileHeader;
    const expectedChunks = header.total_chunks;
    const expectedHash = header.hash;
    const finalFileName = fileName || header.name;

    // 解析数据块
    const dataChunks = chunks.filter(chunk => {
      const parsed = JSON.parse(chunk);
      return parsed.index !== undefined && parsed.data;
    }).sort((a, b) => {
      const chunkA = JSON.parse(a) as ChunkData;
      const chunkB = JSON.parse(b) as ChunkData;
      return chunkA.index - chunkB.index;
    });

    if (dataChunks.length !== expectedChunks) {
      throw new Error(`Incomplete chunks received. Expected ${expectedChunks}, got ${dataChunks.length}`);
    }

    // 重组文件数据
    const fileChunks = dataChunks.map(chunk => {
      const chunkData = JSON.parse(chunk) as ChunkData;
      return this.base64ToArrayBuffer(chunkData.data);
    });

    // 合并文件数据
    const combinedBuffer = this.concatenateArrayBuffers(fileChunks);
    const uint8Array = new Uint8Array(combinedBuffer);

    // 验证文件完整性
    if (expectedHash) {
      const actualHash = await this.calculateFileHash(uint8Array);
      if (actualHash !== expectedHash) {
        throw new Error('File integrity check failed');
      }
    }

    // 创建文件
    return new File([uint8Array], finalFileName, { type: 'application/octet-stream' });
  }

  // 计算文件哈希值（使用 Web Crypto API）
  private static async calculateFileHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ArrayBuffer 转 Base64
  private static arrayBufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
  }

  // Base64 转 ArrayBuffer
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // 合并多个 ArrayBuffer
  private static concatenateArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    return result.buffer;
  }
}
