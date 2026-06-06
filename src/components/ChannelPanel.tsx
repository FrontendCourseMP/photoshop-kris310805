import { useState, useEffect } from 'react';

interface ChannelPanelProps {
  originalImageData: ImageData | null;
  onChannelsChange: (channels: ChannelState) => void;
}

export interface ChannelState {
  red: boolean;
  green: boolean;
  blue: boolean;
  alpha: boolean;
}

type ChannelMode = 'grayscale' | 'grayscale-alpha' | 'rgb' | 'rgb-alpha';

export default function ChannelPanel({ originalImageData, onChannelsChange }: ChannelPanelProps) {
  const [channelState, setChannelState] = useState<ChannelState>({
    red: true,
    green: true,
    blue: true,
    alpha: true,
  });
  const [mode, setMode] = useState<ChannelMode>('rgb-alpha');
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});

  // Генерация миниатюр для каждого канала
  useEffect(() => {
    if (!originalImageData) return;

    const generateThumbnail = (channelFilter: (r: number, g: number, b: number, a: number) => [number, number, number, number]) => {
      const canvas = document.createElement('canvas');
      const width = Math.min(originalImageData.width, 100); // Ограничиваем размер миниатюры
      const height = Math.min(originalImageData.height, 100);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Масштабируем изображение для миниатюры
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      const imgData = new ImageData(width, height);
      
      // Простой downsampling
      const scaleX = originalImageData.width / width;
      const scaleY = originalImageData.height / height;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcX = Math.floor(x * scaleX);
          const srcY = Math.floor(y * scaleY);
          const idx = (srcY * originalImageData.width + srcX) * 4;
          
          const r = originalImageData.data[idx];
          const g = originalImageData.data[idx + 1];
          const b = originalImageData.data[idx + 2];
          const a = originalImageData.data[idx + 3];
          
          const [nr, ng, nb, na] = channelFilter(r, g, b, a);
          imgData.data[(y * width + x) * 4] = nr;
          imgData.data[(y * width + x) * 4 + 1] = ng;
          imgData.data[(y * width + x) * 4 + 2] = nb;
          imgData.data[(y * width + x) * 4 + 3] = na;
        }
      }
      
      tempCtx?.putImageData(imgData, 0, 0);
      return tempCanvas.toDataURL();
    };

    const thumbnailsData: { [key: string]: string } = {};

    // Режим 1: Grayscale
    thumbnailsData.grayscale = generateThumbnail((r, g, b, a) => {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return [gray, gray, gray, a];
    });

    // Режим 2: Grayscale + Alpha
    thumbnailsData.grayscaleAlpha = generateThumbnail((r, g, b, a) => {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return [gray, gray, gray, a];
    });

    // RGB каналы отдельно (в градациях серого)
    thumbnailsData.red = generateThumbnail((r) => [r, r, r, 255]);
    thumbnailsData.green = generateThumbnail((r, g) => [g, g, g, 255]);
    thumbnailsData.blue = generateThumbnail((r, g, b) => [b, b, b, 255]);
    
    // Alpha канал (в градациях серого)
    thumbnailsData.alpha = generateThumbnail((r, g, b, a) => [a, a, a, 255]);

    // RGB цветной
    thumbnailsData.rgb = generateThumbnail((r, g, b, a) => [r, g, b, a]);
    
    // RGB + Alpha
    thumbnailsData.rgbAlpha = generateThumbnail((r, g, b, a) => [r, g, b, a]);

    setThumbnails(thumbnailsData);
  }, [originalImageData]);

  const toggleChannel = (channel: keyof ChannelState) => {
    const newState = { ...channelState, [channel]: !channelState[channel] };
    setChannelState(newState);
    onChannelsChange(newState);
  };

  const setModeAndChannels = (newMode: ChannelMode) => {
    setMode(newMode);
    let newChannelState: ChannelState;
    
    switch (newMode) {
      case 'grayscale':
        newChannelState = { red: true, green: true, blue: true, alpha: false };
        break;
      case 'grayscale-alpha':
        newChannelState = { red: true, green: true, blue: true, alpha: true };
        break;
      case 'rgb':
        newChannelState = { red: true, green: true, blue: true, alpha: false };
        break;
      case 'rgb-alpha':
        newChannelState = { red: true, green: true, blue: true, alpha: true };
        break;
    }
    setChannelState(newChannelState);
    onChannelsChange(newChannelState);
  };

  if (!originalImageData) {
    return <div className="channel-panel">Загрузите изображение для просмотра каналов</div>;
  }

  return (
    <div className="channel-panel">
      <h3>Цветовые каналы</h3>
      
      <div className="channel-mode-selector">
        <button 
          className={mode === 'grayscale' ? 'active' : ''}
          onClick={() => setModeAndChannels('grayscale')}
        >
          Grayscale
        </button>
        <button 
          className={mode === 'grayscale-alpha' ? 'active' : ''}
          onClick={() => setModeAndChannels('grayscale-alpha')}
        >
          Grayscale + Alpha
        </button>
        <button 
          className={mode === 'rgb' ? 'active' : ''}
          onClick={() => setModeAndChannels('rgb')}
        >
          RGB
        </button>
        <button 
          className={mode === 'rgb-alpha' ? 'active' : ''}
          onClick={() => setModeAndChannels('rgb-alpha')}
        >
          RGB + Alpha
        </button>
      </div>

      <div className="channels-grid">
        <div className="channel-item">
          <img src={thumbnails.red} alt="Red channel" />
          <label>
            <input 
              type="checkbox" 
              checked={channelState.red} 
              onChange={() => toggleChannel('red')}
            />
            Red
          </label>
        </div>
        
        <div className="channel-item">
          <img src={thumbnails.green} alt="Green channel" />
          <label>
            <input 
              type="checkbox" 
              checked={channelState.green} 
              onChange={() => toggleChannel('green')}
            />
            Green
          </label>
        </div>
        
        <div className="channel-item">
          <img src={thumbnails.blue} alt="Blue channel" />
          <label>
            <input 
              type="checkbox" 
              checked={channelState.blue} 
              onChange={() => toggleChannel('blue')}
            />
            Blue
          </label>
        </div>
        
        <div className="channel-item">
          <img src={thumbnails.alpha} alt="Alpha channel" />
          <label>
            <input 
              type="checkbox" 
              checked={channelState.alpha} 
              onChange={() => toggleChannel('alpha')}
            />
            Alpha
          </label>
        </div>
      </div>
    </div>
  );
}