import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, menos estáticos/imagens e metadados públicos. Assim a sessão é
     * renovada nas navegações e as rotas do (app) ficam protegidas.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|opengraph-image|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
