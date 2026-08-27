import React, { useEffect, useRef, useState } from "react";

export default function BoundingBoxCanvas({ item, labels, value, onChange }) {
  const boxes = value || [];
  const [label, setLabel] = useState(labels[0] || "");
  const [imgSize, setImgSize] = useState(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const W = 640;
  const H = 360;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      draw(img, boxes);
    };
    img.src = item.url;
  }, [item.url, boxes]);

  function draw(img, boxesToDraw) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    for (const b of boxesToDraw) {
      const [x, y, w, h] = toCanvas(b);
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(52,211,153,0.2)";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#34d399";
      ctx.font = "12px sans-serif";
      ctx.fillText(b.label, x + 4, Math.max(12, y + 12));
    }
  }

  function toCanvas(b) {
    const sx = W / (imgSize?.w || W);
    const sy = H / (imgSize?.h || H);
    return [b.x * sx, b.y * sy, b.w * sx, b.h * sy];
  }

  function toImage(x, y) {
    const fx = (imgSize?.w || W) / W;
    const fy = (imgSize?.h || H) / H;
    return [x * fx, y * fy];
  }

  function point(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function onDown(e) {
    const [x, y] = point(e);
    dragRef.current = { startX: x, startY: y };
  }

  function onUp(e) {
    if (!dragRef.current) return;
    const { startX, startY } = dragRef.current;
    const [ex, ey] = point(e);
    const gx = Math.min(startX, ex);
    const gy = Math.min(startY, ey);
    const gw = Math.abs(ex - startX);
    const gh = Math.abs(ey - startY);
    dragRef.current = null;
    if (!label || gw < 5 || gh < 5) return;
    const [ix, iy] = toImage(gx, gy);
    const [iw, ih] = toImage(gw, gh);
    onChange([...boxes, { label, x: Math.round(ix), y: Math.round(iy), w: Math.round(iw), h: Math.round(ih) }]);
  }

  return (
    <div>
      <div className="flex gap-2 items-center mb-2 flex-wrap">
        <span className="text-sm">Drawing label:</span>
        <select value={label} onChange={(e) => setLabel(e.target.value)} className="p-1 rounded bg-slate-800 border border-slate-700 text-sm">
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-xs text-slate-500">Drag on the image to draw a box.</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="border border-slate-700 rounded cursor-crosshair"
        onMouseDown={onDown}
        onMouseUp={onUp}
      />
      <div className="mt-2 grid gap-1">
        {boxes.map((b, i) => (
          <div key={i} className="text-sm flex gap-2">
            <span className="text-slate-300">{b.label} ({b.x},{b.y},{b.w}×{b.h})</span>
            <button type="button" onClick={() => onChange(boxes.filter((_, idx) => idx !== i))} className="text-red-400 text-xs">delete</button>
          </div>
        ))}
        {!boxes.length && <p className="text-xs text-slate-500">No boxes yet.</p>}
      </div>
    </div>
  );
}
