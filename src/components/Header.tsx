import React from 'react';
import { ScanFace, Cpu, Database, Sparkles, Video, HelpCircle, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'studio' | 'batch' | 'dataset';
  setActiveTab: (tab: 'studio' | 'batch' | 'dataset') => void;
  datasetCount: number;
  batchCount?: number;
  hasAnalysis: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  datasetCount,
  batchCount = 0,
  hasAnalysis,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <ScanFace className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-100 text-base tracking-tight">
                FacetML
              </h1>
              <span className="text-[10px] font-mono font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                FACS & Affect AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Facial Expression Analytics & Machine Learning Dataset Generator
            </p>
          </div>
        </div>

        {/* Tab Navigation Controls (Interactive Filter Tabs / Segmented Controls) */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Expression Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'batch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Batch Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dataset'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>ML Dataset</span>
            {datasetCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 font-mono text-cyan-300">
                {datasetCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
