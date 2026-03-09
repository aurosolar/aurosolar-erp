import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const GET = withAuth("obras:ver", async (req) => {
  const segments = req.nextUrl.pathname.split("/");
  const id = segments[segments.indexOf("documentos") + 1];
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  try {
    const buffer = await storage.download(doc.rutaArchivo);
    const h = new Headers();
    h.set("Content-Type", doc.mimeType || "application/octet-stream");
    h.set("Content-Disposition", "attachment; filename=\"" + doc.nombre + "\"");
    return new NextResponse(new Uint8Array(buffer), { headers: h });
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
});
