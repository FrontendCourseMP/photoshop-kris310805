import { useState, useRef, useEffect } from 'react';
import CanvasArea from './components/CanvasArea';
import StatusBar from './components/StatusBar';
import Toolbar from './components/Toolbar';
import ChannelPanel, { type ChannelState } from './components/ChannelPanel';
import ColorInfo from './components/ColorInfo';
import LevelsTool from './components/LevelsTool';
import './App.css';

export interface ImageDataState {
  width: number;
  height: number;
  colorDepth: number;
  imageData: ImageData | null;
  loadedOriginal: ImageData | null;
  workingOriginal: ImageData | null;
  hasMask: boolean;
}

function App() {
  const [imageState, setImageState] = useState<ImageDataState>({
    width: 0,
    height: 0,
    colorDepth: 0,
    imageData: null,
    loadedOriginal: null,
    workingOriginal: null,
    hasMask: false,
  });
  
  const [channelState, setChannelState] = useState<ChannelState>({
    red: true,
    green: true,
    blue: true,
    alpha: true,
  });
  
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [colorPickCallback, setColorPickCallback] = useState<((x: number, y: number, color: any) => void) | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Применяем каналы к изображению
  const applyChannels = (imageData: ImageData, channels: ChannelState): ImageData => {
    if (!imageData) return imageData;
    
    const newImageData = new ImageData(imageData.width, imageData.height);
    const pixels = imageData.data;
    
    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];
      let a = pixels[i + 3];
      
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
    if (!imageState.workingOriginal) return;
    
    const modifiedImageData = applyChannels(imageState.workingOriginal, channelState);
    setImageState(prev => ({ ...prev, imageData: modifiedImageData }));
    
    const canvas = canvasRef.current;
    if (canvas && modifiedImageData) {
      canvas.width = modifiedImageData.width;
      canvas.height = modifiedImageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(modifiedImageData, 0, 0);
      }
    }
  }, [channelState, imageState.workingOriginal]);

  // Загрузка нового изображения
  const updateCanvasFromImageData = (imgData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Сохраняем загруженный оригинал (никогда не меняется)
    const loadedCopy = new ImageData(imgData.width, imgData.height);
    loadedCopy.data.set(imgData.data);
    
    // Сохраняем рабочий оригинал (будет меняться после уровней)
    const workingCopy = new ImageData(imgData.width, imgData.height);
    workingCopy.data.set(imgData.data);
    
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imgData, 0, 0);
    }
    
    setImageState({
      width: imgData.width,
      height: imgData.height,
      colorDepth: 24,
      imageData: imgData,
      loadedOriginal: loadedCopy,
      workingOriginal: workingCopy,
      hasMask: false,
    });
    
    // Сбрасываем каналы
    setChannelState({ red: true, green: true, blue: true, alpha: true });
  };

  // Обработчик клика для пипетки
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive || !colorPickCallback || !imageState.imageData) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let mouseX = (e.clientX - rect.left) * scaleX;
    let mouseY = (e.clientY - rect.top) * scaleY;
    
    mouseX = Math.max(0, Math.min(mouseX, canvas.width - 1));
    mouseY = Math.max(0, Math.min(mouseY, canvas.height - 1));
    
    const x = Math.floor(mouseX);
    const y = Math.floor(mouseY);
    
    const idx = (y * canvas.width + x) * 4;
    const color = {
      r: imageState.imageData.data[idx],
      g: imageState.imageData.data[idx + 1],
      b: imageState.imageData.data[idx + 2],
      a: imageState.imageData.data[idx + 3],
    };
    colorPickCallback(x, y, color);
  };

  // Обработчик загрузки GB7
  const handleGB7Loaded = (imgData: ImageData, bitsPerPixel: number, hasMask: boolean) => {
    const loadedCopy = new ImageData(imgData.width, imgData.height);
    loadedCopy.data.set(imgData.data);
    
    const workingCopy = new ImageData(imgData.width, imgData.height);
    workingCopy.data.set(imgData.data);
    
    setImageState({
      width: imgData.width,
      height: imgData.height,
      colorDepth: bitsPerPixel,
      imageData: imgData,
      loadedOriginal: loadedCopy,
      workingOriginal: workingCopy,
      hasMask: hasMask,
    });
    setChannelState({ red: true, green: true, blue: true, alpha: true });
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = imgData.width;
      canvas.height = imgData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imgData, 0, 0);
      }
    }
  };

  // Обработчик применения уровней
  const handleApplyLevels = (adjustedImageData: ImageData) => {
    // Обновляем только workingOriginal, loadedOriginal остаётся нетронутым
    const newWorkingCopy = new ImageData(adjustedImageData.width, adjustedImageData.height);
    newWorkingCopy.data.set(adjustedImageData.data);
    
    setImageState(prev => ({
      ...prev,
      imageData: adjustedImageData,
      workingOriginal: newWorkingCopy,
      width: adjustedImageData.width,
      height: adjustedImageData.height,
    }));
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = adjustedImageData.width;
      canvas.height = adjustedImageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(adjustedImageData, 0, 0);
      }
    }
  };

  return (
    <div className="app">
      <h1>Технологии компьютерной графики - Лаба №3</h1>
      <Toolbar 
        onImageLoaded={updateCanvasFromImageData}
        onGB7Loaded={handleGB7Loaded}
        isEyedropperActive={isEyedropperActive}
        onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
        onOpenLevels={() => setIsLevelsOpen(true)}
        canvasRef={canvasRef}
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
            originalImageData={imageState.workingOriginal}
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

      <LevelsTool 
        originalImageData={imageState.workingOriginal}
        onApplyLevels={handleApplyLevels}
        isOpen={isLevelsOpen}
        onClose={() => setIsLevelsOpen(false)}
      />
    </div>
  );
}

export default App;