"use client";

import { useEffect, useState } from "react";
import { createSPAClient } from "@/lib/supabase/client";

const supabase = createSPAClient();

type AvatarInsert = {
  user_id: string;
  name: string;
  style: string | null;
  hair_color: string | null;
  eye_color: string | null;
  personality: string | null;
};

type Avatar = {
  id: string;
  name: string;
  style: string | null;
  hair_color: string | null;
  eye_color: string | null;
  personality: string | null;
  image_url?: string | null;
};

export default function MesAvatarsPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // champs du formulaire
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [personality, setPersonality] = useState("");

  // Charger les avatars
  useEffect(() => {
    const fetchAvatars = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Tu dois être connecté pour voir tes avatars.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Impossible de charger tes avatars.");
      } else if (data) {
        setAvatars(data as Avatar[]);
      }

      setLoading(false);
    };

    fetchAvatars();
  }, []);

  const handleCreateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Tu dois être connecté pour créer un avatar.");
      return;
    }

    if (!name.trim()) {
      setError("Le nom de l'avatar est obligatoire.");
      return;
    }

    const avatarToInsert: AvatarInsert = {
      user_id: user.id,
      name,
      style: style || null,
      hair_color: hairColor || null,
      eye_color: eyeColor || null,
      personality: personality || null,
    };

    const { data, error } = await supabase
      .from("avatars" as unknown as "avatars")
      .insert([avatarToInsert] as never[])
      .select()
      .single();

    if (error) {
      console.error(error);
      setError("Erreur lors de la création de l’avatar.");
      return;
    }

    setAvatars((prev) => [data as Avatar, ...prev]);

    setName("");
    setStyle("");
    setHairColor("");
    setEyeColor("");
    setPersonality("");
  };

  const generateImage = async (avatarId: string) => {
    setError(null);

    const res = await fetch("/api/generate-avatar-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json?.error ?? "Erreur génération");
      return;
    }

    setAvatars((prev) =>
      prev.map((a) =>
        a.id === avatarId ? { ...a, image_url: json.imageUrl } : a
      )
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Mes avatars</h1>

      {/* Formulaire */}
      <section className="mb-10 border rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-3">Créer un avatar</h2>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <form onSubmit={handleCreateAvatar} className="space-y-4">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
          />

          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Style"
          />

          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={hairColor}
            onChange={(e) => setHairColor(e.target.value)}
            placeholder="Cheveux"
          />

          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={eyeColor}
            onChange={(e) => setEyeColor(e.target.value)}
            placeholder="Yeux"
          />

          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Personnalité"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-black text-white"
          >
            Créer l’avatar
          </button>
        </form>
      </section>

      {/* Liste */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Tes avatars</h2>

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <ul className="space-y-3">
            {avatars.map((avatar) => (
              <li
                key={avatar.id}
                className="border rounded-lg p-3 flex flex-col gap-1"
              >
                <strong>{avatar.name}</strong>

                {avatar.personality && (
                  <p className="text-sm">{avatar.personality}</p>
                )}

                {avatar.image_url && (
                  <img
                    src={avatar.image_url}
                    alt={avatar.name}
                    className="mt-2 w-full max-w-sm rounded-lg border"
                  />
                )}

                <button
                  type="button"
                  onClick={() => generateImage(avatar.id)}
                  className="mt-2 px-3 py-2 rounded-lg text-sm border"
                >
                  Générer une image
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
