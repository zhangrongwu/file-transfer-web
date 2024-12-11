document.addEventListener('DOMContentLoaded', () => {
    const qrTransfer = new QRTransfer();
    let qr = null; // QR code generator instance

    // DOM elements
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const startTransfer = document.getElementById('startTransfer');
    const pauseTransfer = document.getElementById('pauseTransfer');
    const speedSelect = document.getElementById('speedSelect');
    const qrCodeElement = document.getElementById('qrCode');
    const transferStatus = document.getElementById('transferStatus');
    const chunkNavigation = document.querySelector('.chunk-navigation');
    const prevChunk = document.getElementById('prevChunk');
    const nextChunk = document.getElementById('nextChunk');
    const chunkInfo = document.getElementById('chunkInfo');

    // 初始化QR码生成器
    function initQRCode() {
        qr = qrcode(0, 'M');
        qr.addData('等待文件选择...');
        qr.make();
        qrCodeElement.innerHTML = qr.createImgTag(5);
    }

    // 更新QR码显示
    function updateQRCode(data, currentChunk, totalChunks) {
        try {
            qr = qrcode(0, 'M');
            qr.addData(data);
            qr.make();
            qrCodeElement.innerHTML = qr.createImgTag(5);
            
            // 更新状态显示
            transferStatus.textContent = `传输中: ${currentChunk + 1}/${totalChunks}`;
            chunkInfo.textContent = `${currentChunk + 1}/${totalChunks}`;
        } catch (error) {
            console.error('生成二维码失败:', error);
            transferStatus.textContent = '生成二维码失败';
        }
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 文件选择处理
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            fileInfo.textContent = '正在准备文件...';
            startTransfer.disabled = true;
            pauseTransfer.disabled = true;
            speedSelect.disabled = true;

            const { totalChunks, fileName, fileSize } = await qrTransfer.prepareFile(file);
            
            fileInfo.innerHTML = `
                文件名: ${fileName}<br>
                大小: ${formatFileSize(fileSize)}<br>
                总块数: ${totalChunks}
            `;

            startTransfer.disabled = false;
            speedSelect.disabled = false;
        } catch (error) {
            console.error('准备文件失败:', error);
            fileInfo.textContent = '准备文件失败: ' + error.message;
        }
    });

    // 开始传输
    startTransfer.addEventListener('click', () => {
        startTransfer.textContent = '重新开始';
        pauseTransfer.disabled = false;
        qrTransfer.start(updateQRCode);
        pauseTransfer.textContent = '暂停';
        chunkNavigation.style.display = 'none';
    });

    // 暂停/继续传输
    pauseTransfer.addEventListener('click', () => {
        if (qrTransfer.isPaused) {
            qrTransfer.resume();
            pauseTransfer.textContent = '暂停';
            chunkNavigation.style.display = 'none';
        } else {
            qrTransfer.pause();
            pauseTransfer.textContent = '继续';
            chunkNavigation.style.display = 'flex';
        }
    });

    // 切换速度
    speedSelect.addEventListener('change', (event) => {
        const interval = parseInt(event.target.value);
        qrTransfer.setSwitchInterval(interval);
    });

    // 上一块
    prevChunk.addEventListener('click', () => {
        qrTransfer.previousChunk(updateQRCode);
    });

    // 下一块
    nextChunk.addEventListener('click', () => {
        qrTransfer.nextChunk(updateQRCode);
    });

    // 初始化显示
    initQRCode();
});
