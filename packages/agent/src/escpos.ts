// Minimal ESC/POS (EPSON) command builder for 80mm thermal printers.
// No external dependency — emits raw bytes the printer understands.

const ESC = 0x1b;
const GS = 0x1d;

export class EscPos {
  private chunks: Buffer[] = [];

  constructor(private codepage: number = 0) {
    // 0 = PC437 (Latin / basic). Set codepage on init.
  }

  init(): this {
    this.chunks.push(Buffer.from([ESC, 0x40])); // initialize
    this.chunks.push(Buffer.from([ESC, 0x74, this.codepage])); // codepage
    return this;
  }

  align(mode: "left" | "center" | "right"): this {
    const code = mode === "center" ? 1 : mode === "right" ? 2 : 0;
    this.chunks.push(Buffer.from([ESC, 0x61, code]));
    return this;
  }

  bold(on: boolean): this {
    this.chunks.push(Buffer.from([ESC, 0x45, on ? 1 : 0]));
    return this;
  }

  large(on: boolean): this {
    // 0x10 = width double, 0x08 = height double
    this.chunks.push(Buffer.from([ESC, 0x21, on ? 0x18 : 0x00]));
    return this;
  }

  text(s: string): this {
    const clean = (s ?? "")
      .normalize("NFKD")
      .replace(/[^\x20-\x7e\xa0-\xff]/g, "") // keep printable ASCII + latin1
      .replace(/\s+$/g, (m) => m); // keep
    this.chunks.push(Buffer.from(clean, "latin1"));
    return this;
  }

  line(s = ""): this {
    return this.text(s + "\n");
  }

  hr(): this {
    return this.line("------------------------------");
  }

  feed(lines = 1): this {
    this.chunks.push(Buffer.from([ESC, 0x64, lines]));
    return this;
  }

  cut(): this {
    this.chunks.push(Buffer.from([GS, 0x56, 0x00])); // full cut
    return this;
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

// Helper: left/right columns padded to width.
export function columns(
  left: string,
  right: string,
  width = 30
): string {
  const pad = width - left.length - right.length;
  if (pad <= 0) return left + " " + right;
  return left + " ".repeat(pad) + right;
}
