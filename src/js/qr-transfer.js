class QRTransfer {
    constructor() {
        this.chunkSize = 1000; // 每个二维码包含的字节数
        this.chunks = [];
        this.currentChunkIndex = 0;
        this.isPaused = false;
        this.intervalId = null;
        this.switchInterval = 2000; // 默认2秒切换一次
    }

    async prepareFile(file) {
        this.chunks = [];
        const fileSize = file.size;
        const totalChunks = Math.ceil(fileSize / this.chunkSize);

        // 创建文件头信息
        const header = {
            name: file.name,
            size: fileSize,
            chunks: totalChunks,
            hash: await this.calculateFileHash(file)
        };
        this.chunks.push(JSON.stringify(header));

        // 读取文件内容并分块
        let offset = 0;
        while (offset < fileSize) {
            const chunk = file.slice(offset, offset + this.chunkSize);
            const arrayBuffer = await chunk.arrayBuffer();
            const base64Data = this.arrayBufferToBase64(arrayBuffer);
            
            const chunkData = {
                index: this.chunks.length - 1,
                data: base64Data
            };
            this.chunks.push(JSON.stringify(chunkData));
            
            offset += this.chunkSize;
        }

        return {
            totalChunks: this.chunks.length,
            fileName: file.name,
            fileSize: fileSize
        };
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async calculateFileHash(file) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getCurrentChunk() {
        return this.chunks[this.currentChunkIndex];
    }

    start(onChunkChange) {
        this.isPaused = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // 立即显示第一个块
        onChunkChange(this.getCurrentChunk(), this.currentChunkIndex, this.chunks.length);
        
        this.intervalId = setInterval(() => {
            if (!this.isPaused) {
                this.currentChunkIndex = (this.currentChunkIndex + 1) % this.chunks.length;
                onChunkChange(this.getCurrentChunk(), this.currentChunkIndex, this.chunks.length);
            }
        }, this.switchInterval);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    setSwitchInterval(interval) {
        this.switchInterval = interval;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.start();
        }
    }

    previousChunk(onChunkChange) {
        if (this.isPaused && this.chunks.length > 0) {
            this.currentChunkIndex = (this.currentChunkIndex - 1 + this.chunks.length) % this.chunks.length;
            onChunkChange(this.getCurrentChunk(), this.currentChunkIndex, this.chunks.length);
        }
    }

    nextChunk(onChunkChange) {
        if (this.isPaused && this.chunks.length > 0) {
            this.currentChunkIndex = (this.currentChunkIndex + 1) % this.chunks.length;
            onChunkChange(this.getCurrentChunk(), this.currentChunkIndex, this.chunks.length);
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isPaused = false;
        this.currentChunkIndex = 0;
        this.chunks = [];
    }
}
