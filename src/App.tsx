import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { FileTransferService } from './services/fileTransferService';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qrChunks, setQRChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [receivedChunks, setReceivedChunks] = useState<string[]>([]);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startDynamicQRTransmission = () => {
    if (qrChunks.length === 0) {
      setError('请先选择文件');
      return;
    }

    setIsTransmitting(true);
    setCurrentChunkIndex(0);
    setProgress(0);

    intervalRef.current = setInterval(() => {
      setCurrentChunkIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % qrChunks.length;
        
        setProgress(Math.round((nextIndex / qrChunks.length) * 100));

        if (nextIndex === 0) {
          stopDynamicQRTransmission();
        }

        return nextIndex;
      });
    }, 1000); 
  };

  const stopDynamicQRTransmission = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsTransmitting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      try {
        if (file.size > 5 * 1024 * 1024) {
          setError('文件过大，请选择小于 5MB 的文件');
          return;
        }

        const chunks = await FileTransferService.fileToQRChunks(file);
        setSelectedFile(file);
        setQRChunks(chunks);
        setCurrentChunkIndex(0);
        setError(null);
        
        startDynamicQRTransmission();
      } catch (error) {
        console.error('文件处理错误:', error);
        setError(error instanceof Error ? error.message : '文件处理失败');
      }
    }
  };

  const reconstructFile = async () => {
    try {
      if (receivedChunks.length === 0) {
        setError('请先接收文件分块');
        return;
      }

      const reconstructedFile = await FileTransferService.qrChunksToFile(
        receivedChunks, 
        selectedFile?.name || 'downloaded_file'
      );
      
      const url = URL.createObjectURL(reconstructedFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = reconstructedFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setReceivedChunks([]);
      setError(null);
    } catch (error) {
      console.error('文件重组错误:', error);
      setError(error instanceof Error ? error.message : '文件重组失败');
    }
  };

  return (
    <GradientBackground>
      <div className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl p-8 space-y-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>

        <div className="text-center">
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            动态二维码文件传输
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            安全、快速、简单的文件共享方案
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg 
            hover:from-purple-700 hover:to-blue-600 transition-all duration-300 
            flex items-center justify-center space-x-2 transform hover:scale-[1.02]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>选择文件</span>
          </button>

          {selectedFile && (
            <div className="text-center text-sm text-gray-600 bg-gray-100 rounded-lg p-2">
              已选择: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </div>

        {selectedFile && (
          <CinematicQRCarousel 
            chunks={qrChunks} 
            currentIndex={currentChunkIndex} 
            progress={progress} 
          />
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">接收文件</h2>
          <textarea 
            placeholder="扫描二维码后，粘贴二维码内容到这里"
            rows={5}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => {
              try {
                const chunk = JSON.parse(e.target.value);
                setReceivedChunks(prev => {
                  if (!prev.some(existingChunk => 
                    JSON.parse(existingChunk).index === chunk.index
                  )) {
                    return [...prev, JSON.stringify(chunk)];
                  }
                  return prev;
                });
                setError(null);
              } catch (error) {
                console.error('解析错误:', error);
                setError('二维码内容解析失败');
              }
            }}
          />
          <button 
            onClick={reconstructFile}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg 
            hover:from-green-600 hover:to-teal-600 transition-all duration-300 
            transform hover:scale-[1.02]"
          >
            重组文件
          </button>
        </div>
      </div>
    </GradientBackground>
  );
};

export default App;
