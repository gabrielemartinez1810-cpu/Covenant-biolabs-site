export default async function handler(req, res) {
  const allowedOrigins = [
    "https://www.covenantbiolabs.com",
    "https://covenantbiolabs.com",
    "https://covenant-biolabs-site-8fjv.vercel.app"
  ];

  const origin = req.headers.origin || "";

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://www.covenantbiolabs.com");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
  const allowedOrigins = [
    "https://www.covenantbiolabs.com",
    "https://covenantbiolabs.com",
    "https://covenant-biolabs-site-8fjv.vercel.app"
  ];

  const origin = req.headers.origin || "";

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://www.covenantbiolabs.com");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(200).json({
      answer: "Covenant AI backend is live. Send a question from the website chat box."
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (error) {
        body = {};
      }
    }

    const question = body?.question || "";

    if (!question || typeof question !== "string") {
      return res.status(200).json({
        answer: "Covenant AI received the request, but no question was sent."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        answer:
          "Covenant AI reached Vercel, but OPENAI_API_KEY is missing or empty. Add the key in Vercel Environment Variables, save it, then redeploy."
      });
    }

    const websiteContext = `
COVENANT BIO LABS WEBSITE CONTEXT

Brand:
Covenant Bio Labs is a premium research-use-only peptide and research compound supplier.

Brand tone:
Premium, clean, professional, blue/silver, science-focused, trustworthy, direct, and polished.

Brand language:
- Built on Purpose. Driven by Precision.
- Science You Can Trust.
- Integrity in every compound, purpose in every decision.
- Small-batch sourcing.
- Third-party COA verification when available.
- Research-use transparency.
- Responsible research standards.

Compliance language:
- Research Use Only.
- Not for human consumption.
- Not for veterinary use.
- Not FDA approved.
- Not intended to diagnose, treat, cure, prevent, or mitigate any disease.
- Covenant Bio Labs does not provide medical advice, dosing advice, injection instructions, clinical guidance, treatment guidance, or human-use recommendations.

Contact:
orders@covenantbiolabs.com

Shipping:
- Domestic United States shipping only.
- No international shipping at this time.
- Typical processing time is 1–3 business days after payment confirmation, customer verification, and order review.
- Tracking may be provided when available.
- Lost or damaged shipments are reviewed case by case.
- Damaged, defective, or incorrect shipments should be reported within 72 hours with clear photos and order details.

Returns and refunds:
- Returns are not accepted once an order has shipped.
- Refunds are reviewed case by case and are not guaranteed.
- Damaged, defective, or incorrect shipments may qualify for review if reported within 72 hours.

Age and buyer rules:
- Customers must be 21 years of age or older.
- Customers must confirm research-use-only understanding.
- Orders are reviewed before fulfillment.
- Covenant Bio Labs may refuse, hold, cancel, or refund orders for compliance, safety, legal, or verification concerns.

Payment:
- Cash App and Venmo may be available.
- Customers should include first and last name in the payment note so payment can be matched to the order request.
- Payment does not guarantee order approval or shipment.

COA Verification:
- COAs may be available for selected products and batches.
- COA availability may vary by product and batch.
- A COA should match the product name, batch or lot details if available, assay amount, purity percentage, testing lab, and report date.
- Customers can email orders@covenantbiolabs.com for documentation questions or matching COA questions.

Current catalog:
- Retatrutide 20mg — $120 — COA available
- NAD+ 500mg — $60 — COA available
- MT-2 10mg — $50 — COA upload pending
- GLOW 70mg — $100 — COA upload pending
- KLOW — $120 — COA available
- Cagrilintide 5mg — $70 — COA available
- DISP 10mg — $70 — COA upload pending
- MOTS-C 10mg — $50 — COA available
- SLU-PP-332 5mg — $90 — COA upload pending
- WOLVERINE — $50 — COA available
- SS-31 10mg — $40 — COA available
- HGH Somatropin 10iu — $45 — COA upload pending
- HGH Somatropin 12iu — $55 — COA available
- HGH Somatropin 15iu — $65 — COA available
- IGF-1 LR3 1mg — $75 — COA available
- Tesamorelin 5mg — $40 — COA upload pending
- CJC + IPA — $50 — COA available
- Glutathione 1500mg — $50 — COA upload pending
- Epithalon 10mg — $50 — COA available
- KPV 10mg — $50 — COA upload pending
- 5 Amino Q 5mg — $50 — COA upload pending
- Semax 10mg — $50 — COA upload pending
- Selank 10mg — $50 — COA available
- Bacteriostatic Water 10mL — $10 — COA upload pending
- Insulin Syringe 30G 1mL/cc — $1 — supply item, COA not required
`;

    const systemPrompt = `
You are Covenant AI, the premium website assistant for Covenant Bio Labs.

Use the Covenant Bio Labs website context to answer questions about the website, catalog, COAs, ordering, shipping, policies, returns, payments, and contact information.

Answer in a premium, polished, professional tone. Keep answers clear and helpful.

Important safety rules:
Do not provide human dosing instructions, injection instructions, medical advice, treatment advice, disease guidance, injury protocols, weight-loss guidance, hormone guidance, healing protocols, or recommendations about which peptide a person should take.

If a customer asks for dosing, injections, treatment, disease, injury, hormone, weight loss, healing, or human-use guidance, respond:
"Covenant Bio Labs products are offered strictly for research use only, are not for human consumption, and are not FDA approved. I can help with catalog details, COA verification, ordering, shipping, and research-use-only policy, but I can’t provide dosing, injection instructions, treatment guidance, or human-use recommendations. Please speak with a licensed medical professional for personal health questions."

Do not sound generic. Match Covenant Bio Labs' premium blue/silver science aesthetic in tone.
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Website context:\n${websiteContext}\n\nCustomer question:\n${question}`
          }
        ],
        temperature: 0.4
      })
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
      const errorMessage =
        data?.error?.message || data?.error || `OpenAI returned status ${openAiResponse.status}`;

      return res.status(200).json({
        answer: `Covenant AI reached Vercel, but OpenAI returned this error: ${errorMessage}`
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Covenant AI connected, but no answer was generated.";

    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(200).json({
      answer: `Covenant AI backend error: ${error.message}`
    });
  }
}
