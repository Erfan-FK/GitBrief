import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getOgData } from "@/lib/supabase/anon";

export const runtime = "nodejs";

/** OG score card — 1200×630, exact §8 layout (01 §22). */

const RING_R = 84;
const RING_C = 2 * Math.PI * RING_R;

function bandColor(score: number | null): string {
  if (score === null) return "#6E6785";
  if (score >= 80) return "#1FA97C";
  if (score >= 50) return "#D97706";
  return "#DC2626";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  const data = await getOgData(owner, repo);

  const [spaceGrotesk, jetbrainsMono] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/SpaceGrotesk-Bold.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/JetBrainsMono-Regular.ttf")),
  ]);

  const score = data?.score ?? null;
  const color = bandColor(score);
  const items =
    data?.items && data.items.length > 0
      ? data.items
      : [
          { pass: true, label: "paste the repo URL on gitbrief.dev" },
          { pass: true, label: "deterministic detection, exact versions" },
          { pass: true, label: "every command verified or removed" },
          { pass: false, label: "not analyzed yet — be the first" },
        ];
  const dashOffset =
    score !== null ? RING_C * (1 - Math.min(score, 100) / 100) : RING_C;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FAF9F7",
          padding: 64,
          fontFamily: "JetBrains Mono",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {data?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                width={72}
                height={72}
                style={{ borderRadius: 36 }}
                alt=""
              />
            ) : null}
            <span style={{ fontSize: 44, color: "#1A1523" }}>
              {owner}/{repo}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              width: 220,
              height: 220,
            }}
          >
            <svg width="220" height="220" viewBox="0 0 220 220">
              <circle
                cx="110" cy="110" r={RING_R}
                fill="none" stroke="#E7E4EF" strokeWidth="14"
              />
              <circle
                cx="110" cy="110" r={RING_R}
                fill="none" stroke={color} strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${RING_C}`}
                strokeDashoffset={`${dashOffset}`}
                transform="rotate(-90 110 110)"
              />
            </svg>
            <span
              style={{
                position: "absolute",
                fontSize: 72,
                fontFamily: "Space Grotesk",
                color,
              }}
            >
              {score ?? "?"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((item) => (
            <span
              key={item.label}
              style={{
                fontSize: 26,
                color: item.pass ? "#1A1523" : "#6E6785",
                display: "flex",
                gap: 14,
              }}
            >
              <span style={{ color: item.pass ? "#1FA97C" : "#DC2626" }}>
                {item.pass ? "✓" : "✗"}
              </span>
              {item.label}
            </span>
          ))}
        </div>

        <span
          style={{
            position: "absolute",
            bottom: 48,
            right: 64,
            fontSize: 34,
            fontFamily: "Space Grotesk",
            color: "#1A1523",
            opacity: 0.4,
          }}
        >
          gitbrief
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Space Grotesk", data: spaceGrotesk, weight: 700 },
        { name: "JetBrains Mono", data: jetbrainsMono, weight: 400 },
      ],
    },
  );
}
