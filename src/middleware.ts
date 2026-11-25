import { NextResponse, type NextRequest } from "next/server";

// Vorläufiger Schutz fürs Backoffice per Benutzer/Passwort aus den Umgebungsvariablen.
// Wird in Stufe 1 später durch richtigen Login ersetzt.
export function middleware(req: NextRequest) {
  const user = process.env.BACKOFFICE_USER;
  const pass = process.env.BACKOFFICE_PASSWORD;
  if (!user || !pass) return new NextResponse("Backoffice nicht konfiguriert", { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [u, ...rest] = atob(encoded).split(":");
    if (u === user && rest.join(":") === pass) return NextResponse.next();
  }
  return new NextResponse("Anmeldung erforderlich", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Backoffice"' } });
}

export const config = { matcher: ["/backoffice/:path*"] };
