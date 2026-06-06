interface StatusBarProps {
  width: number;
  height: number;
  colorDepth: number;
  hasMask: boolean;
}

export default function StatusBar({ width, height, colorDepth, hasMask }: StatusBarProps) {
  return (
    <div className="status-bar">
      <span>Размер: {width} × {height} пикс.</span>
      <span>Глубина цвета: {colorDepth} бит/пикс {hasMask && '(с маской)'}</span>
    </div>
  );
}