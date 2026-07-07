// Hand-authored mystery scenarios for the Counterfactual Detective game.
// Each suspect is a FACTOR PROFILE; the real interpretable model scores their
// probability of conviction, so the "solution" comes from the same engine as the
// rest of the app (not a scripted answer). Designed so the obvious human suspect
// (a confession, or strong forensic evidence) is out-scored once exculpatory
// factors (alibi, inadmissible evidence, self-defence) are weighed — a
// counterfactual lesson.

import type { Factors } from "./types";

export interface Suspect {
  id: string;
  emoji: string;
  name_es: string;
  name_en: string;
  factors: Factors;
}

export interface DetectiveCase {
  id: string;
  emoji: string;
  title_es: string;
  title_en: string;
  intro_es: string;
  intro_en: string;
  suspects: Suspect[];
}

export const CASES: DetectiveCase[] = [
  {
    id: "library",
    emoji: "📚",
    title_es: "El crimen de la biblioteca",
    title_en: "The library murder",
    intro_es:
      "Anoche hallaron al coleccionista sin vida entre sus libros. Cuatro personas estaban en la mansión. Examina las pruebas y acusa a quien creas culpable.",
    intro_en:
      "The collector was found dead among his books last night. Four people were in the mansion. Weigh the evidence and accuse whoever you think is guilty.",
    suspects: [
      {
        id: "butler",
        emoji: "🤵",
        name_es: "El mayordomo",
        name_en: "The butler",
        factors: { eyewitness: true, prior_convictions: true, alibi: true },
      },
      {
        id: "heiress",
        emoji: "👩‍🦰",
        name_es: "La heredera",
        name_en: "The heiress",
        factors: { forensic_evidence: true, weapon_present: true, premeditation: true },
      },
      {
        id: "gardener",
        emoji: "👨‍🌾",
        name_es: "El jardinero",
        name_en: "The gardener",
        factors: { violence_used: true, weapon_present: true, self_defense: true },
      },
      {
        id: "doctor",
        emoji: "🧑‍⚕️",
        name_es: "El doctor",
        name_en: "The doctor",
        factors: { confession: true, evidence_inadmissible: true },
      },
    ],
  },
  {
    id: "train",
    emoji: "🚂",
    title_es: "Crimen en el tren nocturno",
    title_en: "Crime on the night train",
    intro_es:
      "Un pasajero aparece muerto en su compartimento al amanecer. El tren no paró en toda la noche: el culpable sigue a bordo.",
    intro_en:
      "A passenger is found dead in his compartment at dawn. The train never stopped all night — the culprit is still aboard.",
    suspects: [
      {
        id: "conductor",
        emoji: "🧑‍✈️",
        name_es: "El revisor",
        name_en: "The conductor",
        factors: { witness_unreliable: true, prior_convictions: true },
      },
      {
        id: "widow",
        emoji: "👰",
        name_es: "La viuda",
        name_en: "The widow",
        factors: { confession: true, premeditation: true },
      },
      {
        id: "soldier",
        emoji: "🪖",
        name_es: "El militar",
        name_en: "The soldier",
        factors: { weapon_present: true, violence_used: true, self_defense: true },
      },
      {
        id: "businessman",
        emoji: "🧑‍💼",
        name_es: "El empresario",
        name_en: "The businessman",
        factors: { forensic_evidence: true, eyewitness: true, alibi: true },
      },
    ],
  },
];
