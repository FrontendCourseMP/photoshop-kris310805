import { useState, useEffect, useRef } from 'react';
import { kernels, applyFilter, type EdgeHandling } from '../utils/imageFilters';

interface FilterToolProps {
  originalImageData: ImageData | null;
  onApplyFilter: (filteredImageData: ImageData) => void;
  isOpen: boolean;
  onClose: () => void;
}

type KernelPreset = 'identity' | 'sharpen' | 'gaussian' | 'boxBlur' | 'prewittX' | 'prewittY';
type TargetChannel = 'all' | 'red' | 'green' | 'blue' | 'alpha';

export default function FilterTool({
  originalImageData,
  onApplyFilter,
  isOpen,
  onClose,
}: FilterToolProps) {
  const [selectedPreset, setSelectedPreset] = useState<KernelPreset>('identity');
  const [kernelValues, setKernelValues] = useState<number[][]>(() => 
    JSON.parse(JSON.stringify(kernels.identity))
  );
  const [edgeHandling, setEdgeHandling] = useState<EdgeHandling>('copy');
  const [targetChannel, setTargetChannel] = useState<TargetChannel>('all');
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Загрузка предустановленного ядра
  useEffect(() => {
    const newKernel = JSON.parse(JSON.stringify(kernels[selectedPreset]));
    setKernelValues(newKernel);
  }, [selectedPreset]);

  // Применение фильтра для предпросмотра
  useEffect(() => {
    if (!originalImageData || !isOpen || !previewEnabled) return;
    
    const filtered = applyFilter(originalImageData, kernelValues, edgeHandling, targetChannel);
    onApplyFilter(filtered);
  }, [kernelValues, edgeHandling, targetChannel, previewEnabled, originalImageData, isOpen]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
      setSelectedPreset('identity');
      setKernelValues(JSON.parse(JSON.stringify(kernels.identity)));
      setEdgeHandling('copy');
      setTargetChannel('all');
      setPreviewEnabled(true);
    } else if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  const updateKernelValue = (row: number, col: number, value: number) => {
    const newKernel = [...kernelValues];
    newKernel[row][col] = parseFloat(value.toFixed(2));
    setKernelValues(newKernel);
    setSelectedPreset('identity'); // Сбрасываем предустановку при ручном изменении
  };

  const handleReset = () => {
    setKernelValues(JSON.parse(JSON.stringify(kernels.identity)));
    setSelectedPreset('identity');
    setEdgeHandling('copy');
    setTargetChannel('all');
    if (originalImageData) {
      onApplyFilter(originalImageData);
    }
  };

  const handleApply = () => {
    if (originalImageData) {
      const filtered = applyFilter(originalImageData, kernelValues, edgeHandling, targetChannel);
      onApplyFilter(filtered);
    }
    onClose();
  };

  const handleCancel = () => {
    if (originalImageData) {
      onApplyFilter(originalImageData);
    }
    onClose();
  };

  const getKernelDisplayValue = (row: number, col: number): string => {
    const val = kernelValues[row][col];
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  };

  if (!originalImageData) return null;

  return (
    <dialog ref={dialogRef} className="filter-dialog">
      <div className="filter-content">
        <h2>Фильтрация изображения (Свёртка)</h2>
        
        <div className="filter-preview-check">
          <label>
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            Предпросмотр
          </label>
        </div>

        <div className="filter-preset">
          <label>Предустановленные фильтры:</label>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value as KernelPreset)}
          >
            <option value="identity">Тождественное отображение</option>
            <option value="sharpen">Повышение резкости</option>
            <option value="gaussian">Фильтр Гаусса (размытие)</option>
            <option value="boxBlur">Прямоугольное размытие</option>
            <option value="prewittX">Прюитт (горизонтальный)</option>
            <option value="prewittY">Прюитт (вертикальный)</option>
          </select>
        </div>

        <div className="filter-kernel">
          <label>Ядро свёртки (3×3):</label>
          <div className="kernel-grid">
            {kernelValues.map((row, i) => (
              <div key={i} className="kernel-row">
                {row.map((value, j) => (
                  <input
                    key={`${i}-${j}`}
                    type="number"
                    step="0.1"
                    value={getKernelDisplayValue(i, j)}
                    onChange={(e) => updateKernelValue(i, j, parseFloat(e.target.value) || 0)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="filter-options">
          <div className="filter-edge">
            <label>Обработка краёв:</label>
            <select
              value={edgeHandling}
              onChange={(e) => setEdgeHandling(e.target.value as EdgeHandling)}
            >
              <option value="black">Заполнение чёрным</option>
              <option value="white">Заполнение белым</option>
              <option value="copy">Копирование края</option>
            </select>
          </div>

          <div className="filter-channel">
            <label>Применить к каналу:</label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value as TargetChannel)}
            >
              <option value="all">Все каналы (RGB)</option>
              <option value="red">Только Red</option>
              <option value="green">Только Green</option>
              <option value="blue">Только Blue</option>
              <option value="alpha">Только Alpha</option>
            </select>
          </div>
        </div>

        <div className="filter-buttons">
          <button onClick={handleReset}>Сброс</button>
          <button onClick={handleCancel}>Отмена</button>
          <button onClick={handleApply}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}
