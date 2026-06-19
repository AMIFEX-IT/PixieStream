import { DitheringType, PackingMode } from '../types';

/**
 * Applies brightness and contrast adjustments to RGB channels.
 * contrast range: -100 to 100, brightness range: -100 to 100
 */
export function adjustPixel(r: number, g: number, b: number, brightness: number, contrast: number): [number, number, number] {
  // Apply brightness
  let nr = r + brightness;
  let ng = g + brightness;
  let nb = b + brightness;

  // Apply contrast
  if (contrast !== 0) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    nr = factor * (nr - 128) + 128;
    ng = factor * (ng - 128) + 128;
    nb = factor * (nb - 128) + 128;
  }

  // Clamp values
  return [
    Math.max(0, Math.min(255, nr)),
    Math.max(0, Math.min(255, ng)),
    Math.max(0, Math.min(255, nb)),
  ];
}

/**
 * Converts full RGBA frame data into a monochromatic Uint8Array of size 128x64 (8192 pixels, 0 or 1)
 */
export function binarizeFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number,
  dithering: DitheringType,
  brightness: number,
  contrast: number
): Uint8Array {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const pixels = new Uint8Array(width * height);

  // Helper to get index
  const getIdx = (x: number, y: number) => (y * width + x) * 4;

  if (dithering === 'none') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = getIdx(x, y);
        const [r, g, b] = adjustPixel(data[i], data[i + 1], data[i + 2], brightness, contrast);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        pixels[y * width + x] = luminance >= threshold ? 1 : 0;
      }
    }
  } else if (dithering === 'floyd-steinberg') {
    // We need a float array of luminance values to accumulate errors
    const lumArr = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = getIdx(x, y);
        const [r, g, b] = adjustPixel(data[i], data[i + 1], data[i + 2], brightness, contrast);
        lumArr[y * width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    }

    // Process row by row
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = lumArr[idx];
        const newVal = oldVal >= threshold ? 255 : 0;
        pixels[idx] = newVal === 255 ? 1 : 0;
        const err = oldVal - newVal;

        // Distribute error
        if (x + 1 < width) lumArr[idx + 1] += err * (7 / 16);
        if (y + 1 < height) {
          if (x - 1 >= 0) lumArr[idx - 1 + width] += err * (3 / 16);
          lumArr[idx + width] += err * (5 / 16);
          if (x + 1 < width) lumArr[idx + 1 + width] += err * (1 / 16);
        }
      }
    }
  } else if (dithering === 'atkinson') {
    const lumArr = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = getIdx(x, y);
        const [r, g, b] = adjustPixel(data[i], data[i + 1], data[i + 2], brightness, contrast);
        lumArr[y * width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = lumArr[idx];
        const newVal = oldVal >= threshold ? 255 : 0;
        pixels[idx] = newVal === 255 ? 1 : 0;
        const err = oldVal - newVal;
        const fraction = err / 8; // Atkinson distributes 1/8 to six neighbors

        // Error diffusion neighbors
        if (x + 1 < width) lumArr[idx + 1] += fraction;
        if (x + 2 < width) lumArr[idx + 2] += fraction;
        if (y + 1 < height) {
          if (x - 1 >= 0) lumArr[idx - 1 + width] += fraction;
          lumArr[idx + width] += fraction;
          if (x + 1 < width) lumArr[idx + 1 + width] += fraction;
        }
        if (y + 2 < height) {
          lumArr[idx + (width * 2)] += fraction;
        }
      }
    }
  }

  return pixels;
}

/**
 * Converts ImageData directly without canvas context dependence for ultra-fast reactive slider changes.
 */
export function binarizeImageData(
  imgData: ImageData,
  width: number,
  height: number,
  threshold: number,
  dithering: DitheringType,
  brightness: number,
  contrast: number
): Uint8Array {
  const data = imgData.data;
  const pixels = new Uint8Array(width * height);

  // Helper to get index
  const getIdx = (x: number, y: number) => (y * width + x) * 4;

  if (dithering === 'none') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = getIdx(x, y);
        const [r, g, b] = adjustPixel(data[i], data[i + 1], data[i + 2], brightness, contrast);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        pixels[y * width + x] = luminance >= threshold ? 1 : 0;
      }
    }
  } else if (dithering === 'floyd-steinberg') {
    const lumArr = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = getIdx(x, y);
        const [r, g, b] = adjustPixel(data[i], data[i + 1], data[i + 2], brightness, contrast);
        lumArr[y * width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = lumArr[idx];
        const newVal = oldVal >= threshold ? 255 : 0;
        pixels[idx] = newVal === 255 ? 1 : 0;
        const err = oldVal - newVal;

        if (x + 1 < width) lumArr[idx + 1] += err * (7 / 16);
        if (y + 1 < height) {
          if (x - 1 >= 0) lumArr[idx - 1 + width] += err * (3 / 16);
          lumArr[idx + width] += err * (5 / 16);
          if (x + 1 < width) lumArr[idx + 1 + width] += err * (1 / 16);
        }
      }
    }
  } else if (dithering === 'atkinson') {
    const lumArr = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = getIdx(x, y);
        const [r, g, b] = adjustPixel(data[i], data[i + 1], data[i + 2], brightness, contrast);
        lumArr[y * width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = lumArr[idx];
        const newVal = oldVal >= threshold ? 255 : 0;
        pixels[idx] = newVal === 255 ? 1 : 0;
        const err = oldVal - newVal;
        const fraction = err / 8;

        if (x + 1 < width) lumArr[idx + 1] += fraction;
        if (x + 2 < width) lumArr[idx + 2] += fraction;
        if (y + 1 < height) {
          if (x - 1 >= 0) lumArr[idx - 1 + width] += fraction;
          lumArr[idx + width] += fraction;
          if (x + 1 < width) lumArr[idx + 1 + width] += fraction;
        }
        if (y + 2 < height) {
          lumArr[idx + (width * 2)] += fraction;
        }
      }
    }
  }

  return pixels;
}

/**
 * Packs 8192-pixel layout (128x64) into 1024 bytes based on vertical or horizontal settings.
 */
export function packFrame(
  pixels: Uint8Array,
  mode: PackingMode,
  invert: boolean
): Uint8Array {
  const packed = new Uint8Array(1024);

  if (mode === 'horizontal') {
    // Adafruit_GFX horizontal format
    // Width is 128, Height is 64
    // 16 bytes per row (128/8). Row-by-row.
    let byteIdx = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x += 8) {
        let byteVal = 0;
        for (let b = 0; b < 8; b++) {
          const pixelIdx = y * 128 + (x + b);
          let pVal = pixels[pixelIdx];
          if (invert) pVal = pVal === 1 ? 0 : 1;
          
          if (pVal === 1) {
            byteVal |= (1 << (7 - b)); // MSB is x+0, LSB is x+7
          }
        }
        packed[byteIdx++] = byteVal;
      }
    }
  } else {
    // SSD1306 Vertical page mode (U8g2 / native addressing)
    // 8 horizontal pages, each 8 pixels high.
    // Each byte represents 8 vertical pixels (col width of 1 pixel), from top (LSB) to bottom (MSB)
    let byteIdx = 0;
    for (let page = 0; page < 8; page++) {
      for (let x = 0; x < 128; x++) {
        let byteVal = 0;
        for (let b = 0; b < 8; b++) {
          const y = page * 8 + b;
          const pixelIdx = y * 128 + x;
          let pVal = pixels[pixelIdx];
          if (invert) pVal = pVal === 1 ? 0 : 1;

          if (pVal === 1) {
            byteVal |= (1 << b); // LSB is top (y = page*8), MSB is bottom (y = page*8 + 7)
          }
        }
        packed[byteIdx++] = byteVal;
      }
    }
  }

  return packed;
}

/**
 * Performs Run-Length Encoding (RLE) to pack bytes for compression
 * Returns a tuple: [compressedBytes, compressionFactor]
 * Compression format:
 * [Value (1 byte), Count (1 byte)] pairs if count exceeds threshold or simply consecutive bytes.
 * To keep decompression simple in C++, we can use the following standard byte compression:
 * - If byte < 128, it denotes "repeats next byte N times" where N = byte.
 * - Or simpler format: pairs of [count, value], since each count fits in 1 byte (1-255 repeats), and next byte is the pixel byte.
 * Let's use [count, value] formatting:
 * For each frame, we output Pairs. That's extremely easy to decompress on Arduino:
 * ```cpp
 * void drawRLE(const uint8_t* rleData, int rleSize) {
 *   int screenPos = 0;
 *   for(int i = 0; i < rleSize; i += 2) {
 *     uint8_t count = rleData[i];
 *     uint8_t value = rleData[i+1];
 *     for(int c = 0; c < count; c++) {
 *        buffer[screenPos++] = value;
 *     }
 *   }
 * }
 * ```
 */
export function compressRLE(packedFrame: Uint8Array): Uint8Array {
  const result: number[] = [];
  let currentByte = packedFrame[0];
  let currentCount = 1;

  for (let i = 1; i < packedFrame.length; i++) {
    if (packedFrame[i] === currentByte && currentCount < 255) {
      currentCount++;
    } else {
      result.push(currentCount, currentByte);
      currentByte = packedFrame[i];
      currentCount = 1;
    }
  }
  result.push(currentCount, currentByte);

  return new Uint8Array(result);
}

/**
 * Unpacks 1024 bytes back into a 128x64 monochromatic pixel array (8192 bytes).
 */
export function unpackFrame(
  packed: Uint8Array,
  mode: PackingMode
): Uint8Array {
  const pixels = new Uint8Array(128 * 64);

  if (mode === 'horizontal') {
    let byteIdx = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x += 8) {
        if (byteIdx >= packed.length) break;
        const byteVal = packed[byteIdx++];
        for (let b = 0; b < 8; b++) {
          const pixelIdx = y * 128 + (x + b);
          pixels[pixelIdx] = (byteVal & (1 << (7 - b))) ? 1 : 0;
        }
      }
    }
  } else {
    let byteIdx = 0;
    for (let page = 0; page < 8; page++) {
      for (let x = 0; x < 128; x++) {
        if (byteIdx >= packed.length) break;
        const byteVal = packed[byteIdx++];
        for (let b = 0; b < 8; b++) {
          const y = page * 8 + b;
          const pixelIdx = y * 128 + x;
          pixels[pixelIdx] = (byteVal & (1 << b)) ? 1 : 0;
        }
      }
    }
  }

  return pixels;
}

/**
 * Decompresses an RLE byte array back to its packed size.
 */
export function decompressRLE(rleBytes: Uint8Array, expectedSize: number): Uint8Array {
  const unpacked = new Uint8Array(expectedSize);
  let pos = 0;
  for (let i = 0; i < rleBytes.length; i += 2) {
    if (i + 1 >= rleBytes.length) break;
    const count = rleBytes[i];
    const value = rleBytes[i + 1];
    for (let c = 0; c < count; c++) {
      if (pos < expectedSize) {
        unpacked[pos++] = value;
      }
    }
  }
  return unpacked;
}
