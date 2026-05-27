export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      answer: "Covenant AI backend is live."
    });
  }

  if (req.method !== "POST") {
    return res.status(200).json({
      answer: "Covenant AI backend is live, but the request method was not supported."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const question = body.question || body.message || "";

    if (!question) {
      return res.status(200).json({
        answer: "Covenant AI received the request, but no question was sent."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        answer: "Covenant AI reached Vercel, but the OPENAI_API_KEY is missing in Vercel."
      });
    }

    const systemPrompt = `
You are Covenant AI, the website assistant for Covenant Bio Labs.

Covenant Bio Labs is a premium research-use-only supplier.

Always keep answers professional, clear, and compliant.

Important rules:
- Products are research use only.
- Not for human consumption.
- Not FDA approved.
- Do not give dosing advice.
- Do not give injection instructions.
- Do not give medical advice.
- Do not recommend what a person should take.
- You may answer questions about catalog, COAs, ordering, payment, shipping, returns, research policy, and website support.

Shipping:
Domestic United States shipping only. No international shipping at this time. Orders are generally processed within 1–3 business days after payment confirmation, verification, and order review. Delivery time may vary by carrier and location.

Contact:
orders@covenantbiolabs.com
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.4
      })
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return res.status(200).json({
        answer: "Covenant AI reached OpenAI, but OpenAI returned this error: " + (data?.error?.message || openAiResponse.status)
      });
    }

    return res.status(200).json({
      answer: data?.choices?.[0]?.message?.content || "Covenant AI connected, but no answer was generated."
    });
  } catch (error) {
    return res.status(200).json({
      answer: "Covenant AI backend error: " + error.message
    });
  }
}
