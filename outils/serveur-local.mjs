// Serveur local de test : sert public/ et simule la fonction /api/demande.
// Usage : node outils/serveur-local.mjs [port]
// Variables : SIMULER_ENVOI=ok | echec | non-configure (par défaut : ok, aucun e-mail réel n'est envoyé)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const PORT = Number(process.argv[2] || 8788);
const MODE = process.env.SIMULER_ENVOI || "ok";
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };
const { onRequestPost } = await import("../functions/api/demande.js");
export const envois = [];

const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith("https://api.resend.com")) {
    envois.push(JSON.parse(opts.body));
    console.log("[simulation] e-mail :", JSON.parse(opts.body).subject);
    if (MODE === "echec") return new Response('{"message":"simulation d\'échec"}', { status: 500 });
    return new Response('{"id":"simulation"}', { status: 200 });
  }
  return fetchOriginal(url, opts);
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/api/demande" && req.method === "POST") {
    const morceaux = [];
    for await (const m of req) morceaux.push(m);
    const requete = new Request(url, { method: "POST", headers: req.headers, body: Buffer.concat(morceaux) });
    const env = MODE === "non-configure" ? {} : { RESEND_API_KEY: "cle-de-test" };
    const r = await onRequestPost({ request: requete, env });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let chemin = join(RACINE, decodeURIComponent(url.pathname));
  try {
    if ((await stat(chemin)).isDirectory()) chemin = join(chemin, "index.html");
    const contenu = await readFile(chemin);
    res.writeHead(200, { "content-type": TYPES[extname(chemin)] || "application/octet-stream" });
    res.end(contenu);
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(await readFile(join(RACINE, "404.html")));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT} (envoi simulé : ${MODE})`));
