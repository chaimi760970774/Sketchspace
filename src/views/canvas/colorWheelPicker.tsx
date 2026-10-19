import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from "react";

const SIZE   = 180;   // outer diameter of the wheel in px
const RING_W = 22;    // hue ring thickness in px

interface ColorWheelPickerProps {
    color: string;          // "#rrggbb"
    onChange: (hex: string) => void;
}

export function ColorWheelPicker({ color, onChange }: ColorWheelPickerProps) {
    const [h, s, v] = hexToHsv(color);

    const outerR = SIZE / 2;
    const innerR = outerR - RING_W;
    // largest square inscribed in the inner circle
    const sqSize = Math.floor((innerR * 2) / Math.SQRT2);
    const sqOff  = (SIZE - sqSize) / 2;

    // hue handle position on the ring midline
    const hueRad  = ((h - 90) * Math.PI) / 180;
    const handleR = outerR - RING_W / 2;
    const hx = outerR + handleR * Math.cos(hueRad);
    const hy = outerR + handleR * Math.sin(hueRad);

    // sat/val handle position inside the square
    const sx = sqOff + (s / 100) * sqSize;
    const sy = sqOff + (1 - v / 100) * sqSize;

    return (
        <div className="cw-wrap">
            <div style={{ position: "relative", width: SIZE, height: SIZE }}>

                {/* Hue ring — CSS conic-gradient masked to a ring shape */}
                <div
                    className="cw-ring"
                    style={{ "--cw-inner-r": `${innerR}px` } as CSSProperties}
                    onPointerDown={ringPointerDownACB}
                />

                {/* Saturation / brightness square — three nested divs for the gradients */}
                <div style={{
                    position: "absolute",
                    left: sqOff, top: sqOff,
                    width: sqSize, height: sqSize,
                    background: `hsl(${h} 100% 50%)`,
                }}>
                    {/* white → transparent left-to-right (saturation axis) */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #fff, transparent)" }}>
                        {/* transparent → black top-to-bottom (brightness axis) */}
                        <div
                            style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent, #000)" }}
                            onPointerDown={squarePointerDownACB}
                        />
                    </div>
                </div>

                {/* Hue handle */}
                <div className="cw-handle" style={{ left: hx - 7, top: hy - 7, background: `hsl(${h} 100% 50%)` }} />

                {/* Sat/val handle */}
                <div className="cw-handle" style={{ left: sx - 7, top: sy - 7, background: color }} />
            </div>

            {/* Hex value input */}
            <input
                className="cw-hex"
                type="text"
                value={color}
                onChange={hexChangeACB}
                aria-label="Hex color value"
                maxLength={7}
                spellCheck={false}
            />
        </div>
    );

    function ringPointerDownACB(evt: ReactPointerEvent<HTMLDivElement>) {
        const el   = evt.currentTarget;
        const rect = el.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;

        // only respond when the click lands on the ring itself
        const dist = Math.hypot(evt.clientX - cx, evt.clientY - cy);
        if (dist < innerR || dist > outerR) return;

        evt.preventDefault();
        el.setPointerCapture(evt.pointerId);
        updateHue(evt.clientX, evt.clientY);

        function moveACB(e: PointerEvent) { updateHue(e.clientX, e.clientY); }
        el.addEventListener("pointermove", moveACB);
        el.addEventListener("pointerup", () => el.removeEventListener("pointermove", moveACB), { once: true });

        function updateHue(x: number, y: number) {
            const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
            const newH  = ((angle % 360) + 360) % 360;
            onChange(hsvToHex(newH, s, v));
        }
    }

    function squarePointerDownACB(evt: ReactPointerEvent<HTMLDivElement>) {
        const el   = evt.currentTarget;
        const rect = el.getBoundingClientRect();
        evt.preventDefault();
        el.setPointerCapture(evt.pointerId);
        updateSV(evt.clientX, evt.clientY);

        function moveACB(e: PointerEvent) { updateSV(e.clientX, e.clientY); }
        el.addEventListener("pointermove", moveACB);
        el.addEventListener("pointerup", () => el.removeEventListener("pointermove", moveACB), { once: true });

        function updateSV(x: number, y: number) {
            const newS = Math.max(0, Math.min(100, ((x - rect.left) / rect.width)  * 100));
            const newV = Math.max(0, Math.min(100, (1 - (y - rect.top) / rect.height) * 100));
            onChange(hsvToHex(h, newS, newV));
        }
    }

    function hexChangeACB(evt: ChangeEvent<HTMLInputElement>) {
        const val = evt.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) onChange(val.toLowerCase());
    }
}

// --- colour conversion helpers ---

function hexToHsv(hex: string): [number, number, number] {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 0];
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d   = max - min;
    let h = 0;
    if (d > 0) {
        if      (max === r) h = ((g - b) / d + 6) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else                h = (r - g) / d + 4;
        h *= 60;
    }
    return [h, max === 0 ? 0 : (d / max) * 100, max * 100];
}

function hsvToHex(h: number, s: number, v: number): string {
    s /= 100; v /= 100;
    const k = (n: number) => (n + h / 60) % 6;
    const f = (n: number) => v * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return "#" + [f(5), f(3), f(1)]
        .map(x => Math.round(x * 255).toString(16).padStart(2, "0"))
        .join("");
}
