const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function adminApp() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(raw)),
      projectId: process.env.FIREBASE_PROJECT_ID || "ebou-bca0e"
    });
  }
  return getApps()[0];
}
const str = (v, n = 2000) => typeof v === "string" ? v.slice(0, n) : "";
function imageUrl(v) {
  try { const u = new URL(v); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; }
  catch { return ""; }
}
exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: { ...headers, Allow: "GET" }, body: JSON.stringify({ error: "Méthode non autorisée." }) };
  const id = String(event.queryStringParameters?.id || "").trim();
  if (!id || id.length > 150 || /[/\s?#]/.test(id)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Identifiant d’objet invalide." }) };
  try {
    const snap = await getFirestore(adminApp()).collection("objects").doc(id).get();
    if (!snap.exists) return { statusCode: 404, headers, body: JSON.stringify({ error: "Objet introuvable ou non partagé publiquement." }) };
    const d = snap.data() || {};
    const item = {
      id: snap.id, title: str(d.title, 180) || "Objet partagé sur EBOU",
      description: str(d.description, 3000), location: str(d.location, 180),
      date: str(d.date, 80), category: str(d.category, 100),
      isLost: d.isLost === true, imageUrl: imageUrl(d.imageUrl),
      status: str(d.status, 40), isResolved: d.isResolved === true
    };
    if (item.isResolved || item.status === "resolved") return { statusCode: 410, headers, body: JSON.stringify({ error: "Cet objet a déjà été marqué comme résolu." }) };
    return { statusCode: 200, headers: { ...headers, "Cache-Control": "public, max-age=60, s-maxage=60" }, body: JSON.stringify({ object: item }) };
  } catch (e) {
    console.error("EBOU object endpoint:", e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Impossible de charger cet objet pour le moment." }) };
  }
};
