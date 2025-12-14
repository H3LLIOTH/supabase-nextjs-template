"use client";

import { useEffect, useState } from "react";
import { createSPAClient } from "@/lib/supabase/client";

const supabase = createSPAClient();


type Avatar = {
  id: string;
  name: string;
  style: string | null;
  hair_color: string | null;
  eye_color: string | null;
  personality: string | null;
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

  // Charger les avatars de l'utilisateur connecté
  useEffect(() => {
    const fetchAvatars = async () => {
      setLoading(true);
      setError(null);

      // récupérer l'utilisateur connecté
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Tu dois être connecté pour voir tes avatars.");
        setLoading(false);
        return;
      }

      // récupérer les avatars associés à cet utilisateur
      const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Impossible de charger tes avatars pour le moment.");
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

    const { data, error } = await supabase
      .from("avatars" as unknown as "avatars")
      .insert([
        {
          user_id: user.id,
          name,
          style: style || null,
          hair_color: hairColor || null,
          eye_color: eyeColor || null,
          personality: personality || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      setError("Erreur lors de la création de l'avatar.");
      return;
    }

    // ajouter le nouvel avatar en haut de la liste
    setAvatars((prev) => [data as Avatar, ...prev]);

    // reset du formulaire
    setName("");
    setStyle("");
    setHairColor("");
    setEyeColor("");
    setPersonality("");
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Mes avatars</h1>
      <p className="text-gray-600 mb-6">
        Crée et gère ici tes avatars IA. On commencera par la base : nom,
        style, apparence et personnalité.
      </p>

      {/* Formulaire de création */}
      <section className="mb-10 border rounded-xl p-4 md:p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-3">Créer un nouvel avatar</h2>
        {error && (
          <p className="text-sm text-red-500 mb-3">
            {error}
          </p>
        )}
        <form onSubmit={handleCreateAvatar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nom de l&apos;avatar *
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Luna, Alex, Nova..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Style visuel
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Ex : réaliste, anime, cartoon..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Couleur de cheveux
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={hairColor}
                onChange={(e) => setHairColor(e.target.value)}
                placeholder="Ex : bruns, blonds, roux..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Couleur des yeux
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={eyeColor}
                onChange={(e) => setEyeColor(e.target.value)}
                placeholder="Ex : verts, bleus, noisette..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Personnalité (facultatif)
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Ex : douce, joueuse, curieuse, protectrice…"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border bg-black text-white hover:opacity-90"
          >
            Créer l&apos;avatar
          </button>
        </form>
      </section>

      {/* Liste des avatars */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Tes avatars</h2>

        {loading ? (
          <p>Chargement de tes avatars...</p>
        ) : avatars.length === 0 ? (
          <p className="text-gray-500">
            Tu n&apos;as encore aucun avatar. Crée-en un avec le formulaire
            ci-dessus.
          </p>
        ) : (
          <ul className="space-y-3">
            {avatars.map((avatar) => (
              <li
                key={avatar.id}
                className="border rounded-lg p-3 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{avatar.name}</span>
                  {avatar.style && (
                    <span className="text-xs px-2 py-1 rounded-full border">
                      {avatar.style}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {avatar.hair_color && (
                    <span>Cheveux : {avatar.hair_color} · </span>
                  )}
                  {avatar.eye_color && (
                    <span>Yeux : {avatar.eye_color}</span>
                  )}
                </div>
                {avatar.personality && (
                  <p className="text-sm text-gray-700 mt-1">
                    {avatar.personality}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
