import { BoundingBox } from '../types/expression';

export interface AugmentedVariation {
  type: string;
  name: string;
  description: string;
  dataUrl: string;
}

// Loads an image into an HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Generates maximum training variations for ML models
 */
export async function generateMaxMLVariations(
  sourceDataUrl: string,
  boundingBox?: BoundingBox
): Promise<AugmentedVariation[]> {
  const img = await loadImage(sourceDataUrl);
  const width = img.naturalWidth || img.width || 640;
  const height = img.naturalHeight || img.height || 480;

  const variations: AugmentedVariation[] = [];

  // Helper to create a canvas of given size
  const createCanvas = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  };

  // 1. Original (standardized)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    variations.push({
      type: 'original',
      name: 'Original Sample',
      description: 'Standard source resolution baseline',
      dataUrl: canvas.toDataURL('image/jpeg', 0.95),
    });
  }

  // 2. Horizontal Flip (Left/Right Invariance)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    variations.push({
      type: 'horizontal_flip',
      name: 'Horizontal Mirror',
      description: 'Enforces bilateral symmetry invariance',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 3. Brightness Boost (+25%)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] + 35);
      d[i + 1] = Math.min(255, d[i + 1] + 35);
      d[i + 2] = Math.min(255, d[i + 2] + 35);
    }
    ctx.putImageData(imgData, 0, 0);
    variations.push({
      type: 'brightness_high',
      name: 'High Illumination (+25%)',
      description: 'Simulates direct daylight / studio flash',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 4. Low Light / Dim (-25%)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.max(0, d[i] - 35);
      d[i + 1] = Math.max(0, d[i + 1] - 35);
      d[i + 2] = Math.max(0, d[i + 2] - 35);
    }
    ctx.putImageData(imgData, 0, 0);
    variations.push({
      type: 'brightness_low',
      name: 'Low Illumination (-25%)',
      description: 'Simulates indoor / night ambient lighting',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 5. Grayscale / Monochrome (FER2013 standard)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);
    variations.push({
      type: 'grayscale',
      name: 'FER-Standard Grayscale',
      description: 'Eliminates chromatic bias, focuses on facial morphology',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 6. High Contrast (Histogram Expansion)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const factor = (259 * (128 + 45)) / (255 * (259 - 45));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
      d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
      d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
    }
    ctx.putImageData(imgData, 0, 0);
    variations.push({
      type: 'high_contrast',
      name: 'Dynamic High Contrast',
      description: 'Accentuates facial creases, furrow lines, and micro-folds',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 7. Affine Rotation (+8°)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((8 * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2);
    ctx.restore();
    variations.push({
      type: 'rotation_pos8',
      name: 'Rotation Tilt (+8°)',
      description: 'Simulates natural head roll tilt to the right',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 8. Affine Rotation (-8°)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2);
    ctx.restore();
    variations.push({
      type: 'rotation_neg8',
      name: 'Rotation Tilt (-8°)',
      description: 'Simulates natural head roll tilt to the left',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 9. Sensor Noise Injection (Robustness)
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);
    variations.push({
      type: 'gaussian_noise',
      name: 'Sensor Noise Injection',
      description: 'Improves CNN regularizer and test robustness against webcam grain',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 10. Warm Color Shift
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] * 1.12); // Red boost
      d[i + 2] = Math.max(0, d[i + 2] * 0.9); // Blue drop
    }
    ctx.putImageData(imgData, 0, 0);
    variations.push({
      type: 'color_warm',
      name: 'Warm Color Jitter',
      description: 'Simulates incandescent/warm skin-tone lighting',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 11. Edge Sharpening Filter
  {
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(img, 0, 0);
    const srcData = ctx.getImageData(0, 0, width, height);
    const outData = ctx.createImageData(width, height);
    const s = srcData.data;
    const o = outData.data;
    // 3x3 sharpen kernel: [ 0, -1, 0, -1, 5, -1, 0, -1, 0 ]
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = s[idx + c] * 5;
          const up = s[((y - 1) * width + x) * 4 + c];
          const down = s[((y + 1) * width + x) * 4 + c];
          const left = s[(y * width + (x - 1)) * 4 + c];
          const right = s[(y * width + (x + 1)) * 4 + c];
          o[idx + c] = Math.min(255, Math.max(0, center - up - down - left - right));
        }
        o[idx + 3] = s[idx + 3]; // alpha
      }
    }
    ctx.putImageData(outData, 0, 0);
    variations.push({
      type: 'edge_sharpen',
      name: 'High-Pass Feature Sharpen',
      description: 'Accentuates eyelid, lip, and eyebrow feature contours',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  // 12. Tight Cropped Face (Centered ROI)
  {
    let cropX = 0;
    let cropY = 0;
    let cropW = width;
    let cropH = height;

    if (boundingBox) {
      cropX = Math.max(0, (boundingBox.xmin / 100) * width);
      cropY = Math.max(0, (boundingBox.ymin / 100) * height);
      cropW = Math.min(width - cropX, ((boundingBox.xmax - boundingBox.xmin) / 100) * width);
      cropH = Math.min(height - cropY, ((boundingBox.ymax - boundingBox.ymin) / 100) * height);
    } else {
      // Default center 65% crop
      cropW = width * 0.65;
      cropH = height * 0.65;
      cropX = (width - cropW) / 2;
      cropY = (height - cropH) / 2;
    }

    const targetSize = 256;
    const { canvas, ctx } = createCanvas(targetSize, targetSize);
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetSize, targetSize);

    variations.push({
      type: 'tight_face_crop',
      name: 'Aligned 256x256 Facial Crop',
      description: 'Cropped directly to facial ROI, ready for PyTorch/TensorFlow input',
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    });
  }

  return variations;
}
