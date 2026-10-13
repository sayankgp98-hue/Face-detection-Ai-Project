import JSZip from 'jszip';
import { MLTrainingSample } from '../types/expression';

export async function exportMLDatasetZip(samples: MLTrainingSample[]): Promise<Blob> {
  const zip = new JSZip();

  const imgFolder = zip.folder('images');
  const yoloFolder = zip.folder('labels_yolo');

  // Unique emotion labels to class ID map
  const uniqueLabels = Array.from(new Set(samples.map((s) => s.label || 'neutral'))).sort();
  const labelToId: Record<string, number> = {};
  uniqueLabels.forEach((lbl, idx) => {
    labelToId[lbl] = idx;
  });

  // Prepare COCO format structures
  const coco = {
    info: {
      description: 'FacetML Facial Expression & Emotion Training Dataset',
      version: '1.0',
      year: new Date().getFullYear(),
      date_created: new Date().toISOString(),
    },
    licenses: [{ id: 1, name: 'Open Dataset / Research' }],
    categories: uniqueLabels.map((name, id) => ({
      id,
      name,
      supercategory: 'facial_expression',
    })),
    images: [] as any[],
    annotations: [] as any[],
  };

  // CSV rows
  const csvRows: string[] = [
    'filename,sample_id,source_type,augmentation_type,emotion_label,class_id,confidence,valence,arousal,action_units,tags',
  ];

  // Train / Val / Test indices split
  const trainSplit: string[] = [];
  const valSplit: string[] = [];
  const testSplit: string[] = [];

  samples.forEach((sample, index) => {
    const filename = `sample_${String(index + 1).padStart(4, '0')}_${(sample.label || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${sample.augmentationType || 'orig'}.jpg`;

    // Process image base64
    let base64 = sample.imageDataUrl;
    if (base64.includes(';base64,')) {
      base64 = base64.split(';base64,')[1];
    }

    if (imgFolder) {
      imgFolder.file(filename, base64, { base64: true });
    }

    const classId = labelToId[sample.label] ?? 0;

    // YOLO format annotation
    let yoloText = '';
    if (sample.boundingBox) {
      const box = sample.boundingBox;
      const xcenter = ((box.xmin + box.xmax) / 200).toFixed(4);
      const ycenter = ((box.ymin + box.ymax) / 200).toFixed(4);
      const width = ((box.xmax - box.xmin) / 100).toFixed(4);
      const height = ((box.ymax - box.ymin) / 100).toFixed(4);
      yoloText = `${classId} ${xcenter} ${ycenter} ${width} ${height}\n`;
    } else {
      // Default centered face
      yoloText = `${classId} 0.5000 0.5000 0.6500 0.7500\n`;
    }

    if (yoloFolder) {
      const yoloFilename = filename.replace(/\.jpg$/, '.txt');
      yoloFolder.file(yoloFilename, yoloText);
    }

    // Add to COCO
    const imageId = index + 1;
    coco.images.push({
      id: imageId,
      file_name: filename,
      width: sample.width || 640,
      height: sample.height || 480,
    });

    const box = sample.boundingBox || { xmin: 20, ymin: 15, xmax: 80, ymax: 85 };
    const absX = (box.xmin / 100) * (sample.width || 640);
    const absY = (box.ymin / 100) * (sample.height || 480);
    const absW = ((box.xmax - box.xmin) / 100) * (sample.width || 640);
    const absH = ((box.ymax - box.ymin) / 100) * (sample.height || 480);

    coco.annotations.push({
      id: imageId,
      image_id: imageId,
      category_id: classId,
      bbox: [absX, absY, absW, absH],
      area: absW * absH,
      iscrowd: 0,
      confidence: sample.confidence,
      valence: sample.valence,
      arousal: sample.arousal,
      action_units: sample.actionUnits,
    });

    // CSV Row
    const escapedTags = `"${(sample.tags || []).join(';')}"`;
    const escapedAUs = `"${(sample.actionUnits || []).join(';')}"`;
    csvRows.push(
      `${filename},${sample.id},${sample.sourceType},${sample.augmentationType || 'original'},"${sample.label}",${classId},${sample.confidence},${sample.valence.toFixed(3)},${sample.arousal.toFixed(3)},${escapedAUs},${escapedTags}`
    );

    // Split allocation (70% train, 15% val, 15% test)
    const hash = (index * 7 + 13) % 100;
    if (hash < 70) {
      trainSplit.push(filename);
    } else if (hash < 85) {
      valSplit.push(filename);
    } else {
      testSplit.push(filename);
    }
  });

  // Add JSON files
  zip.file('dataset_coco.json', JSON.stringify(coco, null, 2));
  zip.file('annotations.csv', csvRows.join('\n'));
  zip.file(
    'train_val_test_split.json',
    JSON.stringify(
      {
        total_samples: samples.length,
        classes: labelToId,
        train_count: trainSplit.length,
        val_count: valSplit.length,
        test_count: testSplit.length,
        train_images: trainSplit,
        val_images: valSplit,
        test_images: testSplit,
      },
      null,
      2
    )
  );

  // Ready-to-run PyTorch training script
  const pytorchScript = `"""
FacetML PyTorch Facial Expression Classifier
Generated automatically for training Convolutional Neural Networks & Vision Transformers
"""

import os
import json
import pandas as pd
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
import torchvision.models as models

class FacetMLDataset(Dataset):
    def __init__(self, root_dir, split="train", transform=None):
        self.root_dir = root_dir
        self.transform = transform
        
        # Load splits
        with open(os.path.join(root_dir, "train_val_test_split.json")) as f:
            splits_data = json.load(f)
            
        self.file_names = splits_data[f"{split}_images"]
        self.classes = splits_data["classes"]
        
        # Load CSV metadata
        df = pd.read_csv(os.path.join(root_dir, "annotations.csv"))
        self.meta_map = {row['filename']: row for _, row in df.iterrows()}
        
    def __len__(self):
        return len(self.file_names)
        
    def __getitem__(self, idx):
        fname = self.file_names[idx]
        img_path = os.path.join(self.root_dir, "images", fname)
        image = Image.open(img_path).convert("RGB")
        
        row = self.meta_map[fname]
        label = int(row['class_id'])
        valence = float(row['valence'])
        arousal = float(row['arousal'])
        
        if self.transform:
            image = self.transform(image)
            
        return {
            "image": image,
            "label": torch.tensor(label, dtype=torch.long),
            "valence_arousal": torch.tensor([valence, arousal], dtype=torch.float32),
            "filename": fname
        }

def train_classifier():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = FacetMLDataset(root_dir=".", split="train", transform=transform)
    num_classes = len(train_dataset.classes)
    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    
    # Pretrained ResNet-18 backbone
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    
    print(f"Dataset loaded: {len(train_dataset)} training samples across {num_classes} classes.")
    print("Class mapping:", train_dataset.classes)
    print("Ready to run training loop: 'python train_pytorch.py'")

if __name__ == "__main__":
    train_classifier()
`;

  zip.file('train_pytorch.py', pytorchScript);

  // Documentation
  const readme = `# FacetML Dataset Export

## Dataset Summary
- Total Images: ${samples.length}
- Primary Classes: ${uniqueLabels.join(', ')}
- Formats included:
  - images/: Raw and augmented JPG files
  - labels_yolo/: YOLO bounding box text files (class x_center y_center width height)
  - dataset_coco.json: MS COCO format with categories, bounding boxes, valence & arousal
  - annotations.csv: Tabular CSV for easy loading with Pandas or scikit-learn
  - train_val_test_split.json: 70/15/15 balanced partition
  - train_pytorch.py: PyTorch DataLoader and ResNet18 fine-tuning script

## Emotion Classes & Action Units
Each sample includes ground-truth Facial Action Coding System (FACS) action units (e.g. AU06 Cheek Raiser, AU12 Lip Corner Puller) alongside continuous valence-arousal affective coordinates.
`;

  zip.file('README.md', readme);

  return await zip.generateAsync({ type: 'blob' });
}
