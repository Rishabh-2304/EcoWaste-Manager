import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Camera, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ModelStatus {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  info?: string;
}

export default function ModelDebugger() {
  const [models, setModels] = useState<ModelStatus[]>([
    { name: 'TensorFlow.js Core', status: 'idle' },
    { name: 'MobileNet (Image Classification)', status: 'idle' },
    { name: 'COCO-SSD (Object Detection)', status: 'idle' }
  ]);

  const updateModelStatus = (index: number, updates: Partial<ModelStatus>) => {
    setModels(prev => prev.map((model, i) => 
      i === index ? { ...model, ...updates } : model
    ));
  };

  const testTensorFlowCore = async () => {
    updateModelStatus(0, { status: 'loading' });
    try {
      const tf = await import('@tensorflow/tfjs');
      
      // Try to set backend
      const backends = ['webgl', 'cpu'];
      let backendSet = false;
      let backendInfo = '';
      
      for (const backend of backends) {
        try {
          await tf.setBackend(backend);
          await tf.ready();
          backendSet = true;
          backendInfo = `Backend: ${backend}, Version: ${tf.version.tfjs}`;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (backendSet) {
        updateModelStatus(0, { 
          status: 'success', 
          info: backendInfo 
        });
      } else {
        updateModelStatus(0, { 
          status: 'error', 
          error: 'No backend available' 
        });
      }
    } catch (error: any) {
      updateModelStatus(0, { 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const testMobileNet = async () => {
    updateModelStatus(1, { status: 'loading' });
    try {
      const { classifyImageFromURL } = await import('../services/localClassifier');
      
      // Create a simple test image (1x1 pixel data URL)
      const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = await classifyImageFromURL(testImageUrl);
      
      updateModelStatus(1, { 
        status: 'success', 
        info: `Model loaded, sample classification: ${result.label} (${Math.round(result.confidence * 100)}%)` 
      });
    } catch (error: any) {
      updateModelStatus(1, { 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const testCocoSSD = async () => {
    updateModelStatus(2, { status: 'loading' });
    try {
      const { detectWasteItemsFromURL } = await import('../services/objectDetector');
      
      // Create a simple test image
      const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const results = await detectWasteItemsFromURL(testImageUrl);
      
      updateModelStatus(2, { 
        status: 'success', 
        info: `Model loaded, detected ${results.length} objects` 
      });
    } catch (error: any) {
      updateModelStatus(2, { 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const testAllModels = async () => {
    await testTensorFlowCore();
    await testMobileNet();
    await testCocoSSD();
  };

  const getStatusIcon = (status: ModelStatus['status']) => {
    switch (status) {
      case 'loading':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Brain className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ModelStatus['status']) => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Camera className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Model Status
          </h3>
        </div>
        <button
          onClick={testAllModels}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Test All Models
        </button>
      </div>

      <div className="space-y-4">
        {models.map((model, index) => (
          <div
            key={model.name}
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${getStatusColor(model.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(model.status)}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {model.name}
                  </h4>
                  {model.info && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {model.info}
                    </p>
                  )}
                  {model.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Error: {model.error}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm font-medium">
                {model.status === 'idle' && <span className="text-gray-500">Not tested</span>}
                {model.status === 'loading' && <span className="text-blue-600">Loading...</span>}
                {model.status === 'success' && <span className="text-green-600">✓ Ready</span>}
                {model.status === 'error' && <span className="text-red-600">✗ Failed</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          Troubleshooting Tips:
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Make sure you have a stable internet connection for model downloads</li>
          <li>• Models are cached after first load, subsequent loads should be faster</li>
          <li>• WebGL backend provides better performance than CPU backend</li>
          <li>• Clear browser cache if models fail to load consistently</li>
        </ul>
      </div>
    </motion.div>
  );
}