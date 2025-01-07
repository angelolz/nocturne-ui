import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeftIcon, XIcon } from "../../icons";
import { registerDevice, checkAuthStatus } from "../../../services/authService";

const QRAuthFlow = ({ onBack, onComplete }) => {
  const [deviceId, setDeviceId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [toggleQrCode, setToggleQrCode] = useState(true);

  useEffect(() => {
    const initDevice = async () => {
      try {
        const { deviceId } = await registerDevice();
        setDeviceId(deviceId);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to register device:", err);
        setError("Failed to generate QR code");
        setIsLoading(false);
      }
    };

    setIsVisible(true);
    initDevice();
  }, []);

  useEffect(() => {
    if (!deviceId) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const data = await checkAuthStatus(deviceId);

        if (!isMounted) return;

        if (data.status === 'authorized') {
          clearInterval(pollInterval);
          const clientId = data.encryptedData?.clientId;
          const clientSecret = data.encryptedData?.clientSecret;
          const authCode = data.code;

          if (clientId && clientSecret && authCode) {
            // Storing these in localStorage temporarily
            localStorage.setItem('spotifyClientId', clientId);
            localStorage.setItem('spotifyClientSecret', clientSecret);
            localStorage.setItem('spotifyAuthType', 'custom');
            onComplete({
              type: "custom",
              authCode: data.code,
              deviceId
            });
          } else {
            const missing = [];
            if (!clientId) missing.push('clientId');
            if (!clientSecret) missing.push('clientSecret');
            if (!authCode) missing.push('authCode');
            setError(`Incomplete auth data. Missing: ${missing.join(', ')}`);
          }
        }

        if (error) setError(null);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    const timeoutId = setTimeout(() => {
      clearInterval(pollInterval);
      setError("QR code has expired. Please try again.");
    }, 15 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [deviceId, onComplete, error]);

  const handleClose = () => {
    setIsExiting(true);
    setToggleQrCode(true);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-white/70 text-xl">{error}</div>
          <button
            onClick={onBack}
            className="flex items-center justify-center space-x-2 rounded-full bg-white/10 px-6 py-4 text-xl font-[560] text-white tracking-tight shadow-sm mx-auto"
          >
            <ArrowLeftIcon size={24} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  const handleQrCodeClick = () => {
    if(process.env.NODE_ENV === 'development') {
      setToggleQrCode(false);
    }
  }
  const modalContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center space-y-8">
          <div className="animate-pulse bg-white/10 w-[200px] h-[200px] rounded-xl mx-auto"></div>
          <div className="space-y-2 text-center">
            <p className="text-white text-2xl">Connect to Nocturne</p>
            <p className="text-white/50 text-lg">Generating QR Code...</p>
          </div>
        </div>
      );
    }

    if (!deviceId) {
      return null;
    }

    const qrUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/ui/${deviceId}`;

    return (
      <div className="flex flex-col items-center space-y-8">
        
        {toggleQrCode ? <div className="bg-white p-1 rounded-xl" >
          <QRCodeSVG value={qrUrl} size={200} level="H" includeMargin={true} onClick={handleQrCodeClick} />
        </div> : <div><a href={qrUrl} target="_blank"><h4 className="text-white">Link to Authorization URL</h4></a></div>}
        <div className="space-y-2 text-center">
          <p className="text-white text-2xl">Connect to Nocturne</p>
          <p className="text-white/50 text-lg">
            Open your phone's camera and point it at the QR code.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isVisible && !isExiting ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 transition-all duration-300 ${
          isVisible && !isExiting
            ? "-translate-y-1/2 opacity-100"
            : isExiting
            ? "translate-y-[10%] opacity-0"
            : "translate-y-[10%] opacity-0"
        }`}
      >
        <div className="relative bg-black/90 p-8 rounded-3xl shadow-2xl min-w-[400px] border border-white/10">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <XIcon size={24} />
          </button>
          {modalContent()}
        </div>
      </div>
    </div>
  );
};

export default QRAuthFlow;