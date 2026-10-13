import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, FolderUp, Check, ArrowRight } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (dataUrl: string, autoAnalyze?: boolean) => void;
  onBatchImagesSelected?: (dataUrls: string[]) => void;
}

interface PresetFace {
  id: string;
  label: string;
  expression: string;
  url: string;
}

const PRESET_FACES: PresetFace[] = [
  {
    id: 'joy-1',
    label: 'Joy & Radiant Smile',
    expression: 'High AU06 + AU12 engagement, genuine Duchenne affect',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'neutral-1',
    label: 'Neutral & Attentive',
    expression: 'Balanced facial symmetry, baseline resting pose',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'laugh-1',
    label: 'Exuberant Laughter',
    expression: 'High arousal, parted lips (AU25), cheek elevation',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'serious-1',
    label: 'Resolute & Focused',
    expression: 'Mild brow contraction (AU04), firm gaze axis',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'surprise-1',
    label: 'Wonder & Surprise',
    expression: 'Elevated brow arch (AU01/02), wide orbital apertura',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80',
  },
  {
    id: 'contemplative-1',
    label: 'Contemplative & Pensive',
    expression: 'Mild asymmetric lip press (AU14), head pitch shift',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80',
  },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, onBatchImagesSelected }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

  // Global paste handler for quick insertion
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelected(result, true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      processFile(files[0]);
    } else {
      // Multiple files uploaded for ML dataset batch
      const urls: string[] = [];
      let loaded = 0;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const res = ev.target?.result as string;
          if (res) urls.push(res);
          loaded++;
          if (loaded === files.length) {
            if (urls.length > 0) {
              onImageSelected(urls[0], true);
              if (onBatchImagesSelected) {
                onBatchImagesSelected(urls);
              }
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      processFile(files[0]);
    } else {
      const urls: string[] = [];
      let loaded = 0;
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const res = ev.target?.result as string;
            if (res) urls.push(res);
            loaded++;
            if (loaded === files.length) {
              if (urls.length > 0) {
                onImageSelected(urls[0], true);
                if (onBatchImagesSelected) {
                  onBatchImagesSelected(urls);
                }
              }
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // Convert preset URL to real base64 image data
  const handleSelectPreset = async (preset: PresetFace) => {
    try {
      setLoadingPresetId(preset.id);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = preset.url;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onImageSelected(dataUrl, true);
      }
    } catch (err) {
      console.warn('Preset fetch issue, falling back to direct URL fetch:', err);
      // Alternative fallback fetch
      try {
        const resp = await fetch(preset.url);
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          onImageSelected(reader.result as string, true);
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error('Failed to load preset:', e);
      }
    } finally {
      setLoadingPresetId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <h4 className="text-sm font-semibold text-slate-100 mb-1">
            Insert Image or Multi-File Batch
          </h4>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Drag & drop face portraits, click to browse, or paste with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">Ctrl+V</kbd>
          </p>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Supports JPG, PNG, WEBP</span>
            <span aria-hidden="true">·</span>
            <span>Batch uploads auto-populate ML training</span>
          </div>
        </div>
      </div>

      {/* Preset Face Expression Benchmark Gallery */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h5 className="text-xs font-semibold text-slate-200">
              Preset Facial Benchmark Gallery
            </h5>
          </div>
          <span className="text-[11px] text-slate-500">Instant test without webcam</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {PRESET_FACES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              disabled={loadingPresetId !== null}
              className="group relative rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all text-left bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 active:scale-95"
            >
              <div className="aspect-square w-full relative overflow-hidden bg-slate-900">
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {loadingPresetId === preset.id && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                  </div>
                )}
              </div>
              <div className="p-2 bg-slate-900/90">
                <div className="text-[11px] font-medium text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                  {preset.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
