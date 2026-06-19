# PixieStream 🎬✨

PixieStream is an automated, web-based tool designed to convert standard video files into 1-bit monochromatic C/C++ `PROGMEM` hexadecimal arrays. It is optimized explicitly for streaming fluid animations to SSD1306 ($128 \times 64$) OLED displays driven by microcontrollers like the ESP8266 or NodeMCU.

By shifting all frame manipulation to a **client-side HTML5 Canvas processing pipeline**, PixieStream handles heavy video parsing, downsampling, and pixel binarization entirely inside the browser. This eliminates heavy backend server dependencies and allows seamless deployment on serverless architectures like Vercel without performance bottlenecks or timeout limits.

---

## 🚀 Features

* **Zero Server-Side Dependency:** All video conversions happen entirely in the browser using localized client-side canvas memory allocation.
* **On-The-Fly Binarization:** Highly memory-optimized frame extraction engine prevents browser tab crashes by avoiding uncompressed buffer retention.
* **Dynamic Thresholding & Dithering:** Fine-tune image rendering using custom brightness, contrast, and Floyd-Steinberg dithering parameters.
* **Custom Sampling Controls:** Configurable target FPS settings to optimize storage boundaries on embedded memory footprints.
* **Real-time Matrix Preview:** A simulated HTML canvas mimicking the exact physical output behavior of an SSD1306 panel.
* **One-Click Code Export:** Instantly copy formatted multi-dimensional source blocks or download a ready-to-use `animation.h` header file.

---

## 🛠️ Tech Stack

* **Frontend:** React / TypeScript / Tailwind CSS
* **Animations:** Motion (Framer Motion)
* **Processing Engine:** HTML5 Canvas API & Web Pixel Bit-Shifting Algorithms
* **Deployment:** Vercel

---

## 📐 Data Pipeline Mechanics

The application downsamples incoming video media structures across sequential operational steps:

$$\text{Video File (.mp4)} \longrightarrow \text{Canvas Resizing (128x64)} \longrightarrow \text{Luminance Grayscale} \longrightarrow \text{1-Bit Binarization} \longrightarrow \text{Page Bit-Packing}$$

Every $128 \times 64$ grid frame is packed horizontally into a compact 1024-byte array block (`(128 * 64) / 8 = 1024` bytes), matching the exact internal memory architecture layout of the physical SSD1306 controller.

---

## 💻 Hardware Implementation Example

Once you download your custom `animation.h` file, copy it into your local Arduino project folder alongside the primary `.ino` sketch file.

### Project Structure:
```text
PixieAnimation/
 ├── PixieAnimation.ino   <-- Main sketch file
 └── animation.h          <-- Downloaded animation header file


