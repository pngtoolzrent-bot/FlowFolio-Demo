// js/main.js
import { db } from "./firebase.js";
import {
  doc, collection, getDocs, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── PAGE LOADER ─── */
function showLoader() {
  const loader = document.createElement("div");
  loader.id = "page-loader";
  loader.innerHTML = `<div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div>`;
  document.body.prepend(loader);
}
function hideLoader() {
  const l = document.getElementById("page-loader");
  if (l) { l.classList.add("hidden"); setTimeout(() => l.remove(), 600); }
}

/* ─── THEME ─── */
function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  const map = {
    ink:    "--ink",
    paper:  "--paper",
    warm:   "--warm",
    accent: "--accent",
    muted:  "--muted",
    line:   "--line",
  };
  Object.entries(map).forEach(([key, cssVar]) => {
    if (theme[key]) root.style.setProperty(cssVar, theme[key]);
  });
}

/* ─── HERO ─── */
function renderHero(data) {
  if (!data) return;
  const setHTML = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerHTML = val; };
  const setText = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.textContent = val; };

  if (data.name) {
    const parts = data.name.split(" ");
    const last  = parts.pop();
    document.getElementById("hero-name").innerHTML = `${parts.join(" ")}<br/><em>${last}</em>`;
    document.getElementById("nav-logo-text").innerHTML = `${parts.join(" ")} <span>${last}</span>`;
    document.getElementById("site-title").textContent = `${data.name} — ${data.tagline || ""}`;
    document.getElementById("footer-name").textContent = data.name;
    document.getElementById("footer-copy").textContent = `© ${new Date().getFullYear()} ${data.name}. All rights reserved.`;
  }
  setText("hero-tag",  data.tagline);
  setText("hero-sub",  data.location);
  if (data.cvUrl) {
    document.getElementById("hero-cv-link").href = data.cvUrl;
    document.getElementById("contact-cv-link").href = data.cvUrl;
  }
  if (data.metaDescription)
    document.getElementById("site-description").content = data.metaDescription;
}

/* ─── ABOUT ─── */
function renderAbout(data) {
  if (!data) return;
  const bodyEl = document.getElementById("about-body");
  if (data.paragraphs && bodyEl) {
    bodyEl.innerHTML = data.paragraphs.map(p => `<p>${p}</p>`).join("");
  }
  if (data.heading) document.getElementById("about-heading").innerHTML = data.heading;
  if (data.eyebrow) document.getElementById("about-eyebrow").textContent = data.eyebrow;

  // Stats
  const statsEl = document.getElementById("stats-col");
  if (data.stats && statsEl) {
    statsEl.innerHTML = data.stats.map((s, i) =>
      `<div class="stat${i === 2 ? " accent-stat" : ""}">
        <span class="stat-num">${s.value}</span>
        <span class="stat-label">${s.label}</span>
      </div>`
    ).join("");
  }
}

/* ─── CV / EXPERIENCE ─── */
function renderCV(jobs, skillGroups) {
  const timeline = document.getElementById("cv-timeline");
  if (timeline && jobs) {
    timeline.innerHTML = jobs.map((j, i) =>
      `<div class="cv-entry">
        <div class="cv-dot-col">
          <div class="cv-dot"></div>
          ${i < jobs.length - 1 ? '<div class="cv-line"></div>' : ""}
        </div>
        <div>
          <div class="cv-year">${j.period}</div>
          <div class="cv-body">
            <div class="cv-title">${j.title}</div>
            <div class="cv-place">${j.place}</div>
            <div class="cv-desc">${j.description}</div>
          </div>
        </div>
      </div>`
    ).join("");
  }

  const skillsEl = document.getElementById("skills-block");
  if (skillsEl && skillGroups) {
    skillsEl.innerHTML = skillGroups.map(g =>
      `<div>
        <div class="skill-group-label">${g.group}</div>
        <div class="skill-tags">${g.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}</div>
      </div>`
    ).join("");
  }
}

/* ─── CONTACT ─── */
function renderContact(data) {
  if (!data) return;
  if (data.heading) document.getElementById("contact-heading").innerHTML = data.heading;
  if (data.body)    document.getElementById("contact-body").textContent = data.body;
  if (data.email) {
    document.getElementById("contact-email-text").textContent = data.email;
    document.getElementById("contact-email-link").href  = `mailto:${data.email}`;
    document.getElementById("contact-email-btn").href   = `mailto:${data.email}`;
  }

  const socialEl = document.getElementById("social-row");
  if (data.socials && socialEl) {
    socialEl.innerHTML = data.socials.map(s =>
      `<a href="${s.url}" class="social-link" target="_blank" rel="noopener">${s.label}</a>`
    ).join("");
  }
}

/* ─── SCROLL / NAV ─── */
function initNav() {
  const nav      = document.getElementById("nav");
  const sections = [...document.querySelectorAll("section[id]")];
  const navLinks = document.querySelectorAll(".nav-links a");

  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    let cur = "";
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) cur = s.id; });
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${cur}`));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop - nav.offsetHeight, behavior: "smooth" });
      closeMenu();
    });
  });

  const burger = document.querySelector(".burger");
  const drawer = document.querySelector(".drawer");
  function closeMenu() {
    burger.classList.remove("open");
    drawer.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  window.closeMenu = closeMenu;

  burger.addEventListener("click", () => {
    const isOpen = drawer.classList.contains("open");
    if (isOpen) { closeMenu(); }
    else {
      burger.classList.add("open");
      drawer.classList.add("open");
      burger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
}

/* ─── REVEAL ON SCROLL ─── */
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add("in"), i * 60);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -32px 0px" });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

/* ─── BOOT ─── */
async function boot() {
  showLoader();
  try {
    // Listen to theme changes in real-time
    onSnapshot(doc(db, "site", "theme"), snap => {
      applyTheme(snap.exists() ? snap.data() : null);
    });

    const [
      heroSnap, aboutSnap, contactSnap,
      jobsSnap, skillsSnap
    ] = await Promise.all([
      getDocs(query(collection(db, "hero"))),
      getDocs(query(collection(db, "about"))),
      getDocs(query(collection(db, "contact"))),
      getDocs(query(collection(db, "jobs"),    orderBy("order"))),
      getDocs(query(collection(db, "skillGroups"), orderBy("order"))),
    ]);

    // hero / about / contact are single-doc collections keyed "main"
    const hero    = heroSnap.docs.find(d => d.id === "main")?.data();
    const about   = aboutSnap.docs.find(d => d.id === "main")?.data();
    const contact = contactSnap.docs.find(d => d.id === "main")?.data();
    const jobs    = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const skillGroups = skillsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderHero(hero);
    renderAbout(about);
    renderCV(jobs, skillGroups);
    renderContact(contact);

  } catch (err) {
    console.error("Failed to load site data:", err);
  } finally {
    hideLoader();
    initNav();
    initReveal();
  }
}

document.addEventListener("DOMContentLoaded", boot);
