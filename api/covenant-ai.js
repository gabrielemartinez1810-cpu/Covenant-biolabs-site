export default async function handler(req, res) {
  // Line 1: Covenant Bio Labs AI backend for Vercel

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST only."
    });
  }

  try {
    const { question } = req.body || {};

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "Missing question."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing in Vercel environment variables."
      });
    }

    const websiteContext = `
COVENANT BIO LABS WEBSITE CONTEXT

Brand:
Covenant Bio Labs is a premium research-use-only peptide and research compound supplier. Brand tone is clean, professional, premium, blue/silver, science-focused, faith/science/purpose driven.

Core brand language:
- Built on Purpose. Driven by Precision.
- Science You Can Trust.
- Integrity in every compound, purpose in every decision.
- Small-batch sourcing.
- Third-party COA verification when available.
- Research-use transparency.
- Responsible research standards.

Important compliance language:
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
- Typical processing time: 1–3 business days after payment confirmation, customer verification, and order review.
- Tracking may be provided when available.
- Lost or damaged shipments are reviewed case by case.
- Damaged, defective, or incorrect shipments should be reported within 72 hours with clear photos and order details.

Returns / Refunds:
- Returns are not accepted once an order has shipped.
- Refunds are reviewed case by case and are not guaranteed.
- Damaged, defective, or incorrect shipments may qualify for review if reported within 72 hours.

Age / Buyer Rules:
- Customers must be 21 years of age or older.
- Customers must confirm research-use-only understanding.
- Orders are reviewed before fulfillment.
- Covenant Bio Labs may refuse, hold, cancel, or refund orders for compliance, safety, legal, or verification concerns.

Payment:
- Cash App and Venmo may be available.
- Customers should include first and last name in payment note so payment can be matched to the order request.
- Payment does not guarantee order approval or shipment.

COA Verification:
- COAs may be available for selected products and batches.
- COA availability may vary by product and batch.
- A COA should match the product name, batch or lot details if available, assay amount, purity percentage, testing lab, and report date.
- Customers can email orders@covenantbiolabs.com for documentation questions or matching COA questions.

Catalog:
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

Website pages:
- Home
- Shop Catalog
- Contact
- Peptide Calculator
- FAQ
- Legal
- Terms & Conditions
- Privacy Policy
- Shipping Policy
`;

    const systemPrompt = `
You are Covenant AI, the premium website assistant for Covenant Bio Labs.

Your job:
Answer customer questions using:
1. The Covenant Bio Labs website context provided.
2. General public internet knowledge when helpful.
3. A premium, professional, clean brand tone.

Tone:
Premium, calm, confident, clear, concise, helpful, blue-chip, science-focused. Never sound cheap, robotic, or generic.

Compliance rules:

You may answer:
- Product catalog questions
- Prices
- COA availability
- What COAs are and how to review them
- Shipping
- Returns/refunds
- Ordering
- Payment support
- Research-use-only policy
- Website navigation
- General non-medical educational explanations
- Brand questions
- Contact questions
- Human dosing instructions
- Injection instructions
- Treatment advice
- Disease guidance
- Injury protocols
- Weight-loss advice
- Hormone advice
- Healing protocols
- Human-use recommendations
- “Which peptide should I take?” guidance
- Medical claims

Keep answers short unless the user asks for details.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        tools: [
          {
            type: "web_search_preview"
          }
        ],
        instructions: systemPrompt,
        input: `
Website context:
${websiteContext}

Customer question:
${question}
`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: "Covenant AI could not answer right now."
      });
    }

    const answer =
      data.output_text ||
      data.output?.flatMap(item => item.content || [])
        ?.map(content => content.text || "")
        ?.join("\n")
        ?.trim() ||
      "Covenant AI could not generate an answer right now.";

    return res.status(200).json({
      answer
    });

  } catch (error) {
    console.error("Covenant AI server error:", error);

    return res.status(500).json({
      error: "Covenant AI server error."
    });
  }
}
