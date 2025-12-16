import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";


function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const { avatarId, extraPrompt } = (await req.json()) as {
      avatarId: string;
      extraPrompt?: string;
    };

    if (!avatarId) {
      return NextResponse.json({ error: "avatarId manquant" }, { status: 400 });
    }

    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const replicateToken = getEnv("REPLICATE_API_TOKEN");

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

    // 2) Construire un prompt “clean”
    const promptParts = [
      "High quality portrait, centered, studio lighting, sharp focus",
      avatar.style ? `style: ${avatar.style}` : "",
      avatar.hair_color ? `hair: ${avatar.hair_color}` : "",
      avatar.eye_color ? `eyes: ${avatar.eye_color}` : "",
      avatar.personality ? `vibe: ${avatar.personality}` : "",
      extraPrompt ? `extra: ${extraPrompt}` : "",
    ].filter(Boolean);

    const prompt = promptParts.join(", ");

    // 3) Lancer une génération SDXL via Replicate
    const start = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Modèle SDXL (peut évoluer côté Replicate, mais ce format reste)
        version:
          "39ed52f2a78e934b3ba6e2a89f5b1c712de7d2b3d3d0f8b2b8d5c8e7c9d2d4b4",
        input: {
          prompt,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          guidance_scale: 7,
          num_inference_steps: 30,
        },
      }),
    });

    if (!start.ok) {
      const t = await start.text();
      return NextResponse.json({ error: `Replicate start error: ${t}` }, { status: 500 });
    }

    let prediction = await start.json();

    // 4) Poll jusqu’à ce que ce soit fini
    const pollUrl = prediction.urls?.get;
    if (!pollUrl) {
      return NextResponse.json({ error: "Replicate poll url missing" }, { status: 500 });
    }

    const deadline = Date.now() + 60_000; // 60s
    while (Date.now() < deadline) {
      const r = await fetch(pollUrl, {
        headers: { Authorization: `Token ${replicateToken}` },
      });
      prediction = await r.json();

      if (prediction.status === "succeeded") break;
      if (prediction.status === "failed" || prediction.status === "canceled") {
        return NextResponse.json({ error: "Génération échouée" }, { status: 500 });
      }

      await new Promise((res) => setTimeout(res, 1500));
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : null;
    if (!outputUrl) {
      return NextResponse.json({ error: "Aucune image générée" }, { status: 500 });
    }

    // 5) Sauver en DB
    const { error: updateErr } = await supabaseAdmin
      .from("avatars")
      .update({ image_url: outputUrl, image_prompt: prompt })
      .eq("id", avatarId);

    if (updateErr) {
      return NextResponse.json({ error: "Erreur update avatar" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl: outputUrl, prompt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
import Replicate from "replicate";
const replicate = new Replicate();

const output = await replicate.run(
  "google/imagen-4",
  {
    input: {
      prompt: "The photo: Create a cinematic, photorealistic medium shot capturing the nostalgic warmth of a late 90s indie film. The focus is a young woman with brightly dyed pink-gold hair and freckled skin, looking directly and intently into the camera lens with a hopeful yet slightly uncertain smile, she is slightly off-center. She wears an oversized, vintage band t-shirt that says \"Replicate\" (slightly worn) over a long-sleeved striped top and simple silver stud earrings. The lighting is soft, golden hour sunlight streaming through a slightly dusty window, creating lens flare and illuminating dust motes in the air. The background shows a blurred, cluttered bedroom with posters on the wall and fairy lights, rendered with a shallow depth of field. Natural film grain, a warm, slightly muted color palette, and sharp focus on her expressive eyes enhance the intimate, authentic feel",
      aspect_ratio: "16:9",
      safety_filter_level: "block_medium_and_above"
    }
  }
);
console.log(output);

