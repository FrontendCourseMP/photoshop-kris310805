interface StatusBarProps {
  width: number;
  height: number;
  colorDepth: number;
  hasMask: boolean;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}

export default function StatusBar({ width, height, colorDepth, hasMask, zoomLevel, onZoomChange }: StatusBarProps) {
  return (
    <div className="status-bar">
      <span>Размер: {width} × {height} пикс.</span>
      <span>Глубина цвета: {colorDepth} бит/пикс {hasMask && '(с маской)'}</span>
      <div className="zoom-control">
        <span>🔍 Масштаб:</span>
        <input
          type="range"
          min="12"
          max="300"
          value={zoomLevel}
          onChange={(e) => onZoomChange(parseInt(e.target.value))}
        />
        <span>{zoomLevel}%</span>
      </div>
    </div>
  );
}