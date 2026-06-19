import React, { useState } from 'react';
import { Copy, Check, Cpu, HelpCircle, HardDrive, SquareCode, Zap } from 'lucide-react';

export default function HelpGuides() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const rawSketchCode = `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1 // Share reset pin with Arduino/ESP or -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Include the downloaded header file!
#include "animation.h"

void setup() {
  Serial.begin(115200);
  
  // Initialize standard SSD1306 I2C address (usually 0x3C or 0x3D)
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 display allocation failed"));
    for(;;);
  }
  display.clearDisplay();
}

void loop() {
  // Loop through all frames of the animation
  for (int f = 0; f < animation_frames; f++) {
    display.clearDisplay();
    
    // Draw raw horizontal-packed PROGMEM frame bitmap
    display.drawBitmap(0, 0, animation[f], animation_width, animation_height, SSD1306_WHITE);
    
    // Send render buffer to screen
    display.display();
    
    // Playback rate matching your conversion setting
    delay(1000 / animation_fps); 
  }
  delay(1000); // 1-second pause at the end of loop
}`;

  const rleSketchCode = `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Include your downloaded compression code!
#include "animation.h"

void setup() {
  Serial.begin(115200);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.clearDisplay();
}

// Custom function to decompress and draw RLE animation safely to OLED buffer
void drawRLEFrame(const uint8_t* rleData, int size) {
  uint8_t* buffer = display.getBuffer();
  int bufPos = 0;
  
  for (int i = 0; i < size; i += 2) {
    uint8_t count = rleData[i];
    uint8_t value = rleData[i + 1];
    
    for (uint16_t c = 0; c < count; c++) {
      if (bufPos < 1024) {
        buffer[bufPos++] = value;
      }
    }
  }
}

void loop() {
  for (int f = 0; f < animation_frames; f++) {
    display.clearDisplay();
    
    // Decompress frame array directly into the screen buffer
    // Access RLE array and size of this specific frame
    drawRLEFrame(animation_rle[f], animation_rle_sizes[f]);
    
    display.display();
    delay(1000 / animation_fps);
  }
  delay(1000);
}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 mt-8 text-slate-300">
      <div className="flex items-center gap-3 mb-6">
        <Cpu className="w-6 h-6 text-indigo-400" />
        <h2 className="text-xl font-semibold text-white tracking-tight">Hardware Integration Guide</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2 text-indigo-400 mb-3 font-medium">
            <Zap className="w-4 h-4" />
            <span>0.96" OLED I2C Pinout</span>
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-400">
            <li><strong className="text-slate-300">GND</strong> ── GND pin</li>
            <li><strong className="text-slate-300">VCC</strong> ── 3.3V power (ESP8266 or 5V for Arduino)</li>
            <li><strong className="text-slate-300">SCL</strong> ── NodeMCU D1 (GPIO 5) / Arduino A5</li>
            <li><strong className="text-slate-300">SDA</strong> ── NodeMCU D2 (GPIO 4) / Arduino A4</li>
          </ul>
        </div>

        <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2 text-indigo-400 mb-3 font-medium">
            <HardDrive className="w-4 h-4" />
            <span>ESP8266 Storage Tips</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Using <span className="text-indigo-300 font-mono">PROGMEM</span> stores data directly in the Flash memory instead of precious SRAM. 
            At 10 FPS, 10 seconds of raw video uses <span className="text-slate-300 font-semibold">102.4 KB</span>. Perfect for the ESP8266 which has 1MB-4MB Flash! Keep animations tight for Arduino Uno (32KB).
          </p>
        </div>

        <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2 text-indigo-400 mb-3 font-medium">
            <HelpCircle className="w-4 h-4" />
            <span>Packing Format</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Use <strong className="text-slate-300">Horizontal</strong> packing for Adafruit GFX drawBitmap. Use <strong className="text-slate-300">Page Vertical</strong> for custom U8g2 screens or when bypassing GFX coordinates to dump raw screen arrays directly.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center bg-slate-950 px-4 py-3 rounded-t-xl border-t border-x border-slate-800">
            <div className="flex items-center gap-2">
              <SquareCode className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-200">Adafruit SSD1306 - Raw Array Sketch</span>
            </div>
            <button
              onClick={() => handleCopy(rawSketchCode, 0)}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors py-1 px-2.5 rounded-lg text-slate-400"
            >
              {copiedIndex === 0 ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Sketch</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-300 p-4 rounded-b-xl border-b border-x border-slate-800 overflow-x-auto text-xs font-mono max-h-[350px] leading-relaxed scrollbar-thin">
            {rawSketchCode}
          </pre>
        </div>

        <div>
          <div className="flex justify-between items-center bg-slate-950 px-4 py-3 rounded-t-xl border-t border-x border-slate-800">
            <div className="flex items-center gap-2">
              <SquareCode className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-200">Adafruit SSD1306 - RLE Compressed Sketch</span>
            </div>
            <button
              onClick={() => handleCopy(rleSketchCode, 1)}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors py-1 px-2.5 rounded-lg text-slate-400"
            >
              {copiedIndex === 1 ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Sketch</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-300 p-4 rounded-b-xl border-b border-x border-slate-800 overflow-x-auto text-xs font-mono max-h-[350px] leading-relaxed scrollbar-thin">
            {rleSketchCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
