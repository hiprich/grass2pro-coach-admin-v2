// Custom colour picker popover used by Logo Studio.
//
// Two-stage HSV picker: a vertical hue rail + a saturation/value square +
// a hex readout. Drag the hue rail to pick a base colour, drag the square
// to pick saturation (x) and value (y). Designed to be opened from a
// trigger chip and dismissed with Esc / outside click / "Done" button.
//
// Pure UI — no global state, no clipboard work. Parents pass the current
// hex in and get every change back via onChange. We deliberately don't
// debounce because the change feeds an inline SVG re-render which is
// already cheap.
//
// Why hand-roll instead of a library? `react-colorful` is the obvious
// pick but adds ~14KB gz and we only need the basics. This fits in one
// file, no deps, and matches the lime-on-black studio palette exactly.

import { useEffect, useMemo, useRef, useState } from "react";

export type ColourPopoverProps = {
  // Current hex value (e.g. "#1d4ed8"). Drives the picker's initial
  // position. Invalid hex is tolerated — we fall back to mid-spectrum.
  value: string;
  onChange: (hex: string) => void;
  // Called when the user dismisses the popover (Done button, Esc, or
  // outside click). Parents typically use this to close the popover.
  onClose: () => void;
  // Optional title shown at the top of the popover so coaches know which
  // control they're tweaking (e.g. "Custom accent", "Wordmark colour").
  title?: string;
};

// HSV \u2194 RGB conversions. Standard formulas, lifted into local helpers so
// the picker stays self-contained.
function hsvToRgb(
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } {
  const c = v * s;
  const hp = (h / 60) % 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1: number;
  let g1: number;
  let b1: number;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = v - c;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
  };
}

export default function ColourPopover({
  value,
  onChange,
  onClose,
  title = "Custom colour",
}: ColourPopoverProps) {
  // The single source of truth is `hsv`. We seed it ONCE on mount from
  // the incoming hex via a lazy useState initializer. The parent already
  // mounts/unmounts the popover via `{open && <ColourPopover/>}` so a
  // fresh open re-runs this seed naturally — no useEffect sync needed.
  // Hex changes flow upward synchronously inside event handlers via
  // applyHsv() below, which avoids setState-in-render entirely.
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(value);
    if (!rgb) return { h: 0, s: 1, v: 1 };
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const canonicalHex = useMemo(() => {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }, [hsv.h, hsv.s, hsv.v]);

  // Single helper: update local HSV state AND notify the parent in the
  // same event-handler tick. Synchronous emission means we never run
  // afoul of React 19's set-state-in-effect rule and parents stay in
  // sync without us watching them via refs.
  function applyHsv(next: { h: number; s: number; v: number }) {
    setHsv(next);
    const rgb = hsvToRgb(next.h, next.s, next.v);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
  }

  // The hex shown in the input: the user's in-progress draft if they're
  // editing, otherwise our canonical hex.
  const hexInput = hexDraft ?? canonicalHex;

  // Outside click + Esc dismisses the popover.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Use a microtask so the click that opened the popover doesn't
    // immediately close it.
    const t = setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Pointer drag handlers for the saturation/value square + hue rail.
  // Both are 1-axis or 2-axis drags clamped to [0,1] in their respective
  // dimensions, then mapped into HSV.
  function handleSquarePointer(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    function update(clientX: number, clientY: number) {
      const rect = target.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      applyHsv({ h: hsv.h, s: x, v: 1 - y });
    }
    update(e.clientX, e.clientY);
    function move(ev: PointerEvent) {
      update(ev.clientX, ev.clientY);
    }
    function end() {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    }
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  function handleHuePointer(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    function update(clientY: number) {
      const rect = target.getBoundingClientRect();
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      applyHsv({ h: y * 360, s: hsv.s, v: hsv.v });
    }
    update(e.clientY);
    function move(ev: PointerEvent) {
      update(ev.clientY);
    }
    function end() {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    }
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  // Hex text input — commits on blur or Enter, ignores invalid input.
  // Resets the draft so the input falls back to canonicalHex either way.
  function commitHexInput() {
    const draft = hexDraft;
    setHexDraft(null);
    if (draft == null) return;
    const rgb = hexToRgb(draft.trim());
    if (!rgb) return; // invalid — falling back to canonical hex
    applyHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
  }

  // Pure-hue colour for the saturation/value square's red corner. The
  // square is built as: red corner at (1,1) in S/V space, fading to
  // black down y and to white left along x.
  const pureHue = useMemo(() => {
    const rgb = hsvToRgb(hsv.h, 1, 1);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }, [hsv.h]);

  return (
    <div
      ref={rootRef}
      className="logo-studio-colour-popover"
      role="dialog"
      aria-label={title}
      data-testid="colour-popover"
    >
      <div className="logo-studio-colour-popover-header">
        <span>{title}</span>
        <button
          type="button"
          className="logo-studio-colour-popover-close"
          onClick={onClose}
          aria-label="Close colour picker"
        >
          ×
        </button>
      </div>
      <div className="logo-studio-colour-popover-body">
        <div
          className="logo-studio-colour-square"
          style={{ background: pureHue }}
          onPointerDown={handleSquarePointer}
          role="slider"
          aria-label="Saturation and brightness"
          aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
          tabIndex={0}
        >
          <div className="logo-studio-colour-square-overlay-x" />
          <div className="logo-studio-colour-square-overlay-y" />
          <div
            className="logo-studio-colour-square-handle"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
            }}
          />
        </div>
        <div
          className="logo-studio-colour-hue"
          onPointerDown={handleHuePointer}
          role="slider"
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          tabIndex={0}
        >
          <div
            className="logo-studio-colour-hue-handle"
            style={{ top: `${(hsv.h / 360) * 100}%` }}
          />
        </div>
      </div>
      <div className="logo-studio-colour-popover-footer">
        <label className="logo-studio-colour-hex">
          <span>Hex</span>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={commitHexInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitHexInput();
              }
            }}
            spellCheck={false}
            maxLength={7}
            data-testid="colour-popover-hex"
          />
        </label>
        <button
          type="button"
          className="logo-studio-btn logo-studio-btn-primary logo-studio-colour-done"
          onClick={onClose}
          data-testid="colour-popover-done"
        >
          Done
        </button>
      </div>
    </div>
  );
}
