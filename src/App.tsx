import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCw, 
  Download, 
  Copy, 
  Check, 
  Upload, 
  Trash2, 
  Edit, 
  Sliders, 
  Settings, 
  Zap, 
  RotateCcw, 
  Paintbrush, 
  Eraser, 
  Type, 
  FileCode, 
  CheckCircle, 
  Info, 
  Sparkles,
  RefreshCw,
  Video,
  MonitorPlay,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Frame, OledColorStyle, DitheringType, PackingMode, ConverterSettings } from './types';
import { binarizeImageData, packFrame, compressRLE, unpackFrame, decompressRLE } from './utils/imageProcess';
import HelpGuides from './components/HelpGuides';

export default function App() {
  // Application State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [originalFrames, setOriginalFrames] = useState<Frame[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  
  // Settings & Parameters
  const [settings, setSettings] = useState<ConverterSettings>({
    fps: 10,
    threshold: 128,
    dithering: 'floyd-steinberg',
    invert: false,
    brightness: 0,
    contrast: 0,
    packingMode: 'horizontal',
    oledColor: 'yellow-blue',
    showPixelGrid: true,
    compression: 'none',
    startTime: 0,
    endTime: 10,
    codeFormat: 'full-header'
  });

  const [aspectRatioMode, setAspectRatioMode] = useState<'contain' | 'cover' | 'stretch'>('contain');
  
  // Playback States
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // Speed modifier 1x, 0.5x, 2x

  // Drawing States (Pencil Editor)
  const [editorMode, setEditorMode] = useState<'view' | 'draw_pencil' | 'draw_eraser'>('view');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Text Watermark Overlay Tool
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('bottom-right');
  
  // General UI States
  const [tab, setTab] = useState<'converter' | 'sketches'>('converter');
  const [exporterName, setExporterName] = useState<string>('animation');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [videoMetaData, setVideoMetaData] = useState<{ name: string; duration: number; width: number; height: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  // Generate synthetic 3D Cube demo
  const handleLoadDemo = () => {
    setIsExtracting(true);
    setExtractionProgress(10);
    
    setTimeout(() => {
      setExtractionProgress(40);
      const demoFrames: Frame[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const totalDemoFrames = 30;
      for (let f = 0; f < totalDemoFrames; f++) {
        // Black Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 128, 64);

        // Core coordinates for rotating points
        const angle = (f / totalDemoFrames) * Math.PI * 2;
        const cosX = Math.cos(angle);
        const sinX = Math.sin(angle);
        const cosY = Math.cos(angle * 0.6);
        const sinY = Math.sin(angle * 0.6);

        // Draw outer tech frame lines
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 128, 64);

        // Grid lines overlay
        ctx.strokeStyle = '#222222';
        ctx.beginPath();
        for (let l = 16; l < 128; l += 16) {
          ctx.moveTo(l, 0);
          ctx.lineTo(l, 64);
        }
        for (let l = 16; l < 64; l += 16) {
          ctx.moveTo(0, l);
          ctx.lineTo(128, l);
        }
        ctx.stroke();

        // 3D coordinates rotating
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        // Vertices of cube
        const size = 18;
        const pts = [
          {x: -size, y: -size, z: -size},
          {x: size, y: -size, z: -size},
          {x: size, y: size, z: -size},
          {x: -size, y: size, z: -size},
          {x: -size, y: -size, z: size},
          {x: size, y: -size, z: size},
          {x: size, y: size, z: size},
          {x: -size, y: size, z: size}
        ].map(p => {
          // X rotation
          let y1 = p.y * cosX - p.z * sinX;
          let z1 = p.y * sinX + p.z * cosX;
          // Y rotation
          let x2 = p.x * cosY + z1 * sinY;
          let z2 = -p.x * sinY + z1 * cosY;
          
          // Orthographic projection
          const fov = 100;
          const dist = 60;
          const scale = fov / (dist + z2);
          return {
            x: 64 + x2 * scale,
            y: 32 + y1 * scale
          };
        });

        // Frame edge maps
        const edges = [
          [0,1], [1,2], [2,3], [3,0],
          [4,5], [5,6], [6,7], [7,4],
          [0,4], [1,5], [2,6], [3,7]
        ];

        edges.forEach(([u, v]) => {
          ctx.beginPath();
          ctx.moveTo(pts[u].x, pts[u].y);
          ctx.lineTo(pts[v].x, pts[v].y);
          ctx.stroke();
        });

        // Custom Tech HUD Indicators
        ctx.fillStyle = '#ffffff';
        ctx.font = '7px sans-serif';
        ctx.fillText(`PIXIEMODE`, 6, 12);
        ctx.fillText(`SYS ACTIVE`, 80, 12);
        
        ctx.fillText(`CUBE.3D`, 6, 56);
        ctx.fillText(`Z: ${(cosX * 90).toFixed(0)}*`, 83, 56);

        const img = ctx.getImageData(0, 0, 128, 64);
        const binPixels = binarizeImageData(
          img,
          128,
          64,
          settings.threshold,
          settings.dithering,
          settings.brightness,
          settings.contrast
        );
        demoFrames.push({
          index: f,
          pixels: binPixels,
          isEdited: false
        });
      }

      setVideoMetaData({
        name: 'spinning_cube_demo.mp4',
        duration: 3,
        width: 128,
        height: 64
      });
      setOriginalFrames(demoFrames);
      setExtractionProgress(90);

      setFrames(demoFrames);
      setIsExtracting(false);
      setCurrentFrameIndex(0);
    }, 800);
  };

  // Drag and Drop Zone handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('border-indigo-500', 'bg-indigo-950/20');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-indigo-500', 'bg-indigo-950/20');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-indigo-500', 'bg-indigo-950/20');
    }
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleVideoSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleVideoSelect(files[0]);
    }
  };

  const handleVideoSelect = (file: File) => {
    setErrorMessage(null);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pixie') {
      handleLoadPixieFile(file);
      return;
    }

    const isVideoType = file.type.startsWith('video/');
    const commonVideoExtensions = [
      'mp4', 'mov', 'webm', 'ogg', 'ogv', 'avi', 'mkv', 'flv', 
      'wmv', 'm4v', '3gp', 'ts', '3g2', 'mj2', 'divx', 'mpg', 
      'mpeg', 'asf', 'vob', 'm2ts', 'h264', 'h265', 'rmvb', 'rm'
    ];
    const isVideoExtension = extension ? commonVideoExtensions.includes(extension) : false;

    // We allow typical video files, but verify to screen out non-video formats
    const documentOrImageExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'rar', 'txt', 'doc', 'docx', 'xls', 'xlsx'];
    const isDocOrImg = extension ? documentOrImageExtensions.includes(extension) : false;

    if (isDocOrImg) {
      setErrorMessage(`The selected file "${file.name}" appears to be a document or image, not a video. Please select a valid video file.`);
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Read meta from native element
    const tempVideo = document.createElement('video');
    tempVideo.src = url;

    // Set a timeout to notify if parsing/loading takes too long
    const metadataTimeout = setTimeout(() => {
      setErrorMessage(`Warning: "${file.name}" is taking a long time to load. This video might be utilizing an advanced codec (e.g. HEVC/H.265, AV1, or AVI/MKV encapsulation) not natively supported on some web browser setups. If seeking stalls, convert the video file to standard H.264 MP4 format.`);
    }, 4500);

    tempVideo.onloadedmetadata = () => {
      clearTimeout(metadataTimeout);
      setVideoMetaData({
        name: file.name,
        duration: tempVideo.duration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight
      });
      // Set end trim time automatically to full video or limit to 15s to save SRAM
      const calculatedEnd = Math.min(tempVideo.duration, 15);
      setSettings(prev => ({
        ...prev,
        startTime: 0,
        endTime: calculatedEnd
      }));
      // Automatically trigger frame extraction upon successful selection
      triggerExtraction(url, 0, calculatedEnd, settings.fps);
    };

    tempVideo.onerror = () => {
      clearTimeout(metadataTimeout);
      setErrorMessage(`Error: Your browser is unable to decode or playback "${file.name}". Web browsers have limited native support for advanced containers (like MKV, AVI, FLV) or some specific hardware codecs. We strongly recommend converting this file to universally supported MP4 (H.264 + AAC) or WebM first.`);
    };
  };

  // Video Frame Extraction loop
  const triggerExtraction = async (
    overrideUrl?: string,
    overrideStartTime?: number,
    overrideEndTime?: number,
    overrideFps?: number
  ) => {
    const activeUrl = overrideUrl || videoUrl;
    if (!activeUrl) return;
    setIsExtracting(true);
    setExtractionProgress(0);

    const tempVideo = document.createElement('video');
    tempVideo.src = activeUrl;
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.crossOrigin = 'anonymous';

    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      tempVideo.onloadedmetadata = done;
      tempVideo.onerror = done;
      setTimeout(done, 3000); // 3-second absolute safety fallback
    });

    const duration = tempVideo.duration;
    const start = overrideStartTime !== undefined ? overrideStartTime : Math.max(0, settings.startTime);
    const end = overrideEndTime !== undefined ? overrideEndTime : Math.min(duration, settings.endTime);
    const fps = overrideFps !== undefined ? overrideFps : settings.fps;
    const trimDuration = end - start;
    const numFrames = Math.max(1, Math.floor(trimDuration * fps));

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsExtracting(false);
      return;
    }

    const tempFrames: Frame[] = [];

    // Seek and snap loop
    for (let f = 0; f < numFrames; f++) {
      const seekTarget = start + (f / fps);
      tempVideo.currentTime = seekTarget;

      await new Promise<void>((resolve) => {
        let settled = false;
        const onSeeked = () => {
          if (settled) return;
          settled = true;
          tempVideo.removeEventListener('seeked', onSeeked);
          resolve();
        };
        tempVideo.addEventListener('seeked', onSeeked);
        
        // Timeout safeguard
        setTimeout(() => {
          if (!settled) {
            settled = true;
            tempVideo.removeEventListener('seeked', onSeeked);
            resolve();
          }
        }, 600);
      });

      // Render video frame on offscreen canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 128, 64);

      // Aspect scaling mapping
      let dx = 0, dy = 0, dw = 128, dh = 63;
      const vW = tempVideo.videoWidth || 128;
      const vH = tempVideo.videoHeight || 64;

      if (aspectRatioMode === 'contain') {
        const scale = Math.min(128 / vW, 64 / vH);
        dw = vW * scale;
        dh = vH * scale;
        dx = (128 - dw) / 2;
        dy = (64 - dh) / 2;
      } else if (aspectRatioMode === 'cover') {
        const scale = Math.max(128 / vW, 64 / vH);
        dw = vW * scale;
        dh = vH * scale;
        dx = (128 - dw) / 2;
        dy = (64 - dh) / 2;
      } else {
        dw = 128;
        dh = 64;
      }

      ctx.drawImage(tempVideo, dx, dy, dw, dh);
      const imgData = ctx.getImageData(0, 0, 128, 64);
      const binPixels = binarizeImageData(
        imgData,
        128,
        64,
        settings.threshold,
        settings.dithering,
        settings.brightness,
        settings.contrast
      );

      tempFrames.push({
        index: f,
        pixels: binPixels,
        isEdited: false
      });

      setExtractionProgress(Math.round(((f + 1) / numFrames) * 100));
    }

    setOriginalFrames(tempFrames);
    setFrames(tempFrames);
    setIsExtracting(false);
    setCurrentFrameIndex(0);
  };

  // Instantly apply watermarks on top of original 1-bit frames
  useEffect(() => {
    if (originalFrames.length === 0) return;

    const updated = originalFrames.map((raw) => {
      // If the user already manually edited this frame using direct pencil tool, we should
      // preserve their custom pencil design instead of overwriting!
      const currentFrameRef = frames.find(f => f.index === raw.index);
      if (currentFrameRef?.isEdited) {
        return currentFrameRef; 
      }

      return {
        index: raw.index,
        pixels: new Uint8Array(raw.pixels),
        isEdited: false
      };
    });

    // If there is watermark text, burn it into those frames now too!
    if (watermarkText.trim()) {
      burnWatermarkInline(updated, watermarkText);
    }

    setFrames(updated);
  }, [
    watermarkText,
    watermarkPosition,
    originalFrames
  ]);

  // Handle single canvas draw / paint mechanism on active playing frame
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (editorMode === 'view' || frames.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0, clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = 128 / rect.width;
    const scaleY = 64 / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);

    if (x >= 0 && x < 128 && y >= 0 && y < 64) {
      const updatedFrames = [...frames];
      const activeFrame = { ...updatedFrames[currentFrameIndex] };
      const pixelsCopy = new Uint8Array(activeFrame.pixels);

      // Pencil draws active light (1 if inverse is false), Eraser draws dark (0)
      const valToDraw = editorMode === 'draw_pencil' ? 1 : 0;
      
      const idx = y * 128 + x;
      pixelsCopy[idx] = valToDraw;
      
      activeFrame.pixels = pixelsCopy;
      activeFrame.isEdited = true;
      updatedFrames[currentFrameIndex] = activeFrame;
      setFrames(updatedFrames);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (editorMode === 'view') return;
    setIsDrawing(true);
    handleCanvasInteraction(e);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    handleCanvasInteraction(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Reset the active edited frame back to raw snapped video frame values
  const handleResetActiveFrame = () => {
    if (frames.length === 0 || originalFrames.length === 0) return;
    const currentRaw = originalFrames.find(f => f.index === currentFrameIndex);
    if (!currentRaw) return;

    const updated = [...frames];
    updated[currentFrameIndex] = {
      index: currentFrameIndex,
      pixels: new Uint8Array(currentRaw.pixels),
      isEdited: false
    };
    setFrames(updated);
  };

  // Delete/Exclude frame from list
  const handleDeleteFrame = (idxToDelete: number) => {
    const remaining = frames.filter(f => f.index !== idxToDelete)
                            .map((f, i) => ({ ...f, index: i })); // shift indices to align sequencially
    const remainingOriginals = originalFrames.filter(o => o.index !== idxToDelete)
                                            .map((o, i) => ({ ...o, index: i }));
    setFrames(remaining);
    setOriginalFrames(remainingOriginals);
    if (currentFrameIndex >= remaining.length && remaining.length > 0) {
      setCurrentFrameIndex(remaining.length - 1);
    }
  };

  // Burn a real text watermark directly onto the binary buffers
  const burnWatermarkInline = (targetFrames: Frame[], text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    targetFrames.forEach((frame) => {
      // Draw frame pixels back to flat grey canvas first
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 128, 64);
      const tempImg = ctx.createImageData(128, 64);
      for (let i = 0; i < 8192; i++) {
        const val = frame.pixels[i] === 1 ? 255 : 0;
        const colorIdx = i * 4;
        tempImg.data[colorIdx] = val;
        tempImg.data[colorIdx + 1] = val;
        tempImg.data[colorIdx + 2] = val;
        tempImg.data[colorIdx + 3] = 255;
      }
      ctx.putImageData(tempImg, 0, 0);

      // Overlay the watermark text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textBaseline = 'middle';
      const textWidth = ctx.measureText(text).width;
      
      let tx = 4;
      let ty = 8;
      if (watermarkPosition === 'top-right') {
        tx = 124 - textWidth;
      } else if (watermarkPosition === 'bottom-left') {
        ty = 56;
      } else if (watermarkPosition === 'bottom-right') {
        tx = 124 - textWidth;
        ty = 56;
      } else if (watermarkPosition === 'center') {
        tx = 64 - (textWidth / 2);
        ty = 32;
      }

      // Draw safe solid black background backing behind text to keep it perfectly visible
      ctx.fillStyle = '#000000';
      ctx.fillRect(tx - 2, ty - 5, textWidth + 4, 11);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, tx, ty);

      // Extract and update the frame's pixels
      const snapshot = ctx.getImageData(0, 0, 128, 64);
      for (let p = 0; p < 8192; p++) {
        // Red channel is enough
        frame.pixels[p] = snapshot.data[p * 4] >= 128 ? 1 : 0;
      }
    });
  };

  const handleApplyWatermark = () => {
    if (!watermarkText.trim() || frames.length === 0) return;
    const updated = [...frames];
    burnWatermarkInline(updated, watermarkText);
    setFrames(updated);
  };

  const handleClearWatermark = () => {
    setWatermarkText('');
    // Force regeneration from original snapshots
    setSettings(prev => ({ ...prev, threshold: prev.threshold }));
  };

  // Video Preview Player loop
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const intervalMs = (1000 / settings.fps) / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => {
        if (prevIndex >= frames.length - 1) {
          return 0; // loop
        } else {
          return prevIndex + 1;
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, frames.length, settings.fps, playbackSpeed]);

  // Live render active frame to the OLED display simulator canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 5; // Scale grid zoom levels
    canvas.width = 128 * scale;
    canvas.height = 64 * scale;

    const activeFrame = frames[currentFrameIndex];
    if (!activeFrame) return;

    // Dark screen matte background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x++) {
        let pVal = activeFrame.pixels[y * 128 + x];
        
        // Apply Settings Color Inversion
        if (settings.invert) {
          pVal = pVal === 1 ? 0 : 1;
        }

        if (pVal === 1) {
          // Glow or pixel draw depending on OLED style color mode
          if (settings.oledColor === 'white') {
            ctx.fillStyle = '#f8fafc'; // glowing white
            ctx.shadowColor = '#f1f5f9';
          } else if (settings.oledColor === 'blue') {
            ctx.fillStyle = '#00f2fe'; // cyber glowing cyan blue
            ctx.shadowColor = '#00f2fe';
          } else if (settings.oledColor === 'green') {
            ctx.fillStyle = '#39ff14'; // high tech matrix bright green
            ctx.shadowColor = '#39ff14';
          } else { // Yellow-Blue hardware split (Common SSD1306 model split screen)
            ctx.fillStyle = y < 16 ? '#facc15' : '#00f2fe';
            ctx.shadowColor = y < 16 ? '#facc15' : '#00f2fe';
          }
          
          ctx.shadowBlur = settings.showPixelGrid ? 1 : 2;
        } else {
          // Off states are deep grey/black
          ctx.fillStyle = settings.showPixelGrid ? '#1e293b' : '#070f1a';
          ctx.shadowBlur = 0;
        }

        const sizeX = settings.showPixelGrid ? scale - 1 : scale;
        const sizeY = settings.showPixelGrid ? scale - 1 : scale;

        ctx.fillRect(x * scale, y * scale, sizeX, sizeY);
      }
    }
  }, [currentFrameIndex, frames, settings.oledColor, settings.showPixelGrid, settings.invert]);

  // C-style PROGMEM Array Compiler
  const compileArduinoHeader = useMemo(() => {
    if (frames.length === 0) return '// Please load a video or demo animation to compile code.';

    const format = settings.codeFormat || 'full-header';

    const getRawBytesCode = () => {
      let code = '';
      if (settings.compression === 'none') {
        frames.forEach((frame, fIdx) => {
          const packed = packFrame(frame.pixels, settings.packingMode, false);
          if (format === 'csv-values' || format === 'python-list') {
            for (let i = 0; i < packed.length; i++) {
              const hex = '0x' + packed[i].toString(16).toUpperCase().padStart(2, '0');
              code += hex;
              if (!(fIdx === frames.length - 1 && i === packed.length - 1)) {
                code += (i + 1) % 16 === 0 ? ',\n  ' : ', ';
              }
            }
          } else {
            code += `  { // Frame ${fIdx + 1}\n    `;
            for (let i = 0; i < packed.length; i++) {
              const hex = '0x' + packed[i].toString(16).toUpperCase().padStart(2, '0');
              code += hex;
              if (i !== packed.length - 1) {
                code += (i + 1) % 16 === 0 ? ',\n    ' : ', ';
              }
            }
            code += `\n  }${fIdx !== frames.length - 1 ? ',' : ''}\n`;
          }
        });
      } else {
        const rleSizes: number[] = [];
        const frameNames: string[] = [];

        frames.forEach((frame, fIdx) => {
          const packed = packFrame(frame.pixels, settings.packingMode, false);
          const rleBytes = compressRLE(packed);
          rleSizes.push(rleBytes.length);
          
          const fName = `${exporterName}_frame_${fIdx}`;
          frameNames.push(fName);

          if (format === 'csv-values' || format === 'python-list') {
            for (let i = 0; i < rleBytes.length; i++) {
              const hex = '0x' + rleBytes[i].toString(16).toUpperCase().padStart(2, '0');
              code += hex;
              if (!(fIdx === frames.length - 1 && i === rleBytes.length - 1)) {
                code += (i + 1) % 16 === 0 ? ',\n  ' : ', ';
              }
            }
          } else {
            code += `const unsigned char ${fName}[] PROGMEM = {\n  `;
            for (let i = 0; i < rleBytes.length; i++) {
              const hex = '0x' + rleBytes[i].toString(16).toUpperCase().padStart(2, '0');
              code += hex;
              if (i !== rleBytes.length - 1) {
                code += (i + 1) % 16 === 0 ? ',\n  ' : ', ';
              }
            }
            code += `\n};\n\n`;
          }
        });

        if (format !== 'csv-values' && format !== 'python-list') {
          code += `// Sizes of each RLE compressed frame\n`;
          code += `const unsigned int ${exporterName}_rle_sizes[${frames.length}] = {\n  `;
          code += rleSizes.join(', ') + `\n};\n\n`;

          code += `// Multi-dimensional lookup pointer index table\n`;
          code += `const unsigned char* const ${exporterName}_rle[${frames.length}] PROGMEM = {\n  `;
          code += frameNames.join(',\n  ') + `\n};\n`;
        }
      }
      return code;
    };

    if (format === 'csv-values') {
      return `// Comma-separated hex values for ${frames.length} frame(s)\n// Total size: ${settings.compression === 'none' ? frames.length * 1024 : 'Variable RLE'} bytes\n// Format: ${settings.packingMode}, Compression: ${settings.compression}\n\n  ` + getRawBytesCode();
    }

    if (format === 'python-list') {
      return `# Python list format for ${frames.length} frame(s)\n# Total size: ${settings.compression === 'none' ? frames.length * 1024 : 'Variable RLE'} bytes\n# Format: ${settings.packingMode}, Compression: ${settings.compression}\n\n${exporterName}_frames = [\n  ` + getRawBytesCode() + `\n]`;
    }

    if (format === 'array-only') {
      let code = `// ${frames.length} Frame(s) compiled with variable: ${exporterName}\n`;
      code += `// Packing Mode: ${settings.packingMode === 'horizontal' ? 'Horizontal' : 'Vertical-Page'}\n`;
      code += `// Compression: ${settings.compression}\n\n`;
      if (settings.compression === 'none') {
        code += `const unsigned char ${exporterName}[${frames.length}][1024] PROGMEM = {\n`;
        code += getRawBytesCode();
        code += `};\n`;
      } else {
        code += getRawBytesCode();
      }
      return code;
    }

    // Default 'full-header' format
    let code = `/**\n * PixieStream SSD1306 Video Converter Output\n`;
    code += ` * Generated: ${new Date().toISOString()}\n`;
    code += ` * Frames: ${frames.length}\n`;
    code += ` * FPS: ${settings.fps}\n`;
    code += ` * Format: ${settings.packingMode === 'horizontal' ? 'Adafruit GFX (Horizontal)' : 'SSD1306 Native (Page Vertical)'}\n`;
    code += ` * Compression: ${settings.compression === 'rle' ? 'RLE Packed' : 'Raw bytes'}\n */\n\n`;
    code += `#ifndef PIXIE_STREAM_H\n`;
    code += `#define PIXIE_STREAM_H\n\n`;
    code += `#include <pgmspace.h>\n\n`;
    code += `const int animation_width = 128;\n`;
    code += `const int animation_height = 64;\n`;
    code += `const int animation_frames = ${frames.length};\n`;
    code += `const int animation_fps = ${settings.fps};\n\n`;

    if (settings.compression === 'none') {
      code += `// Total animation size: ${frames.length * 1024} bytes\n`;
      code += `const unsigned char ${exporterName}[${frames.length}][1024] PROGMEM = {\n`;
      code += getRawBytesCode();
      code += `};\n`;
    } else {
      code += getRawBytesCode();
    }

    code += `\n#endif // PIXIE_STREAM_H\n`;
    return code;
  }, [frames, settings.packingMode, settings.compression, settings.fps, settings.codeFormat, exporterName]);

  // Flash Memory consumption indicator
  const statistics = useMemo(() => {
    const rawBytes = frames.length * 1024;
    let finalBytes = rawBytes;

    if (settings.compression === 'rle') {
      finalBytes = frames.reduce((acc, frame) => {
        const packed = packFrame(frame.pixels, settings.packingMode, false);
        return acc + compressRLE(packed).length;
      }, 0);
    }

    const percentageESP8266 = ((finalBytes / 1048576) * 100).toFixed(1); // out of 1MB standard allocation zone 

    return {
      framesCount: frames.length,
      bytes: finalBytes,
      rawBytes: rawBytes,
      factor: (rawBytes / finalBytes).toFixed(2),
      percent: percentageESP8266
    };
  }, [frames, settings.compression, settings.packingMode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(compileArduinoHeader);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadFile = () => {
    const format = settings.codeFormat || 'full-header';
    let ext = 'h';
    if (format === 'python-list') ext = 'py';
    if (format === 'csv-values') ext = 'txt';

    const blob = new Blob([compileArduinoHeader], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exporterName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPixie = () => {
    if (frames.length === 0) return;
    
    let totalSize = 13;
    const frameDataArray: Uint8Array[] = [];

    frames.forEach((frame) => {
      const packed = packFrame(frame.pixels, settings.packingMode, false);
      if (settings.compression === 'none') {
        totalSize += 1024;
        frameDataArray.push(packed);
      } else {
        const rleBytes = compressRLE(packed);
        totalSize += 2 + rleBytes.length; // 2 bytes for length
        frameDataArray.push(rleBytes);
      }
    });

    const arrayBuffer = new ArrayBuffer(totalSize);
    const dataView = new DataView(arrayBuffer);
    const uint8View = new Uint8Array(arrayBuffer);

    // Setup "PIXIE" header signature (5 bytes)
    uint8View.set([80, 73, 88, 73, 69], 0);
    // Version = 1 (1 byte)
    dataView.setUint8(5, 1);
    // Width = 128 (1 byte)
    dataView.setUint8(6, 128);
    // Height = 64 (1 byte)
    dataView.setUint8(7, 64);
    // num_frames (2 bytes)
    dataView.setUint16(8, frames.length, true);
    // fps (1 byte)
    dataView.setUint8(10, settings.fps);
    // packingMode (1 byte, 0 = horizontal, 1 = vertical-page)
    dataView.setUint8(11, settings.packingMode === 'horizontal' ? 0 : 1);
    // compression (1 byte, 0 = none, 1 = rle)
    dataView.setUint8(12, settings.compression === 'none' ? 0 : 1);

    let offset = 13;
    frameDataArray.forEach((data) => {
      if (settings.compression === 'none') {
        uint8View.set(data, offset);
        offset += data.length;
      } else {
        dataView.setUint16(offset, data.length, true);
        offset += 2;
        uint8View.set(data, offset);
        offset += data.length;
      }
    });

    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exporterName}.pixie`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadPixieFile = (file: File) => {
    setErrorMessage(null);
    setIsExtracting(true);
    setExtractionProgress(10);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error('Could not read file data');
        }
        
        if (buffer.byteLength < 13) {
          throw new Error('Invalid .pixie file (file is too small)');
        }
        
        const dataView = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);
        
        // Match magic
        let magic = '';
        for (let i = 0; i < 5; i++) {
          magic += String.fromCharCode(uint8View[i]);
        }
        
        if (magic !== 'PIXIE') {
          throw new Error('Invalid .pixie file: signature does not match PIXIE');
        }
        
        const version = dataView.getUint8(5);
        if (version !== 1) {
          throw new Error(`Unsupported .pixie version: ${version}`);
        }
        
        const width = dataView.getUint8(6);
        const height = dataView.getUint8(7);
        if (width !== 128 || height !== 64) {
          throw new Error(`Unsupported screen size: ${width}x${height}. Only 128x64 is supported.`);
        }
        
        const frameCount = dataView.getUint16(8, true);
        const fps = dataView.getUint8(10);
        const packingModeVal = dataView.getUint8(11);
        const compressionVal = dataView.getUint8(12);
        
        const packingMode: PackingMode = packingModeVal === 0 ? 'horizontal' : 'vertical-page';
        const compression: 'none' | 'rle' = compressionVal === 0 ? 'none' : 'rle';
        
        const importedFrames: Frame[] = [];
        let offset = 13;
        
        for (let f = 0; f < frameCount; f++) {
          let binPixels: Uint8Array;
          
          if (compression === 'none') {
            const size = 1024;
            if (offset + size > buffer.byteLength) {
              throw new Error(`Corrupted raw data: frame ${f + 1} exceeds file length`);
            }
            const packed = new Uint8Array(buffer, offset, size);
            offset += size;
            binPixels = unpackFrame(packed, packingMode);
          } else {
            if (offset + 2 > buffer.byteLength) {
              throw new Error(`Corrupted RLE data: frame ${f + 1} length exceeds file length`);
            }
            const rleLen = dataView.getUint16(offset, true);
            offset += 2;
            
            if (offset + rleLen > buffer.byteLength) {
              throw new Error(`Corrupted RLE data: frame ${f + 1} body exceeds file length`);
            }
            const rleData = new Uint8Array(buffer, offset, rleLen);
            offset += rleLen;
            
            const packed = decompressRLE(rleData, 1024);
            binPixels = unpackFrame(packed, packingMode);
          }
          
          importedFrames.push({
            index: f,
            pixels: binPixels,
            isEdited: false
          });
          
          setExtractionProgress(Math.round(((f + 1) / frameCount) * 100));
        }
        
        setExporterName(file.name.replace(/\.pixie$/, '').replace(/[^a-zA-Z0-9_]/g, ''));
        setSettings(prev => ({
          ...prev,
          fps: fps,
          packingMode: packingMode,
          compression: compression,
          startTime: 0,
          endTime: Math.min(frameCount / fps, 15)
        }));
        
        setVideoMetaData({
          name: file.name,
          duration: frameCount / fps,
          width: 128,
          height: 64
        });
        
        setOriginalFrames(importedFrames);
        setFrames(importedFrames);
        setIsExtracting(false);
        setCurrentFrameIndex(0);
      } catch (err: any) {
        setIsExtracting(false);
        setErrorMessage(err.message || 'Error occurred while loading .pixie file');
      }
    };
    reader.onerror = () => {
      setIsExtracting(false);
      setErrorMessage('Failed to read .pixie file');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResetConverter = () => {
    setVideoFile(null);
    setVideoUrl('');
    setOriginalFrames([]);
    setFrames([]);
    setVideoMetaData(null);
    setCurrentFrameIndex(0);
    setIsPlaying(false);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200 flex flex-col antialiased selection:bg-[#3db8ff] selection:text-black">
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1c1c1f_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>

      {/* Main Header navigation */}
      <header className="border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3db8ff] rounded-[11px] flex items-center justify-center shadow-[0_0_15px_rgba(61,184,255,0.4)] hover:brightness-105 transition-all duration-300 select-none">
              <Film className="w-5.5 h-5.5 text-zinc-950" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PixieStream
                <span className="text-[#3db8ff] font-mono text-xs ml-2 opacity-80">v1.2-stable</span>
              </h1>
              <p className="text-xs text-zinc-500">ESP8266 OLED Framebuffer Engine</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setTab('converter')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  tab === 'converter' 
                    ? 'bg-[#3db8ff]/10 text-[#3db8ff] border border-[#3db8ff]/20' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>OLED Video Engine</span>
              </button>
              <button
                onClick={() => setTab('sketches')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  tab === 'sketches' 
                    ? 'bg-[#3db8ff]/10 text-[#3db8ff] border border-[#3db8ff]/20' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Arduino Guide</span>
              </button>
            </div>

            <div className="hidden md:flex px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#3db8ff] items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Engine Ready
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {tab === 'sketches' ? (
            <motion.div
              key="sketches"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              <HelpGuides />
            </motion.div>
          ) : (
            <motion.div
              key="converter"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-8"
            >
              {/* Empty & Video Dropbox State */}
              {frames.length === 0 && !isExtracting && (
                <div className="max-w-2xl mx-auto mt-8 space-y-4">
                  {errorMessage && (
                    <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex items-start gap-3 text-red-200 text-xs shadow-md animate-pulse">
                      <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-white uppercase tracking-wider text-[10px]">Codec / Format Notice</p>
                        <p className="leading-relaxed">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-zinc-800 hover:border-[#3db8ff] bg-[#131316] p-12 rounded-3xl text-center transition-all cursor-pointer relative group"
                  >
                    <input
                      type="file"
                      accept="video/*, .mp4, .mov, .mkv, .avi, .webm, .flv, .3gp, .h264, .wmv, .mpeg, .pixie"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-800 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(61,184,255,0.05)]">
                      <Upload className="w-8 h-8 text-[#3db8ff] group-hover:text-[#3db8ff]/80" />
                    </div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">Convert Video / Load .pixie File</h3>
                    <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
                      Drag and drop any video file or saved <span className="text-[#3db8ff] font-medium">.pixie</span> animation here, or click to browse.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadDemo();
                        }}
                        className="flex items-center gap-2 bg-[#3db8ff] hover:bg-[#2da1e6] text-black font-bold text-xs px-5 py-3 rounded-xl shadow-[0_0_15px_rgba(61,184,255,0.25)] active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-black fill-black" />
                        <span>Spinning 3D Wireframe Demo</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Extraction / Snap Progress indicator */}
              {isExtracting && (
                <div className="max-w-md mx-auto bg-[#131316] border border-zinc-800 rounded-3xl p-8 text-center mt-12 shadow-xl">
                  <RefreshCw className="w-10 h-10 text-[#3db8ff] animate-spin mx-auto mb-4" />
                  <h3 className="font-semibold text-white">Extracting Video Frames...</h3>
                  <p className="text-xs text-zinc-500 mt-1">Converting frame time stamps onto canvas snap-buffer </p>
                  
                  <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden mt-6 border border-zinc-800">
                    <div 
                      className="bg-[#3db8ff] h-full transition-all duration-300 shadow-[0_0_8px_#3db8ff]"
                      style={{ width: `${extractionProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#3db8ff] block mt-2">{extractionProgress}% Complete</span>
                </div>
              )}

              {/* Core Application Video editing workspace */}
              {frames.length > 0 && !isExtracting && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Parameter Panel (Parameters, triggers, modifiers) */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Active File info Card */}
                    <div className="bg-[#131316] border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[#3db8ff]">
                          <Video className="w-5 h-5" />
                        </div>
                        <div className="max-w-[150px] sm:max-w-[200px]">
                          <p className="text-xs font-semibold text-white truncate">{videoMetaData?.name || 'Local Video Record'}</p>
                          <p className="text-[10px] font-mono text-zinc-500">
                            {videoMetaData ? `${videoMetaData.width}x${videoMetaData.height} • ${videoMetaData.duration.toFixed(1)}s` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleResetConverter}
                        className="text-xs bg-zinc-950 hover:bg-rose-950 hover:text-rose-400 border border-zinc-850 hover:border-rose-900 text-zinc-400 transition-colors py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Timeline Snapping Trim Configuration */}
                    {videoFile && (
                      <div className="bg-[#131316] border border-zinc-800 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-[#3db8ff] pb-2 border-b border-zinc-800/80">
                          <Sliders className="w-4 h-4" />
                          <h4 className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">Convert Segment Trim Settings</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Start Point (sec)</label>
                            <input
                              type="number"
                              min={0}
                              max={settings.endTime}
                              step={0.1}
                              value={settings.startTime}
                              onChange={(e) => setSettings(prev => ({ ...prev, startTime: parseFloat(e.target.value) || 0 }))}
                              className="w-full bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-[#3db8ff]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">End Point (sec)</label>
                            <input
                              type="number"
                              min={settings.startTime}
                              max={videoMetaData?.duration || 60}
                              step={0.1}
                              value={settings.endTime}
                              onChange={(e) => setSettings(prev => ({ ...prev, endTime: parseFloat(e.target.value) || 10 }))}
                              className="w-full bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-[#3db8ff]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 flex justify-between">
                            <span>Sampling Target Framerate</span>
                            <span className="font-mono text-[#3db8ff] font-semibold">{settings.fps} FPS</span>
                          </label>
                          <div className="grid grid-cols-6 gap-1">
                            {[5, 10, 15, 20, 24, 30].map((rate) => (
                              <button
                                key={rate}
                                onClick={() => setSettings(prev => ({ ...prev, fps: rate }))}
                                className={`py-1.5 text-[10px] font-bold border rounded-lg transition-all cursor-pointer ${
                                  settings.fps === rate 
                                    ? 'bg-[#3db8ff]/15 text-[#3db8ff] border-[#3db8ff]/30 shadow-[0_0_8px_rgba(61,184,255,0.1)]' 
                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {rate}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Video Resize Aspect Scaling</label>
                          <select
                            value={aspectRatioMode}
                            onChange={(e) => setAspectRatioMode(e.target.value as any)}
                            className="w-full bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-[#3db8ff] font-medium"
                          >
                            <option value="contain">Contain (Keep aspect, add black margins)</option>
                            <option value="cover">Cover (Crop full 128x64 display size)</option>
                            <option value="stretch">Stretch (Fit exact proportions)</option>
                          </select>
                        </div>

                        <button
                          onClick={triggerExtraction}
                          className="w-full bg-[#3db8ff] hover:bg-[#2da1e6] hover:shadow-[0_0_15px_rgba(61,184,255,0.2)] text-black font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-Extract Video Snappers</span>
                        </button>
                      </div>
                    )}

                    {/* Rendering & Binarization Tuning Panel */}
                    <div className="bg-[#131316] border border-zinc-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 text-[#3db8ff] pb-2 border-b border-zinc-800/80">
                        <Settings className="w-4 h-4" />
                        <h4 className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">1-Bit Monochrome Settings</h4>
                      </div>

                      {/* Threshold Slider */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Binarization Luma Threshold</span>
                          <span className="font-mono text-[#3db8ff] font-bold">{settings.threshold}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={settings.threshold}
                          onChange={(e) => setSettings(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                          className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#3db8ff]"
                        />
                        <div className="flex justify-between text-[9px] text-zinc-650 mt-0.5 font-mono">
                          <span>0 (White)</span>
                          <span>128 (Default)</span>
                          <span>255 (Black)</span>
                        </div>
                      </div>

                      {/* Brightness & Contrast */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1 text-zinc-500 uppercase tracking-wider">
                            <span>Brightness</span>
                            <span className="font-mono text-zinc-400">{settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={settings.brightness}
                            onChange={(e) => setSettings(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#3db8ff]"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1 text-zinc-500 uppercase tracking-wider">
                            <span>Contrast</span>
                            <span className="font-mono text-zinc-400">{settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={settings.contrast}
                            onChange={(e) => setSettings(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#3db8ff]"
                          />
                        </div>
                      </div>

                      {/* Dithering Selector */}
                      <div>
                        <label className="block text-[10px] text-zinc-550 uppercase tracking-wider mb-1.5">Algorithmic Error Diffusion Dithering</label>
                        <div className="flex gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, dithering: 'none' }))}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              settings.dithering === 'none'
                                ? 'bg-[#3db8ff]/15 text-[#3db8ff] border border-[#3db8ff]/20'
                                : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            Hard Edge
                          </button>
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, dithering: 'floyd-steinberg' }))}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              settings.dithering === 'floyd-steinberg'
                                ? 'bg-[#3db8ff]/15 text-[#3db8ff] border border-[#3db8ff]/20'
                                : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            Floyd-Steinberg
                          </button>
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, dithering: 'atkinson' }))}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              settings.dithering === 'atkinson'
                                ? 'bg-[#3db8ff]/15 text-[#3db8ff] border border-[#3db8ff]/20'
                                : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            Atkinson
                          </button>
                        </div>
                      </div>

                      {/* Inversion Trigger */}
                      <label className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 hover:bg-zinc-900 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.invert}
                          onChange={(e) => setSettings(prev => ({ ...prev, invert: e.target.checked }))}
                          className="rounded text-[#3db8ff] focus:ring-[#3db8ff] bg-zinc-900 border-zinc-800 h-4 w-4 accent-[#3db8ff]"
                        />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-zinc-200">Invert Palette Monochrome</p>
                          <p className="text-[10px] text-zinc-500">Enable high-contrast black drawing pixels on white base</p>
                        </div>
                      </label>
                    </div>

                    {/* Quick Watermark Burn overlay */}
                    <div className="bg-[#131316] border border-zinc-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 text-[#3db8ff] pb-2 border-b border-zinc-800/80">
                        <Type className="w-4 h-4" />
                        <h4 className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">HUD Text Watermark Overlay</h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Overlay Text (e.g., Frame count, branding)</label>
                          <input
                            type="text"
                            placeholder="e.g. ESP8266"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            className="w-full bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-[#3db8ff] font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-550 uppercase tracking-wider mb-1">Anchor Alignment Position</label>
                          <select
                            value={watermarkPosition}
                            onChange={(e) => setWatermarkPosition(e.target.value as any)}
                            className="w-full bg-zinc-900 text-zinc-350 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#3db8ff] font-medium"
                          >
                            <option value="bottom-right">Bottom-Right Corner</option>
                            <option value="bottom-left">Bottom-Left Corner</option>
                            <option value="top-right">Top-Right Corner</option>
                            <option value="top-left">Top-Left Corner</option>
                            <option value="center">Abs Center Screen</option>
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleApplyWatermark}
                            disabled={!watermarkText.trim()}
                            className="flex-1 bg-[#3db8ff] hover:bg-[#2da1e6] hover:shadow-[0_0_15px_rgba(61,184,255,0.2)] disabled:opacity-50 text-black font-bold text-xs py-2 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            Burn into Frames
                          </button>
                          <button
                            onClick={handleClearWatermark}
                            className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white font-bold text-xs py-2 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            Clear Font
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>                  {/* Right Screen Columns: Display Live Simulator and Painter */}
                  <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Retro SSD1306 physical device view box */}
                    <div className="bg-zinc-950 border-2 border-zinc-805 rounded-2xl p-6 relative flex flex-col items-center">
                      <div className="absolute top-4 left-4 flex gap-1.5 items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#3db8ff] font-sans">SSD1306 Hardware Simulator</h2>
                      </div>
                      <div className="absolute top-4 right-4 text-[10px] font-mono text-zinc-500">
                        FRAME: {currentFrameIndex + 1}/{frames.length}
                      </div>

                      {/* Pixel Screen canvas container */}
                      <div className="my-8 relative group select-none">
                        {/* OLED bezel details */}
                        <div className="absolute -inset-4 bg-[#131316] border border-zinc-800 rounded-3xl -z-10 shadow-2xl flex flex-col justify-end p-2">
                          <div className="flex justify-between items-center text-[8px] font-mono text-zinc-650 px-2 mt-2">
                            <span>SDA (GPIO4)</span>
                            <span>I2C ADDR: 0x3C</span>
                            <span>SCL (GPIO5)</span>
                          </div>
                        </div>

                        <canvas
                          ref={canvasRef}
                          onMouseDown={startDrawing}
                          onMouseMove={drawMove}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={drawMove}
                          onTouchEnd={stopDrawing}
                          className="rounded border border-[#3db8ff]/20 shadow-[0_0_20px_rgba(61,184,255,0.05)] cursor-crosshair relative max-w-full"
                          style={{
                            imageRendering: 'pixelated',
                            aspectRatio: '128 / 64',
                            width: '480px'
                          }}
                        />

                        {/* Direct Pencil Brush Toolbar overlay */}
                        <div className="absolute top-2 right-2 flex bg-zinc-950/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800 gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditorMode(editorMode === 'draw_pencil' ? 'view' : 'draw_pencil')}
                            title="Pencil pixel brush (White pixel)"
                            className={`p-2 rounded-lg transition-all cursor-pointer ${
                              editorMode === 'draw_pencil' 
                                ? 'bg-[#3db8ff] text-black shadow-[0_0_8px_rgba(61,184,255,0.25)]' 
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                            }`}
                          >
                            <Paintbrush className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditorMode(editorMode === 'draw_eraser' ? 'view' : 'draw_eraser')}
                            title="Eraser tool (Black pixel)"
                            className={`p-2 rounded-lg transition-all cursor-pointer ${
                              editorMode === 'draw_eraser' 
                                ? 'bg-[#3db8ff] text-black shadow-[0_0_8px_rgba(61,184,255,0.25)]' 
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                            }`}
                          >
                            <Eraser className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleResetActiveFrame}
                            title="Reinstate original frame"
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Display Color Customizations & Overlays */}
                      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-zinc-800 text-xs">
                        <div className="flex flex-col gap-2">
                          <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">OLED Color Tint Theme</span>
                          <div className="grid grid-cols-4 gap-1">
                            {['white', 'blue', 'green', 'yellow-blue'].map((color) => (
                              <button
                                key={color}
                                onClick={() => setSettings(prev => ({ ...prev, oledColor: color as OledColorStyle }))}
                                className={`py-2 rounded-lg font-bold text-[10px] capitalize border transition-all cursor-pointer ${
                                  settings.oledColor === color
                                    ? 'bg-[#3db8ff]/15 text-[#3db8ff] border-[#3db8ff]/30 shadow-[0_0_8px_rgba(61,184,255,0.1)]'
                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {color === 'yellow-blue' ? 'Split Split' : color}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Screen Pixel divisions Grid</span>
                          <label className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.showPixelGrid}
                              onChange={(e) => setSettings(prev => ({ ...prev, showPixelGrid: e.target.checked }))}
                              className="rounded text-[#3db8ff] bg-zinc-950 border-zinc-800 accent-[#3db8ff]"
                            />
                            <div className="text-left text-[11px]">
                              <p className="text-zinc-300 font-medium">Render Grid scanlines</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Playback Controls Row */}
                      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mt-4 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentFrameIndex(0)}
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <SkipBack className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="p-3 bg-[#3db8ff] hover:bg-[#2da1e6] text-black rounded-full shadow-[0_0_15px_rgba(61,184,255,0.25)] active:translate-y-0.5 transition-all text-center cursor-pointer"
                          >
                            {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
                          </button>

                          <button
                            onClick={() => {
                              if (currentFrameIndex >= frames.length - 1) {
                                setCurrentFrameIndex(0);
                              } else {
                                setCurrentFrameIndex(prev => prev + 1);
                              }
                            }}
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>

                          {/* Speed dialer controls */}
                          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                            {[0.5, 1, 2].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase cursor-pointer ${
                                  playbackSpeed === speed 
                                    ? 'bg-zinc-850 text-[#3db8ff]' 
                                    : 'text-zinc-550 hover:text-white'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Scrub timeline slider controller */}
                        <div className="flex-1 w-full max-w-md flex items-center gap-3">
                          <span className="font-mono text-xs text-zinc-400">F: {currentFrameIndex + 1}/{frames.length}</span>
                          <input
                            type="range"
                            min="0"
                            max={frames.length - 1}
                            value={currentFrameIndex}
                            onChange={(e) => setCurrentFrameIndex(parseInt(e.target.value))}
                            className="flex-1 h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#3db8ff]"
                          />
                        </div>
                      </div>

                      {/* Display warning badge if frame was edited */}
                      {frames[currentFrameIndex]?.isEdited && (
                        <div className="mt-4 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl text-yellow-400 text-[10px] font-mono">
                          <Info className="w-3.5 h-3.5" />
                          <span>Frame {currentFrameIndex + 1} has manual pixel alterations list active.</span>
                        </div>
                      )}
                    </div>

                    {/* Horizontal Frame Timeline list */}
                    <div className="bg-[#131316] border border-zinc-800 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center text-zinc-455">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5" />
                          Sequence Timeline ({frames.length} total snaps)
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">Click to jump • Hover to delete specific frames</span>
                      </div>

                      <div className="flex gap-3 overflow-x-auto py-2.5 scrollbar-thin max-w-full select-none">
                        {frames.map((frame, index) => {
                          const isActive = index === currentFrameIndex;
                          return (
                            <div
                              key={frame.index}
                              onClick={() => setCurrentFrameIndex(index)}
                              className={`relative p-1 rounded-xl border flex-shrink-0 cursor-pointer overflow-hidden transition-all group ${
                                isActive 
                                  ? 'border-[#3db8ff] bg-[#3db8ff]/10 ring-2 ring-[#3db8ff]/20' 
                                  : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-700'
                              }`}
                            >
                              {/* Nano rendering representing the frame pixels */}
                              <div className="w-20 h-10 bg-black flex flex-wrap content-start overflow-hidden rounded opacity-80 group-hover:opacity-100 font-mono text-[7px] text-center flex items-center justify-center">
                                <span className="text-[8px] text-zinc-500 font-bold">Frame {frame.index + 1}</span>
                                {frame.isEdited && (
                                  <span className="absolute top-1 left-1 bg-amber-500 w-1.5 h-1.5 rounded-full" title="Edited" />
                                )}
                              </div>

                              {/* Hover trash to trash file */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFrame(frame.index);
                                }}
                                title="Exclude Frame"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-rose-600/95 hover:bg-rose-500 text-white rounded p-1 transition-opacity cursor-pointer shadow-md"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Exporter Section: compile header block options */}
                    <div className="bg-[#131316] border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-6 h-6 text-[#3db8ff]" />
                          <div>
                            <h3 className="font-semibold text-white">PROGMEM Code Generator</h3>
                            <p className="text-[11px] text-zinc-400">Configure parameters for code compilation export arrays</p>
                          </div>
                        </div>

                        {/* Compression options trigger */}
                        <div className="flex bg-zinc-950 p-1 border border-zinc-800 rounded-xl">
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, compression: 'none' }))}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              settings.compression === 'none' 
                                ? 'bg-[#3db8ff]/15 text-[#3db8ff] border border-[#3db8ff]/20' 
                                : 'text-[#a1a1aa] hover:text-white'
                            }`}
                          >
                            Raw Mode (1024b/F)
                          </button>
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, compression: 'rle' }))}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              settings.compression === 'rle' 
                                ? 'bg-[#3db8ff]/15 text-[#3db8ff] border border-[#3db8ff]/20' 
                                : 'text-[#a1a1aa] hover:text-white'
                            }`}
                          >
                            RLE Compressed
                          </button>
                        </div>
                      </div>

                      {/* Memory analytics segment gauge */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800/80">
                        <div>
                          <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Frames Array</span>
                          <span className="text-lg font-mono font-bold text-white mt-1 block">{statistics.framesCount} Frames</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Estimated Binary Size</span>
                          <span className="text-lg font-mono font-bold text-[#3db8ff] mt-1 block">{(statistics.bytes / 1024).toFixed(1)} KB</span>
                        </div>
                        {settings.compression === 'rle' && (
                          <div>
                            <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">RLE Compression Factor</span>
                            <span className="text-lg font-mono font-bold text-emerald-400 mt-1 block">{statistics.factor}x Ratio</span>
                          </div>
                        )}
                        <div>
                          <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">ESP8266 Flash Occupied</span>
                          <span className="text-lg font-mono font-bold text-amber-500 mt-1 block">{statistics.percent}% Space</span>
                        </div>
                      </div>

                      {/* Exporter Custom Parameters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-medium">
                        <div>
                          <label className="block text-zinc-400 mb-1">C Variable Array Token Name</label>
                          <input
                            type="text"
                            value={exporterName}
                            onChange={(e) => setExporterName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            className="w-full bg-zinc-905 text-zinc-200 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#3db8ff] font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1">OLED Memory Page Pin format</label>
                          <select
                            value={settings.packingMode}
                            onChange={(e) => setSettings(prev => ({ ...prev, packingMode: e.target.value as PackingMode }))}
                            className="w-full bg-zinc-905 text-zinc-200 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#3db8ff] font-medium font-sans"
                          >
                            <option value="horizontal">Horizontal (Adafruit_GFX Standard)</option>
                            <option value="vertical-page">Page Vertical format (direct SSD1306/U8g2)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1">Code / Data Output Option</label>
                          <select
                            value={settings.codeFormat || 'full-header'}
                            onChange={(e) => setSettings(prev => ({ ...prev, codeFormat: e.target.value as any }))}
                            className="w-full bg-zinc-905 text-zinc-200 border border-[#3db8ff]/30 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#3db8ff] font-medium font-sans text-white focus:ring-1 focus:ring-[#3db8ff]"
                          >
                            <option value="full-header">Full C/C++ Header (.h)</option>
                            <option value="array-only">C Array Values Only</option>
                            <option value="csv-values">Comma-Separated Hex Values (.txt)</option>
                            <option value="python-list">Python List Format (.py)</option>
                          </select>
                        </div>
                      </div>

                      {/* Visual Header Output precode block */}
                      <div className="relative">
                        <div className="absolute right-4 top-4 flex gap-2 flex-wrap justify-end">
                          <button
                            onClick={handleCopyCode}
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-lg flex items-center gap-1.5 text-xs cursor-pointer font-bold"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#3db8ff]" />}
                            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                          </button>
                          
                          <button
                            onClick={handleDownloadPixie}
                            className="p-2 text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 transition-all rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-indigo-200 font-bold" />
                            <span>Convert to .pixie</span>
                          </button>

                          <button
                            onClick={handleDownloadFile}
                            className="p-2 text-black bg-[#3db8ff] hover:bg-[#2da1e6] transition-all rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-[0_0_15px_rgba(61,184,255,0.25)] cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-black font-bold" />
                            <span>Download {exporterName}.{settings.codeFormat === 'python-list' ? 'py' : settings.codeFormat === 'csv-values' ? 'txt' : 'h'}</span>
                          </button>
                        </div>

                        <pre className="bg-zinc-950 text-zinc-300 p-6 pt-16 rounded-2xl border border-zinc-800 overflow-x-auto text-[10px] font-mono leading-relaxed max-h-[400px] scrollbar-thin">
                          {compileArduinoHeader}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Styled Micro-Workspace Sticky Footer */}
      <footer className="border-t border-zinc-900 bg-[#09090b] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-550 text-xs leading-relaxed max-w-lg">
          <p className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">PixieStream Monochromatic Bitstream Studio</p>
          <p className="mt-1.5 text-zinc-500">Perfect for compiling pixel animations safely into Arduino and ESP8266 PROGMEM header segments. Developed client-only for instant offline usage.</p>
        </div>
      </footer>
    </div>
  );
}
