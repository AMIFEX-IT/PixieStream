# PixieStream 🎬✨

PixieStream is an automated, web-based tool designed to convert standard video files into 1-bit monochromatic C/C++ `PROGMEM` hexadecimal arrays. It is optimized explicitly for streaming fluid animations to SSD1306 (128 × 64) OLED displays driven by microcontrollers like the ESP8266 or NodeMCU.

By shifting all frame manipulation to a **client-side HTML5 Canvas processing pipeline**, PixieStream handles heavy video parsing, downsampling, and pixel binarization entirely inside the browser. This eliminates heavy backend server dependencies and allows seamless deployment on serverless architectures like Vercel without performance bottlenecks or timeout limits.

---

## 🚀 Features

- **Zero Server-Side Dependency:** All video conversions happen entirely in the browser using localized client-side canvas memory allocation.
- **On-The-Fly Binarization:** Highly memory-optimized frame extraction engine prevents browser tab crashes by avoiding uncompressed buffer retention.
- **Dynamic Thresholding & Dithering:** Fine-tune image rendering using custom brightness, contrast, and Floyd-Steinberg dithering parameters.
- **Custom Sampling Controls:** Configurable target FPS settings to optimize storage boundaries on embedded memory footprints.
- **Real-time Matrix Preview:** A simulated HTML canvas mimicking the exact physical output behavior of an SSD1306 panel.
- **One-Click Code Export:** Instantly copy formatted multi-dimensional source blocks or download a ready-to-use `animation.h` header file.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React / TypeScript / Tailwind CSS |
| Animations | Motion (Framer Motion) |
| Processing Engine | HTML5 Canvas API & Web Pixel Bit-Shifting Algorithms |
| Deployment | Vercel |

---

## 🔍 The Vision

PixieStream was created to bridge the gap between high-definition modern video assets and low-power embedded hardware displays. What started as a manual process of cutting animations frame-by-frame into C arrays has been transformed into a fully automated, lightning-fast cloud asset pipeline.

### Why client-side processing?

Traditional video converter apps upload large files to heavy servers where tools like `ffmpeg` process the pixels. This creates high hosting costs and severe server timeouts when deployed to serverless environments like Vercel.

PixieStream takes an entirely different approach: it treats your web browser as the rendering engine. By loading videos into localized HTML5 `<video>` and `<canvas>` elements, it strips, downsamples, and processes frames directly on your machine — making conversions happen instantly, completely bypassing server latency and file size upload boundaries.

---

## 📐 Data Pipeline Mechanics

The application downsamples incoming video media structures across five sequential stages:

```
Video File (.mp4)
    │
    ▼
Canvas Resizing  ──►  128 × 64 px
    │
    ▼
Luminance Grayscale  ──►  Brightness = (0.2126 × R) + (0.7152 × G) + (0.0722 × B)
    │
    ▼
1-Bit Binarization  ──►  brightness > threshold → 1 (on)  |  brightness ≤ threshold → 0 (off)
    │
    ▼
Page Bit-Packing  ──►  8 pixels → 1 byte  |  (128 × 64) / 8 = 1,024 bytes per frame
```

Every 128 × 64 grid frame is packed horizontally into a compact 1,024-byte array block, matching the exact internal memory architecture layout of the physical SSD1306 controller.

### Step-by-step breakdown

**1. Frame Sub-Sampling & Downsampling**

When a video is dropped into the app, it is scaled from its original resolution (e.g. 1920 × 1080) directly to the native 128 × 64 geometry of the SSD1306 display panel — entirely inside a `<canvas>` element, no server involved.

**2. Luminance Transformation (Grayscale)**

To prepare colorful video frames for a single-color screen, the engine extracts raw RGBA channels for every pixel and computes perceived brightness using the human-eye luma formula:

```
Brightness = (0.2126 × R) + (0.7152 × G) + (0.0722 × B)
```

Green carries the heaviest weight because human vision is most sensitive to it; blue the least.

**3. Binarization (1-Bit Packing)**

Because OLED screens have no concept of "gray" — a pixel is either completely on or completely off — the luma value is evaluated against a dynamic threshold slider:

- Brightness **above** the threshold → `1` (white / pixel on)
- Brightness **at or below** the threshold → `0` (black / pixel off)

To conserve critical RAM on microcontrollers like the ESP8266, every 8 horizontal pixels are bit-shifted and tightly packed into a single `uint8_t` byte:

```
Pixels:  [ 1 ][ 0 ][ 1 ][ 1 ][ 0 ][ 1 ][ 0 ][ 0 ]
                          │
                          ▼  bit-packing
                        0xB4
```

A full 128 × 64 frame contains 8,192 pixels. Packing 8 pixels per byte compresses a single frame into exactly **1,024 bytes** — matching the internal data-page mapping layout required by the SSD1306 controller.

**4. Flash-Optimized Array Generation (`PROGMEM`)**

Storing large arrays in the ESP8266's volatile RAM will quickly cause a stack overflow and crash the board. PixieStream automatically wraps every generated header inside the `PROGMEM` keyword, instructing the compiler to flash the entire animation directly into the chip's spacious Flash Memory (ROM) — leaving RAM completely open for your main program:

```cpp
// generated by PixieStream — do not edit manually
const uint8_t animation[] PROGMEM = {
  /* frame 0 — 1,024 bytes */
  0xFF, 0x81, 0xBD, 0xA5, 0xA5, 0xBD, 0x81, 0xFF, /* ... */
  /* frame 1 — 1,024 bytes */
  /* ... */
};
```

| Storage | Without PROGMEM | With PROGMEM |
|---|---|---|
| RAM consumed (30 frames) | 30,720 bytes → **stack overflow** | ~0 bytes |
| Flash consumed (30 frames) | 0 bytes | 30,720 bytes (ROM has headroom) |

---

## 💻 Hardware Implementation Example

Once you download your custom `animation.h` file, copy it into your local Arduino project folder alongside the primary `.ino` sketch file.

### Project structure

```
PixieAnimation/
 ├── PixieAnimation.ino   ← Main sketch file
 └── animation.h          ← Downloaded animation header file
```

### Wiring (SSD1306 I²C)

| SSD1306 Pin | ESP8266 / NodeMCU Pin |
|---|---|
| VCC | 3.3V |
| GND | GND |
| SDA | D2 (GPIO 4) |
| SCL | D1 (GPIO 5) |

### Sketch example

```cpp
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "animation.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Total frames exported from PixieStream
const int FRAME_COUNT = 30;
// Bytes per frame: (128 × 64) / 8
const int FRAME_SIZE  = 1024;

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
}

void loop() {
  for (int frame = 0; frame < FRAME_COUNT; frame++) {
    display.clearDisplay();
    // Read frame directly from Flash via PROGMEM pointer
    const uint8_t* framePtr = animation + (frame * FRAME_SIZE);
    display.drawBitmap(0, 0, framePtr, SCREEN_WIDTH, SCREEN_HEIGHT, WHITE);
    display.display();
    delay(33); // ~30 FPS
  }
}
```

### Required Arduino libraries

Install via **Arduino IDE → Tools → Manage Libraries**:

- `Adafruit SSD1306`
- `Adafruit GFX Library`

---

## 📊 Frame compression at a glance

| Metric | Value |
|---|---|
| Display resolution | 128 × 64 px |
| Pixels per frame | 8,192 |
| Bytes per frame (packed) | 1,024 |
| Compression ratio | 8× |
| 30-frame animation size | 30,720 bytes (~30 KB in Flash) |
| ESP8266 Flash available | ~1 MB (typical) |
| ESP8266 RAM required | ~0 bytes (PROGMEM) |

---

## 🎯 Target hardware

| Board | Support |
|---|---|
| ESP8266 (generic) | ✅ |
| NodeMCU v1 / v2 / v3 | ✅ |
| ESP-01 | ✅ |
| Wemos D1 Mini | ✅ |
| Arduino Uno / Nano | ✅ (with reduced frame count) |

Display: **SSD1306 128 × 64 OLED** (I²C or SPI)

---

## 📄 License

MIT © PixieStream
