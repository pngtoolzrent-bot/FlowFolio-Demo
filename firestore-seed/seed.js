// firestore-seed/seed.js
// Run once: node firestore-seed/seed.js
// This seeds all initial data so you can always restore from code.
import "dotenv/config";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Init ────────────────────────────────────────────────────────────────────
let credential;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  credential = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  credential = admin.credential.cert(
    JSON.parse(readFileSync(resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS), "utf8"))
  );
} else {
  throw new Error("No Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS in .env");
}

admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
const db = admin.firestore();

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SEED = {

  // site/theme
  theme: {
    ink:    "#111010",
    paper:  "#F5F2ED",
    warm:   "#EDE9E1",
    accent: "#C8441B",
    muted:  "#8A8578",
    line:   "#D9D5CC",
  },

  // hero/main
  hero: {
    name:            "Anthony Kuiau",
    tagline:         "Graphic Designer & Radio Presenter",
    location:        "Port Moresby, Papua New Guinea",
    cvUrl:           "https://drive.google.com/uc?export=download&id=YOUR_GOOGLE_DRIVE_FILE_ID",
    metaDescription: "Anthony Kuiau is a Graphic Designer and Radio Presenter based in Port Moresby, Papua New Guinea.",
  },

  // about/main
  about: {
    eyebrow: "About me",
    heading: "Design that<br/>connects.",
    paragraphs: [
      "Creative digital designer and radio presenter passionate about connecting with local PNG audiences. Delivering energetic on-air content and designing culturally resonant graphics and social media visuals that engage listeners and support brand growth.",
      "With over 4 years of experience across broadcast and digital media, I bring both technical skill and cultural understanding to every project.",
    ],
    stats: [
      { value: "4+",   label: "Years experience" },
      { value: "10+",  label: "Tools mastered" },
      { value: "100%", label: "Creative output" },
    ],
  },

  // contact/main
  contact: {
    heading: "Let's work<br/>together.",
    body:    "Have a project in mind? I'd love to hear about it.",
    email:   "anthonykuiau22@gmail.com",
    socials: [
      { label: "LinkedIn",  url: "https://www.linkedin.com/in/anthonykuiau" },
      { label: "Behance",   url: "https://www.behance.net/anthonykuiau" },
      { label: "Instagram", url: "https://www.instagram.com/anthonykuiau" },
      { label: "Dribbble",  url: "https://dribbble.com/anthonykuiau" },
    ],
  },

  // jobs collection
  jobs: [
    {
      title:       "Programs Officer — Radio Presenter",
      place:       "Kalang Advertising (FM100 & HOT97FM)",
      period:      "Sep 2025 – Mar 2026",
      description: "Worked across FM100 & HOT97FM delivering live radio content while creating digital and promotional materials to support audience engagement and brand growth across broadcast and social media platforms.",
      order: 1,
    },
    {
      title:       "Graphic Designer",
      place:       "Freelance, PNG",
      period:      "2022 – 2024",
      description: "Designed logos and branding materials for local PNG clients, gaining hands-on experience across Adobe Illustrator and Photoshop on diverse branding and print projects.",
      order: 2,
    },
  ],

  // skillGroups collection
  skillGroups: [
    {
      group:  "Design Tools",
      skills: ["Adobe Illustrator", "Adobe Photoshop", "Adobe InDesign", "Adobe Premiere Pro", "Figma", "Canva"],
      order:  1,
    },
    {
      group:  "Creative Skills",
      skills: ["Branding", "Typography", "Copywriting", "Logo Design", "Print Design"],
      order:  2,
    },
    {
      group:  "Digital & Media",
      skills: ["Social Media Management", "Meta Business Suite", "Website Management", "Radio Broadcasting"],
      order:  3,
    },
  ],

  // projects collection
  projects: [
    {
      title:       "Brand Identity",
      category:    "branding",
      description: "A comprehensive brand identity project. Replace this description with your own.",
      imageUrl:    "",
      videoUrl:    "",
      link:        "",
      order:       1,
      featured:    true,
    },
    {
      title:       "Magazine Layout",
      category:    "print",
      description: "Editorial magazine layout. Replace with your project details.",
      imageUrl:    "",
      videoUrl:    "",
      link:        "",
      order:       2,
      featured:    false,
    },
    {
      title:       "Social Campaign",
      category:    "digital",
      description: "Social media campaign visuals. Replace with your project details.",
      imageUrl:    "",
      videoUrl:    "",
      link:        "",
      order:       3,
      featured:    false,
    },
    {
      title:       "Logo & Mark",
      category:    "identity",
      description: "Logo design and brand mark. Replace with your project details.",
      imageUrl:    "",
      videoUrl:    "",
      link:        "",
      order:       4,
      featured:    false,
    },
    {
      title:       "Packaging Design",
      category:    "branding",
      description: "Product packaging design. Replace with your project details.",
      imageUrl:    "",
      videoUrl:    "",
      link:        "",
      order:       5,
      featured:    false,
    },
  ],
};

// ─── Write to Firestore ───────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding Firestore...\n");

  // site/theme
  await db.collection("site").doc("theme").set(SEED.theme);
  console.log("✅ theme");

  // hero/main
  await db.collection("hero").doc("main").set(SEED.hero);
  console.log("✅ hero");

  // about/main
  await db.collection("about").doc("main").set(SEED.about);
  console.log("✅ about");

  // contact/main
  await db.collection("contact").doc("main").set(SEED.contact);
  console.log("✅ contact");

  // jobs
  for (const job of SEED.jobs) {
    await db.collection("jobs").add(job);
  }
  console.log(`✅ ${SEED.jobs.length} jobs`);

  // skillGroups
  for (const g of SEED.skillGroups) {
    await db.collection("skillGroups").add(g);
  }
  console.log(`✅ ${SEED.skillGroups.length} skill groups`);

  // projects
  for (const p of SEED.projects) {
    await db.collection("projects").add(p);
  }
  console.log(`✅ ${SEED.projects.length} projects`);

  console.log("\n🎉 Seed complete!");
  process.exit(0);
}

seed().catch(err => { console.error("Seed failed:", err); process.exit(1); });
