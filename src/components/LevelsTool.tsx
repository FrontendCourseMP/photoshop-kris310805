import { useState, useEffect, useRef } from 'react';

interface LevelsToolProps {
  originalImageData: ImageData | null;
  onApplyLevels: (adjustedImageData: ImageData) => void;
  isOpen: boolean;
  onClose: () => void;
}

type ChannelType = 'master' | 'red' | 'green' | 'blue' | 'alpha';

interface ChannelLevels {
  inputBlack: number;
  inputWhite: number;
  gamma: number;
}

const DEFAULT_LEVELS: ChannelLevels = {
  inputBlack: 0,
  inputWhite: 255,
  gamma: 1.0,
};

export default function LevelsTool({
  originalImageData,
  onApplyLevels,
  isOpen,
  onClose,
}: LevelsToolProps) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('master');
  const [allLevels, setAllLevels] = useState<Record<ChannelType, ChannelLevels>>({
    master: { ...DEFAULT_LEVELS },
    red: { ...DEFAULT_LEVELS },
    green: { ...DEFAULT_LEVELS },
    blue: { ...DEFAULT_LEVELS },
    alpha: { ...DEFAULT_LEVELS },
  });
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Открытие/закрытие диалога
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  // Сброс при открытии
  useEffect(() => {
    if (isOpen) {
      setSelectedChannel('master');
      setAllLevels({
        master: { ...DEFAULT_LEVELS },
        red: { ...DEFAULT_LEVELS },
        green: { ...DEFAULT_LEVELS },
        blue: { ...DEFAULT_LEVELS },
        alpha: { ...DEFAULT_LEVELS },
      });
      setPreviewEnabled(true);
    }
  }, [isOpen]);

  // Применяем уровни для предпросмотра
  useEffect(() => {
    if (!originalImageData || !isOpen || !previewEnabled) return;

    const adjusted = applyLevels(originalImageData, allLevels);
    onApplyLevels(adjusted);
  }, [allLevels, originalImageData, isOpen, previewEnabled]);

  // Функция применения уровней
  const applyLevels = (
    img: ImageData,
    levels: Record<ChannelType, ChannelLevels>
  ): ImageData => {
    const result = new ImageData(img.width, img.height);
    const data = img.data;

    // Создаём LUT для каждого канала
    const makeLUT = (lv: ChannelLevels): number[] => {
      const lut = new Array(256);
      const range = lv.inputWhite - lv.inputBlack;
      for (let i = 0; i < 256; i++) {
        let v = i;
        if (v <= lv.inputBlack) v = 0;
        else if (v >= lv.inputWhite) v = 255;
        else {
          const norm = (v - lv.inputBlack) / range;
          v = Math.round(Math.pow(norm, 1 / lv.gamma) * 255);
        }
        lut[i] = Math.max(0, Math.min(255, v));
      }
      return lut;
    };

    const masterLUT = makeLUT(levels.master);
    const redLUT = makeLUT(levels.red);
    const greenLUT = makeLUT(levels.green);
    const blueLUT = makeLUT(levels.blue);
    const alphaLUT = makeLUT(levels.alpha);

    for (let i = 0; i < data.length; i += 4) {
      // Применяем master первым, потом канальные
      let r = masterLUT[data[i]];
      let g = masterLUT[data[i + 1]];
      let b = masterLUT[data[i + 2]];
      let a = data[i + 3];

      r = redLUT[r];
      g = greenLUT[g];
      b = blueLUT[b];
      a = alphaLUT[a];

      result.data[i] = r;
      result.data[i + 1] = g;
      result.data[i + 2] = b;
      result.data[i + 3] = a;
    }

    return result;
  };

  const currentLevels = allLevels[selectedChannel];

  const updateLevel = (field: keyof ChannelLevels, value: number) => {
    setAllLevels((prev) => {
      const current = prev[selectedChannel];
      const updated = { ...current, [field]: value };

      // Валидация: чёрный < белый, минимум 1 пиксель разницы
      if (field === 'inputBlack') {
        updated.inputBlack = Math.min(Math.max(0, value), current.inputWhite - 1);
      } else if (field === 'inputWhite') {
        updated.inputWhite = Math.max(Math.min(255, value), current.inputBlack + 1);
      } else if (field === 'gamma') {
        updated.gamma = Math.max(0.1, Math.min(5, value));
      }

      return { ...prev, [selectedChannel]: updated };
    });
  };

  const handleReset = () => {
    const reset = {
      master: { ...DEFAULT_LEVELS },
      red: { ...DEFAULT_LEVELS },
      green: { ...DEFAULT_LEVELS },
      blue: { ...DEFAULT_LEVELS },
      alpha: { ...DEFAULT_LEVELS },
    };
    setAllLevels(reset);
    if (originalImageData) {
      onApplyLevels(originalImageData);
    }
  };

  const handleCancel = () => {
    if (originalImageData) {
      onApplyLevels(originalImageData);
    }
    onClose();
  };

  const handleApply = () => {
    if (originalImageData) {
      const adjusted = applyLevels(originalImageData, allLevels);
      onApplyLevels(adjusted);
    }
    onClose();
  };

  if (!originalImageData) return null;

  return (
    <dialog ref={dialogRef} className="levels-dialog">
      <div className="levels-content">
        <h2>📊 Уровни (Levels)</h2>

        <div className="levels-controls">
          <label>
            Канал:
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as ChannelType)}
            >
              <option value="master">Master (RGB)</option>
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="alpha">Alpha</option>
            </select>
          </label>

          <label>
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            👁️ Предпросмотр
          </label>
        </div>

        <div className="sliders-container">
          <div className="slider-group">
            <label>
              Точка чёрного: <strong>{currentLevels.inputBlack}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="254"
              value={currentLevels.inputBlack}
              onChange={(e) => updateLevel('inputBlack', parseInt(e.target.value))}
            />
          </div>

          <div className="slider-group">
            <label>
              Гамма: <strong>{currentLevels.gamma.toFixed(2)}</strong>
            </label>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.01"
              value={currentLevels.gamma}
              onChange={(e) => updateLevel('gamma', parseFloat(e.target.value))}
            />
          </div>

          <div className="slider-group">
            <label>
              Точка белого: <strong>{currentLevels.inputWhite}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="255"
              value={currentLevels.inputWhite}
              onChange={(e) => updateLevel('inputWhite', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="levels-values">
          <span>
            Чёрный: {currentLevels.inputBlack} | Белый: {currentLevels.inputWhite} |
            Диапазон: {currentLevels.inputWhite - currentLevels.inputBlack}
          </span>
        </div>

        <div className="levels-buttons">
          <button onClick={handleReset}>🔄 Сброс</button>
          <button onClick={handleCancel}>❌ Отмена</button>
          <button onClick={handleApply}>✅ Применить</button>
        </div>
      </div>
    </dialog>
  );
}