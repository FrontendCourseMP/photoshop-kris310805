import { useState, useEffect, useRef } from 'react';

interface LevelsToolProps {
  originalImageData: ImageData | null;
  onApplyLevels: (adjustedImageData: ImageData) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function LevelsTool({ originalImageData, onApplyLevels, isOpen, onClose }: LevelsToolProps) {
  const [blackPoint, setBlackPoint] = useState(0);
  const [whitePoint, setWhitePoint] = useState(255);
  const [gamma, setGamma] = useState(1.0);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!originalImageData || !isOpen || !previewEnabled) return;
    
    // Применяем уровни для предпросмотра
    const newImageData = new ImageData(originalImageData.width, originalImageData.height);
    const pixels = originalImageData.data;
    const range = whitePoint - blackPoint;
    
    for (let i = 0; i < pixels.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let value = pixels[i + c];
        if (value <= blackPoint) {
          value = 0;
        } else if (value >= whitePoint) {
          value = 255;
        } else {
          let normalized = (value - blackPoint) / range;
          normalized = Math.pow(normalized, 1 / gamma);
          value = Math.round(normalized * 255);
        }
        newImageData.data[i + c] = Math.max(0, Math.min(255, value));
      }
      newImageData.data[i + 3] = pixels[i + 3];
    }
    
    onApplyLevels(newImageData);
  }, [blackPoint, whitePoint, gamma, originalImageData, isOpen, previewEnabled, onApplyLevels]);

  const handleApply = () => {
    onClose();
  };

  const handleCancel = () => {
    if (originalImageData) {
      onApplyLevels(originalImageData);
    }
    setBlackPoint(0);
    setWhitePoint(255);
    setGamma(1.0);
    onClose();
  };

  const handleReset = () => {
    setBlackPoint(0);
    setWhitePoint(255);
    setGamma(1.0);
    if (originalImageData) {
      onApplyLevels(originalImageData);
    }
  };

  if (!originalImageData) return null;

  return (
    <dialog ref={dialogRef} className="levels-dialog">
      <div className="levels-content">
        <h2>Уровни (Levels)</h2>
        
        <div className="levels-controls">
          <label>
            <input 
              type="checkbox" 
              checked={previewEnabled} 
              onChange={(e) => setPreviewEnabled(e.target.checked)} 
            />
            Предпросмотр (До/После)
          </label>
        </div>

        <div className="sliders-container">
          <div className="slider-group">
            <label>Точка черного: {blackPoint}</label>
            <input 
              type="range" 
              min="0" 
              max={whitePoint - 1} 
              value={blackPoint}
              onChange={(e) => setBlackPoint(parseInt(e.target.value))}
            />
          </div>
          
          <div className="slider-group">
            <label>Гамма (полутона): {gamma.toFixed(2)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="5.0" 
              step="0.01"
              value={gamma}
              onChange={(e) => setGamma(parseFloat(e.target.value))}
            />
          </div>
          
          <div className="slider-group">
            <label>Точка белого: {whitePoint}</label>
            <input 
              type="range" 
              min={blackPoint + 1} 
              max="255" 
              value={whitePoint}
              onChange={(e) => setWhitePoint(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="levels-buttons">
          <button onClick={handleReset}>Сброс</button>
          <button onClick={handleCancel}>Отмена</button>
          <button onClick={handleApply}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}