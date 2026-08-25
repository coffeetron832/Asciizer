import { spawn } from "child_process";
import { CONFIG } from "../../config.js";

export function createLinuxAudioStream() {
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-loglevel", "error",
      "-f", "pulse",
      "-i", "@DEFAULT_AUDIO_SINK@.monitor", 
      "-ac", "2",
      "-ar", "48000",          // Sincronizado a 48kHz con PipeWire/Pulse
      "-f", "s16le",           // Formato PCM de 16 bits limpio
      "pipe:1"
    ],
    {
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  ffmpeg.stderr.on("data", d => {
    console.error("[ffmpeg error]", d.toString());
  });

  return {
    stream: ffmpeg.stdout,
    process: ffmpeg,
    stop: () => {
      if (!ffmpeg.killed) {
        ffmpeg.kill("SIGKILL"); 
      }
    }
  };
}
