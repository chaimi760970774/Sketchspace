import "/style.css"
import type { CSSProperties, MouseEvent } from "react";

interface BannerCollageViewProps {
    creating: boolean;          // a new canvas is being created, the button waits
    onStart: () => void;
}

/* ============================================================
   LAYOUT CONFIG
   Design size is 1440x640; every position is converted to % so it scales.
   To swap a placeholder: set `src` to a PNG, e.g. "/hero/apple.png" (file in public/hero/).
   The connecting lines are computed from these same positions, so moving a piece moves its lines.
   ============================================================ */
const W = 1440;
const H = 640;

interface Piece {
    id: string;
    src: string | null;         // null: a coloured placeholder with `label` is drawn instead
    label: string;
    color: string;              // placeholder colour
    x: number; y: number; w: number; h: number;     // px in the 1440x640 frame
    rot: number;                // degrees, -10..10
}

const PIECES: Piece[] = [
    { id: "bench", src: 'public/banner/bench.png', label: "BENCH", color: "#cfe0cf", x: 60, y: 60, w: 250, h: 98, rot: -5 },
    { id: "piano", src: 'public/banner/piano.png', label: "PIANO", color: "#cdd9ea", x: 1090, y: 40, w: 150, h: 110, rot: 6 },
    { id: "egg", src: 'public/banner/egg.png', label: "EGG", color: "#f1e3c4", x: 90, y: 395, w: 140, h: 170, rot: 8 },
    { id: "apple", src: 'public/banner/apple.png', label: "APPLE", color: "#efc9c3", x: 1230, y: 215, w: 170, h: 165, rot: -8 },
    { id: "arm", src: 'public/banner/arm.png', label: "ARM", color: "#f2dcc9", x: 1020, y: 450, w: 380, h: 170, rot: -4 },
];

// where the lines meet the title group: just outside the text, left and right
const TITLE_LEFT_TOP = { x: 395, y: 285 };
const TITLE_LEFT_LOW = { x: 395, y: 385 };
const TITLE_RIGHT_TOP = { x: 1045, y: 270 };
const TITLE_RIGHT_LOW = { x: 1045, y: 390 };

type End = string | { x: number; y: number };       // a piece id or a fixed point
const LINES: { from: End; to: End; bend: number }[] = [
    { from: "bench", to: "piano", bend: -70 },
    { from: "bench", to: TITLE_LEFT_TOP, bend: 40 },
    // { from: "egg", to: TITLE_LEFT_LOW, bend: -30 },
    { from: "piano", to: TITLE_RIGHT_TOP, bend: 40 },
    { from: "arm", to: TITLE_RIGHT_LOW, bend: -30 },
    { from: "apple", to: "arm", bend: 40 },
];

function pct(value: number, total: number){ return `${(value / total * 100).toFixed(3)}%`; }

function pieceStyle(p: Piece): CSSProperties {
    return {
        "--l": pct(p.x, W), "--t": pct(p.y, H), "--w": pct(p.w, W), "--h": pct(p.h, H), "--rot": `${p.rot}deg`,
    } as CSSProperties;
}

function endPoint(end: End){
    if (typeof end !== "string") return end;
    const p = PIECES.find(function isPieceCB(piece){ return piece.id === end; })!;
    return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

// a gentle curve: the control point sits `bend` px off the middle of the straight line
function linePath(from: End, to: End, bend: number){
    const a = endPoint(from), b = endPoint(to);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const cx = mx - (b.y - a.y) / len * bend, cy = my + (b.x - a.x) / len * bend;
    return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
}


export function BannerCollageView(props: BannerCollageViewProps){
    return (
        <div className="hc-root">
            <div className="hc-frame">
                <svg className="hc-lines" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                    {LINES.map(renderLineCB)}
                </svg>

                {PIECES.map(renderPieceCB)}

                <div className="hc-center">
                    <h1 className="hc-title">
                        <span className="hc-line hc-line-1">Let's make</span>
                        <span className="hc-line hc-line-2">COLLAGE</span>
                        <span className="hc-line hc-line-3">together!</span>
                    </h1>
                    {/* styled as a link; it starts a new canvas instead of navigating */}
                    <a className="hc-cta" href="#" aria-disabled={props.creating} onClick={ctaClickACB}>
                        {props.creating ? "creating..." : "bring a piece"}
                    </a>
                </div>
            </div>
        </div>
    );

    function renderLineCB(line: typeof LINES[number], i: number){
        return <path key={i} className="hc-dash" d={linePath(line.from, line.to, line.bend)}/>;
    }

    function renderPieceCB(p: Piece){
        return (
            <div key={p.id} className={"hc-piece hc-" + p.id} style={pieceStyle(p)}>
                {p.src
                    ? <img className="hc-img" src={p.src} alt="" aria-hidden="true" draggable={false}/>
                    : <div className="hc-ph" style={{ background: p.color }}>{p.label}</div>}
            </div>
        );
    }

    function ctaClickACB(evt: MouseEvent<HTMLAnchorElement>){
        evt.preventDefault();
        if (!props.creating) props.onStart();
    }
}
