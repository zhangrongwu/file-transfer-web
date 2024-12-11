import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { FileTransferService } from './services/fileTransferService';
import './css/style.css';

const GradientBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#6a11cb] via-[#2575fc] to-[#4ecdc4] flex items-center justify-center p-4 overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-pattern"></div>
    <div className="relative z-10 w-full max-w-md">
      {children}
    </div>
  </div>
);

const CinematicQRCarousel: React.FC<{ 
  chunks: string[], 
  currentIndex: number, 
  progress: number 
}> = ({ chunks, currentIndex, progress }) => {
  const [displayChunks, setDisplayChunks] = useState<string[]>([]);

  useEffect(() => {
    if (chunks.length > 0) {
      const visibleChunks = chunks.slice(
        Math.max(0, currentIndex - 2), 
        Math.min(chunks.length, currentIndex + 3)
      );
      setDisplayChunks(visibleChunks);
    }
  }, [chunks, currentIndex]);

  return (
    <div className="relative w-full h-64 overflow-hidden">
      <div 
        className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
        style={{ 
          transform: `translateX(-${(displayChunks.indexOf(chunks[currentIndex]) * 100)}%)`,
        }}
      >
        {displayChunks.map((chunk, idx) => (
          <div 
            key={idx} 
            className="w-full flex-shrink-0 flex justify-center items-center transition-all duration-500"
            style={{
              opacity: chunk === chunks[currentIndex] ? 1 : 0.3,
              transform: chunk === chunks[currentIndex] 
                ? 'scale(1)' 
                : 'scale(0.8)',
            }}
          >
            <QRCode 
              value={chunk} 
              size={256} 
              level={'H'} 
              className="shadow-lg rounded-xl border-4 border-white/20 backdrop-blur-sm"
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-2 bg-white/20 backdrop-blur-sm">
        <div 
          className="h-full bg-blue-500 transition-all duration-500" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [transferStatus, setTransferStatus] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2000);
  const transferInterval = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTransferStatus('');
      setCurrentChunkIndex(0);
      setChunks([]);
      setIsTransferring(false);
    }
  };

  const startTransfer = async () => {
    if (!file) return;
    
    try {
      const newChunks = await FileTransferService.fileToQRChunks(file);
      setChunks(newChunks);
      setIsTransferring(true);
      setTransferStatus('传输中...');
      
      transferInterval.current = setInterval(() => {
        setCurrentChunkIndex(prev => (prev + 1) % newChunks.length);
      }, speed);
    } catch (error) {
      setTransferStatus('传输准备失败');
      console.error(error);
    }
  };

  const pauseTransfer = () => {
    if (transferInterval.current) {
      clearInterval(transferInterval.current);
      transferInterval.current = null;
    }
    setIsTransferring(false);
    setTransferStatus('已暂停');
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseInt(event.target.value);
    setSpeed(newSpeed);
    
    if (isTransferring && transferInterval.current) {
      clearInterval(transferInterval.current);
      transferInterval.current = setInterval(() => {
        setCurrentChunkIndex(prev => (prev + 1) % chunks.length);
      }, newSpeed);
    }
  };

  const prevChunk = () => {
    setCurrentChunkIndex(prev => (prev - 1 + chunks.length) % chunks.length);
  };

  const nextChunk = () => {
    setCurrentChunkIndex(prev => (prev + 1) % chunks.length);
  };

  useEffect(() => {
    return () => {
      if (transferInterval.current) {
        clearInterval(transferInterval.current);
      }
    };
  }, []);

  return (
    <GradientBackground>
      <div className="container">
        <header>
          <h1>文件传输</h1>
          <p className="text-lg text-gray-600">通过二维码安全传输文件</p>
        </header>
        
        <main>
          <div className="file-upload-section">
            <input
              type="file"
              id="fileInput"
              className="file-input"
              onChange={handleFileSelect}
            />
            <label htmlFor="fileInput" className="file-input-label">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              选择文件
            </label>
            <div className="file-info">
              {file ? (
                <p>已选择：{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
              ) : (
                <p>未选择文件</p>
              )}
            </div>
          </div>

          <div className="qr-section">
            <div className="qr-controls">
              <button
                onClick={startTransfer}
                disabled={!file || isTransferring}
                className="button start-button"
              >
                开始传输
              </button>
              <button
                onClick={pauseTransfer}
                disabled={!isTransferring}
                className="button pause-button"
              >
                暂停
              </button>
              <div className="speed-control">
                <label htmlFor="speedSelect">切换速度</label>
                <select
                  id="speedSelect"
                  value={speed}
                  onChange={handleSpeedChange}
                  disabled={!file}
                >
                  <option value="1000">快速 (1秒)</option>
                  <option value="2000">标准 (2秒)</option>
                  <option value="3000">慢速 (3秒)</option>
                  <option value="5000">超慢 (5秒)</option>
                </select>
              </div>
            </div>
            
            <div className="qr-display">
              {chunks.length > 0 ? (
                <div className="qr-code">
                  <QRCode
                    value={chunks[currentChunkIndex]}
                    size={256}
                    level="L"
                  />
                </div>
              ) : (
                <div className="empty-state">
                  <p>选择文件后开始传输</p>
                </div>
              )}
              <div className="transfer-status">
                {transferStatus}
                {chunks.length > 0 && (
                  <p>第 {currentChunkIndex + 1} / {chunks.length} 块</p>
                )}
              </div>
            </div>

            {chunks.length > 0 && (
              <div className="chunk-navigation">
                <button onClick={prevChunk} className="button">上一块</button>
                <span className="chunk-info">
                  {currentChunkIndex + 1} / {chunks.length}
                </span>
                <button onClick={nextChunk} className="button">下一块</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </GradientBackground>
  );
};

export default App;
