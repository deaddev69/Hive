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

function generateDynamicFallback(roughText: string, isDescription: boolean): string {
  const raw = roughText.trim();
  const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
  const lowercase = raw.toLowerCase();

  if (isDescription) {
    const descTemplates = [
      `${capitalized}. Designed for daily comfort and easy styling, this piece fits true to size and feels soft against the skin. It features neat stitching and quality finishing throughout, making it a reliable and versatile choice for casual outings, work, or weekend wear.`,
      `A classic ${lowercase} crafted with soft, breathable fabric and a clean fit. Easy to pair with your favorite accessories, it keeps you comfortable all day long while offering a neat, effortless look for any casual or festive occasion.`,
      `${capitalized}. Features careful tailoring and quality fabric to give you a comfortable and flattering fit. Simple, versatile, and easy to care for, it makes a great addition to your everyday wardrobe rotation.`
    ];
    const index = Math.floor(Math.random() * descTemplates.length);
    return descTemplates[index]!;
  } else {
    const storyTemplates = [
      `Made with care and attention to detail, this piece features ${lowercase}. Designed to combine traditional comfort with simple modern styling, every stitch reflects a commitment to quality craftsmanship and effortless everyday wearability.`,
      `Inspired by classic design and fine fabric texture, this creation highlights ${lowercase}. Created to feel light, comfortable, and neat every time you wear it, bringing simple charm to your wardrobe.`
    ];
    const index = Math.floor(Math.random() * storyTemplates.length);
    return storyTemplates[index]!;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { roughText, type } = await req.json();

    if (!roughText || !roughText.trim()) {
      return NextResponse.json({ error: "Rough text input is required" }, { status: 400 });
    }

    const isDescription = type === "description";

    // 1. Gather API keys for failover
    const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const apiKeys = keysString.split(",").map(k => k.trim()).filter(Boolean);

    // 2. Perform RAG - Pull Local Craft Context
    const craftContext = getLocalCraftDetails(roughText);

    // 3. Assemble Prompt (Simple, natural everyday human tone)
    const targetType = isDescription ? "product description" : "design story";
    const systemPrompt = `You are a product writer for a local clothing store. Rewrite the user's rough notes into a clear, simple, and natural ${targetType}.

STRICT WRITING RULES:
- Write in simple, everyday, warm English that sounds like a real person wrote it.
- Keep the language clean, friendly, and easy to read.
- NEVER use AI buzzwords or dramatic cliché phrases such as "exquisite", "lustrous", "timeless elegance", "meticulously crafted", "effortlessly", "sophisticated", "draped in", "testament to", "rich crimson", or "uniquely textured".
- Keep all original details (color, fabric, comfort, pattern) 100% accurate. Do not invent extra features.
- Write 45 to 60 words in one complete, natural paragraph (2 to 3 sentences).
- Focus ONLY on the product itself. Do not mention any store, boutique, merchant, or delivery service.

Return ONLY the plain text without intro, outro, or wrapper quotes.

${craftContext}

Rough Input:
"${roughText.trim()}"

Polished Output:`;

    let generatedText = "";
    let success = false;

    // 4. Try API Keys and active Gemini models in failover loop
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.0-flash"];

    if (apiKeys.length > 0) {
      keyLoop: for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];

        for (const modelId of candidateModels) {
          try {
            console.log(`[Hive AI] Attempting generation with key index ${i} using model ${modelId}...`);
            
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
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
                console.log(`[Hive AI SUCCESS ✨] Real Gemini AI generated output returned using key ${i} (${modelId})!`);
                break keyLoop;
              }
            } else {
              const errorBody = await response.text();
              console.warn(
                `[Hive AI FAILOVER WARNING ⚠️] Key ${i} model ${modelId} returned HTTP ${response.status}:`,
                errorBody
              );
            }
          } catch (err) {
            console.error(`[Hive AI FAILOVER ERROR ❌] Exception with key ${i} model ${modelId}:`, err);
          }
        }
      }
    } else {
      console.warn("[Hive AI WARNING ⚠️] No valid GEMINI_API_KEY found in .env.local.");
    }

    // 5. Dynamic Rules-based Fallback if API keys fail
    if (!success) {
      console.log("[Hive AI FALLBACK 🔄] Gemini API call failed. Using dynamic rules-based template fallback.");
      generatedText = generateDynamicFallback(roughText, isDescription);
    }

    return NextResponse.json({ text: generatedText });
  } catch (error: any) {
    console.error("[Hive AI API Error]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
