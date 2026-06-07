export type InterpolationMethod = 'nearest' | 'bilinear';

// Метод ближайшего соседа
export function nearestNeighbor(
  srcData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const srcWidth = srcData.width;
  const srcHeight = srcData.height;
  const result = new ImageData(targetWidth, targetHeight);
  
  const xRatio = srcWidth / targetWidth;
  const yRatio = srcHeight / targetHeight;
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), srcWidth - 1);
      const srcY = Math.min(Math.floor(y * yRatio), srcHeight - 1);
      
      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      
      result.data[dstIdx] = srcData.data[srcIdx];
      result.data[dstIdx + 1] = srcData.data[srcIdx + 1];
      result.data[dstIdx + 2] = srcData.data[srcIdx + 2];
      result.data[dstIdx + 3] = srcData.data[srcIdx + 3];
    }
  }
  
  return result;
}

// Билинейная интерполяция
export function bilinearInterpolation(
  srcData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const srcWidth = srcData.width;
  const srcHeight = srcData.height;
  const result = new ImageData(targetWidth, targetHeight);
  
  const xRatio = srcWidth / targetWidth;
  const yRatio = srcHeight / targetHeight;
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      
      const x1 = Math.floor(srcX);
      const x2 = Math.min(x1 + 1, srcWidth - 1);
      const y1 = Math.floor(srcY);
      const y2 = Math.min(y1 + 1, srcHeight - 1);
      
      const dx = srcX - x1;
      const dy = srcY - y1;
      
      const idx11 = (y1 * srcWidth + x1) * 4;
      const idx21 = (y1 * srcWidth + x2) * 4;
      const idx12 = (y2 * srcWidth + x1) * 4;
      const idx22 = (y2 * srcWidth + x2) * 4;
      
      for (let c = 0; c < 4; c++) {
        const v11 = srcData.data[idx11 + c];
        const v21 = srcData.data[idx21 + c];
        const v12 = srcData.data[idx12 + c];
        const v22 = srcData.data[idx22 + c];
        
        const top = v11 * (1 - dx) + v21 * dx;
        const bottom = v12 * (1 - dx) + v22 * dx;
        const value = top * (1 - dy) + bottom * dy;
        
        const dstIdx = (y * targetWidth + x) * 4 + c;
        result.data[dstIdx] = Math.round(value);
      }
    }
  }
  
  return result;
}

// Основная функция изменения размера
export function resizeImage(
  imageData: ImageData,
  newWidth: number,
  newHeight: number,
  method: InterpolationMethod
): ImageData {
  if (method === 'nearest') {
    return nearestNeighbor(imageData, newWidth, newHeight);
  } else {
    return bilinearInterpolation(imageData, newWidth, newHeight);
  }
}