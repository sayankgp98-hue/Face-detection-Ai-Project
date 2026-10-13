import React, { useState } from 'react';
import {
  MLTrainingSample,
  FacialAnalysisResult,
  DetectedFace,
} from '../types/expression';
import { generateMaxMLVariations, AugmentedVariation } from '../utils/imageAugmenter';
import { exportMLDatasetZip } from '../utils/datasetExporter';
import {
  Layers,
  Download,
  Sparkles,
  Database,
  Trash2,
  FileCode,
  CheckCircle2,
  FileSpreadsheet,
  Cpu,
  ChevronRight,
  Filter,
  Eye,
} from 'lucide-react';

interface MlTrainingStudioProps {
  currentImageDataUrl: string | null;
  currentAnalysis: FacialAnalysisResult | null;
  dataset: MLTrainingSample[];
  onAddSamplesToDataset: (samples: MLTrainingSample[]) => void;
  onRemoveSample: (sampleId: string) => void;
  onClearDataset: () => void;
}

export const MlTrainingStudio: React.FC<MlTrainingStudioProps> = ({
  currentImageDataUrl,
  currentAnalysis,
  dataset,
  onAddSamplesToDataset,
  onRemoveSample,
  onClearDataset,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [variations, setVariations] = useState<AugmentedVariation[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, boolean>>({});
  const [filterClass, setFilterClass] = useState<string>('all');
  const [showPyTorchCode, setShowPyTorchCode] = useState(false);

  const face: DetectedFace | undefined = currentAnalysis?.faces?.[0];

  // Generate 12x augmentation variations from current active image
  const handleGenerateVariations = async () => {
    if (!currentImageDataUrl) return;

    try {
      setIsGenerating(true);
      const generated = await generateMaxMLVariations(
        currentImageDataUrl,
        face?.boundingBox
      );
      setVariations(generated);

      // Select all by default
      const initialSelected: Record<string, boolean> = {};
      generated.forEach((v) => {
        initialSelected[v.type] = true;
      });
      setSelectedVariations(initialSelected);
    } catch (err) {
      console.error('Failed to generate ML variations:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add selected variations to the dataset
  const handleAddVariationsToDataset = () => {
    if (variations.length === 0) return;

    const label = face?.primaryEmotion || 'Unclassified';
    const confidence = face?.primaryEmotionConfidence || 90;
    const valence = face?.valence ?? 0;
    const arousal = face?.arousal ?? 0.5;
    const auList = face?.actionUnits?.map((a) => a.code) || [];
    const tags = face?.mlSuggestedLabels || ['ml_ready'];

    const newSamples: MLTrainingSample[] = [];

    variations.forEach((v) => {
      if (selectedVariations[v.type]) {
        newSamples.push({
          id: `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sourceType: 'augmented',
          augmentationType: v.type,
          imageDataUrl: v.dataUrl,
          width: 640,
          height: 480,
          timestamp: Date.now(),
          label,
          confidence,
          boundingBox: face?.boundingBox,
          valence,
          arousal,
          actionUnits: auList,
          tags: [...tags, v.type],
        });
      }
    });

    onAddSamplesToDataset(newSamples);
  };

  // Export dataset as ZIP
  const handleExportZip = async () => {
    if (dataset.length === 0) return;

    try {
      setIsExporting(true);
      const zipBlob = await exportMLDatasetZip(dataset);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facetml_dataset_${dataset.length}_samples.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export dataset zip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Download annotations CSV only
  const handleExportCSV = () => {
    if (dataset.length === 0) return;

    const rows = [
      'sample_id,source_type,augmentation_type,emotion_label,confidence,valence,arousal,action_units',
      ...dataset.map(
        (s) =>
          `${s.id},${s.sourceType},${s.augmentationType || 'orig'},"${s.label}",${s.confidence},${s.valence},${s.arousal},"${(s.actionUnits || []).join(';')}"`
      ),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facetml_annotations_${dataset.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Class distributions
  const classCounts: Record<string, number> = {};
  dataset.forEach((s) => {
    classCounts[s.label] = (classCounts[s.label] || 0) + 1;
  });

  const filteredSamples =
    filterClass === 'all'
      ? dataset
      : dataset.filter((s) => s.label === filterClass);

  return (
    <div className="space-y-6">
      {/* Augmentation Generator Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Maximum ML Training Augmentation Pipeline
            </div>
            <h3 className="text-lg font-bold text-slate-100">
              Generate 12x Training Variations per Image
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Transforms a single facial snapshot into 12 standardized machine-learning variations (mirror, illumination shifts, affine tilts, FER grayscale, CLAHE, sensor noise, 256x256 ROI crops).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateVariations}
              disabled={!currentImageDataUrl || isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Augmenting...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Generate 12x ML Variations
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Variations Grid */}
        {variations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-200">
                Augmentation Matrix ({variations.length} Samples Generated)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allTrue: Record<string, boolean> = {};
                    variations.forEach((v) => (allTrue[v.type] = true));
                    setSelectedVariations(allTrue);
                  }}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-600">·</span>
                <button
                  onClick={handleAddVariationsToDataset}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Add to ML Dataset Session
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {variations.map((v) => {
                const isSelected = Boolean(selectedVariations[v.type]);
                return (
                  <div
                    key={v.type}
                    onClick={() =>
                      setSelectedVariations((prev) => ({
                        ...prev,
                        [v.type]: !prev[v.type],
                      }))
                    }
                    className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all select-none bg-slate-950 p-1.5 ${
                      isSelected
                        ? 'border-indigo-500 ring-1 ring-indigo-500'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden relative bg-slate-900 mb-1.5">
                      <img
                        src={v.dataUrl}
                        alt={v.name}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900/80 text-transparent border border-slate-700'
                        }`}
                      >
                        ✓
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-200 truncate px-1">
                      {v.name}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate px-1">
                      {v.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dataset Session Collector & Class Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">
                Active ML Training Dataset Session
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {dataset.length} samples assembled · Ready for YOLO, COCO, and PyTorch CNN training
            </p>
          </div>

          {/* Export Actions Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPyTorchCode(!showPyTorchCode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              PyTorch Loader
            </button>

            <button
              onClick={handleExportCSV}
              disabled={dataset.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              CSV
            </button>

            <button
              onClick={handleExportZip}
              disabled={dataset.length === 0 || isExporting}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Packaging ZIP...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Full Dataset (.ZIP)
                </>
              )}
            </button>

            {dataset.length > 0 && (
              <button
                onClick={onClearDataset}
                className="p-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                title="Clear dataset session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* PyTorch Code Modal / Drawer */}
        {showPyTorchCode && (
          <div className="mb-4 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto">
            <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-slate-800">
              <span className="font-semibold text-cyan-300">train_pytorch.py (Included in exported ZIP)</span>
              <button
                onClick={() => setShowPyTorchCode(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed text-indigo-200">
{`import torch
import torchvision.models as models
from torch.utils.data import DataLoader
# Dataset contains ${dataset.length} images formatted for torchvision ResNet/ViT training!
# Run directly: python train_pytorch.py`}
            </pre>
          </div>
        )}

        {/* Class Balance Stats */}
        {Object.keys(classCounts).length > 0 && (
          <div className="mb-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300">Class Balance Distribution</span>
              <span className="text-slate-500">{Object.keys(classCounts).length} unique emotion classes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(classCounts).map(([cls, count]) => (
                <div
                  key={cls}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs flex items-center gap-2"
                >
                  <span className="font-medium text-slate-200">{cls}</span>
                  <span className="font-mono text-cyan-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded text-[11px]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dataset Samples Gallery */}
        {dataset.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
            <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-slate-300">Dataset Queue Empty</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Use "Burst Capture" with your camera or click "Generate 12x ML Variations" above to rapidly amass facial training images.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredSamples.map((sample, idx) => (
              <div
                key={sample.id}
                className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950"
              >
                <div className="aspect-square relative overflow-hidden bg-slate-900">
                  <img
                    src={sample.imageDataUrl}
                    alt={sample.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {/* Delete button */}
                  <button
                    onClick={() => onRemoveSample(sample.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-rose-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                    title="Remove sample"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-1.5 text-[10px]">
                  <div className="font-semibold text-slate-200 truncate">
                    {sample.label}
                  </div>
                  <div className="text-slate-500 font-mono text-[9px] truncate">
                    {sample.augmentationType || 'orig'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
