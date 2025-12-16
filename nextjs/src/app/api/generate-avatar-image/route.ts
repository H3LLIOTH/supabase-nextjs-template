import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const { avatarId, extraPrompt } = (await req.json()) as {
      avatarId?: string;
      extraPrompt?: string;
    };

    if (!avatarId) {
      return NextResponse.json({ error: "avatarId manquant" }, { status: 400 });
    }

    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const replicateToken = env("REPLICATE_API_TOKEN");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1) Récupérer l’avatar
    const { data: avatar, error: fetchErr } = await supabaseAdmin
      .from("avatars")
      .select("id, name, style, hair_color, eye_color, personality")
      .eq("id", avatarId)
      .single();

    if (fetchErr || !avatar) {
      return NextResponse.json({ error: "Avatar introuvable" }, { status: 404 });
    }

    // 2) Prompt
    const prompt = [
      "High quality portrait, centered, studio lighting, sharp focus",
      avatar.style ? `visual style: ${avatar.style}` : "",
      avatar.hair_color ? `hair color: ${avatar.hair_color}` : "",
      avatar.eye_color ? `eye color: ${avatar.eye_color}` : "",
      avatar.personality ? `vibe/personality: ${avatar.personality}` : "",
      extraPrompt ? `extra: ${extraPrompt}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    // 3) Génération Replicate (SDXL)
    const replicate = new Replicate({ auth: replicateToken });

    // ✅ Modèle SDXL stable via Replicate (nom, pas "version" hardcodée)
    // (si tu veux un autre modèle, on le changera ensuite)
    const output = await replicate.run("stability-ai/sdxl", {
      input: {
        prompt,
        width: 1024,
        height: 1024,
        num_outputs: 1,
        guidance_scale: 7,
        num_inference_steps: 30,
      },
    });

    const imageUrl = Array.isArray(output) ? (output[0] as string) : null;

    if (!imageUrl) {
      return NextResponse.json({ error: "Aucune image générée" }, { status: 500 });
    }

    // 4) Sauver en DB
    const { error: updateErr } = await supabaseAdmin
      .from("avatars")
      .update({ image_url: imageUrl, image_prompt: prompt })
      .eq("id", avatarId);

    if (updateErr) {
      return NextResponse.json({ error: "Erreur update avatar" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl, prompt });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
