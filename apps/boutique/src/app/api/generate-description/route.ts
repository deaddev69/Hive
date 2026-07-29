import { NextRequest, NextResponse } from "next/server";

const CRAFT_GLOSSARY: Record<string, string> = {
  kasavu: "Kasavu is a traditional handwoven cream-colored fabric with exquisite gold zari borders, originating from Kerala, India. It represents elegance, tradition, and timeless craftsmanship.",
  chikankari: "Chikankari is a delicate and artful traditional embroidery style from Lucknow, India, characterized by intricate hand-embroidered white threadwork on sheer pastel fabrics.",
  shibori: "Shibori is a traditional Japanese tie-dyeing technique that creates beautiful, organic, and abstract patterns on textile surfaces by folding, twisting, or bunching the cloth.",
  banarasi: "Banarasi silk is a legendary, luxurious handwoven fabric from Varanasi, India, known for its gold and silver brocade or zari, fine silk, and opulent designs.",
  handloom: "Handloom fabrics are meticulously woven by skilled artisans on manual wooden looms. They reflect sustainable craftsmanship, unique textures, and human artistry.",
  chanderi: "Chanderi is a traditional handwoven fabric from Madhya Pradesh, India, known for its lightweight, sheer texture, luxurious feel, and fine zari work.",
  organza: "Organza is a light, crisp, and sheer plain-woven fabric that offers a beautiful structured drape and subtle translucent sheen, perfect for elegant formalwear.",
  kalamkari: "Kalamkari is a traditional hand-painted or block-printed cotton textile art originating from Andhra Pradesh, India, featuring detailed mythological motifs colored with natural organic dyes.",
  bandhani: "Bandhani is a highly skilled traditional Indian tie-dye technique from Gujarat and Rajasthan, characterized by minute, intricate dotted patterns created by plucking and tying the cloth.",
  jamdani: "Jamdani is a legendary hand-woven fine muslin textile technique from Bengal, featuring intricate floral and geometric motifs created directly on the loom."
};

function getLocalCraftDetails(text: string): string {
  const lowercaseText = text.toLowerCase();
  const matchedCrafts: string[] = [];
  for (const [key, value] of Object.entries(CRAFT_GLOSSARY)) {
    if (lowercaseText.includes(key)) {
      matchedCrafts.push(value);
    }
  }
  return matchedCrafts.length > 0
    ? `\nCraft Context:\n${matchedCrafts.join("\n")}`
    : "";
}

export async function POST(req: NextRequest) {
  try {
    const { roughText, type, boutiqueName, boutiqueDescription } = await req.json();

    if (!roughText || !roughText.trim()) {
      return NextResponse.json({ error: "Rough text input is required" }, { status: 400 });
    }

    const isDescription = type === "description";

    // 1. Gather API keys for failover
    const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const apiKeys = keysString.split(",").map(k => k.trim()).filter(Boolean);

    // 2. Perform RAG - Pull Local Craft Context
    const craftContext = getLocalCraftDetails(roughText);

    // 3. Assemble Prompt (Strictly product-focused, no boutique/delivery/platform mentions)
    const targetType = isDescription ? "product description" : "design story";
    const systemPrompt = `You are Hive Now's product copywriter. Rewrite the user's rough product notes into a clear, natural, premium ${targetType}. Keep the original meaning and details accurate—do not invent features, materials, colours, sizes, or styling. Use warm, simple English in a consistent premium tone. Write 40–55 words in a single paragraph.

CRITICAL RULES:
- Focus ONLY on the product itself (fabric, weave, silhouette, tailoring, fit, elegance, and comfort).
- NEVER mention "boutique", "partner collection", "curated collection", "store", "merchant", "Hive", "delivery", "express service", or "courier".

Return ONLY the final generated copy. Do not include any intro, outro, conversational text, or wrapper quotes.

${craftContext}

Rough Input:
"${roughText.trim()}"

Polished Output:`;

    let generatedText = "";
    let success = false;

    // 4. Try API Keys in failover loop
    if (apiKeys.length > 0) {
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        try {
          console.log(`[Hive AI] Attempting generation with API key index ${i}...`);
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: systemPrompt
                      }
                    ]
                  }
                ]
              })
            }
          );

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim()) {
              generatedText = text.trim();
              success = true;
              console.log(`[Hive AI] Generation succeeded with API key index ${i}.`);
              break;
            }
          } else {
            const errorBody = await response.text();
            console.warn(
              `[Hive AI Failover Warning] Key index ${i} failed with status ${response.status}:`,
              errorBody
            );
          }
        } catch (err) {
          console.error(`[Hive AI Failover Error] Exception with key index ${i}:`, err);
        }
      }
    } else {
      console.warn("[Hive AI Warning] No GEMINI_API_KEY or GEMINI_API_KEYS defined in env. Using rules-based fallback.");
    }

    // 5. Rules-based Fallback if all API keys fail (Strictly Product-Focused)
    if (!success) {
      console.log("[Hive AI] Using rules-based template fallback.");
      
      const formattedInput = roughText
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(", ");

      if (isDescription) {
        generatedText = `Crafted with refined elegance, this ${formattedInput} features premium tailoring and careful attention to detail. Designed for comfort and modern style, it offers a sophisticated silhouette that transitions effortlessly across occasions, ensuring an elevated look with lasting quality and timeless appeal.`;
      } else {
        generatedText = `Inspired by timeless craftsmanship and graceful aesthetics, this ${formattedInput} celebrates fine textile art and thoughtful design. Every detail reflects dedicated craftsmanship, created to bring subtle luxury and effortless charm to your wardrobe.`;
      }
    }

    return NextResponse.json({ text: generatedText });
  } catch (error: any) {
    console.error("[Hive AI API Error]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
