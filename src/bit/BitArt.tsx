import { useEffect, useRef, useState } from 'react';
import { paintGrid, portraitGrid, spriteGrid, type Expression } from './art';

const cache = new Map<string, HTMLCanvasElement>();

/** The 16 × 16 sprite as a canvas, cached per frame, for the world renderer. */
export function bitSpriteCanvas(frame: 0 | 1, blink: boolean): HTMLCanvasElement {
  const key = `${frame}${blink ? 'b' : ''}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) paintGrid(ctx, spriteGrid(frame, blink));
    cache.set(key, canvas);
  }
  return canvas;
}

/** Blinks every few seconds and flutters on a slow beat, unless motion is reduced. */
function useIdle(still: boolean) {
  const [beat, setBeat] = useState(0);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (still) {
      setBlink(false);
      return;
    }
    const flutter = window.setInterval(() => setBeat(value => (value + 1) % 2), 420);
    let close = 0;
    const blinker = window.setInterval(() => {
      setBlink(true);
      close = window.setTimeout(() => setBlink(false), 140);
    }, 3800);
    return () => {
      window.clearInterval(flutter);
      window.clearInterval(blinker);
      window.clearTimeout(close);
    };
  }, [still]);
  return { beat: (still ? 0 : beat) as 0 | 1, blink };
}

/** The small animated Bit for the guide button and nudges. */
export function BitSprite({ size = 40, still = false }: { size?: number; still?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { beat, blink } = useIdle(still);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 16, 16);
    paintGrid(ctx, spriteGrid(beat, blink));
  }, [beat, blink]);
  return (
    <canvas
      ref={ref}
      className={`bit-sprite${still ? '' : ' bit-float'}`}
      width={16}
      height={16}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    />
  );
}

/**
 * The dialogue portrait. `expression` follows the message; `speaking` opens the mouth on a beat
 * while the text appears. Transparent around Bit, so it can overlap the panel.
 */
export function BitPortrait({ expression, speaking = false, still = false, size = 128 }: {
  expression: Expression;
  speaking?: boolean;
  still?: boolean;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { blink } = useIdle(still);
  const [mouth, setMouth] = useState(false);
  useEffect(() => {
    if (!speaking || still) {
      setMouth(false);
      return;
    }
    const timer = window.setInterval(() => setMouth(open => !open), 110);
    return () => window.clearInterval(timer);
  }, [speaking, still]);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 32, 32);
    paintGrid(ctx, portraitGrid({ expression, speaking: mouth, blink: blink && !speaking }));
  }, [expression, mouth, blink, speaking]);
  return (
    <canvas
      ref={ref}
      className={`bit-portrait${still ? '' : speaking ? ' bit-talk' : ' bit-float'}`}
      data-expression={expression}
      width={32}
      height={32}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    />
  );
}
