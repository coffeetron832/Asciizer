export function createFFTAnalyzer(size = 1024) {
  const FFT_SIZE = size;

  // Precalculamos las tablas de senos y cosenos (Twiddle factors) para máxima velocidad
  const cosTable = new Float32Array(FFT_SIZE);
  const sinTable = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    cosTable[i] = Math.cos((2 * Math.PI * i) / FFT_SIZE);
    sinTable[i] = Math.sin((2 * Math.PI * i) / FFT_SIZE);
  }

  // Algoritmo de inversión de bits para reordenar el array
  function bitReverse(real, imag) {
    let j = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      if (i < j) {
        let temp = real[i]; real[i] = real[j]; real[j] = temp;
        temp = imag[i]; imag[i] = imag[j]; imag[j] = temp;
      }
      let bit = FFT_SIZE >> 1;
      while (j & bit) {
        j ^= bit;
        bit >>= 1;
      }
      j ^= bit;
    }
  }

  function getFFT(samples) {
    const real = new Float32Array(FFT_SIZE);
    const imag = new Float32Array(FFT_SIZE);

    // Rellenamos el buffer de entrada con las muestras PCM recibidas
    const len = Math.min(samples.length, FFT_SIZE);
    for (let i = 0; i < len; i++) {
      real[i] = samples[i] || 0;
    }

    // Reordenamiento obligatorio para Radix-2
    bitReverse(real, imag);

    // Bucles principales de la FFT (Mariposa)
    for (let size = 2; size <= FFT_SIZE; size <<= 1) {
      const halfSize = size >> 1;
      const tabStep = FFT_SIZE / size;

      for (let i = 0; i < FFT_SIZE; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const k = i + j;
          const l = k + halfSize;

          // Acceso rápido a tablas precalculadas
          const tCos = cosTable[j * tabStep];
          const tSin = sinTable[j * tabStep];

          // Operación mariposa compleja
          const tReal = real[l] * tCos + imag[l] * tSin;
          const tImag = imag[l] * tCos - real[l] * tSin;

          real[l] = real[k] - tReal;
          imag[l] = imag[k] - tImag;
          real[k] += tReal;
          imag[k] += tImag;
        }
      }
    }

    // Calculamos las magnitudes finales para la mitad del tamaño (Teorema de Nyquist)
    const half = FFT_SIZE / 2;
    const spectrum = new Float32Array(half);

    for (let i = 0; i < half; i++) {
      const r = real[i];
      const im = imag[i];
      // Normalizamos dividiendo entre el tamaño para mantener valores estables
      const mag = Math.sqrt(r * r + im * im) / FFT_SIZE;
      spectrum[i] = Number.isFinite(mag) ? mag : 0;
    }

    return spectrum;
  }

  return { getFFT };
}
