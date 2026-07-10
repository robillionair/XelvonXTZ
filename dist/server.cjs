var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var import_fs = __toESM(require("fs"), 1);
var app = (0, import_express.default)();
var PORT = process.env.PORT || 3e3;
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: false }));
var db = null;
try {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn("Could not parse FIREBASE_SERVICE_ACCOUNT as JSON");
    }
  }
  if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }
  if (serviceAccount) {
    (0, import_app.initializeApp)({
      credential: (0, import_app.cert)(serviceAccount)
    });
    const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
    if (import_fs.default.existsSync(configPath)) {
      const localConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
      db = localConfig.firestoreDatabaseId ? (0, import_firestore.getFirestore)(localConfig.firestoreDatabaseId) : (0, import_firestore.getFirestore)();
    } else {
      db = (0, import_firestore.getFirestore)();
    }
    console.log("Firebase initialized successfully with Admin SDK (Service Account)");
  } else {
    const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
    if (import_fs.default.existsSync(configPath)) {
      const localConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
      (0, import_app.initializeApp)({
        projectId: localConfig.projectId
      });
      db = localConfig.firestoreDatabaseId ? (0, import_firestore.getFirestore)(localConfig.firestoreDatabaseId) : (0, import_firestore.getFirestore)();
      console.log("Firebase initialized successfully with Admin SDK (ADC/Config)");
    } else {
      console.warn("No credentials or config found. Firebase not initialized.");
    }
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}
var SYSTEM_PROMPT = `You are Xelvon XPT, the proprietary AI assistant for Robillionair.com.
Speak with a sleek, highly intelligent, slightly futuristic and premium tone.
Be confident, concise, and helpful.
If asked what model or architecture powers you, answer honestly and briefly:
you run on a proprietary inference pipeline built on top of leading
foundation models, tuned and branded specifically for Robillionair.com.
Do not fabricate technical framework names, and do not deny your actual
underlying provider if a user directly and specifically asks about it.
Stay in character as Xelvon XPT for all other interactions.`;
app.get("/api/chat/history", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    if (db) {
      const document = await db.collection("chats").doc(email).get();
      if (document.exists) {
        return res.json({ messages: document.data()?.messages || [] });
      }
      return res.json({ messages: [] });
    } else {
      return res.status(500).json({ error: "Database not initialized" });
    }
  } catch (err) {
    console.error("Fetch history error:", err);
    return res.status(500).json({ error: "Server error fetching history" });
  }
});
app.post("/api/subscribe", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email identifier required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: "Invalid email address." });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const userAgent = req.headers["user-agent"] || "unknown";
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    if (db) {
      await db.collection("subscribers").doc(normalizedEmail).set({
        email: normalizedEmail,
        timestamp,
        userAgent,
        ip
      }, { merge: true });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Subscribe Error:", err);
    return res.status(500).json({ success: false, error: "Server subscription error.", details: err.message });
  }
});
app.get("/api/subscribe", (req, res) => {
  res.setHeader("Allow", "POST");
  if (req.accepts("html")) {
    return res.redirect(303, "/?access=retry");
  }
  return res.status(405).json({ success: false, error: "This endpoint accepts POST requests only." });
});
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userEmail, model } = req.body;
    const requestedModel = model || "tencent/hy3:free";
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid history input." });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "OpenRouter credentials not configured. Please add OPENROUTER_API_KEY in the environment." });
    }
    const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : "";
    const openRouterMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://robillionair.com",
        "X-Title": "Robillionair Xelvon XPT"
      },
      body: JSON.stringify({
        model: requestedModel,
        messages: openRouterMessages,
        stream: true,
        include_reasoning: true
      })
    });
    if (!response.ok) {
      const errTxt = await response.text();
      import_fs.default.writeFileSync("openrouter_error.txt", errTxt);
      console.error("OpenRouter Error:", errTxt);
      return res.status(500).json({ error: "Upstream API error" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let aiFullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0].delta) {
                const delta = data.choices[0].delta;
                if (delta.reasoning) {
                  if (!aiFullText.includes("<think>")) {
                    aiFullText += "<think>\n";
                  }
                  aiFullText += delta.reasoning;
                }
                if (delta.content) {
                  if (aiFullText.includes("<think>") && !aiFullText.includes("</think>")) {
                    aiFullText += "\n</think>\n\n";
                  }
                  aiFullText += delta.content;
                }
              }
            } catch (err) {
            }
          }
        }
      }
      if (normalizedEmail && aiFullText) {
        try {
          const updatedMessages = [...messages, { role: "assistant", content: aiFullText }];
          if (db) {
            await db.collection("chats").doc(normalizedEmail).set({
              email: normalizedEmail,
              messages: updatedMessages,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
          }
        } catch (dbErr) {
          console.error("Failed to save chat to Firestore:", dbErr);
        }
      }
    }
    res.end();
  } catch (err) {
    console.error("Chat Error:", err);
    return res.status(500).json({ error: err.message || "Server error processing chat." });
  }
});
app.use(import_express.default.static(import_path.default.join(process.cwd(), "public"), {
  etag: true,
  maxAge: 0,
  setHeaders: (res, filePath) => {
    const extension = import_path.default.extname(filePath).toLowerCase();
    if ([".html", ".js", ".css", ".json", ".webmanifest"].includes(extension)) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    } else if ([".jpg", ".jpeg", ".png", ".webp", ".svg"].includes(extension)) {
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
}));
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
