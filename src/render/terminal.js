export function createTerminalRenderer() {

  let lastFrame = "";

  function clear() {
    // \x1b[2J limpia la pantalla, \x1b[3J limpia el scrollback buffer, \x1b[H va a inicio
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
    lastFrame = ""; // Reseteamos el historial al limpiar la pantalla por completo
  }

  function render(frame) {
    if (!frame || frame === lastFrame) return;
    
    process.stdout.write("\x1b[H" + frame);

    lastFrame = frame;
  }

  function hideCursor() {
    process.stdout.write("\x1b[?25l");
  }

  function showCursor() {
    process.stdout.write("\x1b[?25h");
  }

  return {
    clear,
    render,
    hideCursor,
    showCursor
  };
}
