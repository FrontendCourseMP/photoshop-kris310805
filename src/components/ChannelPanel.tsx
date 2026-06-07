import { useState, useEffect } from 'react';

export interface ChannelState {
  red: boolean;
  green: boolean;
  blue: boolean;
  alpha: boolean;
}

interface ChannelPanelProps {
  imageData: ImageData | null;
  onChannelsChange: (channels: ChannelState) => void;
}

type ChannelMode = 'grayscale' | 'grayscale-alpha' | 'rgb' | 'rgb-alpha';

export default function ChannelPanel({ imageData, onChannelsChange }: ChannelPanelProps) {
  const [channelState, setChannelState] = useState<ChannelState>({
    red: true,
    green: true,
    blue: true,
    alpha: true,
  });
  const [mode, setMode] = useState<ChannelMode>('rgb-alpha');
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({
    red: '',
    green: '',
    blue: '',
    alpha: '',
  });

  useEffect(() => {
    if (!imageData) return;

    const generateThumbnail = (getValue: (r: number, g: number, b: number, a: number) => [number, number, number, number]) => {
      const width = Math.min(imageData.width, 80);
      const height = Math.min(imageData.height, 80);
      
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

    setThumbnails({
      red: generateThumbnail((r) => [r, 0, 0, 255]),
      green: generateThumbnail((_r, g) => [0, g, 0, 255]),
      blue: generateThumbnail((_r, _g, b) => [0, 0, b, 255]),
      alpha: generateThumbnail((_r, _g, _b, a) => [a, a, a, 255]),
    });
  }, [imageData]);

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

  if (!imageData) {
    return <div className="channel-panel">Загрузите изображение</div>;
  }

  return (
    <div className="channel-panel">
      <h3>Цветовые каналы</h3>
      
      <div className="channel-mode-selector">
        <button className={mode === 'grayscale' ? 'active' : ''} onClick={() => setModeAndChannels('grayscale')}>
          Grayscale
        </button>
        <button className={mode === 'grayscale-alpha' ? 'active' : ''} onClick={() => setModeAndChannels('grayscale-alpha')}>
          Grayscale + Alpha
        </button>
        <button className={mode === 'rgb' ? 'active' : ''} onClick={() => setModeAndChannels('rgb')}>
          RGB
        </button>
        <button className={mode === 'rgb-alpha' ? 'active' : ''} onClick={() => setModeAndChannels('rgb-alpha')}>
          RGB + Alpha
        </button>
      </div>

      <div className="channels-grid">
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
        <div className="channel-item">
          <img src={thumbnails.alpha} alt="Alpha" />
          <label>
            <input type="checkbox" checked={channelState.alpha} onChange={() => toggleChannel('alpha')} />
            Alpha
          </label>
        </div>
      </div>
    </div>
  );
}