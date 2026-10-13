import React, { useRef, useState, useEffect } from 'react';
import { FacialAnalysisResult, DetectedFace } from '../types/expression';
import { Eye, Scan, Maximize2, Download, Check, Sparkles, Crop } from 'lucide-react';

interface ImageAnnotatedCanvasProps {
  imageDataUrl: string;
  analysis: FacialAnalysisResult | null;
  isAnalyzing: boolean;
  onCropToFace?: (croppedUrl: string) => void;
}

export const ImageAnnotatedCanvas: React.FC<ImageAnnotatedCanvasProps> = ({
  imageDataUrl,
  analysis,
  isAnalyzing,
  onCropToFace,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showAuTags, setShowAuTags] = useState(true);
  const [activeFaceIndex, setActiveFaceIndex] = useState(0);

  const face: DetectedFace | undefined = analysis?.faces?.[activeFaceIndex];

  // Helper to extract tight face crop
  const handleCropFace = () => {
    if (!imgRef.current || !face?.boundingBox || !onCropToFace) return;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const box = face.boundingBox;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const cropX = Math.max(0, (box.xmin / 100) * width);
    const cropY = Math.max(0, (box.ymin / 100) * height);
    const cropW = Math.min(width - cropX, ((box.xmax - box.xmin) / 100) * width);
    const cropH = Math.min(height - cropY, ((box.ymax - box.ymin) / 100) * height);

    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 256, 256);
    const croppedUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCropToFace(croppedUrl);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Header Controls */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Vision Annotation Viewport</span>
          {face && (
            <span className="text-slate-500">
              · {face.primaryEmotion} ({face.primaryEmotionConfidence}%)
            </span>
          )}
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowBoundingBox(!showBoundingBox)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              showBoundingBox
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Box
          </button>
          <button
            onClick={() => setShowLandmarks(!showLandmarks)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              showLandmarks
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Landmarks
          </button>
          <button
            onClick={() => setShowAuTags(!showAuTags)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              showAuTags
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            FACS Tags
          </button>

          {face && onCropToFace && (
            <button
              onClick={handleCropFace}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors ml-1"
              title="Crop to tight 256x256 face ROI"
            >
              <Crop className="w-3 h-3 text-indigo-400" />
              Crop ROI
            </button>
          )}
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[380px] max-h-[500px] bg-slate-950 flex items-center justify-center p-3 select-none overflow-hidden"
      >
        <div className="relative inline-block max-w-full max-h-full">
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Facial input target"
            className="max-h-[460px] max-w-full rounded-xl object-contain shadow-2xl block"
          />

          {/* Real-time Scanning Radar Animation */}
          {isAnalyzing && (
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-20">
              <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-[1px]"></div>
              {/* Radar scan beam */}
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-[scan_2s_ease-in-out_infinite]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-slate-900/90 border border-indigo-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 text-xs text-indigo-200">
                  <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                  <span>Executing Gemini Multimodal Facial Recognition...</span>
                </div>
              </div>
            </div>
          )}

          {/* Bounding Box & Landmark Overlays */}
          {face && !isAnalyzing && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Bounding Box */}
              {showBoundingBox && face.boundingBox && (
                <div
                  className="absolute border-2 border-cyan-400 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
                  style={{
                    top: `${face.boundingBox.ymin}%`,
                    left: `${face.boundingBox.xmin}%`,
                    width: `${face.boundingBox.xmax - face.boundingBox.xmin}%`,
                    height: `${face.boundingBox.ymax - face.boundingBox.ymin}%`,
                  }}
                >
                  {/* Label badge on top of box */}
                  <div className="absolute -top-7 left-0 flex items-center gap-1.5 bg-cyan-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider shadow-md">
                    <span>{face.primaryEmotion}</span>
                    <span className="opacity-80">· {face.primaryEmotionConfidence}%</span>
                  </div>

                  {/* Corner Target Accents */}
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-300"></div>
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-300"></div>
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-300"></div>
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-300"></div>

                  {/* Valence & Arousal Tag at bottom */}
                  <div className="absolute -bottom-6 left-0 flex items-center gap-2 text-[9px] font-mono text-cyan-300 bg-slate-950/85 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    <span>V: {face.valence >= 0 ? `+${face.valence.toFixed(2)}` : face.valence.toFixed(2)}</span>
                    <span>A: {face.arousal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Facial Action Units Tags (Floating beside bounding box) */}
              {showAuTags && face.actionUnits && face.boundingBox && (
                <div
                  className="absolute flex flex-col gap-1 pointer-events-auto"
                  style={{
                    top: `${face.boundingBox.ymin}%`,
                    left: `${Math.min(92, face.boundingBox.xmax + 2)}%`,
                  }}
                >
                  {face.actionUnits.slice(0, 4).map((au) => (
                    <div
                      key={au.code}
                      className="bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-0.5 text-[9px] font-mono text-slate-200 shadow-md backdrop-blur-xs flex items-center gap-1"
                    >
                      <span className="text-indigo-400 font-semibold">{au.code}</span>
                      <span className="text-slate-400 truncate max-w-[80px]">{au.name}</span>
                      <span className="text-amber-400 font-bold">lvl{au.intensity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Precise Sub-Pixel Landmark Anchor Indicators */}
              {showLandmarks && face.boundingBox && (
                <>
                  {/* Left Eye */}
                  <div
                    className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] -translate-x-1/2 -translate-y-1/2 border border-slate-950 transition-all"
                    style={{
                      top: `${face.landmarkPoints?.leftEye?.y ?? face.boundingBox.ymin + (face.boundingBox.ymax - face.boundingBox.ymin) * 0.38}%`,
                      left: `${face.landmarkPoints?.leftEye?.x ?? face.boundingBox.xmin + (face.boundingBox.xmax - face.boundingBox.xmin) * 0.32}%`,
                    }}
                    title="Left Eye Anchor"
                  />
                  {/* Right Eye */}
                  <div
                    className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] -translate-x-1/2 -translate-y-1/2 border border-slate-950 transition-all"
                    style={{
                      top: `${face.landmarkPoints?.rightEye?.y ?? face.boundingBox.ymin + (face.boundingBox.ymax - face.boundingBox.ymin) * 0.38}%`,
                      left: `${face.landmarkPoints?.rightEye?.x ?? face.boundingBox.xmin + (face.boundingBox.xmax - face.boundingBox.xmin) * 0.68}%`,
                    }}
                    title="Right Eye Anchor"
                  />
                  {/* Nose Tip */}
                  <div
                    className="absolute w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8] -translate-x-1/2 -translate-y-1/2 border border-slate-950 transition-all"
                    style={{
                      top: `${face.landmarkPoints?.noseTip?.y ?? face.boundingBox.ymin + (face.boundingBox.ymax - face.boundingBox.ymin) * 0.58}%`,
                      left: `${face.landmarkPoints?.noseTip?.x ?? face.boundingBox.xmin + (face.boundingBox.xmax - face.boundingBox.xmin) * 0.5}%`,
                    }}
                    title="Nose Tip Anchor"
                  />
                  {/* Mouth Center */}
                  <div
                    className="absolute w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185] -translate-x-1/2 -translate-y-1/2 border border-slate-950 transition-all"
                    style={{
                      top: `${face.landmarkPoints?.mouthCenter?.y ?? face.boundingBox.ymin + (face.boundingBox.ymax - face.boundingBox.ymin) * 0.76}%`,
                      left: `${face.landmarkPoints?.mouthCenter?.x ?? face.boundingBox.xmin + (face.boundingBox.xmax - face.boundingBox.xmin) * 0.5}%`,
                    }}
                    title="Oral Commissure / Mouth Center Anchor"
                  />
                  {/* Mouth Left Corner */}
                  {face.landmarkPoints?.mouthLeftCorner && (
                    <div
                      className="absolute w-1.5 h-1.5 rounded-full bg-rose-300 shadow-[0_0_6px_#fda4af] -translate-x-1/2 -translate-y-1/2 border border-slate-950 transition-all"
                      style={{
                        top: `${face.landmarkPoints.mouthLeftCorner.y}%`,
                        left: `${face.landmarkPoints.mouthLeftCorner.x}%`,
                      }}
                      title="Left Oral Commissure"
                    />
                  )}
                  {/* Mouth Right Corner */}
                  {face.landmarkPoints?.mouthRightCorner && (
                    <div
                      className="absolute w-1.5 h-1.5 rounded-full bg-rose-300 shadow-[0_0_6px_#fda4af] -translate-x-1/2 -translate-y-1/2 border border-slate-950 transition-all"
                      style={{
                        top: `${face.landmarkPoints.mouthRightCorner.y}%`,
                        left: `${face.landmarkPoints.mouthRightCorner.x}%`,
                      }}
                      title="Right Oral Commissure"
                    />
                  )}
                  {/* Chin Tip */}
                  {face.landmarkPoints?.chinTip && (
                    <div
                      className="absolute w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_#2dd4bf] -translate-x-1/2 -translate-y-1/2 border border-slate-950 transition-all"
                      style={{
                        top: `${face.landmarkPoints.chinTip.y}%`,
                        left: `${face.landmarkPoints.chinTip.x}%`,
                      }}
                      title="Mentum / Chin Tip Anchor"
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
