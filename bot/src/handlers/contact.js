// src/handlers/contact.js
import { getDb } from "../firebase.js";

export function contactHandler(bot) {

  bot.command("contact", async ctx => {
    const db   = getDb();
    const snap = await db.collection("contact").doc("main").get();
    const data = snap.exists ? snap.data() : {};
    const socials = (data.socials || []).map((s, i) => `${i + 1}. ${s.label}: ${s.url}`).join("\n") || "—";

    ctx.reply(
      `*Contact Section*\n\n` +
      `• Heading: ${data.heading || "—"}\n` +
      `• Body: ${data.body || "—"}\n` +
      `• Email: ${data.email || "—"}\n\n` +
      `*Social Links:*\n${socials}\n\n` +
      `/contact_heading — Edit heading\n` +
      `/contact_body — Edit body text\n` +
      `/contact_email — Change email\n` +
      `/contact_addsocial — Add social link\n` +
      `/contact_editsocial — Edit social link\n` +
      `/contact_delsocial — Remove social link`,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("contact_heading", ctx => { ctx.session.step = "contact_heading"; ctx.reply("New heading (use \\n for line breaks):"); });
  bot.command("contact_body",    ctx => { ctx.session.step = "contact_body";    ctx.reply("New body text:"); });
  bot.command("contact_email",   ctx => { ctx.session.step = "contact_email";   ctx.reply("New email address:"); });

  bot.command("contact_addsocial", ctx => {
    ctx.session.step = "contact_addsocial";
    ctx.reply("Add social link in format: LABEL | URL\nE.g. LinkedIn | https://linkedin.com/in/yourprofile");
  });

  bot.command("contact_editsocial", async ctx => {
    const snap = await getDb().collection("contact").doc("main").get();
    const socials = snap.data()?.socials || [];
    if (!socials.length) return ctx.reply("No social links yet.");
    const list = socials.map((s, i) => `${i + 1}. ${s.label}: ${s.url}`).join("\n");
    ctx.session.step = "contact_editsocial_pick";
    ctx.session.tmp  = { socials };
    ctx.reply(`Social links:\n${list}\n\nEnter number to edit:`);
  });

  bot.command("contact_delsocial", async ctx => {
    const snap = await getDb().collection("contact").doc("main").get();
    const socials = snap.data()?.socials || [];
    if (!socials.length) return ctx.reply("No social links yet.");
    const list = socials.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
    ctx.session.step = "contact_delsocial_pick";
    ctx.session.tmp  = { socials };
    ctx.reply(`Social links:\n${list}\n\nEnter number to delete:`);
  });

  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session?.step;
    if (!step?.startsWith("contact_")) return next();

    const db   = getDb();
    const text = ctx.message.text.trim();
    const ref  = db.collection("contact").doc("main");
    const tmp  = ctx.session.tmp;

    if (step === "contact_heading") {
      await ref.set({ heading: text.replace(/\\n/g, "<br/>") }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Contact heading updated!");
    }
    if (step === "contact_body") {
      await ref.set({ body: text }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Contact body updated!");
    }
    if (step === "contact_email") {
      await ref.set({ email: text }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Email updated!");
    }

    if (step === "contact_addsocial") {
      const parts = text.split("|").map(s => s.trim());
      if (parts.length !== 2) return ctx.reply("Format: LABEL | URL");
      const snap    = await ref.get();
      const socials = snap.data()?.socials || [];
      socials.push({ label: parts[0], url: parts[1] });
      await ref.set({ socials }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Social link added!");
    }

    if (step === "contact_editsocial_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.socials.length) return ctx.reply("Invalid.");
      ctx.session.tmp.editIdx = idx;
      ctx.session.step = "contact_editsocial_value";
      const s = tmp.socials[idx];
      return ctx.reply(`Current: ${s.label} | ${s.url}\n\nEnter new value (LABEL | URL):`);
    }
    if (step === "contact_editsocial_value") {
      const parts = text.split("|").map(s => s.trim());
      if (parts.length !== 2) return ctx.reply("Format: LABEL | URL");
      const snap    = await ref.get();
      const socials = snap.data()?.socials || [];
      socials[tmp.editIdx] = { label: parts[0], url: parts[1] };
      await ref.set({ socials }, { merge: true });
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Social link updated!");
    }

    if (step === "contact_delsocial_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.socials.length) return ctx.reply("Invalid.");
      tmp.socials.splice(idx, 1);
      await ref.set({ socials: tmp.socials }, { merge: true });
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Social link removed!");
    }

    return next();
  });
}
