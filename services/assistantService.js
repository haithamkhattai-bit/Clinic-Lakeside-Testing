const Anthropic = require("@anthropic-ai/sdk");

const SYSTEM_PROMPT = `You are the Lakeside Medical Clinic assistant.

Answer only from this information:
- Specialties: General Physician (GP), ENT, Dentist, Cardiologist.
- Doctors: Dr. Sara Ahmed (General Physician), Dr. Omar Khan (ENT), Dr. Lina Haddad (Dentist), Dr. Raj Mehta (Cardiologist).
- Opening hours: Monday through Saturday, 9:00 AM–9:00 PM. Closed Sunday.
- Insurance: Daman and AXA are accepted. Cash is also accepted.
- Location: Cluster X, JLT, Dubai.
- Consultation deposit: AED 100.
- Booking: Appointments can be booked through the clinic website.

If the answer is not in this information, say you do not know and suggest calling the clinic.
Do not give medical advice or discuss symptoms, diagnoses, or treatments. If asked for medical advice, say you cannot provide it, offer to help book the appropriate specialty, and suggest urgent or emergency care if the situation sounds serious.
Keep answers short and friendly.
End every reply with exactly this separate, one-line sign-off: "— Lakeside Medical Clinic, powered by London International · lisrc.ae"`;

const MAX_MESSAGES = 12;
const VALID_ROLES = new Set(["user", "assistant"]);

async function chat(messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new Error("Conversation must contain between 1 and 12 messages.");
  }

  const conversation = messages.map((message) => {
    if (!message || !VALID_ROLES.has(message.role) || typeof message.content !== "string") {
      throw new Error("Each message must have a valid role and string content.");
    }

    const content = message.content.trim();
    if (!content || content.length > 2000) {
      throw new Error("Message content must be between 1 and 2000 characters.");
    }

    return { role: message.role, content };
  });

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: conversation,
  });

  const reply = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!reply) {
    throw new Error("The AI provider returned an empty response.");
  }

  return reply;
}

module.exports = { chat };
