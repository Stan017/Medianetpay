import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const apiBase = process.env.API_BASE_URL ?? "http://localhost:8000";
  const upstream = await fetch(`${apiBase}/v1/transactions/${id}/receipt`, {
    headers: { Cookie: `access_token=${token}` },
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error(`[receipt] Backend error ${upstream.status}:`, text);
    return NextResponse.json({ error: "No se pudo generar el recibo", detail: text }, { status: upstream.status });
  }

  const pdfBuffer = await upstream.arrayBuffer();
  const filename = upstream.headers.get("Content-Disposition") ?? `attachment; filename="recibo-${id}.pdf"`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": filename,
    },
  });
}
