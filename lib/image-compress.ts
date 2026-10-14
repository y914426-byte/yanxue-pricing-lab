/**
 * 客户端图片自动压缩工具
 * 将手机或相机拍摄的高清大图在客户端压缩为高画质轻量 WebP DataURL，
 * 兼顾极致清晰度与毫秒级存储速度，单张仅 80KB ~ 200KB。
 */
export async function compressImageToWebpDataUrl(
  file: File,
  maxWidth = 1280,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('无法创建图片渲染上下文'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // 优先使用 image/webp，如果不支持自动回退为 image/jpeg
        try {
          const dataUrl = canvas.toDataURL('image/webp', quality);
          if (dataUrl.startsWith('data:image/webp')) {
            return resolve(dataUrl);
          }
        } catch {
          // fallback to jpeg
        }
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('图片加载解析失败，请检查文件格式'));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error('读取本地文件失败'));
    reader.readAsDataURL(file);
  });
}
