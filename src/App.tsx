import React, { useState, useRef } from 'react';
import QRCode from 'qrcode.react';
import { FileTransferService } from './services/fileTransferService';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qrChunks, setQRChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [receivedChunks, setReceivedChunks] = useState<string[]>([]);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        
        // 更新进度
        setProgress(Math.round((nextIndex / qrChunks.length) * 100));

        // 如果已经循环完一圈，停止传输
        if (nextIndex === 0) {
          stopDynamicQRTransmission();
        }

        return nextIndex;
      });
    }, 500); // 每500毫秒切换一个二维码
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
        // 限制文件大小（例如，限制在 1MB）
        if (file.size > 1 * 1024 * 1024) {
          setError('文件过大，请选择小于 1MB 的文件');
          return;
        }

        const chunks = await FileTransferService.fileToQRChunks(file);
        setSelectedFile(file);
        setQRChunks(chunks);
        setCurrentChunkIndex(0);
        setError(null);
        
        // 自动开始动态二维码传输
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
      
      // 创建下载链接
      const url = URL.createObjectURL(reconstructedFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = reconstructedFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 重置接收的分块
      setReceivedChunks([]);
      setError(null);
    } catch (error) {
      console.error('文件重组错误:', error);
      setError(error instanceof Error ? error.message : '文件重组失败');
    }
  };

  const renderQRCode = () => {
    if (!qrChunks.length) return null;

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}>
        <QRCode 
          value={qrChunks[currentChunkIndex]} 
          size={256} 
          level={'H'} 
        />
        <p>
          分块 {currentChunkIndex + 1} / {qrChunks.length}
          {isTransmitting ? (
            <button onClick={stopDynamicQRTransmission}>
              停止传输
            </button>
          ) : (
            <button onClick={startDynamicQRTransmission}>
              开始动态传输
            </button>
          )}
        </p>
        <div style={{ width: '100%', backgroundColor: '#f0f0f0', marginTop: '10px' }}>
          <div 
            style={{ 
              width: `${progress}%`, 
              height: '10px', 
              backgroundColor: 'green',
              transition: 'width 0.5s ease-in-out'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '20px', 
      textAlign: 'center' 
    }}>
      <h1>动态二维码文件传输</h1>
      
      {error && (
        <div style={{ 
          backgroundColor: '#ffdddd', 
          color: 'red', 
          padding: '10px', 
          marginBottom: '10px' 
        }}>
          {error}
        </div>
      )}

      <input 
        type="file" 
        onChange={handleFileSelect}
        style={{ margin: '20px 0' }}
      />

      {selectedFile && renderQRCode()}

      <div>
        <h2>接收文件</h2>
        <textarea 
          placeholder="扫描二维码后，粘贴二维码内容到这里"
          rows={5}
          style={{ width: '100%', marginBottom: '10px' }}
          onChange={(e) => {
            try {
              const chunk = JSON.parse(e.target.value);
              setReceivedChunks(prev => {
                // 避免重复添加
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
          disabled={receivedChunks.length === 0}
        >
          重组文件
        </button>

        <p>已接收分块: {receivedChunks.length}</p>
      </div>
    </div>
  );
};

export default App;
