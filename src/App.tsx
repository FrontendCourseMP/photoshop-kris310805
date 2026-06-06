import { useState, useRef, useEffect } from 'react';
import CanvasArea from './components/CanvasArea';
import StatusBar from './components/StatusBar';
import Toolbar from './components/Toolbar';
import ChannelPanel, { type ChannelState } from './components/ChannelPanel';
import ColorInfo from './components/ColorInfo';
import './App.css';

export interface ImageDataState {
  width: number;
  height: number;
  colorDepth: number;
  imageData: ImageData | null;
  originalImageData: ImageData | null; // Храним оригинал для каналов
  hasMask: boolean;
}

function App() {
  const [imageState, setImageState] = useState<ImageDataState>({
    width: 0,
    height: 0,
    colorDepth: 0,
    imageData: null,
    originalImageData: null,
    hasMask: false,
  });
  
  const [channelState, setChannelState] = useState<ChannelState>({
    red: true,
    green: true,
    blue: true,
    alpha: true,
  });
  
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [colorPickCallback, setColorPickCallback] = useState<((x: number, y: number, color: any) => void) | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Применяем каналы к изображению
  const applyChannels = (imageData: ImageData, channels: ChannelState): ImageData => {
    const newImageData = new ImageData(imageData.width, imageData.height);
    const pixels = imageData.data;
    
    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];
      let a = pixels[i + 3];
      
      // Отключаем каналы в соответствии с состоянием
      if (!channels.red) r = 0;
      if (!channels.green) g = 0;
      if (!channels.blue) b = 0;
      if (!channels.alpha) a = 255;
      
      newImageData.data[i] = r;
      newImageData.data[i + 1] = g;
      newImageData.data[i + 2] = b;
      newImageData.data[i + 3] = a;
    }
    
    return newImageData;
  };

  // Обновляем canvas при изменении каналов
  useEffect(() => {
    if (!imageState.originalImageData) return;
    
    const modifiedImageData = applyChannels(imageState.originalImageData, channelState);
    setImageState(prev => ({ ...prev, imageData: modifiedImageData }));
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = modifiedImageData.width;
      canvas.height = modifiedImageData.height;
      canvas.getContext('2d')?.putImageData(modifiedImageData, 0, 0);
    }
  }, [channelState, imageState.originalImageData]);

  const updateCanvasFromImageData = (imgData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Сохраняем оригинал
    const originalCopy = new ImageData(imgData.width, imgData.height);
    originalCopy.data.set(imgData.data);
    
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    canvas.getContext('2d')?.putImageData(imgData, 0, 0);
    
    setImageState({
      width: imgData.width,
      height: imgData.height,
      colorDepth: 24,
      imageData: imgData,
      originalImageData: originalCopy,
      hasMask: false,
    });
    
    // Сбрасываем каналы
    setChannelState({ red: true, green: true, blue: true, alpha: true });
  };

  // Обработчик клика на canvas для пипетки
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive || !colorPickCallback || !imageState.imageData) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const x = Math.floor(mouseX);
    const y = Math.floor(mouseY);
    
    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const idx = (y * canvas.width + x) * 4;
      const color = {
        r: imageState.imageData.data[idx],
        g: imageState.imageData.data[idx + 1],
        b: imageState.imageData.data[idx + 2],
        a: imageState.imageData.data[idx + 3],
      };
      colorPickCallback(x, y, color);
    }
  };

  return (
    <div className="app">
      <h1>Технологии компьютерной графики - Лаба №2</h1>
      <Toolbar 
        onImageLoaded={updateCanvasFromImageData}
        onGB7Loaded={(imgData, bitsPerPixel, hasMask) => {
          const originalCopy = new ImageData(imgData.width, imgData.height);
          originalCopy.data.set(imgData.data);
          
          setImageState({
            width: imgData.width,
            height: imgData.height,
            colorDepth: bitsPerPixel,
            imageData: imgData,
            originalImageData: originalCopy,
            hasMask: hasMask,
          });
          setChannelState({ red: true, green: true, blue: true, alpha: true });
          
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = imgData.width;
            canvas.height = imgData.height;
            canvas.getContext('2d')?.putImageData(imgData, 0, 0);
          }
        }}
        isEyedropperActive={isEyedropperActive}
        onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
      />
      
      <div className="main-content">
        <div className="canvas-section">
            <CanvasArea 
                canvasRef={canvasRef} 
                onClick={handleCanvasClick}
                isEyedropperActive={isEyedropperActive}
            />
        </div>
        
        <div className="sidebar">
          <ChannelPanel 
            originalImageData={imageState.originalImageData}
            onChannelsChange={setChannelState}
          />
          <ColorInfo 
            onPickColor={(callback) => setColorPickCallback(() => callback)}
            isActive={isEyedropperActive}
            onActivate={setIsEyedropperActive}
          />
        </div>
      </div>
      
      <StatusBar 
        width={imageState.width}
        height={imageState.height}
        colorDepth={imageState.colorDepth}
        hasMask={imageState.hasMask}
      />
    </div>
  );
}

export default App;