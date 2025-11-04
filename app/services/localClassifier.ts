// Lightweight TFJS-based classifier using MobileNet v2
// Loads lazily in the browser and caches the model instance.

export type LocalClass = {
  label: string;
  probability: number;
};

export type ClassificationResult = {
  label: string;
  confidence: number; // 0..1
  category: 'Recyclable' | 'Organic' | 'General Waste';
  tips: string[];
  raw: LocalClass[];
};

let modelPromise: Promise<any> | null = null;

async function getModel() {
  if (typeof window === 'undefined') throw new Error('Classifier only available in the browser');
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        console.log('Loading TensorFlow.js and MobileNet model...');
        const tf = await import('@tensorflow/tfjs');
        
        // Try different backends in order of preference
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
        
        const mobilenet = await import('@tensorflow-models/mobilenet');
        // Try v2 first, fallback to v1 if needed
        let model;
        try {
          model = await mobilenet.load({ version: 2, alpha: 1.0 });
          console.log('MobileNet v2 model loaded successfully');
        } catch (e) {
          console.warn('MobileNet v2 failed, trying v1:', e);
          model = await mobilenet.load({ version: 1, alpha: 1.0 });
          console.log('MobileNet v1 model loaded successfully');
        }
        
        return model;
      } catch (error) {
        console.error('Failed to load TensorFlow.js model:', error);
        throw new Error(`Model loading failed: ${error.message}`);
      }
    })();
  }
  return modelPromise;
}

// Simple user correction map persisted locally
const MAP_KEY = 'eco-waste-label-map-v1';
function loadUserMap(): Record<string, ClassificationResult['category']> {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem(MAP_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveUserMap(map: Record<string, ClassificationResult['category']>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(MAP_KEY, JSON.stringify(map)); } catch {}
}
export function saveLabelCorrection(label: string, category: ClassificationResult['category']) {
  const map = loadUserMap();
  map[label.toLowerCase()] = category;
  saveUserMap(map);
}

function scoreCategoryFromPredictions(preds: LocalClass[]): { category: ClassificationResult['category']; topLabel: string; confidence: number } {
  const userMap = loadUserMap();
  const recyclableKeys = [
    // packaging & containers
    'bottle','water bottle','glass bottle','wine bottle','beer bottle','can','aluminum','aluminium','tin','jar','glass','cup','mug','plate','bowl',
    // paper/cardboard
    'paper','newspaper','magazine','cardboard','carton','box','packaging','packet','envelope','book',
    // metals & misc
    'metal','steel','iron','copper','wire','cable','screw','bolt'
  ];
  const organicKeys = [
    // fruits & veg
    'banana','apple','orange','fruit','vegetable','broccoli','carrot','cabbage','lettuce','corn','pumpkin','mushroom','potato','tomato','eggplant','citrus','grape','strawberry','pineapple','mango','papaya','onion','garlic','ginger','lime','lemon','melon','avocado','chili',
    // foods
    'bread','sandwich','salad','pizza','burger','noodle','pasta','rice','egg','omelet','omelette','cake','cookie' 
  ];

  let scores = { recyclable: 0, organic: 0, general: 0 };
  let topLabel = preds[0]?.label ?? '';

  for (const p of preds) {
    const label = p.label.toLowerCase();
    // User overrides win
    if (userMap[label]) {
      const cat = userMap[label];
      if (cat === 'Recyclable') scores.recyclable += p.probability * 1.25;
      else if (cat === 'Organic') scores.organic += p.probability * 1.25;
      else scores.general += p.probability * 1.25;
      continue;
    }
    if (organicKeys.some(k => label.includes(k))) {
      scores.organic += p.probability;
      continue;
    }
    if (recyclableKeys.some(k => label.includes(k))) {
      scores.recyclable += p.probability;
      continue;
    }
    scores.general += p.probability * 0.5; // weak vote to general when unknown
  }

  // Decide: Find the category with the highest score.
  // If 'recyclable' and 'organic' have the same top score, prefer the more specific category
  // over 'general' to avoid incorrect "General Waste" classifications.
  const categoryScores: [ClassificationResult['category'], number][] = [
    ['Recyclable', scores.recyclable],
    ['Organic', scores.organic],
    ['General Waste', scores.general],
  ];

  // Sort by score in descending order
  categoryScores.sort((a, b) => b[1] - a[1]);

  let category = categoryScores[0][0];
  const bestScore = categoryScores[0][1];

  // Low-confidence gate: if the best score is too low, it's safer to call it general waste.
  if (bestScore < 0.25) {
    category = 'General Waste';
  }

  return { category, topLabel, confidence: bestScore };
}

function tipsForCategory(category: ClassificationResult['category']): string[] {
  if (category === 'Organic') return ['Remove stickers or plastic ties','Compost if available','Keep liquids minimal'];
  if (category === 'Recyclable') return ['Rinse to remove residue','Flatten cardboard if possible','Place in appropriate bin'];
  return ['If unsure, dispose in general waste','Avoid contaminating recyclables','Check local guidelines'];
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    // Provide more specific error reasons
    img.onerror = (err) => {
        // The event object itself doesn't give much, but the error is likely CORS or a network issue.
        console.error(`Failed to load image from URL: ${url}. This may be due to a network error or CORS policy.`);
        reject(new Error(`Failed to load image. Check browser console for CORS or network errors.`));
    };
    img.src = url;
  });
}

export async function classifyImageFromURL(url: string): Promise<ClassificationResult> {
  const model = await getModel();
  const img = await loadImage(url);
  const predictions: LocalClass[] = await model.classify(img, 5);
  const { category, topLabel, confidence } = scoreCategoryFromPredictions(predictions);
  const tips = tipsForCategory(category);
  
  return {
    label: topLabel,
    confidence, // Use the improved confidence from our scoring logic
    category,
    tips,
    raw: predictions,
  };
}

