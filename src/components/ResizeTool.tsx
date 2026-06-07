import { useState, useEffect, useRef } from 'react';
import { type InterpolationMethod, resizeImage } from '../utils/imageResize';

interface ResizeToolProps {
  originalImageData: ImageData | null;
  onApplyResize: (resizedImageData: ImageData) => void;
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
}

type UnitType = 'percent' | 'pixels';

export default function ResizeTool({
  originalImageData,
  onApplyResize,
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
}: ResizeToolProps) {
  const [unit, setUnit] = useState<UnitType>('percent');
  const [width, setWidth] = useState<number>(100);
  const [height, setHeight] = useState<number>(100);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [method, setMethod] = useState<InterpolationMethod>('bilinear');
  const [showTooltip, setShowTooltip] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  const aspectRatio = currentWidth / currentHeight;

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
      setWidth(100);
      setHeight(100);
      setUnit('percent');
      setMethod('bilinear');
      setKeepAspectRatio(true);
    } else if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [isOpen, currentWidth, currentHeight]);

  const handleWidthChange = (newWidth: number) => {
    if (unit === 'percent') {
      const percent = Math.min(300, Math.max(12, newWidth));
      setWidth(percent);
      if (keepAspectRatio) {
        setHeight(Math.min(300, Math.max(12, percent)));
      }
    } else {
      const maxDim = Math.max(currentWidth, currentHeight) * 3;
      const minDim = Math.max(1, Math.floor(Math.min(currentWidth, currentHeight) * 0.12));
      const clampedWidth = Math.min(maxDim, Math.max(minDim, newWidth));
      setWidth(clampedWidth);
      if (keepAspectRatio) {
        const newHeight = Math.round(clampedWidth / aspectRatio);
        setHeight(Math.min(maxDim, Math.max(minDim, newHeight)));
      }
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (unit === 'percent') {
      const percent = Math.min(300, Math.max(12, newHeight));
      setHeight(percent);
      if (keepAspectRatio) {
        setWidth(Math.min(300, Math.max(12, percent)));
      }
    } else {
      const maxDim = Math.max(currentWidth, currentHeight) * 3;
      const minDim = Math.max(1, Math.floor(Math.min(currentWidth, currentHeight) * 0.12));
      const clampedHeight = Math.min(maxDim, Math.max(minDim, newHeight));
      setHeight(clampedHeight);
      if (keepAspectRatio) {
        const newWidth = Math.round(clampedHeight * aspectRatio);
        setWidth(Math.min(maxDim, Math.max(minDim, newWidth)));
      }
    }
  };

  const getActualDimensions = (): { width: number; height: number } => {
    if (unit === 'percent') {
      const percentW = width / 100;
      const percentH = height / 100;
      return {
        width: Math.round(currentWidth * percentW),
        height: Math.round(currentHeight * percentH),
      };
    }
    return { width, height };
  };

  const getPixelCount = (w: number, h: number): string => {
    const pixels = w * h;
    if (pixels >= 1_000_000) {
      return (pixels / 1_000_000).toFixed(2) + ' MP';
    }
    return pixels.toLocaleString() + ' px';
  };

  const handleApply = () => {
    if (!originalImageData) return;
    
    const dimensions = getActualDimensions();
    const resized = resizeImage(
      originalImageData,
      dimensions.width,
      dimensions.height,
      method
    );
    onApplyResize(resized);
    onClose();
  };

  const getTooltipText = (): string => {
    if (method === 'nearest') {
      return 'Метод ближайшего соседа: быстрый, но может давать пикселизацию. Подходит для увеличения пиксель-арта.';
    }
    return 'Билинейная интерполяция: более плавное масштабирование, учитывает 4 соседних пикселя. Рекомендуется для фотографий.';
  };

  if (!originalImageData) return null;

  const dimensions = getActualDimensions();
  const originalPixels = getPixelCount(currentWidth, currentHeight);
  const newPixels = getPixelCount(dimensions.width, dimensions.height);

  return (
    <dialog ref={dialogRef} className="resize-dialog">
      <div className="resize-content">
        <h2>Масштабирование изображения</h2>
        
        <div className="resize-info">
          <p>Исходный размер: {currentWidth} × {currentHeight} ({originalPixels})</p>
          <p>Новый размер: {dimensions.width} × {dimensions.height} ({newPixels})</p>
        </div>

        <div className="resize-unit-selector">
          <label>
            <input
              type="radio"
              value="percent"
              checked={unit === 'percent'}
              onChange={(e) => {
                setUnit(e.target.value as UnitType);
                setWidth(100);
                setHeight(100);
              }}
            />
            Проценты (12% - 300%)
          </label>
          <label>
            <input
              type="radio"
              value="pixels"
              checked={unit === 'pixels'}
              onChange={(e) => {
                setUnit(e.target.value as UnitType);
                setWidth(currentWidth);
                setHeight(currentHeight);
              }}
            />
            Пиксели
          </label>
        </div>

        <div className="resize-inputs">
          <div className="input-group">
            <label>Ширина:</label>
            <input
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
              min={unit === 'percent' ? 12 : 1}
              max={unit === 'percent' ? 300 : Math.max(currentWidth, currentHeight) * 3}
              step={1}
            />
            <span>{unit === 'percent' ? '%' : 'px'}</span>
          </div>
          
          <div className="input-group">
            <label>Высота:</label>
            <input
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
              min={unit === 'percent' ? 12 : 1}
              max={unit === 'percent' ? 300 : Math.max(currentWidth, currentHeight) * 3}
              step={1}
            />
            <span>{unit === 'percent' ? '%' : 'px'}</span>
          </div>
        </div>

        <div className="resize-aspect">
          <label>
            <input
              type="checkbox"
              checked={keepAspectRatio}
              onChange={(e) => setKeepAspectRatio(e.target.checked)}
            />
            Сохранять пропорции
          </label>
        </div>

        <div className="resize-method">
          <label>
            Метод интерполяции:
            <select value={method} onChange={(e) => setMethod(e.target.value as InterpolationMethod)}>
              <option value="bilinear">Билинейная интерполяция</option>
              <option value="nearest">Ближайший сосед</option>
            </select>
            <span
              className="tooltip-trigger"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              ⓘ
              {showTooltip && <span className="tooltip-text">{getTooltipText()}</span>}
            </span>
          </label>
        </div>

        <div className="resize-buttons">
          <button onClick={onClose}>Отмена</button>
          <button onClick={handleApply}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}