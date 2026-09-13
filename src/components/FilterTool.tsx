import { useState, useEffect, useRef } from 'react';
import { kernels, applyFilter, applyFilterAsync, type EdgeHandling } from '../utils/imageFilters';

interface FilterToolProps {
  originalImageData: ImageData | null;
  onApplyFilter: (filteredImageData: ImageData) => void;
  isOpen: boolean;
  onClose: () => void;
  colorDepth: number;
}

type KernelPreset =
  | 'identity'
  | 'sharpen'
  | 'gaussian'
  | 'boxBlur'
  | 'prewittX'
  | 'prewittY'
  | 'custom';

type TargetChannel = 'all' | 'red' | 'green' | 'blue' | 'alpha';

export default function FilterTool({
  originalImageData,
  onApplyFilter,
  isOpen,
  onClose,
  colorDepth,
}: FilterToolProps) {
  const [selectedPreset, setSelectedPreset] = useState<KernelPreset>('identity');
  const [kernelValues, setKernelValues] = useState<number[][]>(() =>
    JSON.parse(JSON.stringify(kernels.identity))
  );
  const [edgeHandling, setEdgeHandling] = useState<EdgeHandling>('copy');
  const [targetChannel, setTargetChannel] = useState<TargetChannel>('all');
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Определяем доступные каналы
  const hasAlpha = colorDepth === 32 || colorDepth === 16;
  const isGrayscale = colorDepth === 8 || colorDepth === 16;

  // Открытие/сброс
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
      setSelectedPreset('identity');
      setKernelValues(JSON.parse(JSON.stringify(kernels.identity)));
      setEdgeHandling('copy');
      // Для grayscale ставим 'all', но помним, что это один канал
      setTargetChannel('all');
      setPreviewEnabled(true);
    } else if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  // Применение preset
  const applyPreset = (preset: KernelPreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setKernelValues(JSON.parse(JSON.stringify(kernels[preset])));
    }
  };

  // Ручное изменение ядра → preset становится "custom"
  const updateKernelValue = (row: number, col: number, val: number) => {
    const newKernel = kernelValues.map((r) => [...r]);
    newKernel[row][col] = parseFloat(val.toFixed(2));
    setKernelValues(newKernel);
    setSelectedPreset('custom');
  };

  // Предпросмотр — асинхронно для больших изображений
  useEffect(() => {
    if (!originalImageData || !isOpen || !previewEnabled) return;

    let cancelled = false;
    setIsProcessing(true);

    // Определяем целевой канал правильно
    const effectiveTarget = isGrayscale
      ? ('all' as const) // для grayscale — обрабатываем все (это один канал)
      : targetChannel === 'alpha' && !hasAlpha
      ? 'all'
      : targetChannel;

    const run = async () => {
      try {
        const filtered = await applyFilterAsync(
          originalImageData,
          kernelValues,
          edgeHandling,
          effectiveTarget
        );
        if (!cancelled) {
          onApplyFilter(filtered);
          setIsProcessing(false);
        }
      } catch (e) {
        console.error(e);
        setIsProcessing(false);
      }
    };

    // Небольшая задержка для отзывчивости UI
    const timeout = setTimeout(run, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    kernelValues,
    edgeHandling,
    targetChannel,
    previewEnabled,
    originalImageData,
    isOpen,
    isGrayscale,
    hasAlpha,
  ]);

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
      const effectiveTarget = isGrayscale
        ? 'all'
        : targetChannel === 'alpha' && !hasAlpha
        ? 'all'
        : targetChannel;

      const filtered = applyFilter(
        originalImageData,
        kernelValues,
        edgeHandling,
        effectiveTarget
      );
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
        <h2>🎨 Фильтрация (Свёртка)</h2>

        <div className="filter-preview-check">
          <label>
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            👁️ Предпросмотр
            {isProcessing && <span className="processing"> (обработка...)</span>}
          </label>
        </div>

        <div className="filter-preset">
          <label>📋 Предустановленные фильтры:</label>
          <select
            value={selectedPreset}
            onChange={(e) => applyPreset(e.target.value as KernelPreset)}
          >
            <option value="identity">🟦 Тождественное отображение</option>
            <option value="sharpen">✨ Повышение резкости</option>
            <option value="gaussian">🌫️ Фильтр Гаусса (размытие)</option>
            <option value="boxBlur">📦 Прямоугольное размытие</option>
            <option value="prewittX">➡️ Прюитт (горизонтальные границы)</option>
            <option value="prewittY">⬆️ Прюитт (вертикальные границы)</option>
            {selectedPreset === 'custom' && <option value="custom">✏️ Свой вариант</option>}
          </select>
        </div>

        <div className="filter-kernel">
          <label>🔢 Ядро свёртки (3×3):</label>
          <div className="kernel-grid">
            {kernelValues.map((row, i) => (
              <div key={i} className="kernel-row">
                {row.map((_val, j) => (
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
            <label>🖼️ Обработка краёв:</label>
            <select
              value={edgeHandling}
              onChange={(e) => setEdgeHandling(e.target.value as EdgeHandling)}
            >
              <option value="black">⬛ Заполнение чёрным</option>
              <option value="white">⬜ Заполнение белым</option>
              <option value="copy">📋 Копирование края</option>
            </select>
          </div>

          <div className="filter-channel">
            <label>🎯 Применить к каналу:</label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value as TargetChannel)}
            >
              {isGrayscale ? (
                <>
                  <option value="all">Grayscale</option>
                  {hasAlpha && <option value="alpha">Alpha</option>}
                </>
              ) : (
                <>
                  <option value="all">🌈 Все каналы (RGB)</option>
                  <option value="red">🔴 Только Red</option>
                  <option value="green">🟢 Только Green</option>
                  <option value="blue">🔵 Только Blue</option>
                  {hasAlpha && <option value="alpha">◻️ Только Alpha</option>}
                </>
              )}
            </select>
          </div>
        </div>

        <div className="filter-buttons">
          <button onClick={handleReset}>🔄 Сброс</button>
          <button onClick={handleCancel}>❌ Отмена</button>
          <button onClick={handleApply}>✅ Применить</button>
        </div>
      </div>
    </dialog>
  );
}
