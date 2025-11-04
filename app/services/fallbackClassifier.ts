// Fallback classifier for when TensorFlow.js models fail to load
// Uses filename, image properties, and basic heuristics

export interface FallbackResult {
  label: string;
  confidence: number;
  category: 'Recyclable' | 'Organic' | 'General Waste';
  tips: string[];
}

interface ImageAnalysis {
  filename: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
}

// Basic keyword-based classification
const classificationRules = {
  organic: {
    keywords: [
      'fruit', 'apple', 'banana', 'orange', 'peel', 'core', 'scraps',
      'food', 'vegetable', 'carrot', 'broccoli', 'leaves', 'compost',
      'kitchen', 'leftover', 'organic', 'bio', 'natural', 'plant'
    ],
    confidence: 85,
    tips: [
      'Perfect for home composting',
      'Separate from other waste types', 
      'Keep in cool, dry place until collection',
      'Can be used to create nutrient-rich soil'
    ]
  },
  recyclable: {
    keywords: [
      'bottle', 'plastic', 'glass', 'metal', 'can', 'paper', 'cardboard',
      'container', 'jar', 'aluminum', 'pet', 'recyclable', 'clean', 'dry'
    ],
    confidence: 80,
    tips: [
      'Clean thoroughly before recycling',
      'Remove caps and labels if possible',
      'Check local recycling guidelines',
      'Worth more when properly sorted'
    ]
  }
};

function analyzeFilename(filename: string): { category: string; confidence: number; matchedKeywords: string[] } {
  const name = filename.toLowerCase();
  let bestMatch = { category: 'general', confidence: 40, matchedKeywords: [] as string[] };
  
  Object.entries(classificationRules).forEach(([category, rules]) => {
    const matchedKeywords: string[] = [];
    let score = 0;
    
    rules.keywords.forEach(keyword => {
      if (name.includes(keyword)) {
        matchedKeywords.push(keyword);
        score += 15;
      }
    });
    
    if (matchedKeywords.length > 0) {
      const confidence = Math.min(rules.confidence + score, 95);
      if (confidence > bestMatch.confidence) {
        bestMatch = { category, confidence, matchedKeywords };
      }
    }
  });
  
  return bestMatch;
}

function analyzeImageProperties(analysis: ImageAnalysis): number {
  let bonus = 0;
  
  // File size analysis
  if (analysis.fileSize) {
    const sizeMB = analysis.fileSize / (1024 * 1024);
    if (sizeMB > 0.1 && sizeMB < 10) { // Reasonable image size
      bonus += 5;
    }
    if (sizeMB > 1 && sizeMB < 5) { // Good quality range
      bonus += 5;
    }
  }
  
  // Image dimensions analysis
  if (analysis.dimensions) {
    const { width, height } = analysis.dimensions;
    const aspectRatio = width / height;
    
    // Reasonable resolution
    if (width >= 200 && height >= 200) {
      bonus += 5;
    }
    
    // Good aspect ratio (not too stretched)
    if (aspectRatio > 0.5 && aspectRatio < 2) {
      bonus += 3;
    }
  }
  
  return Math.min(bonus, 20); // Max 20% bonus
}

function generateSmartLabel(category: string, matchedKeywords: string[]): string {
  if (matchedKeywords.length === 0) {
    return category === 'organic' ? 'Organic Waste' : 
           category === 'recyclable' ? 'Recyclable Item' : 'General Waste';
  }
  
  // Create a smart label based on matched keywords
  const primaryKeyword = matchedKeywords[0];
  const smartLabels: Record<string, string> = {
    // Organic
    fruit: 'Fruit Waste',
    apple: 'Apple Core',
    banana: 'Banana Peel',
    orange: 'Orange Peel',
    food: 'Food Scraps',
    vegetable: 'Vegetable Waste',
    leaves: 'Leaf Waste',
    
    // Recyclable
    bottle: 'Plastic Bottle',
    glass: 'Glass Container',
    metal: 'Metal Item',
    can: 'Metal Can',
    paper: 'Paper Item',
    cardboard: 'Cardboard Box',
    plastic: 'Plastic Container'
  };
  
  return smartLabels[primaryKeyword] || `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Item`;
}

export async function classifyImageFallback(analysis: ImageAnalysis): Promise<FallbackResult> {
  // Analyze filename for keywords
  const filenameAnalysis = analyzeFilename(analysis.filename);
  
  // Add bonus from image properties
  const propertyBonus = analyzeImageProperties(analysis);
  
  // Calculate final confidence
  const finalConfidence = Math.min(filenameAnalysis.confidence + propertyBonus, 95);
  
  // Determine category
  const category = filenameAnalysis.category === 'organic' ? 'Organic' :
                  filenameAnalysis.category === 'recyclable' ? 'Recyclable' : 'General Waste';
  
  // Generate smart label
  const label = generateSmartLabel(filenameAnalysis.category, filenameAnalysis.matchedKeywords);
  
  // Get tips
  const baseTips = filenameAnalysis.category === 'organic' ? classificationRules.organic.tips :
                   filenameAnalysis.category === 'recyclable' ? classificationRules.recyclable.tips :
                   [
                     'When in doubt, dispose in general waste',
                     'Check if any parts can be recycled separately',
                     'Consider reusing if item is in good condition',
                     'Follow local waste disposal guidelines'
                   ];
  
  const enhancedTips = [
    ...baseTips,
    `Classification based on: ${filenameAnalysis.matchedKeywords.join(', ') || 'general analysis'}`,
    'This is a fallback classification - use better lighting for more accuracy'
  ];
  
  return {
    label,
    confidence: finalConfidence,
    category,
    tips: enhancedTips
  };
}

// Helper function to extract image dimensions from file
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension analysis'));
    };
    img.src = URL.createObjectURL(file);
  });
}