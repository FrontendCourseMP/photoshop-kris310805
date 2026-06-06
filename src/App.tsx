import { useState, useRef } from 'react';
import CanvasArea from './components/CanvasArea';
import StatusBar from './components/StatusBar';
import Toolbar from './components/Toolbar';
import './App.css';

export interface ImageDataState {
  width: number;
  height: number;
  colorDepth: number;
  imageData: ImageData | null;
  hasMask: boolean;
}

function App() {
  const [imageState, setImageState] = useState<ImageDataState>({
    width: 0,
    height: 0,
    colorDepth: 0,
    imageData: null,
    hasMask: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateCanvasFromImageData = (imgData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    const ctx = canvas.getContext('2d');
    ctx?.putImageData(imgData, 0, 0);
    setImageState({
      width: imgData.width,
      height: imgData.height,
      colorDepth: 24,
      imageData: imgData,
      hasMask: false,
    });
  };

  return (
    <div className="app">
      <h1>Технологии компьютерной графики - Лаба №1</h1>
      <Toolbar 
        onImageLoaded={updateCanvasFromImageData}
        onGB7Loaded={(imgData, bitsPerPixel, hasMask) => {
          setImageState({
            width: imgData.width,
            height: imgData.height,
            colorDepth: bitsPerPixel,
            imageData: imgData,
            hasMask: hasMask,
          });
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = imgData.width;
            canvas.height = imgData.height;
            canvas.getContext('2d')?.putImageData(imgData, 0, 0);
          }
        }}
      />
      <CanvasArea canvasRef={canvasRef} />
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