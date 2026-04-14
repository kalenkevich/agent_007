import * as readline from "node:readline";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class TerminalLoader {
  private loadingInterval: NodeJS.Timeout | null = null;
  private frameIndex = 0;

  startLoading() {
    if (this.loadingInterval) return;
    this.frameIndex = 0;
    this.loadingInterval = setInterval(() => {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(SPINNER_FRAMES[this.frameIndex]);
      this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
    }, 80);
  }

  stopLoading() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
    }
  }
}
