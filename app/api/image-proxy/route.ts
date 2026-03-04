import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only allow proxying images from opendoor's CDN
  if (!url.startsWith("https://images.opendoor.com/")) {
    return NextResponse.json({ error: "Disallowed domain" }, { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Referer: "https://www.opendoor.com/",
      },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
