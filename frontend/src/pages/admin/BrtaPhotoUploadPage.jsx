import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  CloudUpload,
  ImagePlus,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
} from 'lucide-react';

import api from '../../lib/api';
import '../../styles/BrtaPhotoUploadPage.css';

const defaultIds = {
  driver: 'BRTA-DRV-0001',
  owner: 'BRTA-OWN-0001',
};

const getUploadResult = (response, type) => {
  const payload = response?.data || response || {};

  if (type === 'driver') {
    return payload.driver || payload.data?.driver || payload;
  }

  return payload.owner || payload.data?.owner || payload;
};

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString('en-US');
};

export default function BrtaPhotoUploadPage() {
  const [profileType, setProfileType] = useState('driver');
  const [brtaId, setBrtaId] = useState(defaultIds.driver);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const isDriver = profileType === 'driver';

  const helperText = useMemo(() => {
    if (isDriver) {
      return 'Upload official BRTA driver photo. Matching driver user account will be synced automatically.';
    }

    return 'Upload official BRTA owner photo. Matching owner user account will be synced automatically.';
  }, [isDriver]);

  const handleTypeChange = (nextType) => {
    setProfileType(nextType);
    setBrtaId(defaultIds[nextType]);
    setSelectedFile(null);
    setPreviewUrl('');
    setMessage('');
    setError('');
    setLastResult(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setMessage('');
    setError('');
    setLastResult(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedFile(null);
      setPreviewUrl('');
      setError('Only image files are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSelectedFile(null);
      setPreviewUrl('');
      setError('Image size must be less than 2MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleReset = () => {
    setBrtaId(defaultIds[profileType]);
    setSelectedFile(null);
    setPreviewUrl('');
    setMessage('');
    setError('');
    setLastResult(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanId = brtaId.trim();

    setMessage('');
    setError('');
    setLastResult(null);

    if (!cleanId) {
      setError(isDriver ? 'BRTA Driver ID is required.' : 'BRTA Owner ID is required.');
      return;
    }

    if (!selectedFile) {
      setError('Please select a profile photo first.');
      return;
    }

    try {
      setUploading(true);

      const response = isDriver
        ? await api.uploadBrtaDriverPhoto(cleanId, selectedFile)
        : await api.uploadBrtaOwnerPhoto(cleanId, selectedFile);

      const result = getUploadResult(response, profileType);

      setLastResult(result);
      setMessage(
        response?.message ||
          `${isDriver ? 'BRTA driver' : 'BRTA owner'} photo uploaded successfully.`
      );
    } catch (uploadError) {
      setError(uploadError.message || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="brta-photo-page space-y-6">
      <div className="brta-photo-hero rounded-2xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <ShieldCheck size={14} />
              BRTA Official Media
            </div>

            <h1 className="mt-4 text-2xl font-bold">
              BRTA Profile Photo Upload
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Upload official driver or owner photo to Cloudinary and sync the saved image URL with the matched STVES user account.
            </p>
          </div>

          <div className="brta-photo-hero-icon">
            <CloudUpload size={42} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="brta-photo-card rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-[#0f4c81]">
              <ImagePlus size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Upload Official Photo
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {helperText}
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleTypeChange('driver')}
              className={`brta-photo-type-button ${isDriver ? 'active' : ''}`}
            >
              <UserRound size={18} />
              <span>Driver Photo</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('owner')}
              className={`brta-photo-type-button ${!isDriver ? 'active' : ''}`}
            >
              <UsersRound size={18} />
              <span>Owner Photo</span>
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {isDriver ? 'BRTA Driver ID' : 'BRTA Owner ID'}
              </label>

              <input
                type="text"
                value={brtaId}
                onChange={(event) => setBrtaId(event.target.value)}
                placeholder={isDriver ? 'Example: BRTA-DRV-0001' : 'Example: BRTA-OWN-0001'}
                className="brta-photo-input"
              />

              <p className="mt-2 text-xs text-gray-400">
                Test value: {isDriver ? 'BRTA-DRV-0001' : 'BRTA-OWN-0001'}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Select Photo
              </label>

              <label className="brta-photo-dropzone">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <Camera size={28} className="text-[#0f4c81]" />

                <span className="mt-2 text-sm font-semibold text-gray-700">
                  {selectedFile ? selectedFile.name : 'Click to choose image'}
                </span>

                <span className="mt-1 text-xs text-gray-400">
                  JPG, PNG, WEBP supported. Max 2MB.
                </span>
              </label>
            </div>

            {error && (
              <div className="brta-photo-alert error">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="brta-photo-alert success">
                <CheckCircle size={17} />
                <span>{message}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={uploading}
                className="brta-photo-submit"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={17} />
                    Upload Photo
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={uploading}
                className="brta-photo-reset"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <div className="brta-photo-card rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              Photo Preview
            </h2>

            <div className="mt-5 flex flex-col items-center rounded-2xl bg-gray-50 p-6 text-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected BRTA profile"
                  className="brta-photo-preview"
                />
              ) : (
                <div className="brta-photo-preview-empty">
                  <Camera size={34} />
                </div>
              )}

              <p className="mt-4 text-sm font-semibold text-gray-700">
                {selectedFile ? selectedFile.name : 'No image selected'}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                This preview is local. Final image will be served from Cloudinary after upload.
              </p>
            </div>
          </div>

          {lastResult && (
            <div className="brta-photo-card rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-green-700">
                <CheckCircle size={18} />
                <h2 className="text-base font-bold">
                  Upload Result
                </h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="brta-photo-result-row">
                  <span>BRTA ID</span>
                  <strong>
                    {lastResult.brtaDriverId || lastResult.brtaOwnerId || brtaId}
                  </strong>
                </div>

                <div className="brta-photo-result-row">
                  <span>Name</span>
                  <strong>{lastResult.name || 'N/A'}</strong>
                </div>

                <div className="brta-photo-result-row">
                  <span>Synced Users</span>
                  <strong>{formatNumber(lastResult.syncedUsers)}</strong>
                </div>

                {Array.isArray(lastResult.matchedLicenseNumbers) && (
                  <div className="brta-photo-result-row">
                    <span>Matched Licenses</span>
                    <strong>{lastResult.matchedLicenseNumbers.join(', ') || 'N/A'}</strong>
                  </div>
                )}

                {lastResult.photoUrl && (
                  <a
                    href={lastResult.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="brta-photo-link"
                  >
                    Open Cloudinary Image
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}