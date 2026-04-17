// js/portfolio.js
import { db } from "./firebase.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── YOUTUBE HELPER ─── */
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function buildThumbnail(project) {
  // If it has a YouTube URL, show thumbnail image (clickable to open modal with embed)
  const ytId = extractYouTubeId(project.videoUrl);
  if (ytId) {
    return `<img
      src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg"
      alt="${project.title}"
      loading="lazy"
    />`;
  }
  if (project.imageUrl) {
    return `<img src="${project.imageUrl}" alt="${project.title}" loading="lazy" />`;
  }
  return `<div class="port-ph">
    <div class="port-ph-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    </div>
    <span>No image yet</span>
  </div>`;
}

/* ─── FILTER ROW ─── */
function buildFilters(projects) {
  const categories = ["all", ...new Set(projects.map(p => p.category).filter(Boolean))];
  const row = document.getElementById("filter-row");
  if (!row) return;
  row.innerHTML = categories.map(cat =>
    `<button class="filter-btn${cat === "all" ? " active" : ""}" data-filter="${cat}">
      ${cat.charAt(0).toUpperCase() + cat.slice(1)}
    </button>`
  ).join("");

  row.addEventListener("click", e => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    row.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    document.querySelectorAll(".port-item").forEach(item => {
      item.classList.toggle("hidden", f !== "all" && item.dataset.category !== f);
    });
  });
}

/* ─── MODAL ─── */
function openModal(project) {
  const modal   = document.getElementById("port-modal");
  const content = document.getElementById("port-modal-content");
  const ytId    = extractYouTubeId(project.videoUrl);

  let mediaHtml = "";
  if (ytId) {
    mediaHtml = `<div class="port-modal-media">
      <iframe
        src="https://www.youtube.com/embed/${ytId}"
        title="${project.title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    </div>`;
  } else if (project.imageUrl) {
    mediaHtml = `<div class="port-modal-media"><img src="${project.imageUrl}" alt="${project.title}" /></div>`;
  }

  content.innerHTML = `
    ${mediaHtml}
    <div class="port-modal-cat">${project.category || ""}</div>
    <div class="port-modal-title">${project.title}</div>
    <div class="port-modal-desc">${project.description || ""}</div>
    ${project.link ? `<p style="margin-top:16px"><a href="${project.link}" target="_blank" rel="noopener" class="btn btn-fill">View project</a></p>` : ""}
  `;

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("port-modal");
  modal.style.display = "none";
  document.body.style.overflow = "";
}

/* ─── RENDER GRID ─── */
function renderPortfolio(projects) {
  const grid = document.getElementById("port-grid");
  if (!grid) return;

  if (!projects.length) {
    grid.innerHTML = `<p style="color:var(--muted);font-size:14px;">No projects yet. Add some via the Telegram bot.</p>`;
    return;
  }

  grid.innerHTML = projects.map(p =>
    `<article class="port-item reveal" data-category="${p.category || "other"}" data-id="${p.id}">
      <div class="port-thumb">${buildThumbnail(p)}</div>
      <div class="port-info">
        <div>
          <div class="port-title">${p.title}</div>
          <div class="port-cat">${p.category || ""}</div>
        </div>
        <div class="port-arrow">↗</div>
      </div>
    </article>`
  ).join("");

  // Click to open modal
  grid.addEventListener("click", e => {
    const item = e.target.closest(".port-item");
    if (!item) return;
    const id = item.dataset.id;
    const project = projects.find(p => p.id === id);
    if (project) openModal(project);
  });

  // Re-trigger reveal for new elements
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add("in"), i * 60);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -32px 0px" });
  grid.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

/* ─── MODAL CLOSE HANDLERS ─── */
document.addEventListener("DOMContentLoaded", () => {
  const modal   = document.getElementById("port-modal");
  const closeBtn = document.querySelector(".port-modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.querySelector(".port-modal-backdrop")?.addEventListener("click", closeModal);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  }
});

/* ─── BOOT ─── */
async function bootPortfolio() {
  try {
    const snap = await getDocs(query(collection(db, "projects"), orderBy("order")));
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    buildFilters(projects);
    renderPortfolio(projects);
  } catch (err) {
    console.error("Portfolio load failed:", err);
  }
}

document.addEventListener("DOMContentLoaded", bootPortfolio);
