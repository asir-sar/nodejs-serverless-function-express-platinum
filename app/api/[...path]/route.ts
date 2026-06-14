// app/api/[...path]/route.ts

import { requests } from "@/lib/store";

async function capture(req: Request, path: string[]) {
  const body = await req.text().catch(() => "");

  requests.unshift({
    time: new Date().toISOString(),
    method: req.method,
    path: "/" + path.join("/"),
    headers: Object.fromEntries(req.headers.entries()),
    body,
  });

  requests.splice(100); // keep last 100

  return Response.json({ ok: true });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return capture(req, path);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return capture(req, path);
}

export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;