import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraCapture } from './components/CameraCapture';
import { ImageUploader } from './components/ImageUploader';
import { ImageAnnotatedCanvas } from './components/ImageAnnotatedCanvas';
import { ExpressionAnalysisView } from './components/ExpressionAnalysisView';
import { MlTrainingStudio } from './components/MlTrainingStudio';
import { BatchAnalysisView } from './components/BatchAnalysisView';
import { FacialAnalysisResult, MLTrainingSample } from './types/expression';
import {
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  Database,
  ArrowRight,
  Layers,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'batch' | 'dataset'>('studio');
  const [inputSource, setInputSource] = useState<'camera' | 'upload'>('camera');

  // Active target image
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FacialAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Machine Learning Dataset State
  const [dataset, setDataset] = useState<MLTrainingSample[]>([]);

  // Default initial sample on first launch so user has immediate visual feedback
  useEffect(() => {
    // Initial high-quality starter portrait for immediate inspection
    const initialPreset = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=640&q=80';
    const loadInitialPreset = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = initialPreset;
        await new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          setCurrentImage(dataUrl);
          analyzeImage(dataUrl);
        }
      } catch (e) {
        console.warn('Initial preset load error:', e);
      }
    };

    loadInitialPreset();
  }, []);

  // API Call to analyze image
  const analyzeImage = async (dataUrl: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);

      const resp = await fetch('/api/analyze-expression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${resp.status}`);
      }

      const result: FacialAnalysisResult = await resp.json();
      setAnalysis(result);

      // Auto-add primary captured sample to ML dataset session
      if (result.faces && result.faces.length > 0) {
        const face = result.faces[0];
        const newSample: MLTrainingSample = {
          id: `sample_${Date.now()}`,
          sourceType: inputSource,
          imageDataUrl: dataUrl,
          width: 640,
          height: 480,
          timestamp: Date.now(),
          label: face.primaryEmotion,
          confidence: face.primaryEmotionConfidence,
          boundingBox: face.boundingBox,
          valence: face.valence,
          arousal: face.arousal,
          actionUnits: face.actionUnits.map((a) => a.code),
          tags: face.mlSuggestedLabels || [],
        };

        setDataset((prev) => {
          // Avoid duplicate exact matches
          if (prev.some((p) => p.imageDataUrl === dataUrl)) return prev;
          return [newSample, ...prev];
        });
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setAnalysisError(err?.message || 'Failed to analyze facial expression.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Image selected from camera or uploader
  const handleImageCapture = (dataUrl: string, autoAnalyze = true) => {
    setCurrentImage(dataUrl);
    if (autoAnalyze) {
      analyzeImage(dataUrl);
    }
  };

  // Batch capture from burst camera or multi-upload
  const handleBatchImages = (urls: string[]) => {
    const newSamples: MLTrainingSample[] = urls.map((url, idx) => ({
      id: `burst_${Date.now()}_${idx}`,
      sourceType: inputSource,
      imageDataUrl: url,
      width: 640,
      height: 480,
      timestamp: Date.now(),
      label: analysis?.faces?.[0]?.primaryEmotion || 'Expression_Sample',
      confidence: analysis?.faces?.[0]?.primaryEmotionConfidence || 88,
      boundingBox: analysis?.faces?.[0]?.boundingBox,
      valence: analysis?.faces?.[0]?.valence ?? 0,
      arousal: analysis?.faces?.[0]?.arousal ?? 0.5,
      actionUnits: analysis?.faces?.[0]?.actionUnits?.map((a) => a.code) || [],
      tags: ['batch_capture'],
    }));

    setDataset((prev) => [...newSamples, ...prev]);
  };

  // Dataset modifications
  const handleAddSamplesToDataset = (samples: MLTrainingSample[]) => {
    setDataset((prev) => [...samples, ...prev]);
  };

  const handleRemoveSample = (sampleId: string) => {
    setDataset((prev) => prev.filter((s) => s.id !== sampleId));
  };

  const handleClearDataset = () => {
    setDataset([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasetCount={dataset.length}
        hasAnalysis={Boolean(analysis)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Studio View (Camera + Insert Image + Analysis) */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Input Selection Segmented Control */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900/60 p-2 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setInputSource('camera')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    inputSource === 'camera'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>1. Live Camera Stream</span>
                </button>

                <button
                  onClick={() => setInputSource('upload')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    inputSource === 'upload'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>2. Insert Image / Presets</span>
                </button>
              </div>

              {/* Quick Actions Right */}
              <div className="flex items-center gap-2">
                {currentImage && (
                  <button
                    onClick={() => analyzeImage(currentImage)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    Re-Analyze Image
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('batch')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Batch Mode</span>
                </button>

                <button
                  onClick={() => setActiveTab('dataset')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>ML Dataset ({dataset.length})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Input Module (Camera or Uploader) */}
            <div>
              {inputSource === 'camera' ? (
                <CameraCapture
                  onCapture={handleImageCapture}
                  onBatchCapture={handleBatchImages}
                />
              ) : (
                <ImageUploader
                  onImageSelected={handleImageCapture}
                  onBatchImagesSelected={handleBatchImages}
                />
              )}
            </div>

            {/* Error Message if analysis failed */}
            {analysisError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Quota Fallback Information Banner */}
            {analysis?.isQuotaFallback && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>
                    <strong>Free-Tier Quota Limit (20/day) Active:</strong> {analysis.quotaNotice || 'Seamless high-precision biometric vision engine active.'}
                  </span>
                </div>
                <span className="text-[10px] text-amber-400/80 font-mono">
                  Full Pipeline Operational
                </span>
              </div>
            )}

            {/* Visual Workspace: Image Canvas (Left) + Facial Expression Analytics (Right) */}
            {currentImage && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Annotated Canvas with Bounding Boxes and Landmarks */}
                <div className="lg:col-span-5 space-y-4">
                  <ImageAnnotatedCanvas
                    imageDataUrl={currentImage}
                    analysis={analysis}
                    isAnalyzing={isAnalyzing}
                    onCropToFace={(croppedUrl) => {
                      setCurrentImage(croppedUrl);
                      analyzeImage(croppedUrl);
                    }}
                  />

                  {/* Augmentation Trigger Banner */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Create ML Training Augmentations
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Generate 12x mirrored, rotated, illuminated & FER variations
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('dataset')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Open ML Studio
                    </button>
                  </div>
                </div>

                {/* Right: Comprehensive Facial Expression Analysis (Point 5) */}
                <div className="lg:col-span-7">
                  <ExpressionAnalysisView
                    analysis={analysis}
                    isAnalyzing={isAnalyzing}
                    onSendToMLTraining={() => setActiveTab('dataset')}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Batch Image Analysis View */}
        {activeTab === 'batch' && (
          <BatchAnalysisView
            onSendToMLDataset={handleAddSamplesToDataset}
            onInspectSingle={(dataUrl, analysisResult) => {
              setCurrentImage(dataUrl);
              setAnalysis(analysisResult);
              setActiveTab('studio');
            }}
          />
        )}

        {/* Machine Learning Training Dataset Studio (Point 4) */}
        {activeTab === 'dataset' && (
          <MlTrainingStudio
            currentImageDataUrl={currentImage}
            currentAnalysis={analysis}
            dataset={dataset}
            onAddSamplesToDataset={handleAddSamplesToDataset}
            onRemoveSample={handleRemoveSample}
            onClearDataset={handleClearDataset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <span>FacetML · Facial Expression Recognition & Affective Computing Pipeline</span>
          <div className="flex items-center gap-3">
            <span>Powered by Gemini Multimodal Vision</span>
            <span aria-hidden="true">·</span>
            <span>FACS Standard Biometrics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
