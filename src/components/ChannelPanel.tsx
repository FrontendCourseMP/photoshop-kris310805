import { useState, useEffect } from 'react';

export interface ChannelState {
  red: boolean;
  green: boolean;
  blue: boolean;
  alpha: boolean;
}

interface ChannelPanelProps {
  imageData: ImageData | null;
  colorDepth: number;
  onChannelsChange: (channels: ChannelState) => void;
}

export default function ChannelPanel({ imageData, colorDepth, onChannelsChange }: ChannelPanelProps) {
  const [channelState, setChannelState] = useState<ChannelState>({
    red: true,
    green: true,
    blue: true,
    alpha: true,
  });
  const [thumbnails, setThumbnails] = useState({
    red: '',
    green: '',
    blue: '',
    alpha: '',
  });

  // Определяем доступные каналы по глубине цвета
  // 8 бит  = grayscale (1 канал)
  // 16 бит = grayscale + alpha (2 канала)
  // 24 бит = RGB (3 канала)
  // 32 бит = RGBA (4 канала)
  const hasAlpha = colorDepth === 32 || colorDepth === 16;
  const isGrayscale = colorDepth === 8 || colorDepth === 16;
  const hasRGB = colorDepth === 24 || colorDepth === 32;

  useEffect(() => {
    if (!imageData) return;

    const generateThumbnail = (
      getValue: (r: number, g: number, b: number, a: number) => [number, number, number, number]
    ) => {
      // Сохраняем пропорции изображения
      const maxSize = 70;
      const ratio = imageData.width / imageData.height;
      let width: number;
      let height: number;

      if (ratio >= 1) {
        // Широкое изображение
        width = maxSize;
        height = Math.round(maxSize / ratio);
      } else {
        // Высокое изображение
        height = maxSize;
        width = Math.round(maxSize * ratio);
      }

      // Не даём размерам уйти ниже 30px, чтобы превью было видно
      width = Math.max(width, 30);
      height = Math.max(height, 30);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const imgData = new ImageData(width, height);
      const scaleX = imageData.width / width;
      const scaleY = imageData.height / height;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcX = Math.floor(x * scaleX);
          const srcY = Math.floor(y * scaleY);
          const idx = (srcY * imageData.width + srcX) * 4;

          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          const a = imageData.data[idx + 3];

          const [nr, ng, nb, na] = getValue(r, g, b, a);
          const destIdx = (y * width + x) * 4;
          imgData.data[destIdx] = nr;
          imgData.data[destIdx + 1] = ng;
          imgData.data[destIdx + 2] = nb;
          imgData.data[destIdx + 3] = na;
        }
      }

      ctx?.putImageData(imgData, 0, 0);
      return canvas.toDataURL();
    };

    const newThumbs = {
      red: '',
      green: '',
      blue: '',
      alpha: '',
    };

    if (isGrayscale) {
      // Grayscale: показываем серый канал вместо трёх цветных
      const grayThumb = generateThumbnail((r, g, b, a) => {
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        return [gray, gray, gray, a];
      });
      newThumbs.red = grayThumb; // Используем слот red, но показываем серый
    } else {
      newThumbs.red = generateThumbnail((r) => [r, 0, 0, 255]);
      newThumbs.green = generateThumbnail((_r, g) => [0, g, 0, 255]);
      newThumbs.blue = generateThumbnail((_r, _g, b) => [0, 0, b, 255]);
    }

    if (hasAlpha) {
      newThumbs.alpha = generateThumbnail((_r, _g, _b, a) => [a, a, a, 255]);
    }

    setThumbnails(newThumbs);
  }, [imageData, colorDepth, isGrayscale, hasAlpha]);

  const toggleChannel = (channel: keyof ChannelState) => {
    const newState = { ...channelState, [channel]: !channelState[channel] };
    setChannelState(newState);
    onChannelsChange(newState);
  };

  if (!imageData) {
    return (
      <div className="channel-panel">
        <h3>Цветовые каналы</h3>
        <p className="channel-placeholder">Загрузите изображение</p>
      </div>
    );
  }

  // Формируем список видимых каналов
  const renderGrayscaleChannel = () => (
    <div className="channel-item" key="grayscale">
      <img src={thumbnails.red} alt="Grayscale" />
      <label>
        <input type="checkbox" checked={channelState.red} onChange={() => toggleChannel('red')} />
        Grayscale
      </label>
    </div>
  );

  const renderRGBChannels = () => (
    <>
      <div className="channel-item">
        <img src={thumbnails.red} alt="Red" />
        <label>
          <input type="checkbox" checked={channelState.red} onChange={() => toggleChannel('red')} />
          Red
        </label>
      </div>
      <div className="channel-item">
        <img src={thumbnails.green} alt="Green" />
        <label>
          <input type="checkbox" checked={channelState.green} onChange={() => toggleChannel('green')} />
          Green
        </label>
      </div>
      <div className="channel-item">
        <img src={thumbnails.blue} alt="Blue" />
        <label>
          <input type="checkbox" checked={channelState.blue} onChange={() => toggleChannel('blue')} />
          Blue
        </label>
      </div>
    </>
  );

  const renderAlphaChannel = () => (
    <div className="channel-item">
      <img src={thumbnails.alpha} alt="Alpha" />
      <label>
        <input type="checkbox" checked={channelState.alpha} onChange={() => toggleChannel('alpha')} />
        Alpha
      </label>
    </div>
  );

  return (
    <div className="channel-panel">
      <h3>Цветовые каналы</h3>
      <p className="channel-info">
        {colorDepth} бит · {isGrayscale ? 'Grayscale' : 'RGB'}{hasAlpha ? ' + Alpha' : ''}
      </p>
      <div className={`channels-grid ${isGrayscale && !hasAlpha ? 'single' : ''}`}>
        {isGrayscale ? renderGrayscaleChannel() : renderRGBChannels()}
        {hasAlpha && renderAlphaChannel()}
      </div>
    </div>
  );
}