
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function adminApp() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(raw)),
      projectId: process.env.FIREBASE_PROJECT_ID || "ebou-bca0e",
    });
  }

  return getApps()[0];
}

function str(value, maxLength = 2000) {
  return typeof value === "string"
    ? value.slice(0, maxLength)
    : "";
}

function imageUrl(value) {
  if (typeof value !== "string") return "";

  const image = value.trim();

  if (!image) return "";

  // Images hébergées sur un serveur HTTPS ou HTTP.
  try {
    const url = new URL(image);

    if (["http:", "https:"].includes(url.protocol)) {
      return url.href;
    }
  } catch {
    // La valeur peut être une image Base64.
  }

  // Images encodées en Base64.
  const base64Pattern =
    /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i;

  // Limite de sécurité : environ 900 Ko de texte Base64.
  if (image.length <= 900000 && base64Pattern.test(image)) {
    return image;
  }

  return "";
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: "GET" },
      body: JSON.stringify({
        error: "Méthode non autorisée.",
      }),
    };
  }

  const id = String(
    event.queryStringParameters?.id || ""
  ).trim();

  if (!id || id.length > 150 || /[/\s?#]/.test(id)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Identifiant d’objet invalide.",
      }),
    };
  }

  try {
    const db = getFirestore(adminApp());
    const snapshot = await db.collection("objects").doc(id).get();

    if (!snapshot.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: "Objet introuvable ou non partagé publiquement.",
        }),
      };
    }

    const data = snapshot.data() || {};

    const item = {
      id: snapshot.id,
      title: str(data.title, 180) || "Objet partagé sur EBOU",
      description: str(data.description, 3000),
      location: str(data.location, 180),
      date: str(data.date, 80),
      category: str(data.category, 100),
      isLost: data.isLost === true,

      // Le champ imageUrl doit contenir une URL ou une image Base64.
      imageUrl: imageUrl(data.imageUrl),

      status: str(data.status, 40),
      isResolved: data.isResolved === true,
    };

    if (
      item.isResolved ||
      item.status.toLowerCase() === "resolved"
    ) {
      return {
        statusCode: 410,
        headers,
        body: JSON.stringify({
          error: "Cet objet a déjà été marqué comme résolu.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
      body: JSON.stringify({ object: item }),
    };
  } catch (error) {
    console.error("EBOU object endpoint:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Impossible de charger cet objet pour le moment.",
      }),
    };
  }
};
