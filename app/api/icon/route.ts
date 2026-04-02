/**
 * GET /api/icon?size=192
 *
 * Generates the ApnaMap PWA icon as a PNG at any requested size.
 * Referenced by manifest.json, apple-touch-icon, and shortcut icons.
 * Runs on the Edge runtime — no filesystem access needed.
 *
 * Uses React.createElement instead of JSX so the file stays .ts
 * (ImageResponse accepts ReactElement from either syntax).
 */
import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { createElement as h } from "react";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = Math.max(16, Math.min(1024, Number(searchParams.get("size")) || 192));

  const pad  = Math.round(size * 0.12);   // outer padding
  const tile  = size - pad * 2;           // inner tile size
  const r     = Math.round(size * 0.22);  // corner radius (~22%, iOS style)
  const dot   = Math.round(size * 0.28);  // outer circle
  const inner = Math.round(size * 0.14);  // inner filled circle
  const fs    = Math.round(size * 0.145); // "ApnaMap" label font size

  const icon = h(
    "div",
    {
      style: {
        width:          size,
        height:         size,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "#05070C",
      },
    },
    h(
      "div",
      {
        style: {
          width:          tile,
          height:         tile,
          borderRadius:   r,
          background:     "linear-gradient(145deg,#FF6A30,#FF5E1A)",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          gap:            Math.round(size * 0.025),
        },
      },
      /* Location pin — outer white circle with orange core */
      h(
        "div",
        {
          style: {
            width:          dot,
            height:         dot,
            borderRadius:   "50%",
            background:     "white",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          },
        },
        h("div", {
          style: {
            width:        inner,
            height:       inner,
            borderRadius: "50%",
            background:   "#FF5E1A",
          },
        })
      ),
      /* App name label */
      h("div", {
        style: {
          fontFamily:    "sans-serif",
          fontWeight:    900,
          fontSize:      fs,
          color:         "white",
          letterSpacing: "-0.02em",
          lineHeight:    1,
        },
      }, "ApnaMap")
    )
  );

  return new ImageResponse(icon, { width: size, height: size });
}
