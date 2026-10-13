import React from 'react';
import { FacialAnalysisResult, DetectedFace, ActionUnit } from '../types/expression';
import {
  Activity,
  Smile,
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  BarChart3,
  Cpu,
  Eye,
  Info,
} from 'lucide-react';

interface ExpressionAnalysisViewProps {
  analysis: FacialAnalysisResult | null;
  isAnalyzing: boolean;
  onSendToMLTraining?: () => void;
}

export const ExpressionAnalysisView: React.FC<ExpressionAnalysisViewProps> = ({
  analysis,
  isAnalyzing,
  onSendToMLTraining,
}) => {
  if (isAnalyzing) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[380px]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <Activity className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Extracting Affective Signals & FACS Action Units
        </h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
          Synthesizing facial landmark geometry, valence-arousal circumplex coordinates, micro-expressions, and machine learning feature tags...
        </p>
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          Processing Model: gemini-3.8-flash (Vision)
        </div>
      </div>
    );
  }

  if (!analysis || !analysis.faces || analysis.faces.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[380px]">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
          <Smile className="w-7 h-7 text-slate-500" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200 mb-1">No Facial Expression Analysis Yet</h4>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
          Capture a webcam snapshot or select an image to inspect comprehensive facial emotions and Action Units.
        </p>
      </div>
    );
  }

  const face: DetectedFace = analysis.faces[0];

  // Normalized coordinates for Russell's circumplex model
  // Valence: -1 (left) to +1 (right) -> map to 0% to 100%
  const circumplexX = Math.min(95, Math.max(5, ((face.valence + 1) / 2) * 100));
  // Arousal: 0 (bottom) to 1 (top) -> map to 100% to 0%
  const circumplexY = Math.min(95, Math.max(5, (1 - face.arousal) * 100));

  return (
    <div className="space-y-4">
      {/* Overview Card: Primary Expression & Affective Synopsis */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Primary Facial Expression Classification
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Ultra-Precision (Deep Thinking & FACS Calibrated)
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                {face.primaryEmotion}
              </h2>
              <span className="text-sm font-semibold text-cyan-400 font-mono">
                {face.primaryEmotionConfidence}% confidence
              </span>
            </div>
          </div>

          {face.secondaryEmotion && (
            <div className="text-right">
              <div className="text-[11px] text-slate-500 mb-0.5">Secondary Component</div>
              <div className="text-xs font-medium text-slate-300">
                {face.secondaryEmotion} <span className="text-slate-500">({face.secondaryEmotionConfidence}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Executive summary paragraph */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4">
          {analysis.overallSummary}
        </p>

        {/* Micro-expression & Authenticity row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block mb-1 font-medium">Expression Authenticity</span>
            <span className="text-slate-200 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {face.expressionAuthenticity || 'Natural Affective State'}
            </span>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block mb-1 font-medium">Gaze & Visual Attention</span>
            <span className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {face.gazeDirection}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Russell's Circumplex & Head Pose / Landmarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Russell's Circumplex Affect Model (Valence vs Arousal) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-semibold text-slate-200">
                Russell's Circumplex Model (2D Affect)
              </h4>
            </div>
            <div className="text-[11px] font-mono text-cyan-300">
              V: {face.valence >= 0 ? `+${face.valence.toFixed(2)}` : face.valence.toFixed(2)} · A: {face.arousal.toFixed(2)}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Pleasure (Valence) plotted against physiological activation (Arousal).
          </p>

          {/* 2D Plane Coordinate Graph */}
          <div className="relative aspect-square max-h-[220px] mx-auto bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2">
            {/* Quadrant labels */}
            <div className="absolute top-2 left-2 text-[9px] text-rose-400/70 font-mono">
              High Arousal / Negative (Tense)
            </div>
            <div className="absolute top-2 right-2 text-[9px] text-emerald-400/70 font-mono text-right">
              High Arousal / Positive (Excited)
            </div>
            <div className="absolute bottom-2 left-2 text-[9px] text-slate-500 font-mono">
              Low Arousal / Negative (Sad)
            </div>
            <div className="absolute bottom-2 right-2 text-[9px] text-teal-400/70 font-mono text-right">
              Low Arousal / Positive (Serene)
            </div>

            {/* Crosshair Axes */}
            <div className="absolute inset-x-0 top-1/2 border-b border-slate-800 border-dashed"></div>
            <div className="absolute inset-y-0 left-1/2 border-r border-slate-800 border-dashed"></div>

            {/* Plotted Point Indicator */}
            <div
              className="absolute w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-[0_0_12px_#22d3ee] -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-10"
              style={{
                left: `${circumplexX}%`,
                top: `${circumplexY}%`,
              }}
            >
              <div className="w-full h-full rounded-full animate-ping bg-cyan-400/60"></div>
            </div>
          </div>
        </div>

        {/* 3D Head Pose & Landmark Morphology */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-semibold text-slate-200">
                Head Pose Orientation & Landmark Geometry
              </h4>
            </div>

            {/* Head Pose Degrees Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-0.5">Yaw (Left/Right)</span>
                <span className="text-sm font-bold font-mono text-indigo-300">
                  {face.headPose.yaw > 0 ? `+${face.headPose.yaw}°` : `${face.headPose.yaw}°`}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-0.5">Pitch (Up/Down)</span>
                <span className="text-sm font-bold font-mono text-indigo-300">
                  {face.headPose.pitch > 0 ? `+${face.headPose.pitch}°` : `${face.headPose.pitch}°`}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-0.5">Roll (Tilt)</span>
                <span className="text-sm font-bold font-mono text-indigo-300">
                  {face.headPose.roll > 0 ? `+${face.headPose.roll}°` : `${face.headPose.roll}°`}
                </span>
              </div>
            </div>

            {/* Landmark descriptions */}
            <div className="space-y-2 text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 font-semibold mr-1.5">Eyes & Brows:</span>
                <span>{face.landmarksSummary.eyes}; {face.landmarksSummary.eyebrows}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold mr-1.5">Mouth & Jaw:</span>
                <span>{face.landmarksSummary.mouth}; {face.landmarksSummary.jaw}</span>
              </div>
            </div>
          </div>

          {/* Micro expressions note */}
          {face.microExpressions && (
            <div className="mt-3 text-[11px] text-slate-400 italic">
              Note: {face.microExpressions}
            </div>
          )}
        </div>
      </div>

      {/* FACS Action Units (Facial Action Coding System) Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-slate-200">
              FACS Action Units (Facial Action Coding System)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {face.actionUnits.length} active anatomical units
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
          Standardized biometric measurement of individual facial muscle movements formulated by Paul Ekman.
        </p>

        {/* Action Units Table / Grid */}
        <div className="space-y-2.5">
          {face.actionUnits.map((au) => (
            <div
              key={au.code}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
                  {au.code}
                </span>
                <div>
                  <h5 className="text-xs font-semibold text-slate-200">{au.name}</h5>
                  {au.muscle && (
                    <span className="text-[10px] text-slate-500 font-serif italic">
                      Muscle: {au.muscle}
                    </span>
                  )}
                </div>
              </div>

              {/* Intensity Segmented Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`w-3.5 h-3.5 rounded-xs transition-colors ${
                        lvl <= au.intensity
                          ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                          : 'bg-slate-800'
                      }`}
                      title={`FACS Intensity Level ${lvl}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 w-12 text-right">
                  Lvl {au.intensity}/5
                </span>
              </div>

              {au.description && (
                <div className="w-full text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  {au.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Machine Learning Suitability Audit Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200">
              Machine Learning Dataset Quality Audit
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span>ML Score: {face.mlSuitability.score}/100</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Illumination Balance</span>
            <div className="flex items-baseline justify-between">
              <span className="font-bold text-slate-200 font-mono">{face.mlSuitability.lightingScore}%</span>
              <span className="text-[10px] text-emerald-400">Uniform</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Feature Sharpness</span>
            <div className="flex items-baseline justify-between">
              <span className="font-bold text-slate-200 font-mono">{face.mlSuitability.sharpnessScore}%</span>
              <span className="text-[10px] text-cyan-400">High Def</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Occlusion Check</span>
            <div className="flex items-baseline justify-between">
              <span className="font-bold text-slate-200">
                {face.mlSuitability.occlusionDetected ? 'Occluded' : 'Clear ROI'}
              </span>
              <span className="text-[10px] text-slate-400">Zero Blockage</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          {face.mlSuitability.recommendations}
        </p>
      </div>
    </div>
  );
};
