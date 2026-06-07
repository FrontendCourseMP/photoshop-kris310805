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

export default function ChannelPanel({ imageData, onChannelsChange }: ChannelPanelProps) {
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

  useEffect(() => {
    if (!imageData) return;

    const generateThumbnail = (getValue: (r: number, g: number, b: number, a: number) => [number, number, number, number]) => {
      const size = 60;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      const imgData = new ImageData(size, size);
      const scaleX = imageData.width / size;
      const scaleY = imageData.height / size;
      
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const srcX = Math.floor(x * scaleX);
          const srcY = Math.floor(y * scaleY);
          const idx = (srcY * imageData.width + srcX) * 4;
          
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          const a = imageData.data[idx + 3];
          
          const [nr, ng, nb, na] = getValue(r, g, b, a);
          const destIdx = (y * size + x) * 4;
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

  if (!imageData) {
    return <div className="channel-panel">Загрузите изображение</div>;
  }

  return (
    <div className="channel-panel">
      <h3>Цветовые каналы</h3>
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