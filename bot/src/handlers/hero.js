// src/handlers/hero.js
import { getDb } from "../firebase.js";

const FIELDS = ["name", "tagline", "location", "cvUrl", "metaDescription"];

export function heroHandler(bot) {

  bot.command("hero", async ctx => {
    const db   = getDb();
    const snap = await db.collection("hero").doc("main").get();
    const data = snap.exists ? snap.data() : {};

    ctx.reply(
      `*Hero Section*\n\n` +
      `• Name: ${data.name || "—"}\n` +
      `• Tagline: ${data.tagline || "—"}\n` +
      `• Location: ${data.location || "—"}\n` +
      `• CV URL: ${data.cvUrl || "—"}\n` +
      `• Meta description: ${data.metaDescription || "—"}\n\n` +
      `Edit a field:\n` +
      `/hero_name\n/hero_tagline\n/hero_location\n/hero_cvurl\n/hero_meta`,
      { parse_mode: "Markdown" }
    );
  });

  // Generic field setter helper
  function makeFieldCmd(command, field, prompt) {
    bot.command(command, ctx => {
      ctx.session.step = `hero_${field}`;
      ctx.reply(prompt);
    });
  }

  makeFieldCmd("hero_name",     "name",            "Enter the full name (e.g. Anthony Kuiau):");
  makeFieldCmd("hero_tagline",  "tagline",          "Enter the tagline / job title:");
  makeFieldCmd("hero_location", "location",         "Enter the location (e.g. Port Moresby, PNG):");
  makeFieldCmd("hero_cvurl",    "cvUrl",            "Paste the CV download URL:");
  makeFieldCmd("hero_meta",     "metaDescription",  "Enter the SEO meta description:");

  // Handle text replies for hero fields
  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session?.step;
    if (!step?.startsWith("hero_")) return next();

    const field = step.replace("hero_", "");
    if (!FIELDS.includes(field)) return next();

    await getDb().collection("hero").doc("main").set(
      { [field]: ctx.message.text.trim() },
      { merge: true }
    );
    ctx.session.step = null;
    ctx.reply(`✅ Hero ${field} updated!`);
  });
}
