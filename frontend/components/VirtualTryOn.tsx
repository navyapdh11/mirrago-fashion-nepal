'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, X, Sparkles, Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface VirtualTryOnProps {
  productSlug: string;
  productName: string;
  productImageUrl: string | null;
}

export default function VirtualTryOn({ productSlug, productName, productImageUrl }: VirtualTryOnProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError('');
    setIsLoading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUserPhoto(base64);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError('Failed to read image');
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleTryOn = useCallback(async () => {
    if (!userPhoto) {
      setError('Please upload your photo first');
      return;
    }

    setError('');
    setIsProcessing(true);
    setTryOnImage(null);

    try {
      const result = await api.ai.tryOn.initiate(productSlug, userPhoto);
      setSessionId(result.session_id);

      // Poll for result
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.ai.tryOn.checkStatus(result.session_id);

          if (status.status === 'ready' && status.tryon_image) {
            setTryOnImage(status.tryon_image);
            setIsProcessing(false);
            clearInterval(pollInterval);
          } else if (status.status === 'failed') {
            setError(status.error_message || 'Virtual try-on failed. Please try again.');
            setIsProcessing(false);
            clearInterval(pollInterval);
          }
          // Continue polling if status is 'processing'
        } catch (err) {
          clearInterval(pollInterval);
          setError('Failed to get try-on result');
          setIsProcessing(false);
        }
      }, 3000); // Poll every 3 seconds

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isProcessing) {
          setError('Try-on is taking longer than expected. Please try again later.');
          setIsProcessing(false);
        }
      }, 60000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initiate virtual try-on';
      setError(message);
      setIsProcessing(false);
    }
  }, [userPhoto, productSlug, isProcessing]);

  const handleReset = () => {
    setUserPhoto(null);
    setTryOnImage(null);
    setSessionId(null);
    setError('');
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!tryOnImage) return;

    const link = document.createElement('a');
    link.href = tryOnImage;
    link.download = `tryon-${productSlug}.png`;
    link.click();
  };

  return (
    <>
      {/* Try-On Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition flex items-center justify-center gap-2 shadow-lg"
      >
        <Sparkles className="w-5 h-5" />
        Virtual Try-On
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Virtual Try-On</h2>
                <p className="text-sm text-gray-600 mt-1">Try on {productName} virtually</p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  handleReset();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Step 1: Upload Your Photo</h3>

                  {!userPhoto ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition"
                    >
                      <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium text-gray-700 mb-2">Click to upload your photo</p>
                      <p className="text-sm text-gray-500">JPG, PNG up to 5MB</p>
                      <p className="text-xs text-gray-400 mt-2">For best results, use a clear front-facing photo</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={userPhoto}
                        alt="Your photo"
                        className="w-full aspect-square object-cover rounded-xl"
                      />
                      <button
                        onClick={handleReset}
                        className="absolute top-2 right-2 bg-white p-2 rounded-full shadow hover:bg-gray-100 transition"
                        aria-label="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Upload photo"
                  />

                  {userPhoto && !tryOnImage && (
                    <button
                      onClick={handleTryOn}
                      disabled={isProcessing}
                      className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Try It On
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Result Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Step 2: View Result</h3>

                  {isProcessing ? (
                    <div className="bg-gray-100 rounded-xl aspect-square flex flex-col items-center justify-center">
                      <Loader2 className="w-16 h-16 text-purple-600 animate-spin mb-4" />
                      <p className="text-gray-600 font-medium">AI is generating your virtual try-on...</p>
                      <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
                    </div>
                  ) : tryOnImage ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tryOnImage}
                        alt="Virtual try-on result"
                        className="w-full aspect-square object-cover rounded-xl"
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={handleDownload}
                          className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition"
                          aria-label="Download image"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleReset}
                          className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition"
                          aria-label="Try again"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-xl aspect-square flex flex-col items-center justify-center">
                      <Sparkles className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500 font-medium">
                        {userPhoto ? 'Click "Try It On" to see the result' : 'Upload your photo to get started'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Product Preview */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Trying On:</h4>
                <div className="flex items-center gap-3">
                  {productImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productImageUrl}
                      alt={productName}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-medium">{productName}</p>
                    <p className="text-sm text-gray-500">AI Virtual Try-On powered by Mirrago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
