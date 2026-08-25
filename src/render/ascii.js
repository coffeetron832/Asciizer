import { CONFIG } from "../config.js";
import { getTerminalSize } from "../utils/terminalSize.js";
import { THEMES } from "./themes.js";

export function createAsciiRenderer() {
  const chars = CONFIG.chars;
  let currentThemeIdx = 0;
  
  const MODES = ["Classic", "Perspective", "Center-Out", "Rainfall", "Radar", "Oscilloscope"];
  let modeIdx = 0;

  let rainMatrix = []; 
  let wavePhase = 0; 

  function mapCharacter(v) {
    const idx = Math.floor(v * (chars.length - 1));
    return chars[Math.max(0, Math.min(chars.length - 1, idx))];
  }

  function nextTheme() {
    currentThemeIdx = (currentThemeIdx + 1) % THEMES.length;
  }

  function toggleMode() {
    modeIdx = (modeIdx + 1) % MODES.length;
  }

  function interpolateColor(color1, color2, factor) {
    return {
      r: Math.round(color1.r + (color2.r - color1.r) * factor),
      g: Math.round(color1.g + (color2.g - color1.g) * factor),
      b: Math.round(color1.b + (color2.b - color1.b) * factor)
    };
  }

  function render(bars) {
    if (!Array.isArray(bars) || bars.length === 0) {
      return "";
    }

    const { width, height } = getTerminalSize();
    const cols = width || 80;
    const isMaximized = cols >= 120 && height >= 20;

    const rows = Math.max(5, height - (isMaximized ? 4 : 1)); 
    const currentMode = MODES[modeIdx];
    const theme = THEMES[currentThemeIdx];
    const ANSI_RESET = "\x1b[0m";
    
    let output = "";

    if (currentMode === "Rainfall") {
      if (rainMatrix.length !== rows || rainMatrix[0]?.length !== cols) {
        rainMatrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
      }
      for (let r = 0; r < rows - 1; r++) {
        rainMatrix[r] = [...rainMatrix[r + 1]];
      }
      const step = bars.length / cols;
      const topRow = new Array(cols);
      for (let c = 0; c < cols; c++) {
        const val = bars[Math.floor(c * step)] || 0;
        topRow[c] = val > 0.15 ? val : 0;
      }
      rainMatrix[rows - 1] = topRow;
    }

    if (currentMode === "Oscilloscope") {
      wavePhase += 0.25; 
    }

    let totalEnergy = 0;
    if (currentMode === "Radar") {
      const sampleSize = Math.min(bars.length, 15);
      for (let i = 0; i < sampleSize; i++) {
        totalEnergy += bars[i];
      }
      totalEnergy = totalEnergy / sampleSize;
    }

    for (let row = rows - 1; row >= 0; row--) {
      let line = "";

      const minWidthFactor = 0.35; 
      const currentWidthFactor = 1.0 - ((row / (rows - 1 || 1)) * (1.0 - minWidthFactor));
      const activeColsInRow = Math.floor(cols * currentWidthFactor);
      const sideMargin = Math.floor((cols - activeColsInRow) / 2);

      for (let col = 0; col < cols; col++) {
        let value = -1;
        let verticalFactor = row / rows;
        let isOscilloscopeDot = false;

        switch (currentMode) {
          case "Perspective":
            if (col >= sideMargin && col < cols - sideMargin) {
              const relativeCol = col - sideMargin;
              const colFactor = relativeCol / (activeColsInRow || 1);
              const barIndex = Math.floor(colFactor * (bars.length - 1));
              const barHeight = (bars[barIndex] || 0) * rows;

              if (barHeight > row) {
                value = 1 - ((row + 1) / barHeight);
              }
            }
            break;

          case "Center-Out": {
            const midCol = cols / 2;
            const distanceFromMidCol = Math.abs(col - midCol);
            const barIndex = Math.floor((distanceFromMidCol / midCol) * (bars.length - 1));
            const barHeight = (bars[barIndex] || 0) * rows;
            if (barHeight > row) {
              value = 1 - ((row + 1) / barHeight);
            }
            break;
          }

          case "Rainfall":
            const rainVal = rainMatrix[row][col] || 0;
            if (rainVal > 0) {
              value = rainVal * (row / rows);
            }
            break;

          case "Radar": {
            const centerX = cols / 2;
            const centerY = rows / 2;
            
            const dx = (col - centerX) * 0.55; 
            const dy = row - centerY;
            
            const radius = Math.sqrt(dx * dx + dy * dy);
            let angle = Math.atan2(dy, dx);
            if (angle < 0) angle += 2 * Math.PI;

            const angleFactor = angle / (2 * Math.PI);
            const barIndex = Math.floor(angleFactor * (bars.length - 1));
            
            const rawBarValue = bars[barIndex] || 0;
            const boostedValue = Math.pow(rawBarValue, 1.2) * 1.3;

            const pulseSubtractedRadius = 1.5 + (totalEnergy * 3.5);
            const maxRadius = Math.min(centerX * 0.55, centerY) * 0.95;
            
            const targetRadius = pulseSubtractedRadius + (boostedValue * (maxRadius - pulseSubtractedRadius));

            if (radius < targetRadius && radius > 0.8) {
              value = 1 - (radius / targetRadius);
              verticalFactor = Math.min(1, radius / maxRadius); 
            }
            break;
          }

          case "Oscilloscope": {
            const waveIndex = Math.floor((col / cols) * (bars.length - 1));
            const prevAmp = bars[Math.max(0, waveIndex - 1)] || 0;
            const nextAmp = bars[Math.min(bars.length - 1, waveIndex + 1)] || 0;
            const currentAmp = bars[waveIndex] || 0;
            const smoothedAmp = (prevAmp + currentAmp + nextAmp) / 3;

            const theta = (col * 0.12) + wavePhase;
            const waveForm = Math.sin(theta) * 0.7 + Math.sin(theta * 2.3 + wavePhase * 0.5) * 0.3;
            
            const targetRow = Math.floor((rows / 2) + (waveForm * (smoothedAmp * (rows / 2.1))));

            if (row === targetRow) {
              isOscilloscopeDot = true;
            }
            break;
          }

          default: {
            const step = bars.length / cols;
            const rawValue = bars[Math.floor(col * step)] || 0;
            const barHeight = rawValue * rows;
            if (barHeight > row) {
              value = 1 - ((row + 1) / barHeight);
            }
            break;
          }
        }

        if (isOscilloscopeDot) {
          let color;
          if (theme.mid) {
            if (verticalFactor < 0.5) {
              color = interpolateColor(theme.base, theme.mid, verticalFactor * 2);
            } else {
              color = interpolateColor(theme.mid, theme.top, (verticalFactor - 0.5) * 2);
            }
          } else {
            color = interpolateColor(theme.base, theme.top, verticalFactor);
          }
          
          const ansiColor = `\x1b[38;2;${color.r};${color.g};${color.b}m`;
          line += ansiColor + "─";
          
        } else if (value >= 0) {
          let color;
          if (theme.mid) {
            if (verticalFactor < 0.5) {
              color = interpolateColor(theme.base, theme.mid, verticalFactor * 2);
            } else {
              color = interpolateColor(theme.mid, theme.top, (verticalFactor - 0.5) * 2);
            }
          } else {
            color = interpolateColor(theme.base, theme.top, verticalFactor);
          }

          if (currentMode === "Rainfall" && theme.name === "Default") {
            color = { r: 34, g: 197, b: 94 };
          }

          const ansiColor = `\x1b[38;2;${color.r};${color.g};${color.b}m`;
          line += ansiColor + mapCharacter(value);
        } else {
          line += " ";
        }
      }

      output += line + ANSI_RESET + "\n";
    }

    if (isMaximized) {
      const rawText = `Asciizer v1.0.0  |  Style: ${currentMode}  |  Theme: ${theme.name}  |  [C] Color  |  [M] Style  |  [Q] Exit`;
      const leftPaddingCount = Math.max(0, Math.floor((cols - rawText.length) / 2));
      const centerPadding = " ".repeat(leftPaddingCount);

      output += "\n" + `${centerPadding}\x1b[37m${rawText}${ANSI_RESET}`;
    } else {
      if (output.endsWith("\n")) {
        output = output.slice(0, -1);
      }
    }

    return output;
  }

  return { render, nextTheme, toggleMode };
}
