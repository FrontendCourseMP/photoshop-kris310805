import { useRef, type RefObject } from 'react';
import { decodeGB7, encodeGB7 } from './GB7Processor';

interface ToolbarProps {
  onImageLoaded: (imageData: ImageData) => void;
  onGB7Loaded: (imageData: ImageData, bitsPerPixel: number, hasMask: boolean) => void;
  isEyedropperActive?: boolean;
  onToggleEyedropper?: () => void;
  onOpenLevels?: () => void;
  onOpenResize?: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export default function Toolbar({ 
  onImageLoaded, 
  onGB7Loaded, 
  isEyedropperActive = false, 
  onToggleEyedropper,
  onOpenLevels,
  onOpenResize,
  canvasRef
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          const imageData = ctx?.getImageData(0, 0, img.width, img.height);
          if (imageData) onImageLoaded(imageData);
        };
        img.src = result;
      } else if (result instanceof ArrayBuffer) {
        try {
          const { imageData, bitsPerPixel, hasMask } = decodeGB7(result);
          onGB7Loaded(imageData, bitsPerPixel, hasMask);
        } catch (error) {
          console.error('Ошибка декодирования GB7:', error);
          alert('Не удалось загрузить GB7 файл');
        }
      }
    };

    if (file.name.endsWith('.gb7')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const downloadAsPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Нет изображения для сохранения');
      return;
    }
    const link = document.createElement('a');
    link.download = 'image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadAsJPG = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Нет изображения для сохранения');
      return;
    }
    const link = document.createElement('a');
    link.download = 'image.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  };

  const downloadAsGB7 = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Нет изображения для сохранения');
      return;
    }
    const ctx = canvas.getContext('2d');
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return;
    
    const gb7Blob = encodeGB7(imageData);
    const link = document.createElement('a');
    link.download = 'image.gb7';
    link.href = URL.createObjectURL(gb7Blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="toolbar">
      <input 
        type="file" 
        ref={fileInputRef}
        accept=".png,.jpg,.jpeg,.gb7"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <button onClick={() => fileInputRef.current?.click()}>📁 Загрузить изображение</button>
      <button onClick={downloadAsPNG}>💾 Скачать как PNG</button>
      <button onClick={downloadAsJPG}>💾 Скачать как JPG</button>
      <button onClick={downloadAsGB7}>💾 Скачать как GB7</button>
      {onToggleEyedropper && (
        <button 
          className={isEyedropperActive ? 'active' : ''}
          onClick={onToggleEyedropper}
        >
          🖌️ Пипетка {isEyedropperActive ? '(ON)' : '(OFF)'}
        </button>
      )}
      {onOpenLevels && (
        <button onClick={onOpenLevels}>
          📊 Уровни (Levels)
        </button>
      )}
      {onOpenResize && (
        <button onClick={onOpenResize}>
          🔍 Масштабирование
        </button>
      )}
    </div>
  );
}