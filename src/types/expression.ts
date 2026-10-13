export interface BoundingBox {
  ymin: number; // 0 to 100 percentage
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ActionUnit {
  code: string; // e.g. "AU12"
  name: string; // e.g. "Lip Corner Puller"
  intensity: number; // 1 to 5
  muscle?: string; // e.g. "Zygomaticus major"
  description?: string;
}

export interface HeadPose {
  yaw: number; // -90 to +90
  pitch: number;
  roll: number;
}

export interface LandmarksSummary {
  eyebrows: string;
  eyes: string;
  mouth: string;
  jaw: string;
}

export interface MLSuitability {
  score: number; // 0 to 100
  lightingScore: number;
  sharpnessScore: number;
  occlusionDetected: boolean;
  recommendations: string;
}

export interface LandmarkPoint {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

export interface LandmarkCoordinates {
  leftEye?: LandmarkPoint;
  rightEye?: LandmarkPoint;
  noseTip?: LandmarkPoint;
  mouthCenter?: LandmarkPoint;
  mouthLeftCorner?: LandmarkPoint;
  mouthRightCorner?: LandmarkPoint;
  chinTip?: LandmarkPoint;
  leftEyebrow?: LandmarkPoint;
  rightEyebrow?: LandmarkPoint;
}

export interface DetectedFace {
  boundingBox: BoundingBox;
  primaryEmotion: string;
  primaryEmotionConfidence: number;
  secondaryEmotion?: string;
  secondaryEmotionConfidence?: number;
  valence: number; // -1.0 to 1.0
  arousal: number; // 0.0 to 1.0
  expressionAuthenticity?: string;
  gazeDirection: string;
  headPose: HeadPose;
  actionUnits: ActionUnit[];
  microExpressions?: string;
  landmarksSummary: LandmarksSummary;
  landmarkPoints?: LandmarkCoordinates;
  mlSuitability: MLSuitability;
  mlSuggestedLabels: string[];
}

export interface FacialAnalysisResult {
  faceDetected: boolean;
  faceCount: number;
  overallSummary: string;
  faces: DetectedFace[];
  isQuotaFallback?: boolean;
  quotaNotice?: string;
}

export interface MLTrainingSample {
  id: string;
  sourceType: 'camera' | 'upload' | 'preset' | 'augmented';
  parentSampleId?: string;
  augmentationType?: string;
  imageDataUrl: string;
  width: number;
  height: number;
  timestamp: number;
  label: string; // primary emotion class
  confidence: number;
  boundingBox?: BoundingBox;
  valence: number;
  arousal: number;
  actionUnits: string[];
  tags: string[];
}

export interface AugmentationConfig {
  flipHorizontal: boolean;
  brightnessBoost: boolean;
  brightnessDim: boolean;
  highContrast: boolean;
  grayscale: boolean;
  rotatePositive: boolean; // +8 deg
  rotateNegative: boolean; // -8 deg
  noiseInjection: boolean;
  tightFaceCrop: boolean;
  edgeFilter: boolean;
}

export interface BatchAnalysisItem {
  id: string;
  name?: string;
  dataUrl: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  error?: string;
  analysis?: FacialAnalysisResult;
  timestamp: number;
}

export interface CommonActionUnitStat {
  code: string;
  name: string;
  count: number;
  avgIntensity: number;
}

export interface BatchSummaryStats {
  total: number;
  completed: number;
  failed: number;
  emotionDistribution: Record<string, number>;
  averageValence: number;
  averageArousal: number;
  averageConfidence: number;
  commonActionUnits: CommonActionUnitStat[];
  authenticityBreakdown: Record<string, number>;
  averageMlScore: number;
}

