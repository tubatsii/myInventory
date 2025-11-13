import { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';
import { X, Camera, Scan } from 'lucide-react';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDetected, setLastDetected] = useState<string>('');
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = () => {
    if (!scannerRef.current) return;

    setIsScanning(true);
    setError(null);

    Quagga.init(
      {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: 'environment', // Use back camera on mobile
            aspectRatio: { min: 1, max: 2 },
          },
        },
        locator: {
          patchSize: 'medium',
          halfSample: true,
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'code_39_reader',
            'code_39_vin_reader',
            'codabar_reader',
            'upc_reader',
            'upc_e_reader',
            'i2of5_reader',
          ],
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error('QuaggaJS initialization error:', err);
          setError('Failed to start camera. Please check permissions.');
          setIsScanning(false);
          return;
        }
        Quagga.start();
        setIsScanning(true);
      }
    );

    Quagga.onDetected(handleDetected);
  };

  const handleDetected = (result: any) => {
    if (!result || !result.codeResult) return;

    const code = result.codeResult.code;
    
    // Prevent duplicate rapid detections (debounce)
    if (code === lastDetected) return;
    
    // Clear previous timeout
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    setLastDetected(code);
    
    // Play beep sound (optional)
    playBeep();

    // Show visual feedback
    const canvas = scannerRef.current?.querySelector('canvas.drawingBuffer');
    if (canvas instanceof HTMLCanvasElement) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Call the callback with the detected barcode
    onDetected(code);

    // Reset last detected after 1 second to allow re-scanning same item
    detectionTimeoutRef.current = setTimeout(() => {
      setLastDetected('');
    }, 1000);
  };

  const stopScanner = () => {
    Quagga.offDetected(handleDetected);
    Quagga.stop();
    setIsScanning(false);
    
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
  };

  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6" />
          <div>
            <h2 className="font-semibold">Barcode Scanner</h2>
            <p className="text-sm text-gray-400">
              {isScanning ? 'Scanning...' : 'Starting camera...'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner View */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div 
          ref={scannerRef} 
          className="relative w-full h-full max-w-2xl max-h-2xl"
          style={{
            position: 'relative',
          }}
        />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64 md:w-96 md:h-96">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-400"></div>
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-green-400"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-green-400"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-400"></div>
              
              {/* Scanning Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-scan"></div>
            </div>
          </div>
        </div>

        {/* Last Detected */}
        {lastDetected && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn">
            <Scan className="w-5 h-5" />
            <span className="font-medium">Scanned: {lastDetected}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg max-w-md text-center">
            {error}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 text-white p-4 space-y-2">
        <p className="text-sm text-gray-300">
          📱 Point the camera at a barcode
        </p>
        <p className="text-sm text-gray-300">
          ✅ The item will be added automatically when detected
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        /* QuaggaJS canvas styling */
        #interactive.viewport {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        #interactive.viewport canvas,
        #interactive.viewport video {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
        }
        
        #interactive.viewport canvas.drawingBuffer {
          position: absolute;
        }
      `}</style>
    </div>
  );
}
