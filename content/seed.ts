import { DEFAULT_RSVP_FORM_CONFIG } from "@/content/rsvp-form-defaults";
import type { WeddingContent } from "@/types/wedding";

/**
 * Static content for Hazel Jean & Jhonel Rhey's wedding.
 *
 * This is the source of truth until Supabase is connected: the wedding
 * service falls back to it when NEXT_PUBLIC_SUPABASE_URL is absent, and
 * supabase/seed.sql mirrors it for the hosted database.
 */

const VENUE = "Hacienda Solange Private Events Place";

const ADDRESS = [
  "Brgy. 07 Aguinaldo, Alfonso Road",
  "Esperanza Ilaya, Alfonso, Cavite",
  "Philippines",
];

export const seedContent: WeddingContent = {
  wedding: {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "hazel-and-jhonel",
    brideName: "Hazel Jean",
    groomName: "Jhonel Rhey",
    weddingDate: "2026-11-30",
    ceremonyTime: "16:00",
    timezone: "Asia/Manila",
    ceremonyVenue: VENUE,
    ceremonyAddress: ADDRESS,
    receptionTime: "18:30",
    receptionVenue: VENUE,
    receptionAddress: ADDRESS,
    rsvpDeadline: "2026-11-24",
    dressCode: "Formal",
    weddingColors: ["Black", "Gold"],
    parkingNote:
      "Complimentary parking is available on the venue grounds. Attendants will guide you upon arrival.",
    welcomeMessage:
      "Join us as we celebrate our love and begin our journey together.",
    heroImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2400&q=80",
    musicUrl: "/audio/bgm.mp3",
    musicAutoplay: true,
  },

  rsvpConfig: DEFAULT_RSVP_FORM_CONFIG,

  story: [
    {
      id: "m1",
      title: "How We Met",
      body: "Two paths crossed at just the right moment, and a conversation that was never meant to end — didn't.",
      imageUrl: null,
      sortOrder: 1,
    },
    {
      id: "m2",
      title: "The Proposal",
      body: "One quiet, perfect question. One joyful, certain yes. And everything after became ours to plan together.",
      imageUrl: null,
      sortOrder: 2,
    },
    {
      id: "m3",
      title: "See You At The Wedding",
      body: "The best chapter is the one we write next — and it begins with you there beside us.",
      imageUrl: null,
      sortOrder: 3,
    },
  ],

  schedule: [
    { id: "s1", time: "15:30", title: "Guest Arrival", description: null, sortOrder: 1 },
    { id: "s2", time: "16:00", title: "Ceremony", description: null, sortOrder: 2 },
    { id: "s3", time: "17:30", title: "Cocktail Hour", description: null, sortOrder: 3 },
    { id: "s4", time: "18:30", title: "Reception", description: null, sortOrder: 4 },
    { id: "s5", time: "20:00", title: "Dinner", description: null, sortOrder: 5 },
    { id: "s6", time: "21:00", title: "First Dance", description: null, sortOrder: 6 },
    { id: "s7", time: "22:00", title: "Open Dance Floor", description: null, sortOrder: 7 },
    { id: "s8", time: "00:00", title: "Closing", description: null, sortOrder: 8 },
  ],

  gallery: [
    {
      id: "g1",
      src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80",
      caption: "A quiet moment",
      displayOrder: 1,
    },
    {
      id: "g2",
      src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80",
      caption: "The walk",
      displayOrder: 2,
    },
    {
      id: "g3",
      src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1600&q=80",
      caption: "Golden hour",
      displayOrder: 3,
    },
    {
      id: "g4",
      src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80",
      caption: "Table for two",
      displayOrder: 4,
    },
    {
      id: "g5",
      src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1600&q=80",
      caption: "Evening lights",
      displayOrder: 5,
    },
    {
      id: "g6",
      src: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1600&q=80",
      caption: "The first dance",
      displayOrder: 6,
    },
    {
      id: "g7",
      src: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=1600&q=80",
      caption: "With this ring",
      displayOrder: 7,
    },
    {
      id: "g8",
      src: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1600&q=80",
      caption: "Celebration",
      displayOrder: 8,
    },
  ],

  faqs: [
    {
      id: "f1",
      question: "What is the dress code?",
      answer:
        "Formal attire, in keeping with our black and gold celebration. Suits or barongs for gentlemen, and long dresses or elegant evening wear for ladies.",
      displayOrder: 1,
    },
    {
      id: "f2",
      question: "Can I bring a plus one?",
      answer:
        "If your invitation includes a plus one, there is a place for their name on the RSVP form. We would love to know who is joining you.",
      displayOrder: 2,
    },
    {
      id: "f3",
      question: "Are children invited?",
      answer:
        "We adore your little ones, and children named on your invitation are warmly welcome. Please include them in your guest count when you RSVP.",
      displayOrder: 3,
    },
    {
      id: "f4",
      question: "Where can I park?",
      answer:
        "Complimentary parking is available on the grounds of Hacienda Solange. Attendants will be on hand to guide you when you arrive.",
      displayOrder: 4,
    },
    {
      id: "f5",
      question: "What time should I arrive?",
      answer:
        "Guest arrival begins at 3:30 PM, and the ceremony starts promptly at 4:00 PM. We suggest arriving early to find your seat and settle in.",
      displayOrder: 5,
    },
    {
      id: "f6",
      question: "Who do I contact with questions?",
      answer:
        "Reach out to the couple or their families directly, or leave a note in the message field of your RSVP and we will get back to you.",
      displayOrder: 6,
    },
  ],
};
