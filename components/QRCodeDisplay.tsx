import React from 'react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 150 }) => {
  // Using a reliable public API for QR generation for the demo
  // In production, use a library like `react-qr-code` or generated on backend
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=000000&bgcolor=FFFFFF`;

  return (
    <div className="bg-white p-4 rounded-lg inline-block">
      <img src={qrUrl} alt="Kid QR Code" width={size} height={size} className="mix-blend-multiply" />
    </div>
  );
};

export default QRCodeDisplay;
