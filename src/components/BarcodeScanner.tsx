"use client";

import { useEffect, useRef, useState } from "react";

// Boarding passes use PDF417 (paper), Aztec (most mobile passes) or QR.
async function createReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.AZTEC, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints);
}

/** Read a boarding pass barcode from a photo or screenshot. */
export async function decodeImage(file: Blob): Promise<string> {
  const reader = await createReader();
  const url = URL.createObjectURL(file);
  try {
    return (await reader.decodeFromImageUrl(url)).getText();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Live camera scanner; calls onResult once with the decoded text. */
export default function BarcodeScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let done = false;
    (async () => {
      try {
        const reader = await createReader();
        const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current!, (result) => {
          if (result && !done) {
            done = true;
            controls.stop();
            onResult(result.getText());
          }
        });
        stop = () => controls.stop();
        if (done) controls.stop();
      } catch {
        setError("카메라를 열 수 없어요. 권한을 허용하거나 사진으로 올려 주세요.");
      }
    })();
    return () => {
      done = true;
      stop?.();
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-48 w-72 rounded-2xl border-4 border-white/80" />
      </div>
      <p className="absolute inset-x-0 top-10 text-center text-sm text-white">보딩패스의 바코드를 네모 안에 맞춰 주세요</p>
      {error && <p className="absolute inset-x-6 top-1/2 rounded-xl bg-black/70 p-4 text-center text-sm text-white">{error}</p>}
      <button className="absolute inset-x-6 bottom-10 rounded-xl bg-white py-3 font-medium text-zinc-900" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}
