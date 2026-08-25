export const THEMES = [
  {
    name: "Classic Green",
    base: { r: 0, g: 255, b: 128 },   // Verde cian brillante
    top: { r: 0, g: 100, b: 40 }      // Verde oscuro
  },
  {
    name: "Cyberpunk Pink",
    base: { r: 255, g: 0, b: 128 },   // Rosa neón
    top: { r: 60, g: 0, b: 150 }      // Morado cyberpunk
  },
  {
    name: "Electric Blue",
    base: { r: 0, g: 191, b: 255 },   // Azul cielo eléctrico
    top: { r: 0, g: 30, b: 120 }      // Azul profundo
  },
  {
    name: "Sunset Orange",
    base: { r: 255, g: 69, b: 0 },    // Naranja rojizo
    top: { r: 128, g: 0, b: 64 }      // Vino tinto / magenta oscuro
  },
  {
    name: "Monochrome Minimal",
    base: { r: 240, g: 240, b: 240 }, // Blanco roto
    top: { r: 70, g: 70, b: 70 }      // Gris oscuro
  },
  {
    name: "Retro VU Meter",           // 🚀 NUEVO: Estilo ecualizador clásico de tres niveles
    base: { r: 0, g: 255, b: 0 },     // Verde (Base estable)
    mid: { r: 255, g: 200, b: 0 },    // Amarillo (Zona intermedia/Advertencia)
    top: { r: 255, g: 0, b: 0 }       // Rojo (Picos altos/Saturación)
  }
];
