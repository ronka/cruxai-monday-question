import type { Artboard } from "@/types/canvas";

/** Supplied renderer: draws one artboard's layers as SVG at 1:1 scale. */
export function ArtboardSvg({ artboard }: { artboard: Artboard }) {
  return (
    <svg width={artboard.width} height={artboard.height} viewBox={`0 0 ${artboard.width} ${artboard.height}`} style={{ display: "block", background: artboard.background }} aria-hidden>
      {artboard.layers.map((layer, index) => {
        if (layer.kind === "rect")
          return <rect key={index} x={layer.x} y={layer.y} width={layer.width} height={layer.height} rx={layer.radius} fill={layer.fill} stroke={layer.stroke} />;
        if (layer.kind === "ellipse")
          return <ellipse key={index} cx={layer.x + layer.width / 2} cy={layer.y + layer.height / 2} rx={layer.width / 2} ry={layer.height / 2} fill={layer.fill} />;
        return (
          <text key={index} x={layer.x} y={layer.y} fontSize={layer.size} fontWeight={layer.weight} fill={layer.fill} fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">
            {layer.text}
          </text>
        );
      })}
    </svg>
  );
}
