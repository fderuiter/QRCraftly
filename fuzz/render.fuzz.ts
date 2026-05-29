import { FuzzedDataProvider } from '@jazzer.js/core';
import { drawQR } from '../src/utils/qrRenderer';
import { QRStyle, QRType, QRErrorCorrectionLevel } from '../src/types';
import { DEFAULT_CONFIG } from '../src/constants';

export function fuzz(data: Buffer) {
  const fdp = new FuzzedDataProvider(data);

  const mockContext = {
    clearRect: () => {},
    fillRect: () => {},
    roundRect: () => {},
    beginPath: () => {},
    fill: () => {},
    arc: () => {},
    rect: () => {},
    save: () => {},
    translate: () => {},
    rotate: () => {},
    restore: () => {},
    scale: () => {},
    drawImage: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    setLineDash: () => {},
    strokeRect: () => {},
    stroke: () => {},
    fillText: () => {},
    canvas: { width: 0, height: 0 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    quadraticCurveTo: () => {},
  } as any;

  // Fuzzing QR Config
  const fuzzedConfig = {
    ...DEFAULT_CONFIG,
    value: fdp.consumeString(100),
    type: fdp.pickValue(Object.values(QRType)),
    style: fdp.pickValue(Object.values(QRStyle)),
    fgColor: fdp.consumeString(20),
    bgColor: fdp.consumeString(20),
    eyeColor: fdp.consumeString(20),
    errorCorrectionLevel: fdp.pickValue(Object.values(QRErrorCorrectionLevel)),
    isBorderEnabled: fdp.consumeBoolean(),
    borderSize: fdp.consumeNumber(),
    borderColor: fdp.consumeString(20),
    borderStyle: fdp.pickValue(['solid', 'dashed', 'dotted', 'double'] as const),
    logoUrl: fdp.consumeBoolean() ? fdp.consumeString(50) : null,
    logoSize: fdp.consumeNumber(),
    logoPadding: fdp.consumeNumber(),
  };

  const moduleSize = fdp.consumeIntegralInRange(21, 100);
  const mockModules = {
    size: moduleSize,
    get: (r: number, c: number) => {
      return (r + c) % 2 === 0;
    },
  };

  const displaySize = fdp.consumeIntegralInRange(100, 2000);
  
  let fakeImg = null;
  if (fuzzedConfig.logoUrl) {
    fakeImg = { width: 100, height: 100 } as any;
  }

  try {
    drawQR(mockContext, mockModules, fuzzedConfig, fakeImg, null, displaySize);
  } catch (e) {
    throw e;
  }
}
