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
      `${capitalized}. Designed with modern elegance and fine tailoring, this piece offers a flattering fit and comfortable feel, making it an essential addition for effortless, sophisticated styling.`,
      `Featuring ${lowercase}, this garment highlights refined craftsmanship and thoughtful design. Tailored for comfort and timeless appeal, it brings subtle grace to any wardrobe.`,
      `A classic expression of style, this piece showcases ${lowercase}. Crafted for comfort and versatility, its clean lines and premium finish ensure a standout look across occasions.`,
      `${capitalized}. Carefully tailored to deliver both comfort and sophistication, this versatile garment combines rich texture with an effortless silhouette.`,
      `Exquisitely detailed with ${lowercase}, this garment combines high comfort with contemporary flair, ideal for elevated everyday wear or special gatherings.`
    ];
    const index = Math.floor(Math.random() * descTemplates.length);
    return descTemplates[index]!;
  } else {
    const storyTemplates = [
      `Inspired by traditional artistry and modern aesthetics, this piece celebrates ${lowercase}. Every detail is thoughtfully designed to highlight delicate textures and lasting quality.`,
      `Drawing inspiration from timeless heritage, this creation brings together ${lowercase}. Crafted with dedication, it reflects a passion for fine textiles and authentic style.`,
      `Rooted in graceful craftsmanship, this design highlights ${lowercase}. Created to bring subtle luxury and effortless charm to your wardrobe, it tells a story of refined elegance.`,
      `A tribute to artisanal craftsmanship, this garment expresses ${lowercase}. Designed to be cherished across seasons, it combines heritage techniques with contemporary styling.`
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

    // 4. Try API Keys and valid Gemini models in failover loop
    const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"];

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
                console.log(`[Hive AI] Generation succeeded with key index ${i} (${modelId}).`);
                break keyLoop;
              }
            } else {
              const errorBody = await response.text();
              console.warn(
                `[Hive AI Failover Warning] Key index ${i} model ${modelId} failed with status ${response.status}:`,
                errorBody
              );
            }
          } catch (err) {
            console.error(`[Hive AI Failover Error] Exception with key index ${i} model ${modelId}:`, err);
          }
        }
      }
    } else {
      console.warn("[Hive AI Warning] No GEMINI_API_KEY or GEMINI_API_KEYS defined in env. Using rules-based fallback.");
    }

    // 5. Dynamic Rules-based Fallback if API keys fail
    if (!success) {
      console.log("[Hive AI] Using dynamic rules-based template fallback.");
      generatedText = generateDynamicFallback(roughText, isDescription);
    }

    return NextResponse.json({ text: generatedText });
  } catch (error: any) {
    console.error("[Hive AI API Error]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
