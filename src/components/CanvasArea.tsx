import { type RefObject } from 'react';

interface CanvasAreaProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  isEyedropperActive?: boolean;
}

export default function CanvasArea({ canvasRef, onClick, isEyedropperActive = false }: CanvasAreaProps) {
  return (
    <div className="canvas-container">
      <canvas 
        ref={canvasRef} 
        onClick={onClick}
        style={{ 
          maxWidth: '100%', 
          height: 'auto', 
          border: '1px solid #ccc',
          display: 'block',
          cursor: isEyedropperActive ? 'crosshair' : 'default'
        }} 
      />
    </div>
  );
}