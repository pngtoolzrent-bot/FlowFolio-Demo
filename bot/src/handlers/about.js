// src/handlers/about.js
import { getDb } from "../firebase.js";

export function aboutHandler(bot) {

  bot.command("about", async ctx => {
    const db   = getDb();
    const snap = await db.collection("about").doc("main").get();
    const data = snap.exists ? snap.data() : {};

    const paragraphs = (data.paragraphs || []).map((p, i) => `${i + 1}. ${p}`).join("\n") || "—";
    const stats = (data.stats || []).map(s => `• ${s.value} — ${s.label}`).join("\n") || "—";

    ctx.reply(
      `*About Section*\n\n` +
      `*Heading:* ${data.heading || "—"}\n\n` +
      `*Paragraphs:*\n${paragraphs}\n\n` +
      `*Stats:*\n${stats}\n\n` +
      `Edit:\n` +
      `/about_heading — Change heading\n` +
      `/about_addpara — Add paragraph\n` +
      `/about_editpara — Edit a paragraph\n` +
      `/about_delpara — Delete a paragraph\n` +
      `/about_addstat — Add stat\n` +
      `/about_delstat — Delete stat`,
      { parse_mode: "Markdown" }
    );
  });

  // ── Heading ──────────────────────────────────────────────────────────────
  bot.command("about_heading", ctx => {
    ctx.session.step = "about_heading";
    ctx.reply("Enter new heading (use \\n for line breaks, e.g. Design that\\nconnects.):");
  });

  // ── Add paragraph ─────────────────────────────────────────────────────────
  bot.command("about_addpara", ctx => {
    ctx.session.step = "about_addpara";
    ctx.reply("Type the new paragraph to add:");
  });

  // ── Edit paragraph ────────────────────────────────────────────────────────
  bot.command("about_editpara", async ctx => {
    const snap = await getDb().collection("about").doc("main").get();
    const paragraphs = snap.data()?.paragraphs || [];
    if (!paragraphs.length) return ctx.reply("No paragraphs yet.");
    const list = paragraphs.map((p, i) => `${i + 1}. ${p}`).join("\n");
    ctx.session.step = "about_editpara_idx";
    ctx.reply(`Paragraphs:\n${list}\n\nEnter the number of the paragraph to edit:`);
  });

  // ── Delete paragraph ──────────────────────────────────────────────────────
  bot.command("about_delpara", async ctx => {
    const snap = await getDb().collection("about").doc("main").get();
    const paragraphs = snap.data()?.paragraphs || [];
    if (!paragraphs.length) return ctx.reply("No paragraphs yet.");
    const list = paragraphs.map((p, i) => `${i + 1}. ${p.substring(0, 60)}...`).join("\n");
    ctx.session.step = "about_delpara_idx";
    ctx.reply(`Paragraphs:\n${list}\n\nEnter the number to delete:`);
  });

  // ── Add stat ──────────────────────────────────────────────────────────────
  bot.command("about_addstat", ctx => {
    ctx.session.step = "about_addstat";
    ctx.reply('Enter stat in format: VALUE | LABEL\nExample: 4+ | Years experience');
  });

  // ── Delete stat ───────────────────────────────────────────────────────────
  bot.command("about_delstat", async ctx => {
    const snap  = await getDb().collection("about").doc("main").get();
    const stats = snap.data()?.stats || [];
    if (!stats.length) return ctx.reply("No stats yet.");
    const list = stats.map((s, i) => `${i + 1}. ${s.value} — ${s.label}`).join("\n");
    ctx.session.step = "about_delstat_idx";
    ctx.reply(`Stats:\n${list}\n\nEnter the number to delete:`);
  });

  // ── Message handler ───────────────────────────────────────────────────────
  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session?.step;
    const db   = getDb();
    const text = ctx.message.text.trim();
    const ref  = db.collection("about").doc("main");

    if (step === "about_heading") {
      await ref.set({ heading: text.replace(/\\n/g, "<br/>") }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ About heading updated!");
    }

    if (step === "about_addpara") {
      const snap = await ref.get();
      const paras = snap.data()?.paragraphs || [];
      paras.push(text);
      await ref.set({ paragraphs: paras }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Paragraph added!");
    }

    if (step === "about_editpara_idx") {
      const idx = parseInt(text) - 1;
      const snap = await ref.get();
      const paras = snap.data()?.paragraphs || [];
      if (isNaN(idx) || idx < 0 || idx >= paras.length) return ctx.reply("Invalid number.");
      ctx.session.tmp.editParaIdx = idx;
      ctx.session.step = "about_editpara_text";
      return ctx.reply(`Current text:\n${paras[idx]}\n\nEnter new text:`);
    }

    if (step === "about_editpara_text") {
      const snap = await ref.get();
      const paras = snap.data()?.paragraphs || [];
      paras[ctx.session.tmp.editParaIdx] = text;
      await ref.set({ paragraphs: paras }, { merge: true });
      ctx.session.step = null;
      ctx.session.tmp  = {};
      return ctx.reply("✅ Paragraph updated!");
    }

    if (step === "about_delpara_idx") {
      const idx = parseInt(text) - 1;
      const snap = await ref.get();
      const paras = snap.data()?.paragraphs || [];
      if (isNaN(idx) || idx < 0 || idx >= paras.length) return ctx.reply("Invalid number.");
      paras.splice(idx, 1);
      await ref.set({ paragraphs: paras }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Paragraph deleted!");
    }

    if (step === "about_addstat") {
      const parts = text.split("|").map(s => s.trim());
      if (parts.length !== 2) return ctx.reply("Format: VALUE | LABEL");
      const snap  = await ref.get();
      const stats = snap.data()?.stats || [];
      stats.push({ value: parts[0], label: parts[1] });
      await ref.set({ stats }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Stat added!");
    }

    if (step === "about_delstat_idx") {
      const idx  = parseInt(text) - 1;
      const snap = await ref.get();
      const stats = snap.data()?.stats || [];
      if (isNaN(idx) || idx < 0 || idx >= stats.length) return ctx.reply("Invalid number.");
      stats.splice(idx, 1);
      await ref.set({ stats }, { merge: true });
      ctx.session.step = null;
      return ctx.reply("✅ Stat deleted!");
    }

    return next();
  });
}
