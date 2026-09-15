import type { Transform, Clip } from "../types";

export type Point = { x: number; y: number };

export type ClipBounds = {
  cx: number;
  cy: number;
  drawW: number;
  drawH: number;
  rotation: number;
  corners: {
    tl: Point;
    tr: Point;
    br: Point;
    bl: Point;
  };
  rotHandle: Point;
};

const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

function getClipDimensions(
  clip: Clip,
  srcW: number,
  srcH: number,
  projW: number,
  projH: number
): { drawW: number; drawH: number } {
  const t = { ...DEFAULT_TRANSFORM, ...clip.transform };

  if (clip.mediaType === "text" || clip.text) {
    const fontSize = clip.text?.fontSize || 64;
    const len = (clip.text?.content || "Text").length;
    const approxW = Math.max(120, len * fontSize * 0.55 + 32);
    const approxH = fontSize * 1.3;
    return {
      drawW: approxW * (t.scaleX ?? 1),
      drawH: approxH * (t.scaleY ?? 1),
    };
  }

  const fitScale = Math.min(projW / (srcW || 1920), projH / (srcH || 1080));
  return {
    drawW: (srcW || 1920) * fitScale * (t.scaleX ?? 1),
    drawH: (srcH || 1080) * fitScale * (t.scaleY ?? 1),
  };
}

export function computeClipBounds(
  clip: Clip,
  srcW: number,
  srcH: number,
  projW: number,
  projH: number
): ClipBounds {
  const t = { ...DEFAULT_TRANSFORM, ...clip.transform };
  const { drawW, drawH } = getClipDimensions(clip, srcW, srcH, projW, projH);

  const cx = projW / 2 + (t.x ?? 0);
  const cy = projH / 2 + (t.y ?? 0);
  const rad = ((t.rotation ?? 0) * Math.PI) / 180;

  const rotatePoint = (lx: number, ly: number): Point => ({
    x: lx * Math.cos(rad) - ly * Math.sin(rad) + cx,
    y: lx * Math.sin(rad) + ly * Math.cos(rad) + cy,
  });

  const hw = drawW / 2;
  const hh = drawH / 2;

  const tl = rotatePoint(-hw, -hh);
  const tr = rotatePoint(hw, -hh);
  const br = rotatePoint(hw, hh);
  const bl = rotatePoint(-hw, hh);

  // Rotation handle 30px above top center
  const rotHandle = rotatePoint(0, -hh - 30);

  return {
    cx,
    cy,
    drawW,
    drawH,
    rotation: t.rotation ?? 0,
    corners: { tl, tr, br, bl },
    rotHandle,
  };
}

/** Check if point (px, py) in project space is inside the rotated rectangle */
export function isPointInsideClip(
  px: number,
  py: number,
  clip: Clip,
  srcW: number,
  srcH: number,
  projW: number,
  projH: number
): boolean {
  const t = { ...DEFAULT_TRANSFORM, ...clip.transform };
  const { drawW, drawH } = getClipDimensions(clip, srcW, srcH, projW, projH);

  const cx = projW / 2 + (t.x ?? 0);
  const cy = projH / 2 + (t.y ?? 0);

  // Translate point to clip center
  const dx = px - cx;
  const dy = py - cy;

  // Unrotate point by -rotation
  const rad = (-(t.rotation ?? 0) * Math.PI) / 180;
  const unrotX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const unrotY = dx * Math.sin(rad) + dy * Math.cos(rad);

  return (
    unrotX >= -drawW / 2 &&
    unrotX <= drawW / 2 &&
    unrotY >= -drawH / 2 &&
    unrotY <= drawH / 2
  );
}
