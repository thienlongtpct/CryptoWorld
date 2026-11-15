import { paintGrid, portraitGrid } from './art';

/** The tab icon is Bit, painted from the same 32 × 32 portrait grid the dialogue uses. */
export function setBitFavicon() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  paintGrid(ctx, portraitGrid({ expression: 'happy' }), 0, 0, 2);
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/png';
  icon.href = canvas.toDataURL('image/png');
  if (!icon.parentElement) document.head.appendChild(icon);
}
