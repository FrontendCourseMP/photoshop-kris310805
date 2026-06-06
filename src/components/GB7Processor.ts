// Сигнатура файла GB7: "GB7" + 0x1D
const SIGNATURE = new Uint8Array([0x47, 0x42, 0x37, 0x1D]);
const VERSION = 0x01;

export function decodeGB7(arrayBuffer: ArrayBuffer): {
  imageData: ImageData;
  bitsPerPixel: number;
  hasMask: boolean;
} {
  const dataView = new DataView(arrayBuffer);
  let offset = 0;

  // 1. Проверяем сигнатуру (4 байта)
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (dataView.getUint8(offset + i) !== SIGNATURE[i]) {
      throw new Error('Неверная сигнатура GB7 файла');
    }
  }
  offset += 4;

  // 2. Версия (1 байт)
  const version = dataView.getUint8(offset);
  if (version !== VERSION) {
    console.warn(`Версия ${version} не поддерживается, пробуем всё равно`);
  }
  offset += 1;

  // 3. Флаг (1 байт)
  const flags = dataView.getUint8(offset);
  const hasMask = (flags & 0x01) === 1;
  offset += 1;

  // 4. Ширина (2 байта, big-endian)
  const width = dataView.getUint16(offset, false);
  offset += 2;

  // 5. Высота (2 байта, big-endian)
  const height = dataView.getUint16(offset, false);
  offset += 2;

  // 6. Резерв (2 байта) - пропускаем
  offset += 2;

  // 7. Данные пикселей
  const pixelCount = width * height;
  const rawPixels = new Uint8Array(arrayBuffer, offset, pixelCount);

  // Создаём ImageData (RGBA)
  const imageData = new ImageData(width, height);
  
  for (let i = 0; i < pixelCount; i++) {
    const byte = rawPixels[i];
    const grayValue = byte & 0x7F;
    const maskBit = (byte >> 7) & 0x01;

    // 7 бит (0-127) -> 8 бит (0-255)
    const rgb = Math.floor((grayValue / 127) * 255);
    
    let a = 255;
    if (hasMask && maskBit === 0) {
      a = 0;
    }

    imageData.data[i * 4] = rgb;
    imageData.data[i * 4 + 1] = rgb;
    imageData.data[i * 4 + 2] = rgb;
    imageData.data[i * 4 + 3] = a;
  }

  return {
    imageData,
    bitsPerPixel: 7 + (hasMask ? 1 : 0),
    hasMask,
  };
}

export function encodeGB7(imageData: ImageData): Blob {
  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;
  
  // Проверяем, есть ли прозрачные пиксели
  let hasMask = false;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 255) {
      hasMask = true;
      break;
    }
  }

  const headerSize = 12;
  const pixelCount = width * height;
  const buffer = new ArrayBuffer(headerSize + pixelCount);
  const view = new DataView(buffer);
  let offset = 0;

  // Сигнатура
  for (let i = 0; i < SIGNATURE.length; i++) {
    view.setUint8(offset++, SIGNATURE[i]);
  }

  // Версия
  view.setUint8(offset++, VERSION);

  // Флаг
  let flags = 0;
  if (hasMask) flags |= 0x01;
  view.setUint8(offset++, flags);

  // Ширина
  view.setUint16(offset, width, false);
  offset += 2;

  // Высота
  view.setUint16(offset, height, false);
  offset += 2;

  // Резерв
  view.setUint16(offset, 0, false);
  offset += 2;

  // Пиксельные данные
  const pixelData = new Uint8Array(buffer, offset, pixelCount);
  
  for (let i = 0; i < pixelCount; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const a = pixels[i * 4 + 3];
    
    // Яркость по формуле
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const gray7 = Math.floor((gray / 255) * 127);
    
    let byte = gray7 & 0x7F;
    
    if (hasMask) {
      const maskBit = a >= 128 ? 1 : 0;
      byte |= (maskBit << 7);
    }
    
    pixelData[i] = byte;
  }

  return new Blob([buffer], { type: 'application/octet-stream' });
}