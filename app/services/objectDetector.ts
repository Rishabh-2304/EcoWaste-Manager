// Local object detection for waste items using @tensorflow-models/coco-ssd
// Identifies multiple visible items and maps to waste categories

export type WasteCategory = 'Plastic' | 'Paper' | 'Glass' | 'Metal' | 'Organic' | 'E-Waste' | 'Other';

export type WasteDetection = {
  name: string; // COCO class label
  category: WasteCategory;
  confidence: number; // 0..100
  bbox?: [number, number, number, number]; // [x, y, width, height]
};

let cocoModelPromise: Promise<any> | null = null;

async function getModel() {
  if (typeof window === 'undefined') throw new Error('Detector only available in the browser');
  if (!cocoModelPromise) {
    cocoModelPromise = (async () => {
      try {
        console.log('Loading TensorFlow.js and COCO-SSD model...');
        const tf = await import('@tensorflow/tfjs');
        
        // Try different backends
        const backends = ['webgl', 'cpu'];
        let backendSet = false;
        
        for (const backend of backends) {
          try {
            await tf.setBackend(backend);
            await tf.ready();
            console.log(`TensorFlow.js backend set to: ${backend}`);
            backendSet = true;
            break;
          } catch (e) {
            console.warn(`Failed to set backend ${backend}:`, e);
          }
        }
        
        if (!backendSet) {
          throw new Error('No TensorFlow.js backend available');
        }
        
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        // Try lite model first, fallback to mobilenet_v1 if needed
        let model;
        try {
          model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
          console.log('COCO-SSD lite_mobilenet_v2 model loaded successfully');
        } catch (e) {
          console.warn('COCO-SSD lite model failed, trying mobilenet_v1:', e);
          model = await cocoSsd.load({ base: 'mobilenet_v1' });
          console.log('COCO-SSD mobilenet_v1 model loaded successfully');
        }
        
        return model;
      } catch (error) {
        console.error('Failed to load COCO-SSD model:', error);
        throw new Error(`Object detection model loading failed: ${error.message}`);
      }
    })();
  }
  return cocoModelPromise;
}

function mapCocoToCategory(label: string): WasteCategory {
  const l = label.toLowerCase();
  // Organic
  const organic = [
    'banana','apple','orange','broccoli','carrot','hot dog','pizza','donut','cake','sandwich','bowl','spoon', // bowl/spoon used for food context, but treat as Other below
  ];
  if (organic.some(k => l.includes(k))) return 'Organic';

  // Paper
  const paper = ['book','toilet paper','paper towel','napkin','tissue'];
  if (paper.some(k => l.includes(k))) return 'Paper';

  // Glass
  const glass = ['wine glass','vase'];
  if (glass.some(k => l.includes(k))) return 'Glass';

  // Metal
  const metal = ['fork','knife','spoon','scissors'];
  if (metal.some(k => l.includes(k))) return 'Metal';

  // E-Waste
  const ewaste = ['laptop','keyboard','cell phone','mouse','tv','refrigerator','microwave','remote'];
  if (ewaste.some(k => l.includes(k))) return 'E-Waste';

  // Plastic (best guess for common disposables)
  const plastic = ['bottle','cup','frisbee','toothbrush','hair drier'];
  if (plastic.some(k => l.includes(k))) return 'Plastic';

  return 'Other';
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export async function detectWasteItemsFromURL(url: string): Promise<WasteDetection[]> {
  const model = await getModel();
  const img = await loadImage(url);
  const preds: Array<{class: string; score: number; bbox: [number, number, number, number]}> = await model.detect(img);

  // Map predictions to waste categories and format
  // Filter to visible waste-like classes with a reasonable score threshold
  const threshold = 0.35;
  const items: WasteDetection[] = preds
    .filter(p => (p.score ?? 0) >= threshold)
    .map(p => ({
      name: p.class,
      category: mapCocoToCategory(p.class),
      confidence: Math.round((p.score ?? 0) * 100),
      bbox: p.bbox as any,
    }));

  // Optionally de-duplicate identical class detections that are overlapping heavily
  // For simplicity, we keep them as-is to represent multiple items if present
  return items;
}

