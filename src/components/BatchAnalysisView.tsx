import React, { useState, useRef } from 'react';
import {
  BatchAnalysisItem,
  BatchSummaryStats,
  FacialAnalysisResult,
  MLTrainingSample,
} from '../types/expression';
import {
  Layers,
  Upload,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart3,
  Download,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  Eye,
  FileSpreadsheet,
  FileJson,
  ArrowRight,
  Database,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface BatchAnalysisViewProps {
  onSendToMLDataset?: (samples: MLTrainingSample[]) => void;
  onInspectSingle?: (dataUrl: string, analysis: FacialAnalysisResult) => void;
}

const BENCHMARK_SUITE = [
  {
    name: 'Joy Portrait',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=640&q=80',
  },
  {
    name: 'Neutral Male',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=640&q=80',
  },
  {
    name: 'Joyful Laughter',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=640&q=80',
  },
  {
    name: 'Focused / Resolute',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=640&q=80',
  },
  {
    name: 'Wonder / Surprise',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80',
  },
  {
    name: 'Contemplative',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80',
  },
];

export const BatchAnalysisView: React.FC<BatchAnalysisViewProps> = ({
  onSendToMLDataset,
  onInspectSingle,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<BatchAnalysisItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [inspectedItem, setInspectedItem] = useState<BatchAnalysisItem | null>(null);

  // Add files to queue
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: BatchAnalysisItem[] = [];
    let loaded = 0;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          newItems.push({
            id: `batch_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            dataUrl,
            status: 'pending',
            timestamp: Date.now(),
          });
        }
        loaded++;
        if (loaded === files.length) {
          setItems((prev) => [...prev, ...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Load benchmark suite
  const handleLoadBenchmarkSuite = async () => {
    const loadedBatch: BatchAnalysisItem[] = [];

    for (let i = 0; i < BENCHMARK_SUITE.length; i++) {
      const bench = BENCHMARK_SUITE[i];
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = bench.url;
        await new Promise((res, rej) => {
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
          loadedBatch.push({
            id: `bench_${Date.now()}_${i}`,
            name: bench.name,
            dataUrl,
            status: 'pending',
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.warn('Failed to load benchmark item:', err);
      }
    }

    if (loadedBatch.length > 0) {
      setItems((prev) => [...prev, ...loadedBatch]);
    }
  };

  // Run simultaneous batch analysis
  const handleRunBatchAnalysis = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);

    // Mark pending items as analyzing
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'pending' || item.status === 'error'
          ? { ...item, status: 'analyzing', error: undefined }
          : item
      )
    );

    // Concurrently process pending items in parallel
    const pendingItems = items.filter(
      (item) => item.status === 'pending' || item.status === 'error'
    );

    // Process using Promise.allSettled with maximum concurrency of 4
    const concurrency = 4;
    for (let i = 0; i < pendingItems.length; i += concurrency) {
      const chunk = pendingItems.slice(i, i + concurrency);

      await Promise.allSettled(
        chunk.map(async (item) => {
          try {
            const resp = await fetch('/api/analyze-expression', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: item.dataUrl }),
            });

            if (!resp.ok) {
              const err = await resp.json().catch(() => ({}));
              throw new Error(err.error || `HTTP ${resp.status}`);
            }

            const analysis: FacialAnalysisResult = await resp.json();

            setItems((curr) =>
              curr.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'completed', analysis }
                  : it
              )
            );
          } catch (err: any) {
            setItems((curr) =>
              curr.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'error', error: err?.message || 'Analysis failed' }
                  : it
              )
            );
          }
        })
      );
    }

    setIsProcessing(false);
  };

  // Remove individual item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    setItems([]);
    setInspectedItem(null);
  };

  // Compute consolidated batch statistics
  const completedItems = items.filter((it) => it.status === 'completed' && it.analysis?.faces?.length);
  const emotionCounts: Record<string, number> = {};
  let totalValence = 0;
  let totalArousal = 0;
  let totalConfidence = 0;
  let totalMlScore = 0;
  const auMap: Record<string, { name: string; count: number; totalIntensity: number }> = {};
  const authenticityMap: Record<string, number> = {};

  completedItems.forEach((it) => {
    const face = it.analysis!.faces[0];
    const emotion = face.primaryEmotion || 'Unclassified';
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;

    totalValence += face.valence || 0;
    totalArousal += face.arousal || 0;
    totalConfidence += face.primaryEmotionConfidence || 0;
    totalMlScore += face.mlSuitability?.score || 85;

    if (face.expressionAuthenticity) {
      authenticityMap[face.expressionAuthenticity] =
        (authenticityMap[face.expressionAuthenticity] || 0) + 1;
    }

    if (face.actionUnits) {
      face.actionUnits.forEach((au) => {
        if (!auMap[au.code]) {
          auMap[au.code] = { name: au.name, count: 0, totalIntensity: 0 };
        }
        auMap[au.code].count += 1;
        auMap[au.code].totalIntensity += au.intensity || 1;
      });
    }
  });

  const count = completedItems.length;
  const avgValence = count > 0 ? totalValence / count : 0;
  const avgArousal = count > 0 ? totalArousal / count : 0;
  const avgConfidence = count > 0 ? totalConfidence / count : 0;
  const avgMlScore = count > 0 ? Math.round(totalMlScore / count) : 0;

  const topActionUnits = Object.entries(auMap)
    .map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
      avgIntensity: Number((data.totalIntensity / data.count).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Send all completed to ML Dataset
  const handlePushAllToMLDataset = () => {
    if (!onSendToMLDataset || completedItems.length === 0) return;

    const samples: MLTrainingSample[] = completedItems.map((item) => {
      const face = item.analysis!.faces[0];
      return {
        id: `batch_sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceType: 'upload',
        imageDataUrl: item.dataUrl,
        width: 640,
        height: 480,
        timestamp: Date.now(),
        label: face.primaryEmotion,
        confidence: face.primaryEmotionConfidence,
        boundingBox: face.boundingBox,
        valence: face.valence,
        arousal: face.arousal,
        actionUnits: face.actionUnits.map((a) => a.code),
        tags: face.mlSuggestedLabels || ['batch_analyzed'],
      };
    });

    onSendToMLDataset(samples);
  };

  // Export CSV Report
  const handleExportCSV = () => {
    if (completedItems.length === 0) return;

    const rows = [
      'item_name,primary_emotion,confidence,valence,arousal,authenticity,action_units,head_yaw,head_pitch,head_roll,ml_score',
      ...completedItems.map((it) => {
        const f = it.analysis!.faces[0];
        const auStr = (f.actionUnits || []).map((a) => `${a.code}:${a.intensity}`).join(';');
        return `"${it.name || 'image'}","${f.primaryEmotion}",${f.primaryEmotionConfidence},${f.valence.toFixed(2)},${f.arousal.toFixed(2)},"${f.expressionAuthenticity || ''}","${auStr}",${f.headPose.yaw},${f.headPose.pitch},${f.headPose.roll},${f.mlSuitability.score}`;
      }),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_facial_expression_report_${completedItems.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON Report
  const handleExportJSON = () => {
    if (completedItems.length === 0) return;

    const report = {
      summary: {
        total_items: items.length,
        analyzed_count: completedItems.length,
        average_confidence: avgConfidence.toFixed(1),
        average_valence: avgValence.toFixed(2),
        average_arousal: avgArousal.toFixed(2),
        emotion_distribution: emotionCounts,
        top_action_units: topActionUnits,
      },
      items: completedItems.map((it) => ({
        name: it.name,
        analysis: it.analysis,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_facial_expression_report_${completedItems.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter items
  const filteredItems = items.filter((it) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return it.status === 'pending';
    if (selectedFilter === 'completed') return it.status === 'completed';
    if (selectedFilter === 'error') return it.status === 'error';
    const emotion = it.analysis?.faces?.[0]?.primaryEmotion;
    return emotion === selectedFilter;
  });

  const pendingCount = items.filter((it) => it.status === 'pending').length;
  const analyzingCount = items.filter((it) => it.status === 'analyzing').length;

  return (
    <div className="space-y-6">
      {/* Top Batch Management & Upload Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Simultaneous Batch Facial Expression Engine
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Batch Image Analysis & Affect Diagnostics
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Queue multiple facial portraits, analyze them concurrently via Gemini Vision, and inspect consolidated emotion distributions, FACS Action Unit frequencies, and comparative metrics.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => handleFilesAdded(e.target.files)}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              Add Multiple Images
            </button>

            <button
              onClick={handleLoadBenchmarkSuite}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Load Benchmark Suite (6x)
            </button>

            <button
              onClick={handleRunBatchAnalysis}
              disabled={items.length === 0 || isProcessing || pendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Analyzing Simultaneously ({analyzingCount} in flight)...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Batch Analysis ({pendingCount > 0 ? pendingCount : items.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Progress Bar when Processing */}
        {isProcessing && (
          <div className="mt-2 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Processing Multimodal Batch Request...
              </span>
              <span className="font-mono text-cyan-300">
                {completedItems.length} of {items.length} completed
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                style={{
                  width: `${(completedItems.length / Math.max(1, items.length)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Consolidated Statistical Summary Cards (Shown once items are analyzed) */}
      {completedItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Consolidated Batch Analysis Results ({completedItems.length} Faces Processed)
              </h3>
            </div>

            {/* Quick Export Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                CSV Summary
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                JSON Report
              </button>
              {onSendToMLDataset && (
                <button
                  onClick={handlePushAllToMLDataset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                >
                  <Database className="w-3.5 h-3.5" />
                  Add All to ML Dataset
                </button>
              )}
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">Average Confidence</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {avgConfidence.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500">model certainty</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">Mean Valence (Affect)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-indigo-300">
                  {avgValence >= 0 ? `+${avgValence.toFixed(2)}` : avgValence.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {avgValence > 0.2 ? 'Positive' : avgValence < -0.2 ? 'Negative' : 'Neutral'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">Mean Arousal (Energy)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-amber-300">
                  {avgArousal.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">activation lvl</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">Avg ML Training Readiness</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {avgMlScore}/100
                </span>
                <span className="text-[10px] text-emerald-500">High Quality</span>
              </div>
            </div>
          </div>

          {/* Two-Column Deep Breakdown: Emotion Distribution & Top FACS Action Units */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Emotion Breakdown */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center justify-between">
                <span>Emotion Class Distribution</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {Object.keys(emotionCounts).length} distinct classes
                </span>
              </h4>
              <div className="space-y-2">
                {Object.entries(emotionCounts).map(([emotion, count]) => {
                  const pct = Math.round((count / completedItems.length) * 100);
                  return (
                    <div key={emotion} className="text-xs">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span className="font-medium">{emotion}</span>
                        <span className="font-mono text-cyan-400 font-semibold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top FACS Action Units in Batch */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center justify-between">
                <span>Dominant FACS Action Units Across Batch</span>
                <span className="text-[11px] text-slate-500 font-mono">Co-occurrence frequency</span>
              </h4>
              <div className="space-y-2">
                {topActionUnits.map((au) => (
                  <div
                    key={au.code}
                    className="flex items-center justify-between text-xs bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-bold text-[10px]">
                        {au.code}
                      </span>
                      <span className="text-slate-300 truncate max-w-[160px]">{au.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">
                        {au.count}/{completedItems.length} faces
                      </span>
                      <span className="font-mono text-amber-300 font-semibold text-[11px]">
                        avg lvl {au.avgIntensity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and View Toggle Toolbar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 px-2">
          {/* Emotion Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </span>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All ({items.length})
            </button>
            {Object.keys(emotionCounts).map((em) => (
              <button
                key={em}
                onClick={() => setSelectedFilter(em)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedFilter === em
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {em} ({emotionCounts[em]})
              </button>
            ))}
          </div>

          {/* View Mode Switcher and Clear */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                onClick={() => setActiveViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  activeViewMode === 'grid'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  activeViewMode === 'table'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dense Data Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleClearAll}
              className="p-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
              title="Clear Batch Queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Consolidated Presentation: Grid vs Table View */}
      {items.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            No Images in Batch Queue
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            Add multiple image files from your computer or click "Load Benchmark Suite" to analyze 6 facial expressions simultaneously.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
            >
              Select Image Files
            </button>
            <button
              onClick={handleLoadBenchmarkSuite}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Load Benchmark Suite (6x)
            </button>
          </div>
        </div>
      ) : activeViewMode === 'grid' ? (
        /* GRID CARD MATRIX VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, idx) => {
            const face = item.analysis?.faces?.[0];
            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image Preview & Status Header */}
                  <div className="aspect-[4/3] relative bg-slate-950 overflow-hidden">
                    <img
                      src={item.dataUrl}
                      alt={item.name || `Face ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      {item.status === 'completed' && face && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950 shadow-md">
                          {face.primaryEmotion} · {face.primaryEmotionConfidence}%
                        </span>
                      )}
                      {item.status === 'analyzing' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-600 text-white shadow-md animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          Analyzing...
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/90 text-slate-300 border border-slate-700 backdrop-blur-xs">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Queued
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-600 text-white shadow-md">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors backdrop-blur-xs"
                      title="Remove from batch"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body Analytics Card Content */}
                  <div className="p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="truncate max-w-[150px] font-medium text-slate-200">
                        {item.name || `Image #${idx + 1}`}
                      </span>
                      {face && (
                        <span className="font-mono text-cyan-400 text-[11px]">
                          V:{face.valence >= 0 ? `+${face.valence.toFixed(2)}` : face.valence.toFixed(2)} · A:{face.arousal.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Action Units Chips */}
                    {face?.actionUnits && face.actionUnits.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {face.actionUnits.slice(0, 3).map((au) => (
                          <span
                            key={au.code}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-950 border border-slate-800 text-amber-300"
                            title={`${au.code}: ${au.name} (Intensity: ${au.intensity})`}
                          >
                            {au.code} Lvl{au.intensity}
                          </span>
                        ))}
                        {face.actionUnits.length > 3 && (
                          <span className="text-[9px] text-slate-500 self-center">
                            +{face.actionUnits.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Authenticity / Gaze */}
                    {face?.expressionAuthenticity && (
                      <div className="text-[11px] text-slate-400 truncate">
                        <span className="text-slate-500">Affect:</span> {face.expressionAuthenticity}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspect Action Footer */}
                {face && (
                  <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => setInspectedItem(item)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detailed Inspect
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">
                      ML Score: {face.mlSuitability?.score}/100
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* DENSE CONSOLIDATED DATA TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Primary Emotion</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Valence / Arousal</th>
                  <th className="py-3 px-4">FACS Action Units</th>
                  <th className="py-3 px-4">Authenticity</th>
                  <th className="py-3 px-4">Head Pose</th>
                  <th className="py-3 px-4">ML Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((item, idx) => {
                  const face = item.analysis?.faces?.[0];
                  return (
                    <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                      {/* Image Thumbnail + Name */}
                      <td className="py-3 px-4 flex items-center gap-2.5">
                        <img
                          src={item.dataUrl}
                          alt={item.name || 'Thumb'}
                          className="w-9 h-9 rounded-lg object-cover bg-slate-950 border border-slate-800 shrink-0"
                        />
                        <span className="font-medium text-slate-200 truncate max-w-[140px]">
                          {item.name || `Image #${idx + 1}`}
                        </span>
                      </td>

                      {/* Emotion */}
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {face ? (
                          <span className="inline-flex items-center gap-1.5 text-cyan-300">
                            {face.primaryEmotion}
                          </span>
                        ) : item.status === 'analyzing' ? (
                          <span className="text-indigo-400 animate-pulse">Analyzing...</span>
                        ) : (
                          <span className="text-slate-500 font-normal">Pending</span>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 font-mono">
                        {face ? (
                          <span className="text-cyan-400 font-bold">
                            {face.primaryEmotionConfidence}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Valence & Arousal */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {face ? (
                          <span>
                            V: {face.valence >= 0 ? `+${face.valence.toFixed(2)}` : face.valence.toFixed(2)}{' '}
                            · A: {face.arousal.toFixed(2)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* FACS Action Units */}
                      <td className="py-3 px-4">
                        {face?.actionUnits ? (
                          <div className="flex flex-wrap gap-1">
                            {face.actionUnits.slice(0, 3).map((au) => (
                              <span
                                key={au.code}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-950 border border-slate-800 text-amber-300"
                              >
                                {au.code}
                              </span>
                            ))}
                            {face.actionUnits.length > 3 && (
                              <span className="text-[10px] text-slate-500">
                                +{face.actionUnits.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Authenticity */}
                      <td className="py-3 px-4 text-slate-300 truncate max-w-[130px]">
                        {face?.expressionAuthenticity || '—'}
                      </td>

                      {/* Head Pose */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {face ? (
                          `Y:${face.headPose.yaw}° P:${face.headPose.pitch}°`
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* ML Score */}
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                        {face?.mlSuitability ? `${face.mlSuitability.score}/100` : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {face && (
                          <button
                            onClick={() => setInspectedItem(item)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Detailed Inspection Drawer for Single Batch Item */}
      {inspectedItem && inspectedItem.analysis && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={inspectedItem.dataUrl}
                  alt="Thumb"
                  className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800"
                />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {inspectedItem.name || 'Batch Subject Inspection'}
                  </h3>
                  <div className="text-xs text-cyan-400 font-mono">
                    {inspectedItem.analysis.faces[0]?.primaryEmotion} (
                    {inspectedItem.analysis.faces[0]?.primaryEmotionConfidence}% Confidence)
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectedItem(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4">
              {inspectedItem.analysis.overallSummary}
            </p>

            {/* Action Units List */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-semibold text-slate-200">
                Active FACS Action Units ({inspectedItem.analysis.faces[0]?.actionUnits?.length || 0})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {inspectedItem.analysis.faces[0]?.actionUnits?.map((au) => (
                  <div
                    key={au.code}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-amber-400">{au.code}</span>
                      <span className="font-mono text-[11px] text-amber-300 font-semibold">
                        Lvl {au.intensity}/5
                      </span>
                    </div>
                    <div className="font-medium text-slate-200 text-[11px]">{au.name}</div>
                    {au.muscle && (
                      <div className="text-[10px] text-slate-500 italic">{au.muscle}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setInspectedItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
