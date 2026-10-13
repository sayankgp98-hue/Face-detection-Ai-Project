import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, Zap, Video, CheckCircle2, AlertTriangle, ShieldCheck, Layers } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (dataUrl: string, autoAnalyze?: boolean) => void;
  onBatchCapture?: (dataUrls: string[]) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onBatchCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState(true);
  const [showFaceGuide, setShowFaceGuide] = useState(true);
  const [flashAnimation, setFlashAnimation] = useState(false);

  // Burst capture mode
  const [isBursting, setIsBursting] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [burstTotal, setBurstTotal] = useState(5);

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Unable to list media devices:', err);
    }
  }, [selectedDeviceId]);

  // Start video stream
  const startCamera = async (deviceIdToUse?: string) => {
    setErrorMessage(null);
    setPermissionDenied(false);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
          : { facingMode: 'user', width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
      await updateDeviceList();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsStreaming(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setErrorMessage('Camera access was blocked by browser permissions. Please allow camera access in your URL bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera hardware was detected on this device.');
      } else {
        setErrorMessage(err.message || 'Failed to start camera feed.');
      }
    }
  };

  // Stop video stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Single Frame Capture
  const captureFrame = (autoAnalyze = true) => {
    if (!videoRef.current || !isStreaming) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);

    // Trigger visual flash shutter
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    onCapture(dataUrl, autoAnalyze);
    return dataUrl;
  };

  // Burst capture for training dataset creation
  const triggerBurstCapture = async (count = 5) => {
    if (!isStreaming || isBursting) return;
    setIsBursting(true);
    setBurstTotal(count);
    setBurstCount(0);

    const capturedBatch: string[] = [];

    for (let i = 1; i <= count; i++) {
      setBurstCount(i);
      const frameUrl = captureFrame(false);
      if (frameUrl) {
        capturedBatch.push(frameUrl);
      }
      // Wait 700ms between snapshots to let user adjust expression
      if (i < count) {
        await new Promise((res) => setTimeout(res, 750));
      }
    }

    setIsBursting(false);
    if (onBatchCapture && capturedBatch.length > 0) {
      onBatchCapture(capturedBatch);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Header Bar */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-tight flex items-center gap-2">
              Live Facial Camera Stream
              {isStreaming && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE 30 FPS
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Direct webcam access for instant facial expressions & ML captures</p>
          </div>
        </div>

        {/* Controls right side */}
        <div className="flex items-center gap-2">
          {devices.length > 1 && isStreaming && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startCamera(e.target.value);
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {devices.map((device, i) => (
                <option key={device.deviceId || i} value={device.deviceId}>
                  {device.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {isStreaming ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            >
              <CameraOff className="w-3.5 h-3.5" />
              Stop Camera
            </button>
          ) : (
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Start Camera Access
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="relative aspect-video max-h-[460px] bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Shutter flash overlay */}
        <div
          className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 z-30 ${
            flashAnimation ? 'opacity-70' : 'opacity-0'
          }`}
        />

        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-200 ${
            isMirrored ? 'scale-x-[-1]' : 'scale-x-100'
          } ${isStreaming ? 'block' : 'hidden'}`}
        />

        {/* Live Face Framing Guide Overlay */}
        {isStreaming && showFaceGuide && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            {/* Rule of thirds grid lines */}
            <div className="absolute inset-0 border border-slate-700/20 grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-b border-dashed border-indigo-400/40"></div>
              <div className="border-r border-b border-dashed border-indigo-400/40"></div>
              <div className="border-b border-dashed border-indigo-400/40"></div>
              <div className="border-r border-b border-dashed border-indigo-400/40"></div>
              <div className="border-r border-b border-dashed border-indigo-400/40"></div>
              <div className="border-b border-dashed border-indigo-400/40"></div>
              <div className="border-r border-dashed border-indigo-400/40"></div>
              <div className="border-r border-dashed border-indigo-400/40"></div>
              <div></div>
            </div>

            {/* Oval Face Silhouette Guide */}
            <div className="relative w-64 h-80 border-2 border-indigo-400/60 rounded-[50%/60%] shadow-[0_0_25px_rgba(99,102,241,0.25)] flex items-center justify-center">
              {/* Corner target reticles */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-mono tracking-wider text-indigo-300 bg-slate-900/80 px-2 py-0.5 rounded border border-indigo-500/30">
                Face Placement
              </div>
              {/* Horizontal eye alignment guide */}
              <div className="absolute top-[35%] w-3/4 border-b border-indigo-400/40 border-dashed flex justify-between px-4 text-[9px] text-indigo-300/80 font-mono">
                <span>Eye Line</span>
                <span>Eye Line</span>
              </div>
              {/* Vertical center axis */}
              <div className="absolute h-full border-r border-indigo-400/30 border-dashed"></div>
            </div>
          </div>
        )}

        {/* Burst capture countdown badge */}
        {isBursting && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-rose-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm animate-bounce shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            BURST ML CAPTURE: Frame {burstCount} of {burstTotal}
          </div>
        )}

        {/* Not Streaming Placeholder / Permission prompt */}
        {!isStreaming && (
          <div className="p-8 text-center max-w-md mx-auto flex flex-col items-center">
            {permissionDenied ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h4 className="text-base font-semibold text-slate-100 mb-2">Camera Permission Needed</h4>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  {errorMessage || 'Your browser blocked camera access. Please click the camera icon in your address bar to grant permission, then try again.'}
                </p>
                <button
                  onClick={() => startCamera(selectedDeviceId)}
                  className="px-4 py-2 text-xs font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
                >
                  Retry Camera Authorization
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 group-hover:scale-105 transition-transform">
                  <Camera className="w-8 h-8 text-indigo-400" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Webcam Access Ready</h4>
                <p className="text-xs text-slate-400 mb-5 max-w-xs leading-relaxed">
                  Click to enable real-time camera capture for facial expression analysis and training dataset creation.
                </p>
                <button
                  onClick={() => startCamera(selectedDeviceId)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Grant Camera Access & Start
                </button>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Streams run locally in your browser frame</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Toolbar */}
      {isStreaming && (
        <div className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          {/* View options */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                isMirrored
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Mirror horizontal orientation"
            >
              <RefreshCw className="w-3 h-3" />
              {isMirrored ? 'Mirrored' : 'Standard'}
            </button>

            <button
              onClick={() => setShowFaceGuide(!showFaceGuide)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                showFaceGuide
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              Alignment Guide
            </button>
          </div>

          {/* Primary Capture Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Burst Capture for ML Dataset */}
            <button
              onClick={() => triggerBurstCapture(5)}
              disabled={isBursting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-colors disabled:opacity-50"
              title="Capture 5 sequential frames for ML training dataset"
            >
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              Burst Capture (5x ML)
            </button>

            {/* Instant Snapshot & Analyze */}
            <button
              onClick={() => captureFrame(true)}
              disabled={isBursting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Capture & Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
