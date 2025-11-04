import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Recycle, 
  Leaf, 
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Trophy,
  Star,
  Percent,
  Info
} from 'lucide-react';
import { useEcoStore } from '../services/ecoStore';
import { classifyWasteImage, type WasteClassificationResult } from '../services/wasteClassifier';
import { recordClassification } from '../services/classificationHistory';

const categoryIcons = {
  'Recyclable': Recycle,
  'Organic': Leaf,
  'Hazardous': AlertTriangle,
  'General Waste': Trash2
};

const categoryColors = {
  'Recyclable': 'from-green-500 to-emerald-500',
  'Organic': 'from-orange-500 to-yellow-500', 
  'Hazardous': 'from-red-500 to-pink-500',
  'General Waste': 'from-gray-500 to-slate-600'
};

const categoryBgColors = {
  'Recyclable': 'bg-green-50 dark:bg-green-900/20',
  'Organic': 'bg-orange-50 dark:bg-orange-900/20',
  'Hazardous': 'bg-red-50 dark:bg-red-900/20', 
  'General Waste': 'bg-gray-50 dark:bg-gray-800/50'
};

export default function SortWorking() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<WasteClassificationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const points = useEcoStore((s) => s.points);
  const addSort = useEcoStore((s) => s.addSort);

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    
    setError(null);
    setIsScanning(true);
    
    try {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Classify the image
      const classification = await classifyWasteImage(file, url);
      
      setResult(classification);
      
      // Add to store
      addSort({
        item: classification.name,
        category: classification.category as 'Recyclable' | 'Organic' | 'General Waste',
        confidence: classification.confidence,
        points: classification.points,
        tips: classification.tips
      });
      
      // Record the classification for history tracking
      recordClassification({
        filename: file.name,
        fileSize: file.size,
        itemName: classification.name,
        category: classification.category,
        confidence: classification.confidence,
        recyclableRate: classification.recyclableRate,
        points: classification.points,
        description: classification.description,
        disposalMethod: classification.disposalMethod,
        tips: classification.tips,
        imageUrl: url
      });
      
      console.log('✅ Classification recorded successfully');
      console.log(`📊 Item: ${classification.name} | Category: ${classification.category} | Recyclable: ${classification.recyclableRate}%`);
      
    } catch (err: any) {
      setError(`Classification failed: ${err.message}`);
      setResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const openCamera = () => cameraInputRef.current?.click();
  const openFilePicker = () => fileInputRef.current?.click();
  
  const resetClassification = () => {
    setResult(null);
    setPreviewUrl(null);
    setError(null);
    setIsScanning(false);
  };

  const CategoryIcon = result ? categoryIcons[result.category] : Sparkles;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur px-4 py-2 rounded-full mb-4 border border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Your Eco Points:</span>
            <span className="ml-2 text-lg font-bold text-green-600 dark:text-green-400">{points.toLocaleString()}</span>
          </div>
          
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-lg"
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Smart <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Waste Classifier</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload any waste image to get instant identification, recyclable rates, and disposal guidance!
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 mb-8"
        >
          {/* Upload Area */}
          {!result && (
            <div className="text-center">
              <div className={`border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ${
                isScanning 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
              }`}>
                {isScanning ? (
                  <div className="space-y-6">
                    <div className="mx-auto w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">Analyzing Image...</p>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">Identifying waste type and recyclable rate</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Selected waste" className="mx-auto h-40 object-contain rounded-xl shadow" />
                    ) : (
                      <div className="flex justify-center space-x-4">
                        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <Upload className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          <Camera className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Waste Image</h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">Get instant classification and recycling information</p>
                      {error && <p className="text-red-600 dark:text-red-400 mt-2 text-sm">{error}</p>}
                    </div>
                    
                    <div className="flex gap-4">
                      <button
                        onClick={openCamera}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Camera className="h-5 w-5" />
                        <span>Take Photo</span>
                      </button>
                      <button
                        onClick={openFilePicker}
                        className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Upload className="h-5 w-5" />
                        <span>Upload File</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Hidden inputs */}
              <input 
                ref={cameraInputRef} 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)} 
              />
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)} 
              />
            </div>
          )}

          {/* Results */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Image Preview */}
              {previewUrl && (
                <div className="text-center">
                  <img src={previewUrl} alt="Analyzed waste" className="mx-auto h-48 object-contain rounded-xl shadow-lg" />
                </div>
              )}
              
              {/* Classification Results */}
              <div className={`${categoryBgColors[result.category]} rounded-2xl p-6 border-2 border-opacity-20`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-2xl bg-gradient-to-r ${categoryColors[result.category]} shadow-lg`}>
                      <CategoryIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{result.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{result.category}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center text-green-600 dark:text-green-400 mb-1">
                      <Trophy className="h-5 w-5 mr-1" />
                      <span className="font-bold">+{result.points} points</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {result.confidence}% confidence
                    </div>
                  </div>
                </div>
                
                {/* Recyclable Rate */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Percent className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Recyclable Rate</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{result.recyclableRate}%</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.recyclableRate}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-3 rounded-full bg-gradient-to-r ${
                        result.recyclableRate >= 80 ? 'from-green-500 to-emerald-500' :
                        result.recyclableRate >= 50 ? 'from-yellow-500 to-orange-500' :
                        'from-red-500 to-pink-500'
                      }`}
                    />
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-lg">{result.description}</p>
                
                {/* Disposal Method */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800 dark:text-blue-200">How to Dispose:</span>
                  </div>
                  <p className="text-blue-700 dark:text-blue-300">{result.disposalMethod}</p>
                </div>
                
                {/* Tips */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center mb-3">
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    Eco Tips
                  </h4>
                  <ul className="space-y-2">
                    {result.tips.map((tip, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={resetClassification}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  Classify Another Item
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
            Pro Tips for Better Classification
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">📷 Photo Tips:</h4>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Use good lighting and clear background</li>
                <li>• Center the item in the frame</li>
                <li>• Take close-up shots for better detail</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">🏷️ Naming Tips:</h4>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Use descriptive filenames (e.g., "plastic-bottle.jpg")</li>
                <li>• Include material type in filename</li>
                <li>• Be specific (e.g., "glass-jar" vs "container")</li>
              </ul>
            </div>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}