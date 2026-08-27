/* ============================================================
   OmarOS — portfolio interactif
   ============================================================ */

/* ---------------- BOOT SEQUENCE ---------------- */
const bootLines = [
  "OmarOS v1.0 — initializing kernel...",
  "Mounting /home/omar ................ [ OK ]",
  "Loading network stack (TCP/IP, VLAN) [ OK ]",
  "Starting Docker daemon .............. [ OK ]",
  "Starting k3s cluster ................ [ OK ]",
  "Loading security modules (Wazuh) .... [ OK ]",
  "Checking certifications.db .......... [ OK ]",
  "Authenticating: omar.benmansour ..... [ OK ]",
];

function runBoot() {
  const log = document.getElementById("boot-log");
  let i = 0;
  const interval = setInterval(() => {
    if (i >= bootLines.length) {
      clearInterval(interval);
      const final = document.createElement("div");
      final.className = "final";
      final.textContent = "Welcome, Omar Benmansour.";
      log.appendChild(final);
      setTimeout(showDesktop, 550);
      return;
    }
    const raw = bootLines[i];
    const line = document.createElement("div");
    line.className = "line-ok";
    if (raw.includes("[ OK ]")) {
      line.innerHTML = raw.replace("[ OK ]", '<span class="tag-ok">[ OK ]</span>');
    } else {
      line.textContent = raw;
    }
    log.appendChild(line);
    i++;
  }, 220);
}

function showDesktop() {
  document.getElementById("boot-screen").style.display = "none";
  const desktop = document.getElementById("desktop");
  desktop.classList.remove("hidden");
  requestAnimationFrame(() => desktop.classList.add("show"));
}

/* Skip boot if user prefers reduced motion */
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  showDesktop();
  document.getElementById("boot-screen").style.display = "none";
} else {
  runBoot();
}

/* ---------------- CLOCK ---------------- */
function tickClock() {
  const el = document.getElementById("clock");
  const now = new Date();
  el.textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
setInterval(tickClock, 1000);
tickClock();

/* ============================================================
   APP CONTENT
   ============================================================ */

const APPS = {
  about: {
    title: "systeminfo.conf",
    icon: "◈",
    width: 480, height: 420,
    render: () => `
      <span class="k-eyebrow">// À propos</span>
      <h1 class="k-h1">Omar Benmansour</h1>
      <p class="k-sub" style="margin-bottom:18px;">Étudiant en cybersécurité &amp; infrastructure — futur ingénieur systèmes, réseaux &amp; cloud</p>
      <div class="about-grid">
        <div class="about-row"><span class="about-key">user</span><span class="about-val">omar.benmansour</span></div>
        <div class="about-row"><span class="about-key">age</span><span class="about-val">22 ans</span></div>
        <div class="about-row"><span class="about-key">origine</span><span class="about-val">Maroc</span></div>
        <div class="about-row"><span class="about-key">localisation</span><span class="about-val">Montpellier / Chambéry, France</span></div>
        <div class="about-row"><span class="about-key">formation</span><span class="about-val">Mastère Cybersécurité &amp; Cloud Computing — IPSSI</span></div>
        <div class="about-row"><span class="about-key">langues</span><span class="about-val">Arabe (natif), Français (courant), Anglais (B2)</span></div>
        <div class="about-row"><span class="about-key">permis</span><span class="about-val">B — mobile sur toute la France</span></div>
        <div class="about-row"><span class="about-key">objectif</span><span class="about-val">Alternance IT / Infrastructure / Cybersécurité</span></div>
      </div>
      <div class="k-divider"></div>
      <p class="k-p">Formé en télécoms et réseaux (DUT puis Licence), je me spécialise aujourd'hui en cybersécurité et cloud à l'IPSSI. J'apprends en construisant : chaque outil que je maîtrise, je l'ai d'abord testé sur un vrai projet — homelab, audit de sécurité, chaîne DevOps complète.</p>
      <div class="tag-row">
        <span class="tag">Rigueur</span><span class="tag">Autonomie</span><span class="tag">Curiosité</span><span class="tag">Esprit d'équipe</span><span class="tag">Sens du service</span>
      </div>
    `
  },

  formation: {
    title: "formation.log",
    icon: "🎓",
    width: 520, height: 460,
    render: () => `
      <span class="k-eyebrow">// Parcours académique</span>
      <h1 class="k-h1">Formation</h1>
      <div class="k-divider"></div>
      <div class="timeline">
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-date">Sept. 2026 — Juil. 2028</div>
          <div class="tl-title">Mastère Cybersécurité &amp; Cloud Computing</div>
          <div class="tl-org">IPSSI — Institut Privé Supérieur des Systèmes d'Information, Montpellier</div>
          <div class="tl-desc">Spécialisation en sécurité des systèmes d'information et technologies cloud, en alternance.</div>
        </div>
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-date">Sept. 2025 — Juil. 2026</div>
          <div class="tl-title">Licence 3 — Télécommunications &amp; Réseaux Informatiques</div>
          <div class="tl-org">Université Savoie Mont Blanc (USMB), Le Bourget-du-Lac — Mention Bien</div>
          <div class="tl-desc">Réseaux, télécommunications, systèmes, avec un projet de fin d'études (Solea) mené en autonomie complète.</div>
        </div>
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-date">Sept. 2023 — Juil. 2025</div>
          <div class="tl-title">DUT Génie Réseaux &amp; Télécommunications</div>
          <div class="tl-org">École Supérieure de Technologie (EST), Fès, Maroc — Major de promotion</div>
          <div class="tl-desc">Bases solides en réseaux, systèmes et télécoms — sorti major de la promotion.</div>
        </div>
      </div>
    `
  },

  skills: {
    title: "resources --monitor",
    icon: "▤",
    width: 480, height: 480,
    render: () => `
      <span class="k-eyebrow">// Compétences techniques</span>
      <h1 class="k-h1" style="margin-bottom:16px;">Compétences</h1>

      <div class="skill-group">
        <div class="skill-group-title">Systèmes &amp; annuaire</div>
        ${skillRow("Windows Server / Active Directory / GPO", 85)}
        ${skillRow("Linux (Debian, Ubuntu)", 85)}
        ${skillRow("macOS", 55)}
      </div>

      <div class="skill-group">
        <div class="skill-group-title">Réseau &amp; sécurité</div>
        ${skillRow("TCP/IP, VLAN, routage, VPN", 85)}
        ${skillRow("pfSense / Fortinet, Wireshark", 80)}
        ${skillRow("MDM / EDR, hardening, MFA", 60)}
        ${skillRow("SIEM (Wazuh)", 70)}
      </div>

      <div class="skill-group">
        <div class="skill-group-title">Virtualisation &amp; conteneurisation</div>
        ${skillRow("Proxmox VE, VMware", 85)}
        ${skillRow("Docker, Kubernetes", 75)}
      </div>

      <div class="skill-group">
        <div class="skill-group-title">DevOps &amp; automatisation</div>
        ${skillRow("Python (Netmiko, Napalm)", 70)}
        ${skillRow("Ansible, Terraform", 70)}
        ${skillRow("GitLab CI/CD, Git", 75)}
        ${skillRow("PowerShell, Bash", 70)}
      </div>

      <div class="skill-group">
        <div class="skill-group-title">Support &amp; exploitation</div>
        ${skillRow("Support N1/N2, GLPI", 85)}
        ${skillRow("Documentation technique", 90)}
      </div>
    `
  },

  certifications: {
    title: "certifications.db",
    icon: "◆",
    width: 520, height: 420,
    render: () => `
      <span class="k-eyebrow">// Certifications</span>
      <h1 class="k-h1">Certifications</h1>
      <div class="k-divider"></div>
      <div class="cert-grid">
        <div class="cert-card"><div class="cert-issuer">Cisco</div><div class="cert-name">Introduction to Cybersecurity</div></div>
        <div class="cert-card"><div class="cert-issuer">Cisco</div><div class="cert-name">Networking Devices</div></div>
        <div class="cert-card"><div class="cert-issuer">Cisco</div><div class="cert-name">Network Addressing &amp; Troubleshooting</div></div>
        <div class="cert-card"><div class="cert-issuer">Fortinet</div><div class="cert-name">NSE 1 — Network Security Associate</div></div>
        <div class="cert-card"><div class="cert-issuer">Fortinet</div><div class="cert-name">NSE 2 — Intro to the Threat Landscape</div></div>
        <div class="cert-card"><div class="cert-issuer">AWS</div><div class="cert-name">Cloud Essentials Knowledge</div></div>
        <div class="cert-card"><div class="cert-issuer">AWS</div><div class="cert-name">Security Champion</div></div>
      </div>
    `
  },

  experience: {
    title: "experience.log",
    icon: "▣",
    width: 540, height: 480,
    render: () => `
      <span class="k-eyebrow">// Expérience professionnelle</span>
      <h1 class="k-h1">Expérience</h1>
      <div class="k-divider"></div>
      <div class="timeline">
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-date">Avril — Juillet 2025</div>
          <div class="tl-title">Administrateur système, réseau et sécurité — Stagiaire</div>
          <div class="tl-org">IPST, Fès, Maroc</div>
          <div class="tl-desc">Configuration et administration de switches/routeurs Cisco (VLAN, STP, OSPF, ACL, NAT/PAT), sécurisation du LAN, administration de serveurs Linux, diagnostic de pannes réseau avec Wireshark/tcpdump — 5 incidents critiques résolus en moins de 24h. Maquettage de topologies sous GNS3. Intervention chez une dizaine de clients.</div>
        </div>
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-date">Mai — Juillet 2024</div>
          <div class="tl-title">Technicien IT — Stagiaire</div>
          <div class="tl-org">Hôtel Palais Medina, Groupe Atlas, Fès, Maroc</div>
          <div class="tl-desc">Administration Active Directory, GPO et gestion des accès sur un parc de plus de 50 postes. Configuration et supervision du réseau Wi-Fi à fort trafic (VLANs Invité/Admin, bornes UniFi). Support utilisateurs via GLPI.</div>
        </div>
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-date">Sept. 2025 — Mars 2026</div>
          <div class="tl-title">Employé polyvalent (job étudiant)</div>
          <div class="tl-org">Domino's Pizza, Chambéry, France</div>
          <div class="tl-desc">Gestion de la relation client et travail en équipe sous forte affluence, en parallèle des études — rigueur, ponctualité, gestion du temps.</div>
        </div>
      </div>
    `
  },

  projects: {
    title: "projects/",
    icon: "⬡",
    width: 620, height: 560,
    render: () => `
      <span class="k-eyebrow">// Portfolio technique</span>
      <h1 class="k-h1" style="margin-bottom:16px;">Projets</h1>

      <div class="proj-card">
        <div class="proj-head">
          <span class="proj-name">Pradeo DevOps Demo</span>
          <a class="proj-link" href="https://github.com/Omarben04/pradeo-devops-demo" target="_blank" rel="noopener">github ↗</a>
        </div>
        <p class="proj-desc">Chaîne DevOps complète construite sur GitHub Codespaces : application dockerisée, orchestrée avec Kubernetes (k3d/K3s), provisionnée avec Terraform, configurée avec Ansible, intégrée dans un pipeline CI/CD GitLab, avec une première approche EDR via osquery.</p>
        <div class="tag-row"><span class="tag">Docker</span><span class="tag">Kubernetes</span><span class="tag">Terraform</span><span class="tag">Ansible</span><span class="tag">GitLab CI/CD</span><span class="tag">osquery</span></div>
      </div>

      <div class="proj-card">
        <div class="proj-head">
          <span class="proj-name">Solea — Infrastructure Réseau &amp; Système Hybride</span>
        </div>
        <p class="proj-desc">Projet de fin d'études : infrastructure complète sur serveur Dell PowerEdge avec Proxmox VE et 30 VMs. Pare-feu pfSense, VLANs, VPN IPSec, Active Directory, supervision Zabbix et centralisation des logs avec Wazuh. Documenté dans un rapport technique de 91 pages.</p>
        <div class="tag-row"><span class="tag">Proxmox</span><span class="tag">pfSense</span><span class="tag">Active Directory</span><span class="tag">Zabbix</span><span class="tag">Wazuh</span></div>
      </div>

      <div class="proj-card">
        <div class="proj-head">
          <span class="proj-name">SecuPulse</span>
          <a class="proj-link" href="https://github.com/Omarben04/secupulse" target="_blank" rel="noopener">github ↗</a>
        </div>
        <p class="proj-desc">Outil open source d'audit de sécurité en Python : analyse Active Directory, réseau, postes, correctifs et sauvegardes, avec calcul d'un score de posture sur 100 et dashboard Flask pour le suivi continu.</p>
        <div class="tag-row"><span class="tag">Python</span><span class="tag">Flask</span><span class="tag">Audit sécurité</span></div>
      </div>
    `
  },

  terminal: {
    title: "bash — omar@OmarOS",
    icon: ">_",
    width: 560, height: 420,
    render: () => `<div class="term-wrap" id="term-body"></div>`,
    afterRender: initTerminal
  },

  contact: {
    title: "contact.sh",
    icon: "✉",
    width: 420, height: 340,
    render: () => `
      <span class="k-eyebrow">// Me contacter</span>
      <h1 class="k-h1">Contact</h1>
      <div class="k-divider"></div>
      <div class="contact-row">
        <div class="contact-icon">@</div>
        <div><div class="contact-label">Email</div><div class="contact-value"><a href="mailto:omarbenmansour2004@gmail.com">omarbenmansour2004@gmail.com</a></div></div>
      </div>
      <div class="contact-row">
        <div class="contact-icon">☎</div>
        <div><div class="contact-label">Téléphone</div><div class="contact-value">07 45 94 51 30</div></div>
      </div>
      <div class="contact-row">
        <div class="contact-icon">in</div>
        <div><div class="contact-label">LinkedIn</div><div class="contact-value"><a href="https://linkedin.com/in/omarbenmansour" target="_blank" rel="noopener">linkedin.com/in/omarbenmansour</a></div></div>
      </div>
      <div class="contact-row">
        <div class="contact-icon">gh</div>
        <div><div class="contact-label">GitHub</div><div class="contact-value"><a href="https://github.com/Omarben04" target="_blank" rel="noopener">github.com/Omarben04</a></div></div>
      </div>
    `
  }
};

function skillRow(name, pct) {
  return `
    <div class="skill-row">
      <span class="skill-name">${name}</span>
      <span class="skill-bar"><span class="skill-fill" style="width:${pct}%"></span></span>
      <span class="skill-pct">${pct}%</span>
    </div>`;
}

/* ============================================================
   WINDOW MANAGER
   ============================================================ */

let zTop = 10;
const openWindows = {};
let windowOffset = 0;

function openApp(appId) {
  const isMobile = window.innerWidth <= 760;

  if (openWindows[appId]) {
    focusWindow(appId);
    return;
  }

  const app = APPS[appId];
  const win = document.createElement("div");
  win.className = "window";
  win.dataset.app = appId;

  const w = app.width, h = app.height;
  const left = isMobile ? 0 : 90 + (windowOffset * 26) % 220;
  const top = isMobile ? 0 : 60 + (windowOffset * 22) % 160;
  windowOffset++;

  if (!isMobile) {
    win.style.width = w + "px";
    win.style.height = h + "px";
    win.style.left = left + "px";
    win.style.top = top + "px";
  }
  zTop++;
  win.style.zIndex = zTop;

  win.innerHTML = `
    <div class="window-titlebar">
      <div class="hex-controls">
        <div class="hex-btn hex-close" title="Fermer"></div>
        <div class="hex-btn hex-min" title="Réduire"></div>
        <div class="hex-btn hex-max" title="Agrandir"></div>
      </div>
      <div class="window-title">${app.icon} <b>${app.title}</b></div>
    </div>
    <div class="window-body">${app.render()}</div>
  `;

  document.getElementById("windows-layer").appendChild(win);
  openWindows[appId] = win;

  win.querySelector(".hex-close").addEventListener("click", () => closeWindow(appId));
  win.addEventListener("mousedown", () => focusWindow(appId));
  win.addEventListener("touchstart", () => focusWindow(appId));

  if (!isMobile) makeDraggable(win, win.querySelector(".window-titlebar"));

  if (app.afterRender) app.afterRender(win);

  focusWindow(appId);
  renderDock();
}

function closeWindow(appId) {
  const win = openWindows[appId];
  if (!win) return;
  win.remove();
  delete openWindows[appId];
  renderDock();
}

function focusWindow(appId) {
  const win = openWindows[appId];
  if (!win) return;
  zTop++;
  win.style.zIndex = zTop;
  Object.values(openWindows).forEach(w => w.classList.remove("focused"));
  win.classList.add("focused");
  renderDock();
}

function makeDraggable(win, handle) {
  let ox = 0, oy = 0, dragging = false;
  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    ox = e.clientX - win.offsetLeft;
    oy = e.clientY - win.offsetTop;
    document.body.style.userSelect = "none";
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    let nx = e.clientX - ox;
    let ny = Math.max(40, e.clientY - oy);
    win.style.left = nx + "px";
    win.style.top = ny + "px";
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
}

function renderDock() {
  const dock = document.getElementById("dock");
  dock.innerHTML = "";
  Object.keys(APPS).forEach(appId => {
    const app = APPS[appId];
    const item = document.createElement("div");
    item.className = "dock-item" + (openWindows[appId] ? " active" : "");
    item.textContent = app.icon;
    item.title = app.title;
    item.setAttribute("tabindex", "0");
    item.addEventListener("click", () => openApp(appId));
    dock.appendChild(item);
  });
}
renderDock();

/* Bind icons + top menu */
document.querySelectorAll(".icon, .menu-item").forEach(el => {
  el.setAttribute("tabindex", "0");
  el.addEventListener("click", () => openApp(el.dataset.app));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openApp(el.dataset.app); }
  });
});

/* Open "about" by default shortly after boot, on desktop only */
setTimeout(() => {
  if (window.innerWidth > 760) openApp("about");
}, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 2300);

/* ============================================================
   TERMINAL (signature interactive element)
   ============================================================ */

function initTerminal(winEl) {
  const body = winEl.querySelector("#term-body");

  const files = {
    "about.txt": "Omar Benmansour — étudiant en cybersécurité & cloud (IPSSI), passionné d'infrastructure et de systèmes.",
    "skills.txt": "Linux, Windows Server, Docker, Kubernetes, Terraform, Ansible, pfSense, Wazuh, Python, Bash...",
    "contact.txt": "omarbenmansour2004@gmail.com | 07 45 94 51 30 | github.com/Omarben04",
  };

  const commands = {
    help: () => "Commandes: help, whoami, ls, cat <fichier>, skills, projects, clear, sudo hire-omar",
    whoami: () => "omar — futur ingénieur systèmes, réseaux & cybersécurité",
    ls: () => Object.keys(files).join("   "),
    cat: (arg) => files[arg] ? files[arg] : `cat: ${arg || ""}: fichier introuvable`,
    skills: () => "Linux · Windows Server · Docker · Kubernetes · Terraform · Ansible · pfSense · Wazuh · Python",
    projects: () => "pradeo-devops-demo · solea · secupulse  (voir la fenêtre Projets)",
    clear: () => "__CLEAR__",
  };

  function printLine(html) {
    const l = document.createElement("div");
    l.className = "term-line";
    l.innerHTML = html;
    body.appendChild(l);
    body.scrollTop = body.scrollHeight;
  }

  printLine(`<span class="term-prompt">omar@OmarOS</span>:~$ Bienvenue. Tapez <b>help</b> pour la liste des commandes.`);

  const rowWrap = document.createElement("div");
  rowWrap.className = "term-input-row";
  rowWrap.innerHTML = `<span class="term-prompt">omar@OmarOS</span>:~$ <input class="term-input" autocomplete="off" spellcheck="false">`;
  body.appendChild(rowWrap);
  const input = rowWrap.querySelector("input");
  setTimeout(() => input.focus(), 150);
  winEl.addEventListener("mousedown", () => setTimeout(() => input.focus(), 10));

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const raw = input.value.trim();
    if (!raw) return;

    const echoRow = document.createElement("div");
    echoRow.className = "term-line";
    echoRow.innerHTML = `<span class="term-prompt">omar@OmarOS</span>:~$ ${escapeHtml(raw)}`;
    body.insertBefore(echoRow, rowWrap);

    const [cmd, ...rest] = raw.split(" ");
    let output;

    if (raw === "sudo hire-omar") {
      output = "✔ Candidature validée. Contactez-moi : omarbenmansour2004@gmail.com — je réponds vite.";
    } else if (cmd === "cat") {
      output = commands.cat(rest.join(" "));
    } else if (commands[cmd]) {
      output = commands[cmd]();
    } else {
      output = `commande introuvable: ${cmd} — tapez "help"`;
    }

    if (output === "__CLEAR__") {
      body.querySelectorAll(".term-line").forEach(l => l.remove());
    } else {
      const outRow = document.createElement("div");
      outRow.className = "term-line";
      outRow.textContent = output;
      body.insertBefore(outRow, rowWrap);
    }

    input.value = "";
    body.scrollTop = body.scrollHeight;
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}