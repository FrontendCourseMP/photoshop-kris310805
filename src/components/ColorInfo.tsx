import { useState } from 'react';

interface ColorInfoProps {
  onPickColor: (callback: (x: number, y: number, color: RGBColor) => void) => void;
  isActive: boolean;
  onActivate: (active: boolean) => void;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export default function ColorInfo({ onPickColor, isActive, onActivate }: ColorInfoProps) {
  const [color, setColor] = useState<RGBColor | null>(null);
  const [coordinates, setCoordinates] = useState<{ x: number; y: number } | null>(null);
  const [labColor, setLabColor] = useState<LabColor | null>(null);

  const rgbToLab = (r: number, g: number, b: number): LabColor => {
    let var_R = r / 255;
    let var_G = g / 255;
    let var_B = b / 255;

    const toXYZ = (channel: number) => {
      if (channel > 0.04045) {
        return Math.pow((channel + 0.055) / 1.055, 2.4);
      }
      return channel / 12.92;
    };

    var_R = toXYZ(var_R);
    var_G = toXYZ(var_G);
    var_B = toXYZ(var_B);

    const x = var_R * 0.4124564 + var_G * 0.3575761 + var_B * 0.1804375;
    const y = var_R * 0.2126729 + var_G * 0.7151522 + var_B * 0.0721750;
    const z = var_R * 0.0193339 + var_G * 0.1191920 + var_B * 0.9503041;

    const toLab = (value: number) => {
      const epsilon = 0.008856;
      const kappa = 903.3;
      
      if (value > epsilon) {
        return Math.pow(value, 1/3);
      }
      return (kappa * value + 16) / 116;
    };

    const xRef = 0.95047;
    const yRef = 1.0;
    const zRef = 1.08883;

    const xr = toLab(x / xRef);
    const yr = toLab(y / yRef);
    const zr = toLab(z / zRef);

    const L = Math.max(0, Math.min(100, 116 * yr - 16));
    const aVal = 500 * (xr - yr);
    const bVal = 200 * (yr - zr);

    return {
      L: Math.round(L * 100) / 100,
      a: Math.round(aVal * 100) / 100,
      b: Math.round(bVal * 100) / 100,
    };
  };

  const handleColorPick = (x: number, y: number, rgb: RGBColor) => {
    setCoordinates({ x, y });
    setColor(rgb);
    setLabColor(rgbToLab(rgb.r, rgb.g, rgb.b));
  };

  useState(() => {
    onPickColor(handleColorPick);
  });

  return (
    <div className="color-info">
      <div className="color-info-header">
        <h3>Информация о цвете</h3>
        <button 
          className={isActive ? 'active' : ''}
          onClick={() => onActivate(!isActive)}
        >
          🖌️ Пипетка {isActive ? '(активна)' : ''}
        </button>
      </div>
      
      {color && coordinates ? (
        <div className="color-details">
          <div 
            className="color-preview" 
            style={{ backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})` }}
          />
          <div className="color-values">
            <p><strong>Координаты:</strong> X={coordinates.x}, Y={coordinates.y}</p>
            <p><strong>RGB:</strong> {color.r}, {color.g}, {color.b}</p>
            <p><strong>Alpha:</strong> {color.a}</p>
            {labColor && (
              <>
                <p><strong>CIELAB:</strong></p>
                <p>L* = {labColor.L}</p>
                <p>a* = {labColor.a}</p>
                <p>b* = {labColor.b}</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="color-placeholder">
          {isActive ? 'Кликните на изображение, чтобы выбрать цвет' : 'Активируйте пипетку, чтобы выбрать цвет'}
        </p>
      )}
    </div>
  );
}