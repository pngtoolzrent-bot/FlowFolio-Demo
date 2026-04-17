// src/handlers/theme.js
// Changes are applied live on the frontend via onSnapshot
import { getDb } from "../firebase.js";

const COLOR_VARS = ["ink", "paper", "warm", "accent", "muted", "line"];

const PRESETS = {
  original: {
    ink: "#111010", paper: "#F5F2ED", warm: "#EDE9E1",
    accent: "#C8441B", muted: "#8A8578", line: "#D9D5CC",
  },
  dark: {
    ink: "#F5F2ED", paper: "#111010", warm: "#1A1A1A",
    accent: "#C8441B", muted: "#8A8578", line: "#2A2A2A",
  },
  ocean: {
    ink: "#0D1B2A", paper: "#F0F4F8", warm: "#E2EBF4",
    accent: "#1A73C8", muted: "#6B8FAF", line: "#C5D8EC",
  },
  forest: {
    ink: "#1A2A1A", paper: "#F4F7F2", warm: "#E8EFE4",
    accent: "#2D7A3A", muted: "#6A8C6A", line: "#C4D9C0",
  },
  monochrome: {
    ink: "#111111", paper: "#FAFAFA", warm: "#F0F0F0",
    accent: "#555555", muted: "#999999", line: "#DDDDDD",
  },
};

export function themeHandler(bot) {

  bot.command("theme", async ctx => {
    const db   = getDb();
    const snap = await db.collection("site").doc("theme").get();
    const data = snap.exists ? snap.data() : {};

    const current = COLOR_VARS.map(v => `• ${v}: ${data[v] || "default"}`).join("\n");
    const presetList = Object.keys(PRESETS).map(p => `/theme_${p}`).join("\n");

    ctx.reply(
      `*Theme / Colour Scheme*\n\n*Current:*\n${current}\n\n` +
      `*Presets:*\n${presetList}\n\n` +
      `/theme_custom — Set individual colour\n` +
      `/theme_reset — Reset to original`,
      { parse_mode: "Markdown" }
    );
  });

  // Apply presets
  Object.entries(PRESETS).forEach(([name, colors]) => {
    bot.command(`theme_${name}`, async ctx => {
      await getDb().collection("site").doc("theme").set(colors);
      ctx.reply(`✅ Theme set to *${name}*! Changes are live.`, { parse_mode: "Markdown" });
    });
  });

  // Custom colour
  bot.command("theme_custom", ctx => {
    ctx.session.step = "theme_custom_var";
    ctx.reply(
      `Which variable to change?\n\n${COLOR_VARS.map((v, i) => `${i + 1}. ${v}`).join("\n")}\n\nEnter number:`
    );
  });

  // Reset = original preset
  bot.command("theme_reset", async ctx => {
    await getDb().collection("site").doc("theme").set(PRESETS.original);
    ctx.reply("✅ Theme reset to original.");
  });

  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session?.step;
    if (!step?.startsWith("theme_")) return next();

    const db   = getDb();
    const text = ctx.message.text.trim();

    if (step === "theme_custom_var") {
      const idx = parseInt(text) - 1;
      if (isNaN(idx) || idx < 0 || idx >= COLOR_VARS.length) return ctx.reply("Enter 1-6.");
      ctx.session.tmp = { varName: COLOR_VARS[idx] };
      ctx.session.step = "theme_custom_value";
      return ctx.reply(`Enter hex colour for *${COLOR_VARS[idx]}* (e.g. #C8441B):`, { parse_mode: "Markdown" });
    }

    if (step === "theme_custom_value") {
      const hex = text.startsWith("#") ? text : `#${text}`;
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
        return ctx.reply("Invalid hex colour. Try again (e.g. #FF5733):");
      }
      await db.collection("site").doc("theme").set(
        { [ctx.session.tmp.varName]: hex },
        { merge: true }
      );
      ctx.session.step = null;
      ctx.session.tmp  = {};
      return ctx.reply(`✅ ${ctx.session.tmp?.varName || "Colour"} updated to ${hex}! Live now.`);
    }

    return next();
  });
}
