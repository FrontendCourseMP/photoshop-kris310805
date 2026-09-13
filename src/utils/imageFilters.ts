export type EdgeHandling = 'black' | 'white' | 'copy';

export const kernels = {
  identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0]
  ],
  sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ],
  gaussian: [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ],
  boxBlur: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
  ],
  prewittX: [
    [-1, 0, 1],
    [-1, 0, 1],
    [-1, 0, 1]
  ],
  prewittY: [
    [-1, -1, -1],
    [0, 0, 0],
    [1, 1, 1]
  ]
};

// Нормализация ядра (для blur/sharp, кроме edge-детекторов)
function normalizeKernel(kernel: number[][]): number[][] {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sum += kernel[i][j];
    }
  }
  // Для ядер Прюитта сумма = 0 — не нормализуем
  if (sum === 0) return kernel;
  return kernel.map((row) => row.map((val) => val / sum));
}

// Обработка краёв
function padImage(
  srcData: ImageData,
  width: number,
  height: number,
  edgeHandling: EdgeHandling
): ImageData {
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;
  const padded = new ImageData(paddedWidth, paddedHeight);

  for (let y = 0; y < paddedHeight; y++) {
    for (let x = 0; x < paddedWidth; x++) {
      let srcX = x - 1;
      let srcY = y - 1;
      let r = 0, g = 0, b = 0, a = 255;

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const idx = (srcY * width + srcX) * 4;
        r = srcData.data[idx];
        g = srcData.data[idx + 1];
        b = srcData.data[idx + 2];
        a = srcData.data[idx + 3];
      } else {
        if (edgeHandling === 'black') {
          r = g = b = 0;
        } else if (edgeHandling === 'white') {
          r = g = b = 255;
        } else {
          // Копирование края
          srcX = Math.max(0, Math.min(width - 1, srcX));
          srcY = Math.max(0, Math.min(height - 1, srcY));
          const idx = (srcY * width + srcX) * 4;
          r = srcData.data[idx];
          g = srcData.data[idx + 1];
          b = srcData.data[idx + 2];
          a = srcData.data[idx + 3];
        }
      }

      const idx = (y * paddedWidth + x) * 4;
      padded.data[idx] = r;
      padded.data[idx + 1] = g;
      padded.data[idx + 2] = b;
      padded.data[idx + 3] = a;
    }
  }

  return padded;
}

// Свёртка для одного канала
function convolveChannel(
  paddedData: ImageData,
  paddedWidth: number,
  paddedHeight: number,
  kernel: number[][],
  channelOffset: number
): number[] {
  const result = new Array(paddedWidth * paddedHeight).fill(0);

  for (let y = 1; y < paddedHeight - 1; y++) {
    for (let x = 1; x < paddedWidth - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = x + kx;
          const py = y + ky;
          const idx = (py * paddedWidth + px) * 4 + channelOffset;
          sum += paddedData.data[idx] * kernel[ky + 1][kx + 1];
        }
      }
      result[y * paddedWidth + x] = Math.max(0, Math.min(255, Math.round(sum)));
    }
  }

  return result;
}

// Основная функция
export function applyFilter(
  srcData: ImageData,
  kernel: number[][],
  edgeHandling: EdgeHandling,
  targetChannel: 'all' | 'red' | 'green' | 'blue' | 'alpha'
): ImageData {
  const width = srcData.width;
  const height = srcData.height;

  const normalizedKernel = normalizeKernel(kernel);

  const padded = padImage(srcData, width, height, edgeHandling);
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;

  let rResult: number[] | null = null;
  let gResult: number[] | null = null;
  let bResult: number[] | null = null;
  let aResult: number[] | null = null;

  if (targetChannel === 'all' || targetChannel === 'red') {
    rResult = convolveChannel(padded, paddedWidth, paddedHeight, normalizedKernel, 0);
  }
  if (targetChannel === 'all' || targetChannel === 'green') {
    gResult = convolveChannel(padded, paddedWidth, paddedHeight, normalizedKernel, 1);
  }
  if (targetChannel === 'all' || targetChannel === 'blue') {
    bResult = convolveChannel(padded, paddedWidth, paddedHeight, normalizedKernel, 2);
  }
  if (targetChannel === 'alpha') {
    aResult = convolveChannel(padded, paddedWidth, paddedHeight, normalizedKernel, 3);
  }

  const result = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const paddedIdx = (y + 1) * paddedWidth + (x + 1);

      result.data[idx] = rResult ? rResult[paddedIdx] : srcData.data[idx];
      result.data[idx + 1] = gResult ? gResult[paddedIdx] : srcData.data[idx + 1];
      result.data[idx + 2] = bResult ? bResult[paddedIdx] : srcData.data[idx + 2];
      result.data[idx + 3] = aResult ? aResult[paddedIdx] : srcData.data[idx + 3];
    }
  }

  return result;
}

// Асинхронная версия — для больших изображений
export async function applyFilterAsync(
  srcData: ImageData,
  kernel: number[][],
  edgeHandling: EdgeHandling,
  targetChannel: 'all' | 'red' | 'green' | 'blue' | 'alpha',
  onProgress?: (percent: number) => void
): Promise<ImageData> {
  const width = srcData.width;
  const height = srcData.height;

  const normalizedKernel = normalizeKernel(kernel);
  const padded = padImage(srcData, width, height, edgeHandling);
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;

  const result = new ImageData(width, height);

  const apply = async (channelOffset: number, target: 'r' | 'g' | 'b' | 'a') => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + 1 + kx;
            const py = y + 1 + ky;
            const idx = (py * paddedWidth + px) * 4 + channelOffset;
            sum += padded.data[idx] * normalizedKernel[ky + 1][kx + 1];
          }
        }
        const idx = (y * width + x) * 4 + channelOffset;
        result.data[idx] = Math.max(0, Math.min(255, Math.round(sum)));
      }

      // Каждые 50 строк — отдаём управление браузеру
      if (y % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (onProgress) {
          onProgress(Math.round((y / height) * 100));
        }
      }
    }
  };

  // Копируем исходные данные для необрабатываемых каналов
  result.data.set(srcData.data);

  if (targetChannel === 'all' || targetChannel === 'red') {
    await apply(0, 'r');
  }
  if (targetChannel === 'all' || targetChannel === 'green') {
    await apply(1, 'g');
  }
  if (targetChannel === 'all' || targetChannel === 'blue') {
    await apply(2, 'b');
  }
  if (targetChannel === 'alpha') {
    await apply(3, 'a');
  }

  return result;
}