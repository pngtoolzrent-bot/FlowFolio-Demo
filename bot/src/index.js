// src/index.js
import "dotenv/config";
import { Bot, session } from "grammy";
import { initFirebase }  from "./firebase.js";
import { heroHandler }    from "./handlers/hero.js";
import { aboutHandler }   from "./handlers/about.js";
import { portfolioHandler } from "./handlers/portfolio.js";
import { cvHandler }      from "./handlers/cv.js";
import { contactHandler } from "./handlers/contact.js";
import { themeHandler }   from "./handlers/theme.js";

// ─── Init ───────────────────────────────────────────────────────────────────
initFirebase();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Only allow the owner
const ADMIN_ID = Number(process.env.TELEGRAM_ADMIN_ID);
bot.use(async (ctx, next) => {
  if (ctx.from?.id !== ADMIN_ID) {
    return ctx.reply("⛔ Unauthorised.");
  }
  return next();
});

// Simple session for multi-step wizards
bot.use(session({ initial: () => ({ step: null, tmp: {} }) }));

// ─── Register handlers ───────────────────────────────────────────────────────
heroHandler(bot);
aboutHandler(bot);
portfolioHandler(bot);
cvHandler(bot);
contactHandler(bot);
themeHandler(bot);

// ─── Main menu ───────────────────────────────────────────────────────────────
bot.command("start", ctx => ctx.reply(
  `👋 *Portfolio Admin Bot*\n\nChoose what to manage:\n\n` +
  `/hero       — Edit hero section\n` +
  `/about      — Edit about & stats\n` +
  `/portfolio  — Add / edit / delete projects\n` +
  `/cv         — Manage work history & skills\n` +
  `/contact    — Edit contact info & social links\n` +
  `/theme      — Change colour scheme\n` +
  `/cancel     — Cancel current operation`,
  { parse_mode: "Markdown" }
));

bot.command("cancel", ctx => {
  ctx.session.step = null;
  ctx.session.tmp  = {};
  ctx.reply("✅ Cancelled.");
});

bot.command("help", ctx => ctx.reply(
  `*Commands:*\n/start — Main menu\n/hero — Hero section\n/about — About section\n/portfolio — Portfolio projects\n/cv — Work history & skills\n/contact — Contact info\n/theme — Colour scheme\n/cancel — Cancel wizard`,
  { parse_mode: "Markdown" }
));

// ─── Start ───────────────────────────────────────────────────────────────────
bot.catch(err => console.error("Bot error:", err));
bot.start({ onStart: () => console.log("✅ Bot running") });
