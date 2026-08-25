import { CONFIG } from "../config.js";
import { createFFTAnalyzer } from "./fft.js";

export function createAnalyzer() {
  let buffer = Buffer.alloc(0);
  const fft = createFFTAnalyzer(CONFIG.fftSize);

  let lastBars = new Array(CONFIG.barCount).fill(0);

  let energyHistory = [];
  const HISTORY_SIZE = 15;

  const hannWindow = new Float32Array(CONFIG.fftSize);
  for (let i = 0; i < CONFIG.fftSize; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (CONFIG.fftSize - 1)));
  }

  function process(chunk) {
    if (lastBars.length !== CONFIG.barCount) {
      lastBars = new Array(CONFIG.barCount).fill(0);
    }

    if (!chunk || chunk.length === 0) {
      return lastBars;
    }

    buffer = Buffer.concat([buffer, chunk]);

    const requiredBytes = CONFIG.analysisWindowBytes || (CONFIG.fftSize * 4);

    if (buffer.length < requiredBytes) {
      return lastBars;
    }

    if (buffer.length > requiredBytes * 2) {
      buffer = buffer.subarray(buffer.length - requiredBytes);
    }

    const slice = buffer.subarray(0, requiredBytes);
    buffer = buffer.subarray(requiredBytes);

    const sampleCount = Math.floor(slice.length / 4); 
    const samples = new Float32Array(sampleCount);

    let s = 0;
    for (let i = 0; i + 3 < slice.length; i += 4) {
      const leftSample = slice.readInt16LE(i);
      const rightSample = slice.readInt16LE(i + 2);
      
      const rawMonoSample = ((leftSample + rightSample) / 2) / 32768;

      samples[s] = rawMonoSample * (hannWindow[s] || 1);
      s++;
    }

    const spectrum = fft.getFFT(samples.subarray(0, s));

    const bars = new Array(CONFIG.barCount).fill(0);
    const bandSize = Math.max(
      1,
      Math.floor(spectrum.length / CONFIG.barCount)
    );

    for (let i = 0; i < CONFIG.barCount; i++) {
      let sum = 0;
      let count = 0;

      for (let j = 0; j < bandSize; j++) {
        const value = spectrum[i * bandSize + j];

        if (Number.isFinite(value)) {
          sum += value;
          count++;
        }
      }

      const avg = count > 0 ? sum / count : 0;

      const logScale = Math.log10(1 + avg * 120); 
      const curve = 1.0 + (i / CONFIG.barCount) * 3.5; 
      const boosted = logScale * 1.9 * curve; 

      bars[i] = Number.isFinite(boosted)
        ? Math.max(0, Math.min(1, boosted))
        : 0;
    }

    const smoothedBars = new Array(CONFIG.barCount).fill(0);
    const isLargeScreen = CONFIG.barCount > 100;

    for (let i = 0; i < CONFIG.barCount; i++) {
      if (isLargeScreen) {
        const left = i > 0 ? bars[i - 1] : bars[i];
        const right = i < CONFIG.barCount - 1 ? bars[i + 1] : bars[i];
        smoothedBars[i] = left * 0.25 + bars[i] * 0.50 + right * 0.25;
      } else {
        smoothedBars[i] = bars[i];
      }
    }

    const energy = smoothedBars.reduce((a, b) => a + b, 0) / smoothedBars.length;
    energyHistory.push(energy);

    if (energyHistory.length > HISTORY_SIZE) {
      energyHistory.shift();
    }

    const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;

    let variance = 0;
    for (let i = 0; i < energyHistory.length; i++) {
      variance += Math.abs(energyHistory[i] - avgEnergy);
    }
    variance /= energyHistory.length;

    const isSilent = avgEnergy < 0.01 || variance < 0.002;

    lastBars = smoothedBars.map((val, idx) => (lastBars[idx] || 0) * 0.1 + val * 0.9);

    return lastBars;
  }

  return { process };
}
