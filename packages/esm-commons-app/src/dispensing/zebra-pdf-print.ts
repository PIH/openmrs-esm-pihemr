/**
 * Minimal Zebra Browser Print client for PDF label printing.
 *
 * Both print pathways route through the Zebra Browser Print helper app
 * running locally at 127.0.0.1:9100 (HTTP) or 127.0.0.1:9101 (HTTPS).
 * The helper must be installed and running on the user's machine.
 *
 * PATHWAY 1 — PDF Direct (recommended for Link-OS printers):
 *   Sends raw PDF bytes to the helper via POST /write.
 *   The helper proxies the bytes to the printer, which rasterizes the PDF
 *   internally using its own firmware renderer. Requires the printer to have
 *   Link-OS with apl.enable = "pdf". No license key needed.
 *
 * PATHWAY 2 — Browser Print conversion (fallback for older printers):
 *   Sends the PDF to the helper via POST /convert.
 *   The helper converts PDF→ZPL and sends the resulting ZPL to the printer.
 *   Works on any Zebra printer. On Windows/macOS with the official Zebra helper,
 *   a PDF conversion license key is required. On Linux with the open-source shim
 *   (pih/zebra-printing-tools), no key is needed.
 */

const HELPER_BASE =
  typeof location !== 'undefined' && location.protocol === 'https:'
    ? 'https://127.0.0.1:9101'
    : 'http://127.0.0.1:9100';

async function helperRequest(method: string, path: string, body?: string | FormData): Promise<string> {
  const opts: RequestInit = { method };
  if (body !== undefined) {
    if (typeof body === 'string') {
      opts.headers = { 'Content-Type': 'text/plain;charset=UTF-8' };
      opts.body = body;
    } else {
      opts.body = body; // FormData — do not set Content-Type; fetch supplies the multipart boundary
    }
  }
  const r = await fetch(HELPER_BASE + path, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`Zebra helper ${method} ${path} → ${r.status}: ${text}`);
  return text;
}

export class ZebraDevice {
  private readonly _json: object;
  private _queue: Promise<unknown> = Promise.resolve();

  constructor(json: object) {
    this._json = json;
  }

  private _enqueue<T>(op: () => Promise<T>): Promise<T> {
    // Serialize all operations on this device so concurrent calls don't
    // interleave their /write+/read pairs and produce garbled responses.
    const next = this._queue.then(
      () => op(),
      () => op(),
    );
    this._queue = next.catch(() => {});
    return next;
  }

  /**
   * PDF Direct: raw PDF bytes → printer firmware renders them.
   * Simpler and faster when the printer supports it (Link-OS, apl.enable = "pdf").
   */
  sendFile(pdfBlob: Blob): Promise<string> {
    return this._enqueue(() => {
      const fd = new FormData();
      fd.append('json', JSON.stringify({ device: this._json }));
      fd.append('blob', pdfBlob);
      return helperRequest('POST', '/write', fd);
    });
  }

  /**
   * Browser Print conversion: helper converts PDF→ZPL, then sends ZPL.
   * Works on any Zebra printer. Pass options.keys.pdf for Windows/macOS.
   */
  convertAndSendFile(pdfBlob: Blob, options?: { keys?: { pdf?: string } }): Promise<string> {
    return this._enqueue(() => {
      const opts: Record<string, unknown> = { action: 'print', ...options };
      if (!opts.fromFormat && pdfBlob.type) {
        const t = pdfBlob.type.toLowerCase();
        if (t.startsWith('image/') || t.startsWith('application/')) {
          opts.fromFormat = t.replace('image/', '').replace('application/', '').replace('x-ms-', '');
        }
      }
      const fd = new FormData();
      fd.append('json', JSON.stringify({ options: opts, device: this._json }));
      fd.append('blob', pdfBlob);
      return helperRequest('POST', '/convert', fd);
    });
  }
}

/**
 * Returns the default device registered with the Browser Print helper,
 * or null if the helper is not running or no device is configured.
 */
export async function getDefaultZebraDevice(): Promise<ZebraDevice | null> {
  try {
    const text = await helperRequest('GET', '/default?type=printer');
    if (!text) return null;
    return new ZebraDevice(JSON.parse(text));
  } catch {
    return null;
  }
}
