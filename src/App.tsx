import { useState, useRef, useEffect } from 'react';
import CanvasArea from './components/CanvasArea';
import StatusBar from './components/StatusBar';
import Toolbar from './components/Toolbar';
import ChannelPanel, { type ChannelState } from './components/ChannelPanel';
import ColorInfo from './components/ColorInfo';
import LevelsTool from './components/LevelsTool';
import ResizeTool from './components/ResizeTool';
import { resizeImage } from './utils/imageResize';
import './App.css';

interface ImageDataState {
  width: number;
  height: number;
  colorDepth: number;
  imageData: ImageData | null;
  loadedOriginal: ImageData | null;
  workingOriginal: ImageData | null;
  displayOriginal: ImageData | null;
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
    displayOriginal: null,
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
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
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

  // Применяем масштаб к изображению для отображения
  const applyZoom = (sourceImage: ImageData, zoom: number): ImageData => {
    if (zoom === 100 || !sourceImage) return sourceImage;
    
    const newWidth = Math.round(sourceImage.width * (zoom / 100));
    const newHeight = Math.round(sourceImage.height * (zoom / 100));
    
    return resizeImage(sourceImage, newWidth, newHeight, 'bilinear');
  };

  // Обновляем canvas при изменении каналов или масштаба
  const updateCanvasDisplay = () => {
    if (!imageState.workingOriginal) return;
    
    // Сначала применяем каналы
    const withChannels = applyChannels(imageState.workingOriginal, channelState);
    // Потом применяем масштаб для отображения
    const withZoom = applyZoom(withChannels, zoomLevel);
    
    setImageState(prev => ({ ...prev, imageData: withZoom, displayOriginal: withChannels }));
    
    const canvas = canvasRef.current;
    if (canvas && withZoom) {
      canvas.width = withZoom.width;
      canvas.height = withZoom.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(withZoom, 0, 0);
      }
    }
  };

  useEffect(() => {
    updateCanvasDisplay();
  }, [channelState, zoomLevel, imageState.workingOriginal]);

  // Загрузка нового изображения с авто-масштабированием
  const updateCanvasFromImageData = (imgData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Сохраняем оригиналы
    const loadedCopy = new ImageData(imgData.width, imgData.height);
    loadedCopy.data.set(imgData.data);
    
    const workingCopy = new ImageData(imgData.width, imgData.height);
    workingCopy.data.set(imgData.data);
    
    // Автоматический масштаб, чтобы изображение поместилось в canvas
    const container = document.querySelector('.canvas-container');
    const maxWidth = (container?.clientWidth || 800) - 40;
    const maxHeight = 500;
    let autoZoom = 100;
    
    if (imgData.width > maxWidth || imgData.height > maxHeight) {
      const scaleX = maxWidth / imgData.width;
      const scaleY = maxHeight / imgData.height;
      autoZoom = Math.min(scaleX, scaleY) * 100;
      autoZoom = Math.min(300, Math.max(12, Math.round(autoZoom)));
    }
    
    setZoomLevel(autoZoom);
    
    setImageState({
      width: imgData.width,
      height: imgData.height,
      colorDepth: 24,
      imageData: imgData,
      loadedOriginal: loadedCopy,
      workingOriginal: workingCopy,
      displayOriginal: workingCopy,
      hasMask: false,
    });
    
    setChannelState({ red: true, green: true, blue: true, alpha: true });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive || !colorPickCallback || !imageState.displayOriginal) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = imageState.displayOriginal!.width / rect.width;
    const scaleY = imageState.displayOriginal!.height / rect.height;
    
    let mouseX = (e.clientX - rect.left) * scaleX;
    let mouseY = (e.clientY - rect.top) * scaleY;
    
    mouseX = Math.max(0, Math.min(mouseX, imageState.displayOriginal!.width - 1));
    mouseY = Math.max(0, Math.min(mouseY, imageState.displayOriginal!.height - 1));
    
    const x = Math.floor(mouseX);
    const y = Math.floor(mouseY);
    
    const idx = (y * imageState.displayOriginal!.width + x) * 4;
    const color = {
      r: imageState.displayOriginal!.data[idx],
      g: imageState.displayOriginal!.data[idx + 1],
      b: imageState.displayOriginal!.data[idx + 2],
      a: imageState.displayOriginal!.data[idx + 3],
    };
    colorPickCallback(x, y, color);
  };

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
      displayOriginal: workingCopy,
      hasMask: hasMask,
    });
    setChannelState({ red: true, green: true, blue: true, alpha: true });
    setZoomLevel(100);
  };

  const handleApplyLevels = (adjustedImageData: ImageData) => {
    const newWorkingCopy = new ImageData(adjustedImageData.width, adjustedImageData.height);
    newWorkingCopy.data.set(adjustedImageData.data);
    
    setImageState(prev => ({
      ...prev,
      workingOriginal: newWorkingCopy,
      displayOriginal: newWorkingCopy,
      width: adjustedImageData.width,
      height: adjustedImageData.height,
    }));
  };

  const handleApplyResize = (resizedImageData: ImageData) => {
    const newWorkingCopy = new ImageData(resizedImageData.width, resizedImageData.height);
    newWorkingCopy.data.set(resizedImageData.data);
    
    setImageState(prev => ({
      ...prev,
      workingOriginal: newWorkingCopy,
      displayOriginal: newWorkingCopy,
      width: resizedImageData.width,
      height: resizedImageData.height,
      loadedOriginal: newWorkingCopy,
    }));
    
    setZoomLevel(100);
  };

  return (
    <div className="app">
      <h1>Технологии компьютерной графики - Лаба №4</h1>
      <Toolbar 
        onImageLoaded={updateCanvasFromImageData}
        onGB7Loaded={handleGB7Loaded}
        isEyedropperActive={isEyedropperActive}
        onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
        onOpenLevels={() => setIsLevelsOpen(true)}
        onOpenResize={() => setIsResizeOpen(true)}
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
            imageData={imageState.workingOriginal}
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
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
      />

      <LevelsTool 
        originalImageData={imageState.workingOriginal}
        onApplyLevels={handleApplyLevels}
        isOpen={isLevelsOpen}
        onClose={() => setIsLevelsOpen(false)}
      />

      <ResizeTool 
        originalImageData={imageState.workingOriginal}
        onApplyResize={handleApplyResize}
        isOpen={isResizeOpen}
        onClose={() => setIsResizeOpen(false)}
        currentWidth={imageState.width}
        currentHeight={imageState.height}
      />
    </div>
  );
}

export default App;