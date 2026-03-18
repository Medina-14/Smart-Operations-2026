'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';

interface CameraScannerProps {
  onScan: (data: string) => void;
  title?: string;
}

export function CameraScanner({ onScan, title = 'Scan Label' }: CameraScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setIsScanning(true);
      // Simulate AI/OCR processing delay
      setTimeout(() => {
        // Mock result: NV-4587-1
        const mockResult = `NV-${Math.floor(Math.random() * 1000 + 4000)}-${Math.floor(Math.random() * 5 + 1)}`;
        setScanResult(mockResult);
        setIsScanning(false);
        onScan(mockResult);
      }, 1500);
    }
  }, [webcamRef, onScan]);

  const reset = () => {
    setScanResult(null);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
      <h3 className="text-lg font-semibold text-antko-dark mb-4">{title}</h3>
      
      {!scanResult ? (
        <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: 'environment' }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 border-2 border-antko-primary/50 m-8 rounded pointer-events-none"></div>
          
          <button
            onClick={capture}
            disabled={isScanning}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-antko-primary text-white p-3 rounded-full shadow-lg hover:bg-antko-primary/90 transition-colors disabled:opacity-50"
          >
            {isScanning ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md aspect-video bg-green-50 rounded-lg flex flex-col items-center justify-center border-2 border-green-200">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
          <p className="text-green-800 font-medium text-lg">Scanned Successfully</p>
          <p className="text-green-600 font-mono mt-1">{scanResult}</p>
          <button
            onClick={reset}
            className="mt-4 text-sm text-green-700 underline hover:text-green-800"
          >
            Scan Another
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Uses device camera to scan labels and documents.
      </p>
    </div>
  );
}
