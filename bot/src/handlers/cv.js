// src/handlers/cv.js
// jobs schema:  { title, place, period, description, order }
// skillGroups:  { group, skills: [], order }
import { getDb } from "../firebase.js";

export function cvHandler(bot) {

  bot.command("cv", async ctx => {
    const db    = getDb();
    const [jobsSnap, skillsSnap] = await Promise.all([
      db.collection("jobs").orderBy("order").get(),
      db.collection("skillGroups").orderBy("order").get(),
    ]);

    const jobs   = jobsSnap.docs.map((d, i) => `${i + 1}. ${d.data().title} @ ${d.data().place}`).join("\n") || "—";
    const skills = skillsSnap.docs.map((d, i) => `${i + 1}. ${d.data().group}: ${(d.data().skills || []).join(", ")}`).join("\n") || "—";

    ctx.reply(
      `*CV / Experience*\n\n*Jobs:*\n${jobs}\n\n*Skill Groups:*\n${skills}\n\n` +
      `/cv_addjob — Add job\n` +
      `/cv_editjob — Edit job\n` +
      `/cv_deljob — Delete job\n` +
      `/cv_addgroup — Add skill group\n` +
      `/cv_editgroup — Edit skill group\n` +
      `/cv_delgroup — Delete skill group`,
      { parse_mode: "Markdown" }
    );
  });

  // ── ADD JOB ───────────────────────────────────────────────────────────────
  bot.command("cv_addjob", ctx => {
    ctx.session.step = "cv_addjob_title";
    ctx.session.tmp  = {};
    ctx.reply("New job — Step 1/4\n\n*Job title:*", { parse_mode: "Markdown" });
  });

  // ── EDIT JOB ──────────────────────────────────────────────────────────────
  bot.command("cv_editjob", async ctx => {
    const snap = await getDb().collection("jobs").orderBy("order").get();
    if (!snap.docs.length) return ctx.reply("No jobs yet.");
    const list = snap.docs.map((d, i) => `${i + 1}. ${d.data().title}`).join("\n");
    ctx.session.step = "cv_editjob_pick";
    ctx.session.tmp  = { docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    ctx.reply(`Select job to edit:\n\n${list}`);
  });

  // ── DELETE JOB ────────────────────────────────────────────────────────────
  bot.command("cv_deljob", async ctx => {
    const snap = await getDb().collection("jobs").orderBy("order").get();
    if (!snap.docs.length) return ctx.reply("No jobs yet.");
    const list = snap.docs.map((d, i) => `${i + 1}. ${d.data().title}`).join("\n");
    ctx.session.step = "cv_deljob_pick";
    ctx.session.tmp  = { docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    ctx.reply(`Select job to delete:\n\n${list}\n\nEnter number:`);
  });

  // ── ADD SKILL GROUP ───────────────────────────────────────────────────────
  bot.command("cv_addgroup", ctx => {
    ctx.session.step = "cv_addgroup_name";
    ctx.session.tmp  = {};
    ctx.reply("New skill group — *Group name* (e.g. Design Tools):", { parse_mode: "Markdown" });
  });

  // ── EDIT SKILL GROUP ──────────────────────────────────────────────────────
  bot.command("cv_editgroup", async ctx => {
    const snap = await getDb().collection("skillGroups").orderBy("order").get();
    if (!snap.docs.length) return ctx.reply("No skill groups yet.");
    const list = snap.docs.map((d, i) => `${i + 1}. ${d.data().group}`).join("\n");
    ctx.session.step = "cv_editgroup_pick";
    ctx.session.tmp  = { docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    ctx.reply(`Select group to edit:\n\n${list}`);
  });

  // ── DELETE SKILL GROUP ────────────────────────────────────────────────────
  bot.command("cv_delgroup", async ctx => {
    const snap = await getDb().collection("skillGroups").orderBy("order").get();
    if (!snap.docs.length) return ctx.reply("No skill groups yet.");
    const list = snap.docs.map((d, i) => `${i + 1}. ${d.data().group}`).join("\n");
    ctx.session.step = "cv_delgroup_pick";
    ctx.session.tmp  = { docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    ctx.reply(`Select group to delete:\n\n${list}\n\nEnter number:`);
  });

  // ── MESSAGE HANDLER ───────────────────────────────────────────────────────
  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session?.step;
    if (!step?.startsWith("cv_")) return next();

    const db   = getDb();
    const text = ctx.message.text.trim();
    const tmp  = ctx.session.tmp;

    // Add job wizard
    if (step === "cv_addjob_title") {
      tmp.title = text;
      ctx.session.step = "cv_addjob_place";
      return ctx.reply("Step 2/4 — *Place / Company:*", { parse_mode: "Markdown" });
    }
    if (step === "cv_addjob_place") {
      tmp.place = text;
      ctx.session.step = "cv_addjob_period";
      return ctx.reply("Step 3/4 — *Period* (e.g. Sep 2025 – Mar 2026):", { parse_mode: "Markdown" });
    }
    if (step === "cv_addjob_period") {
      tmp.period = text;
      ctx.session.step = "cv_addjob_desc";
      return ctx.reply("Step 4/4 — *Description:*", { parse_mode: "Markdown" });
    }
    if (step === "cv_addjob_desc") {
      const snap = await db.collection("jobs").orderBy("order","desc").limit(1).get();
      const maxOrder = snap.docs.length ? (snap.docs[0].data().order || 0) : 0;
      await db.collection("jobs").add({ ...tmp, description: text, order: maxOrder + 1 });
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Job added!");
    }

    // Edit job
    if (step === "cv_editjob_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.docs.length) return ctx.reply("Invalid.");
      ctx.session.tmp.editing = tmp.docs[idx];
      ctx.session.step = "cv_editjob_field";
      const j = tmp.docs[idx];
      return ctx.reply(
        `*Editing: ${j.title}*\n\n1. Title\n2. Place\n3. Period\n4. Description\n\nField number:`,
        { parse_mode: "Markdown" }
      );
    }
    if (step === "cv_editjob_field") {
      const fields = ["title","place","period","description"];
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= fields.length) return ctx.reply("Enter 1-4.");
      ctx.session.tmp.editField = fields[idx];
      ctx.session.step = "cv_editjob_value";
      return ctx.reply(`Current *${fields[idx]}*: ${tmp.editing[fields[idx]]}\n\nNew value:`, { parse_mode: "Markdown" });
    }
    if (step === "cv_editjob_value") {
      await db.collection("jobs").doc(tmp.editing.id).update({ [tmp.editField]: text });
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Job updated!");
    }

    // Delete job
    if (step === "cv_deljob_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.docs.length) return ctx.reply("Invalid.");
      await db.collection("jobs").doc(tmp.docs[idx].id).delete();
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Job deleted.");
    }

    // Add skill group
    if (step === "cv_addgroup_name") {
      tmp.groupName = text;
      ctx.session.step = "cv_addgroup_skills";
      return ctx.reply("Enter skills as comma-separated list:\nE.g. Adobe Illustrator, Figma, Canva");
    }
    if (step === "cv_addgroup_skills") {
      const skills = text.split(",").map(s => s.trim()).filter(Boolean);
      const snap = await db.collection("skillGroups").orderBy("order","desc").limit(1).get();
      const maxOrder = snap.docs.length ? (snap.docs[0].data().order || 0) : 0;
      await db.collection("skillGroups").add({ group: tmp.groupName, skills, order: maxOrder + 1 });
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Skill group added!");
    }

    // Edit skill group
    if (step === "cv_editgroup_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.docs.length) return ctx.reply("Invalid.");
      ctx.session.tmp.editing = tmp.docs[idx];
      ctx.session.step = "cv_editgroup_field";
      return ctx.reply(`*Editing: ${tmp.docs[idx].group}*\n\n1. Group name\n2. Skills list\n\nField:`, { parse_mode: "Markdown" });
    }
    if (step === "cv_editgroup_field") {
      ctx.session.tmp.editField = text === "1" ? "group" : "skills";
      ctx.session.step = "cv_editgroup_value";
      const current = tmp.editField === "skills"
        ? (tmp.editing.skills || []).join(", ")
        : tmp.editing.group;
      return ctx.reply(`Current: ${current || "—"}\n\nNew value${tmp.editField === "skills" ? " (comma-separated)" : ""}:`);
    }
    if (step === "cv_editgroup_value") {
      const val = tmp.editField === "skills"
        ? text.split(",").map(s => s.trim()).filter(Boolean)
        : text;
      await db.collection("skillGroups").doc(tmp.editing.id).update({ [tmp.editField]: val });
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Skill group updated!");
    }

    // Delete skill group
    if (step === "cv_delgroup_pick") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= tmp.docs.length) return ctx.reply("Invalid.");
      await db.collection("skillGroups").doc(tmp.docs[idx].id).delete();
      ctx.session.step = null; ctx.session.tmp = {};
      return ctx.reply("✅ Skill group deleted.");
    }

    return next();
  });
}
