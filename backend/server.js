import express from "express";

const app = express();
app.use(express.json({ limit: "32kb" }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.AI_API_KEY;
const BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const APP_TOKEN = process.env.APP_TOKEN || "";

app.get("/", (_req, res) => res.json({
  name: "Anita AI API",
  status: "ok",
  note: "Set AI_API_KEY in your hosting environment to enable AI responses."
}));

app.post("/chat", async (req, res) => {
  try {
    if (APP_TOKEN && req.get("authorization") !== `Bearer ${APP_TOKEN}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message must be a non-empty string" });
    }

    if (message.length > 8000) {
      return res.status(413).json({ error: "message is too long" });
    }

    if (!API_KEY) {
      return res.status(503).json({
        error: "AI_API_KEY is not configured on the backend"
      });
    }

    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "You are Anita, a helpful personal assistant for an Android user. Be clear and natural. You cannot directly control the phone; the Android app handles supported local actions. Never claim to have performed actions you did not perform. Ask clarifying questions when needed."
          },
          {
            role: "user",
            content: message.trim()
          }
        ],
        temperature: 0.7
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(502).json({
        error: "AI provider request failed",
        providerStatus: upstream.status,
        detail: data?.error?.message || "The provider returned an error"
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({ error: "AI provider returned no text" });
    }

    return res.json({ reply: reply.trim(), model: MODEL });
  } catch (error) {
    console.error("chat_error", error?.message || error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Anita AI backend listening on " + PORT);
});
