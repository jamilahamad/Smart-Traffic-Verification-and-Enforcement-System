import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle,
  IdCard,
  Loader2,
  QrCode,
  ScanLine,
  ShieldCheck,
  XCircle,
  Car,
} from 'lucide-react';

import useStore from '../../store/useStore';
import { parseSTVESQR } from '../../utils/qr';
import '../../styles/QRScanPage.css';

const cleanQRValue = (value) => {
  return String(value || '').trim();
};

const waitForRender = () => {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
};

const getCameraErrorMessage = (error) => {
  const message = String(error?.message || error || '');

  if (
    message.includes('NotAllowedError') ||
    message.includes('Permission denied') ||
    message.includes('permission')
  ) {
    return 'Camera permission was denied. Please allow camera access from your browser settings and try again.';
  }

  if (
    message.includes('NotFoundError') ||
    message.includes('Requested device not found') ||
    message.includes('No camera')
  ) {
    return 'No camera device was found on this device.';
  }

  if (
    message.includes('NotReadableError') ||
    message.includes('Could not start video source')
  ) {
    return 'Camera is already in use by another app. Close the other app and try again.';
  }

  return message || 'Unable to start camera scanner.';
};

export default function QRScanPage({ onNavigate = () => {} }) {
  const currentUser = useStore((state) => state.currentUser);
  const addLog = useStore((state) => state.addLog);
  const setQRVerificationPayload = useStore((state) => state.setQRVerificationPayload);

  const readerIdRef = useRef(`stves-qr-reader-${Date.now()}`);
  const scannerRef = useRef(null);
  const detectedLockRef = useRef(false);
  const lastInvalidQRRef = useRef('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [detectedQR, setDetectedQR] = useState('');
  const [error, setError] = useState('');
  const [startingCamera, setStartingCamera] = useState(false);

  const writeScanLog = ({ action, details }) => {
    if (!currentUser || typeof addLog !== 'function') {
      return;
    }

    addLog({
      userId: currentUser.id || currentUser._id,
      userName: currentUser.name || 'Police Officer',
      action,
      details,
      type: 'verification',
    });
  };

  const clearScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (stopError) {
      console.warn('QR scanner stop warning:', stopError);
    }

    try {
      await scanner.clear();
    } catch (clearError) {
      console.warn('QR scanner clear warning:', clearError);
    }

    scannerRef.current = null;
  };

  const stopCamera = async () => {
    detectedLockRef.current = false;
    await clearScanner();
    setCameraActive(false);
    setStartingCamera(false);
    setCameraStatus('idle');
  };

  const handleDetectedQRCode = async (rawValue) => {
    const value = cleanQRValue(rawValue);

    if (!value) {
      detectedLockRef.current = false;
      return;
    }

    const parsed = parseSTVESQR(value);

    if (!parsed.isValid) {
      if (lastInvalidQRRef.current !== value) {
        lastInvalidQRRef.current = value;
        setError('A QR code was detected, but it is not a valid STVES vehicle/license QR.');
      }

      detectedLockRef.current = false;
      return;
    }

    setDetectedQR(parsed.raw);
    setError('');
    setCameraStatus('detected');

    if (typeof setQRVerificationPayload === 'function') {
      setQRVerificationPayload({
        source: 'camera-scanner',
        type: parsed.type,
        value: parsed.value,
        rawValue: parsed.raw,
        createdAt: Date.now(),
      });
    }

    writeScanLog({
      action: parsed.type === 'vehicle' ? 'Vehicle QR Scanned' : 'License QR Scanned',
      details: `${parsed.raw} scanned by camera. Redirecting to verification page.`,
    });

    await clearScanner();
    setCameraActive(false);
    setStartingCamera(false);

    window.setTimeout(() => {
      onNavigate('verify');
    }, 250);
  };

  const startCamera = async () => {
    setError('');
    setDetectedQR('');
    lastInvalidQRRef.current = '';
    detectedLockRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser. Please use localhost or HTTPS.');
      return;
    }

    try {
      await clearScanner();

      setStartingCamera(true);
      setCameraStatus('requesting');

      await waitForRender();

      const scanner = new Html5Qrcode(readerIdRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
          aspectRatio: 1.7777778,
        },
        async (decodedText) => {
          if (detectedLockRef.current) {
            return;
          }

          detectedLockRef.current = true;
          await handleDetectedQRCode(decodedText);
        },
        () => {
          // Ignore continuous scan miss messages.
        }
      );

      setCameraActive(true);
      setStartingCamera(false);
      setCameraStatus('scanning');
    } catch (cameraError) {
      console.error('Camera start failed:', cameraError);
      await clearScanner();
      setCameraActive(false);
      setStartingCamera(false);
      setCameraStatus('idle');
      setError(getCameraErrorMessage(cameraError));
    }
  };

  const handleCameraButtonClick = () => {
    if (cameraActive || startingCamera) {
      stopCamera();
      return;
    }

    startCamera();
  };

  useEffect(() => {
    return () => {
      clearScanner();
    };
  }, []);

  const statusText = cameraActive
    ? 'Camera is scanning for STVES QR codes.'
    : cameraStatus === 'requesting'
      ? 'Waiting for camera permission...'
      : cameraStatus === 'detected'
        ? 'QR detected. Opening verification page...'
        : 'Camera is currently off.';

  return (
    <div className="qr-scan-wrapper animate-fade-in space-y-6">
      <header className="qr-scan-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode size={26} />
          QR Code Scanner
        </h1>

        <p className="text-sm text-blue-100 mt-1">
          Scan vehicle or license QR codes for instant STVES verification.
        </p>
      </header>

      <section className="qr-scan-layout grid grid-cols-1 gap-6">
        <div className="qr-scan-camera-card bg-white rounded-2xl border border-gray-100 p-5">
          <div className="qr-scan-camera-head flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Live Camera Scanner</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Start the camera, allow permission, then place an STVES QR code inside the frame.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCameraButtonClick}
              className={`qr-scan-camera-button px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                cameraActive || startingCamera
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-[#0f4c81] text-white hover:shadow-lg'
              }`}
            >
              {startingCamera ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {cameraActive || startingCamera ? 'Stop Camera' : 'Start Camera'}
            </button>
          </div>

          <div
            className={`qr-scan-preview rounded-2xl border-2 border-dashed ${
              cameraActive || startingCamera
                ? 'border-blue-200 bg-slate-950'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {cameraActive || startingCamera ? (
              <div className="qr-scan-camera-view">
                <div className="qr-scan-video-wrap">
                  <div id={readerIdRef.current} className="qr-scan-reader" />

                  <div className="qr-scan-frame-overlay" aria-hidden="true">
                    <span className="qr-scan-corner qr-scan-corner-top-left" />
                    <span className="qr-scan-corner qr-scan-corner-top-right" />
                    <span className="qr-scan-corner qr-scan-corner-bottom-left" />
                    <span className="qr-scan-corner qr-scan-corner-bottom-right" />
                    {cameraActive && <span className="qr-scan-line" />}
                  </div>
                </div>

                <p className="text-sm text-white/75 mt-5 flex items-center gap-2">
                  <ScanLine size={16} />
                  {statusText}
                </p>
              </div>
            ) : (
              <div className="qr-scan-placeholder">
                <Camera size={58} className="text-gray-300 mx-auto mb-3" />

                <p className="text-sm font-medium text-gray-500">
                  Camera is currently off
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Click Start Camera to allow device camera access and scan a QR code.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="qr-scan-status-panel grid md:grid-cols-3 gap-4">
        <article className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="qr-scan-info-icon w-10 h-10 rounded-xl bg-blue-50 text-[#0f4c81] flex items-center justify-center">
              <Camera size={18} />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-800">Camera Status</p>
              <p className="text-xs text-gray-500 mt-1">{statusText}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="qr-scan-info-icon w-10 h-10 rounded-xl bg-blue-50 text-[#0f4c81] flex items-center justify-center">
              <Car size={18} />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-800">Vehicle QR</p>
              <p className="text-xs text-gray-500 mt-1">
                STVES-VEH:&lt;registration-number&gt;
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="qr-scan-info-icon w-10 h-10 rounded-xl bg-blue-50 text-[#0f4c81] flex items-center justify-center">
              <IdCard size={18} />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-800">License QR</p>
              <p className="text-xs text-gray-500 mt-1">
                STVES-LIC:&lt;license-number&gt;
              </p>
            </div>
          </div>
        </article>
      </section>

      {error && (
        <section className="qr-scan-error-card rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <XCircle size={26} className="text-red-500 shrink-0" />

          <div>
            <h3 className="font-semibold text-red-700">Camera Scanner Failed</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </section>
      )}

      {detectedQR && (
        <section className="qr-scan-detected-card rounded-2xl border border-green-200 bg-green-50 p-5 flex items-start gap-3">
          <CheckCircle size={26} className="text-green-500 shrink-0" />

          <div>
            <h3 className="font-semibold text-green-700">QR Detected Successfully</h3>
            <p className="text-sm text-green-600 mt-1">
              {detectedQR} detected. Opening verification page...
            </p>
          </div>
        </section>
      )}

      <p className="qr-scan-help-text text-xs text-gray-400 flex items-center gap-2">
        <ShieldCheck size={14} />
        Camera works on localhost or HTTPS. Supported QR format: STVES-VEH:&lt;registration-number&gt; or STVES-LIC:&lt;license-number&gt;.
      </p>
    </div>
  );
}