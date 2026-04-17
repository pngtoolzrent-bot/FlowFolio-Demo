// src/handlers/portfolio.js
// Projects schema: { title, category, description, imageUrl, videoUrl, link, order, featured }
// imageUrl: external URL (e.g. Cloudinary, Imgur, GitHub raw, etc.)
// videoUrl: YouTube URL — will be embedded
import { getDb } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const CATEGORIES = ["branding", "print", "digital", "identity", "other"];

export function portfolioHandler(bot) {

  // ── List projects ─────────────────────────────────────────────────────────
  bot.command("portfolio", async ctx => {
    const db   = getDb();
    const snap = await db.collection("projects").orderBy("order").get();
    const projects = snap.docs.map((d, i) => ({ id: d.id, ...d.data(), _idx: i + 1 }));

    if (!projects.length) {
      return ctx.reply(
        `*Portfolio — No projects yet*\n\n` +
        `/port_add — Add first project`,
        { parse_mode: "Markdown" }
      );
    }

    const list = projects.map(p =>
      `${p._idx}. *${p.title}* [${p.category}]${p.videoUrl ? " 🎬" : p.imageUrl ? " 🖼" : ""}`
    ).join("\n");

    ctx.reply(
      `*Portfolio Projects (${projects.length})*\n\n${list}\n\n` +
      `/port_add — Add project\n` +
      `/port_edit — Edit project\n` +
      `/port_del — Delete project\n` +
      `/port_reorder — Change display order`,
      { parse_mode: "Markdown" }
    );
  });

  // ── Add project ───────────────────────────────────────────────────────────
  bot.command("port_add", ctx => {
    ctx.session.step = "port_add_title";
    ctx.session.tmp  = {};
    ctx.reply("📝 New project — Step 1/6\n\nEnter project *title*:", { parse_mode: "Markdown" });
  });

  // ── Edit project ──────────────────────────────────────────────────────────
  bot.command("port_edit", async ctx => {
    const snap = await getDb().collection("projects").orderBy("order").get();
    const list = snap.docs.map((d, i) => `${i + 1}. ${d.data().title} [${d.data().category}]`).join("\n");
    if (!snap.docs.length) return ctx.reply("No projects yet. Use /port_add");
    ctx.session.step = "port_edit_pick";
    ctx.session.tmp  = { docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    ctx.reply(`Select project number to edit:\n\n${list}`);
  });

  // ── Delete project ────────────────────────────────────────────────────────
  bot.command("port_del", async ctx => {
    const snap = await getDb().collection("projects").orderBy("order").get();
    if (!snap.docs.length) return ctx.reply("No projects yet.");
    const list = snap.docs.map((d, i) => `${i + 1}. ${d.data().title}`).join("\n");
    ctx.session.step = "port_del_pick";
    ctx.session.tmp  = { docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    ctx.reply(`Which project to *delete*?\n\n${list}\n\nEnter number (or /cancel):`, { parse_mode: "Markdown" });
  });

  // ── Reorder ───────────────────────────────────────────────────────────────
  bot.command("port_reorder", async ctx => {
    const snap = await getDb().collection("projects").orderBy("order").get();
    if (!snap.docs.length) return ctx.reply("No projects yet.");
    const list = snap.docs.map((d, i) => `${i + 1}. ${d.data().title}`).join("\n");
    ctx.session.step = "port_reorder";
    ctx.session.tmp  = { docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    ctx.reply(
      `Current order:\n${list}\n\n` +
      `Enter new order as comma-separated numbers.\nE.g. \`3,1,2\` to put #3 first:`,
      { parse_mode: "Markdown" }
    );
  });

  // ── Message handler ───────────────────────────────────────────────────────
  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session?.step;
    if (!step?.startsWith("port_")) return next();

    const db   = getDb();
    const text = ctx.message.text.trim();
    const tmp  = ctx.session.tmp;

    // ── ADD WIZARD ──────────────────────────────────────────────────────────
    if (step === "port_add_title") {
      tmp.title = text;
      ctx.session.step = "port_add_category";
      return ctx.reply(
        `Step 2/6 — *Category*\n\nAvailable: ${CATEGORIES.join(", ")}\n\nEnter category:`,
        { parse_mode: "Markdown" }
      );
    }

    if (step === "port_add_category") {
      const cat = text.toLowerCase();
      if (!CATEGORIES.includes(cat)) return ctx.reply(`Invalid. Choose: ${CATEGORIES.join(", ")}`);
      tmp.category = cat;
      ctx.session.step = "port_add_desc";
      return ctx.reply("Step 3/6 — *Description* (or type `skip`)", { parse_mode: "Markdown" });
    }

    if (step === "port_add_desc") {
      tmp.description = text === "skip" ? "" : text;
      ctx.session.step = "port_add_image";
      return ctx.reply(
        "Step 4/6 — *Image URL*\n\nPaste a direct image URL (Imgur, Cloudinary, GitHub raw, etc.)\nType `skip` if none.",
        { parse_mode: "Markdown" }
      );
    }

    if (step === "port_add_image") {
      tmp.imageUrl = text === "skip" ? "" : text;
      ctx.session.step = "port_add_video";
      return ctx.reply(
        "Step 5/6 — *YouTube URL*\n\nPaste a YouTube video URL to embed (or `skip`)",
        { parse_mode: "Markdown" }
      );
    }

    if (step === "port_add_video") {
      tmp.videoUrl = text === "skip" ? "" : text;
      ctx.session.step = "port_add_link";
      return ctx.reply("Step 6/6 — *External project link* (or `skip`)", { parse_mode: "Markdown" });
    }

    if (step === "port_add_link") {
      tmp.link = text === "skip" ? "" : text;

      // Get current max order
      const snap = await db.collection("projects").orderBy("order", "desc").limit(1).get();
      const maxOrder = snap.docs.length ? (snap.docs[0].data().order || 0) : 0;

      await db.collection("projects").add({
        title:       tmp.title,
        category:    tmp.category,
        description: tmp.description,
        imageUrl:    tmp.imageUrl,
        videoUrl:    tmp.videoUrl,
        link:        tmp.link,
        order:       maxOrder + 1,
        featured:    false,
        createdAt:   new Date().toISOString(),
      });

      ctx.session.step = null;
      ctx.session.tmp  = {};
      return ctx.reply(`✅ Project *${tmp.title}* added!`, { parse_mode: "Markdown" });
    }

    // ── EDIT PICK ───────────────────────────────────────────────────────────
    if (step === "port_edit_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.docs.length) return ctx.reply("Invalid number.");
      ctx.session.tmp.editing = tmp.docs[idx];
      ctx.session.step = "port_edit_field";
      const p = tmp.docs[idx];
      return ctx.reply(
        `*Editing: ${p.title}*\n\n` +
        `Which field to edit?\n` +
        `1. Title (${p.title})\n` +
        `2. Category (${p.category})\n` +
        `3. Description\n` +
        `4. Image URL\n` +
        `5. YouTube URL\n` +
        `6. External link\n\nEnter number:`,
        { parse_mode: "Markdown" }
      );
    }

    if (step === "port_edit_field") {
      const fields = ["title","category","description","imageUrl","videoUrl","link"];
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= fields.length) return ctx.reply("Enter 1-6.");
      ctx.session.tmp.editField = fields[idx];
      ctx.session.step = "port_edit_value";
      const current = tmp.editing[fields[idx]] || "(empty)";
      return ctx.reply(`Current *${fields[idx]}*: ${current}\n\nEnter new value:`, { parse_mode: "Markdown" });
    }

    if (step === "port_edit_value") {
      const { editing, editField } = tmp;
      await db.collection("projects").doc(editing.id).update({ [editField]: text });
      ctx.session.step = null;
      ctx.session.tmp  = {};
      return ctx.reply(`✅ Project *${editing.title}* — ${editField} updated!`, { parse_mode: "Markdown" });
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (step === "port_del_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.docs.length) return ctx.reply("Invalid number.");
      ctx.session.tmp.delProject = tmp.docs[idx];
      ctx.session.step = "port_del_confirm";
      return ctx.reply(`⚠️ Delete *${tmp.docs[idx].title}*? Type YES to confirm.`, { parse_mode: "Markdown" });
    }

    if (step === "port_del_confirm") {
      if (text !== "YES") { ctx.session.step = null; return ctx.reply("Cancelled."); }
      await db.collection("projects").doc(tmp.delProject.id).delete();
      ctx.session.step = null;
      ctx.session.tmp  = {};
      return ctx.reply(`✅ Project deleted.`);
    }

    // ── REORDER ─────────────────────────────────────────────────────────────
    if (step === "port_reorder") {
      const nums = text.split(",").map(n => parseInt(n.trim()) - 1);
      if (nums.some(n => isNaN(n) || n < 0 || n >= tmp.docs.length)) {
        return ctx.reply("Invalid input. Use comma-separated numbers matching the list.");
      }
      const batch = db.batch();
      nums.forEach((origIdx, newOrder) => {
        const docId = tmp.docs[origIdx].id;
        batch.update(db.collection("projects").doc(docId), { order: newOrder + 1 });
      });
      await batch.commit();
      ctx.session.step = null;
      ctx.session.tmp  = {};
      return ctx.reply("✅ Order updated!");
    }

    return next();
  });
}
