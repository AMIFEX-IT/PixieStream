export interface Frame {
  index: number;
  pixels: Uint8Array; // 128x64 = 8192 pixels, where 0 = black / 1 = white
  isEdited?: boolean;
}

export type OledColorStyle = 'white' | 'blue' | 'green' | 'yellow-blue';

export type DitheringType = 'none' | 'floyd-steinberg' | 'atkinson';

export type PackingMode = 'horizontal' | 'vertical-page';

export interface ConverterSettings {
  fps: number;
  threshold: number;
  dithering: DitheringType;
  invert: boolean;
  brightness: number;  // slider -100 to 100
  contrast: number;    // slider -100 to 100
  packingMode: PackingMode;
  oledColor: OledColorStyle;
  showPixelGrid: boolean;
  compression: 'none' | 'rle';
  startTime: number;
  endTime: number;
}
