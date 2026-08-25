import { CONFIG } from "./config.js";
import { createLinuxAudioStream } from "./audio/system/linux.js";
import { createAnalyzer } from "./core/analyzer.js";
import { createAsciiRenderer } from "./render/ascii.js";
import { createTerminalRenderer } from "./render/terminal.js";
import { createPipeline } from "./core/pipeline.js";
import { getTerminalSize } from "./utils/terminalSize.js";

const WELCOME_BANNER = [
  "   ###     ######   ######  #### #### ######## ######## ########  ",
  "  ## ##   ##    ## ##    ##  ##   ##       ##  ##       ##     ## ",
  " ##   ##  ##       ##        ##   ##      ##   ##       ##     ## ",
  "##     ##  ######  ##        ##   ##     ##    ######   ########  ",
  "#########       ## ##        ##   ##    ##     ##       ##   ##   ",
  "##     ## ##    ## ##    ##  ##   ##   ##      ##       ##    ##  ",
  "##     ##  ######   ######  #### #### ######## ######## ##     ## "
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startApp() {
  const terminal = createTerminalRenderer();
  let isIntroActive = true;

  const showSplash = () => {
    terminal.clear();
    const { width, height } = getTerminalSize();
    
    const bannerWidth = WELCOME_BANNER[0].length;
    const bannerHeight = WELCOME_BANNER.length;

    const leftPad = Math.max(0, Math.floor((width - bannerWidth) / 2));
    const topPad = Math.max(0, Math.floor((height - bannerHeight) / 2));

    let splashOutput = "\n".repeat(topPad);
    for (const line of WELCOME_BANNER) {
      splashOutput += " ".repeat(leftPad) + line + "\n";
    }
    
    process.stdout.write(splashOutput);
  };

  terminal.hideCursor();
  showSplash();

  await delay(2500);
  isIntroActive = false;

  const audio = createLinuxAudioStream();
  const analyzer = createAnalyzer();
  const ascii = createAsciiRenderer();

  terminal.clear();

  const cleanup = () => {
    try {
      audio.stop?.();
    } catch (e) {}
    terminal.showCursor();
    process.exit(0);
  };

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (key) => {
    const str = key.toString();

    if (str === "c" || str === "C") {
      ascii.nextTheme();
    }
    
    if (str === "m" || str === "M") {
      ascii.toggleMode();
    }

    if (str === "q" || str === "Q" || str === "\u0003") {
      cleanup();
    }
  });

  process.stdout.on("resize", () => {
    terminal.clear();
    if (isIntroActive) {
      showSplash();
    } else {
      const { width } = getTerminalSize();
      CONFIG.barCount = width || 80;
    }
  });

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", () => terminal.showCursor());

  const pipeline = createPipeline({
    fps: CONFIG.fps,
    onFrame: (bars) => {
      const frame = ascii.render(bars);
      terminal.render(frame);
    }
  });

  audio.stream.on("data", (chunk) => {
    const { width } = getTerminalSize();
    CONFIG.barCount = width || 80;

    const rawBars = analyzer.process(chunk);
    pipeline.update(rawBars);
  });

  audio.stream.on("error", (err) => {
    console.error("Audio stream error:", err);
  });

  audio.process?.on("error", (err) => {
    console.error("FFmpeg process error:", err);
  });

  pipeline.start();
}
