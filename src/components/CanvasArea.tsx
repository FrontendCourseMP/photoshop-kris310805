import { type RefObject } from 'react';

interface CanvasAreaProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export default function CanvasArea({ canvasRef }: CanvasAreaProps) {
  return (
    <div className="canvas-container">
      <canvas 
        ref={canvasRef} 
        style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc' }} 
      />
    </div>
  );
}