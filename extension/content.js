(() => {
  function start() {
  if (document.getElementById("mzo-host")) return;

  const defaults = { settings: { dark: false, compact: true, localView: "grid" }, contacts: {}, reminders: [], flags: {}, manualOrder: [], folders: [], folderAssignments: {} };
  let state = structuredClone(defaults);
  let selectedId = "";
  let tab = "ajustes";
  let query = "";
  const uid = () => crypto.randomUUID();
  const reportExtensionError = (area, error) => console.warn(`MKT ORGANIZER: falha em ${area}`, error);
  const safe = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const $ = selector => shadow.querySelector(selector);
  const $$ = selector => [...shadow.querySelectorAll(selector)];
  const urlKey = () => {
    const url = new URL(location.href);
    const stable = ["contactId", "contact_id", "chatId", "chat_id", "conversationId", "conversation_id", "ticketId", "ticket_id", "id"];
    for (const key of stable) {
      const value = url.searchParams.get(key);
      if (value) return `url:${key}:${value}`;
    }
    const rest = url.pathname.replace(/^\/chat\/?/, "");
    return rest && rest !== "/" ? `path:${rest}` : "";
  };

  const host = document.createElement("div");
  host.id = "mzo-host";
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>
    :host{all:initial;font:14px/1.45 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf2ff}
    *{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer}
    .mzo-launch{position:fixed;right:18px;bottom:18px;z-index:2147483646;border:0;border-radius:999px;background:#5eead4;color:#082f32;box-shadow:0 12px 35px #0006;padding:13px 18px;font-weight:800;letter-spacing:.01em}
    .mzo-panel{position:fixed;z-index:2147483647;right:18px;top:18px;bottom:18px;width:min(400px,calc(100vw - 36px));display:none;flex-direction:column;background:#111c2d;color:#eaf2ff;border:1px solid #34465e;border-radius:18px;box-shadow:0 20px 70px #0009;overflow:hidden}
    .mzo-panel.open{display:flex}.mzo-head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;background:#16253a;border-bottom:1px solid #34465e}.mzo-head-title{display:flex;align-items:center;gap:10px;min-width:0}.mzo-app-logo{width:36px;height:36px;flex:0 0 36px;border-radius:9px}.mzo-brand{font-size:17px;font-weight:800}.mzo-sub{display:block;color:#9fb1c9;font-size:11px;font-weight:500}
    .mzo-icon{border:0;background:transparent;color:#c9d9ee;font-size:22px;padding:0 4px}.mzo-tabs{display:flex;gap:4px;padding:9px;background:#16253a;border-bottom:1px solid #34465e}.mzo-tabs button{flex:1;border:0;background:transparent;color:#9fb1c9;border-radius:9px;padding:8px 3px;font-size:12px}.mzo-tabs button.active{background:#28526a;color:#e8fffa;font-weight:700}
    .mzo-body{overflow:auto;flex:1;padding:17px}.mzo-card{background:#19293e;border:1px solid #34465e;border-radius:13px;padding:14px;margin-bottom:14px}.mzo-card h3{font-size:13px;margin:0 0 10px;color:#b9d5ef}.mzo-row{display:flex;gap:8px;align-items:center}.mzo-row>*{min-width:0}.mzo-grow{flex:1}.mzo-field{display:block;margin:10px 0 5px;color:#9fb1c9;font-size:12px;font-weight:650}
    .mzo-input,.mzo-select,.mzo-textarea{width:100%;border:1px solid #405570;border-radius:9px;background:#0e1a2b;color:#f0f7ff;padding:10px;outline:none}.mzo-input:focus,.mzo-select:focus,.mzo-textarea:focus{border-color:#5eead4}.mzo-textarea{min-height:126px;resize:vertical}.mzo-btn{border:0;border-radius:9px;background:#5eead4;color:#073536;font-weight:750;padding:9px 12px}.mzo-btn.secondary{background:#263e55;color:#dceafb}.mzo-btn.danger{background:#643647;color:#ffe0e5}.mzo-btn:disabled{opacity:.45;cursor:not-allowed}.mzo-muted{color:#9fb1c9;font-size:12px}.mzo-list{display:grid;gap:8px}.mzo-item{border:1px solid #34465e;border-radius:11px;background:#19293e;padding:11px}.mzo-item-head{display:flex;justify-content:space-between;gap:8px;align-items:start}.mzo-item-title{font-weight:750;overflow-wrap:anywhere}.mzo-pill{display:inline-block;border-radius:99px;background:#30445e;color:#d8e9ff;font-size:11px;padding:2px 7px;margin:4px 4px 0 0}.mzo-actions{display:flex;gap:6px;margin-top:8px}.mzo-actions button{border:0;background:#263e55;color:#cce8fa;border-radius:7px;padding:5px 8px;font-size:11px}.mzo-empty{text-align:center;color:#9fb1c9;padding:24px 10px}.mzo-check{display:flex;gap:9px;align-items:center;margin:12px 0}.mzo-stat{font-size:21px;font-weight:800;color:#5eead4}.mzo-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.mzo-small{font-size:11px}.mzo-divider{height:1px;background:#34465e;margin:13px 0}.mzo-file{display:none}
    .mzo-launch{display:none}.mzo-panel{right:0;top:0;bottom:0;width:min(430px,100vw);border-radius:0;border-top:0;border-bottom:0;border-right:0;box-shadow:-16px 0 50px #0007}.mzo-flag-picker{position:fixed;z-index:2147483647;width:min(352px,calc(100vw - 24px));display:none;padding:16px;border:1px solid #52677f;border-radius:14px;background:#142236;color:#eef6ff;box-shadow:0 16px 45px #0009}.mzo-flag-picker.open{display:block}.mzo-picker-icons,.mzo-picker-colors{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin:12px 0}.mzo-picker-icons{grid-template-columns:repeat(7,minmax(0,1fr))}.mzo-picker-icons button{border:1px solid #455972;border-radius:8px;background:#263c55;color:#fff;font-size:18px;height:42px;min-width:0}.mzo-picker-colors button{border:2px solid transparent;border-radius:100%;background:var(--swatch);height:34px;width:34px;justify-self:center}.mzo-picker-icons button.chosen,.mzo-picker-colors button.chosen{outline:2px solid var(--mzo-picker-selection,#5eead4);outline-offset:2px}
    :host(.mzo-light){color:#162638}
    :host(.mzo-light) .mzo-panel,:host(.mzo-light) .mzo-flag-picker{background:#fff;color:#162638;border-color:#c7d5e2}
    :host(.mzo-light) .mzo-head,:host(.mzo-light) .mzo-tabs{background:#f3f7fa;border-color:#d5e0e9}
    :host(.mzo-light) .mzo-card,:host(.mzo-light) .mzo-item{background:#f7fafc;border-color:#d3dfe9}
    :host(.mzo-light) .mzo-card h3{color:#244c64}
    :host(.mzo-light) .mzo-stat{color:#087d72}
    :host(.mzo-light) .mzo-empty{color:#5b7084}
    :host(.mzo-light) .mzo-pill{background:#e1edf4;color:#24465e}
    :host(.mzo-light) .mzo-input,:host(.mzo-light) .mzo-select,:host(.mzo-light) .mzo-textarea{background:#fff;color:#142638;border-color:#a9bdce}
    :host(.mzo-light) .mzo-field,:host(.mzo-light) .mzo-muted,:host(.mzo-light) .mzo-sub{color:#52697e}
    :host(.mzo-light) .mzo-icon,:host(.mzo-light) .mzo-tabs button{color:#274156}
    :host(.mzo-light) .mzo-tabs button.active{background:#d5eee9;color:#0b4c47}
    :host(.mzo-light) .mzo-btn.secondary,:host(.mzo-light) .mzo-actions button{background:#e1ebf2;color:#17405a}
    :host(.mzo-light) .mzo-picker-icons button{background:#e8f0f6;color:#183449;border-color:#b8cbda}
    :host(.mzo-light) .mzo-flag-picker{--mzo-picker-selection:#11685f;--mzo-picker-hover:#516f85;--mzo-picker-icon-selected:#d6eeea}
    .mzo-flag-picker :is(.mzo-picker-icons,.mzo-picker-colors) button{cursor:pointer}
    .mzo-flag-picker :is(.mzo-picker-icons,.mzo-picker-colors) button:hover{border-color:var(--mzo-picker-hover,#a5bfd5)}
    .mzo-flag-picker :is(.mzo-picker-icons,.mzo-picker-colors) button:focus-visible{outline:2px solid var(--mzo-picker-selection,#5eead4);outline-offset:3px}
    .mzo-flag-picker .mzo-picker-icons button.chosen{background:var(--mzo-picker-icon-selected,#214e52)}
    .mzo-custom-row{display:grid;grid-template-columns:1fr 100px;gap:8px;align-items:end;margin:8px 0}
    .mzo-custom-row input[type=color]{height:40px;padding:3px;cursor:pointer}
    .mzo-tabs[hidden]{display:none}
    .mzo-folder-color-input{box-sizing:border-box;width:44px;height:30px;padding:2px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;cursor:pointer}
    .mzo-folder-color-input::-webkit-color-swatch-wrapper{padding:0}
    .mzo-folder-color-input::-webkit-color-swatch{border:0;border-radius:3px}
    .mzo-folder-color-control{display:inline-flex;align-items:center;gap:5px;color:inherit;font-size:12px}
    .mzo-folder-color-control .mzo-folder-color-input{width:24px;height:22px}
    @media(max-width:600px){.mzo-panel{inset:0;width:100%;border-radius:0}.mzo-launch{right:10px;bottom:10px}}
  </style><button class="mzo-launch" aria-label="Abrir organização">Organizar</button><div class="mzo-flag-picker" aria-label="Sinalizar chat"></div><aside class="mzo-panel" aria-label="Painel de organização"><div class="mzo-head"><div class="mzo-head-title"><img class="mzo-app-logo" src="${chrome.runtime.getURL("icons/icon48.png")}" alt=""><div><span class="mzo-brand">MKT ORGANIZER</span><span class="mzo-sub">Extensão por @andrz.wav</span></div></div><div class="mzo-row"><button class="mzo-icon mzo-theme-toggle" type="button" aria-label="Alternar tema" title="Alternar tema">☀</button><button class="mzo-icon mzo-close" aria-label="Fechar painel">×</button></div></div><nav class="mzo-tabs" aria-label="Seções"><button data-tab="pastas">Pastas</button><button data-tab="ajustes">Ajustes</button></nav><div class="mzo-body"></div><input class="mzo-file" type="file" accept="application/json,.json"></aside>`;

  const applySettings = () => {
    document.documentElement.classList.add("mzo-dark");
    document.documentElement.classList.toggle("mzo-light", !state.settings.dark);
    host.classList.toggle("mzo-light", !state.settings.dark);
    document.documentElement.classList.toggle("mzo-compact", !!state.settings.compact);
    document.documentElement.classList.toggle("mzo-list-view", state.settings.localView === "list");
    document.documentElement.classList.toggle("mzo-grid-view", state.settings.localView !== "list");
    document.documentElement.classList.add("mzo-enhanced");
    const toggle = document.querySelector(".mzo-view-toggle");
    if (toggle) toggle.textContent = state.settings.localView === "list" ? "▦ Visão em cartões" : "☷ Visão em lista";
    queueMicrotask(() => repairQuotedMessages());
    const themeButton = $(".mzo-theme-toggle");
    if (themeButton) { themeButton.textContent = state.settings.dark ? "☀" : "☾"; themeButton.title = state.settings.dark ? "Ativar tema claro" : "Ativar tema escuro"; }
  };
  const flagLabelLimit = 60;
  const flagPalette = [["", "Sem cor"], ["#38bdf8", "Azul"], ["#a78bfa", "Roxo"], ["#fbbf24", "Amarelo"], ["#fb7185", "Rosa"], ["#4ade80", "Verde"]];
  const flagIcons = ["", "🚩", "⭐", "🔥", "⚡", "📌", "💰"];
  let flagPhone = "";
  let activeFolder = "";
  let activeStatusFilter = "";
  let draggingKey = "";
  let dragStartOrder = [];
  let dragCommitted = false;
  let dragMoved = false;
  const ticketFolderKey = card => card.dataset.mzoPhone ? `phone:${card.dataset.mzoPhone}` : `ticket:${card.dataset.mzoKey}`;
  function visibleCards() { return [...document.querySelectorAll(".attendance-card-container[data-mzo-key]:not(.mzo-filter-hidden)")].sort((a,b)=>Number(a.style.order)-Number(b.style.order)); }
  function previewOrder(next) {
    const cards = visibleCards();
    const before = new Map(cards.map(el => [el, el.getBoundingClientRect()]));
    state.manualOrder = [...next, ...state.manualOrder.filter(id => !next.includes(id))];
    dragMoved = true;
    scanTickets();
    for (const el of cards) {
      const prev = before.get(el), now = el.getBoundingClientRect();
      const dx = prev.left - now.left, dy = prev.top - now.top;
      if (dx || dy) el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"translate(0,0)"}],{duration:220,easing:"cubic-bezier(.22,1,.36,1)"});
    }
  }
  const ticketMetrics = [
    ["Responsável", '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/>'],
    ["Atendido por", '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-12 5 2 2 4-4"/>'],
    ["Tempo total", '<circle cx="12" cy="13" r="8"/><path d="M12 13V9m-3-7h6m3 5 2-2"/>'],
    ["1ª resposta", '<path d="M20 15a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2zM8 10h8m-8 3h5"/>'],
    ["Tempo de espera", '<path d="M6 3h12M6 21h12M7 3c0 5 1 7 5 9-4 2-5 4-5 9M17 3c0 5-1 7-5 9 4 2 5 4 5 9"/>'],
    ["Janela de contato", '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'],
    ["Canal de entrada", '<path d="M4 5h16v14H4zM8 12h8m-3-3 3 3-3 3"/>', "mzo-ticket-metric-channel"]
  ];
  function paintTicketMetrics(card, container) {
    const operators = card.querySelector(".op-info-container");
    const times = [".tt", ".pr", ".tm"].map(selector =>
      card.querySelector(".time-info " + selector)?.textContent.trim() || "—"
    );
    const names = operators?.textContent.replace(/\s+/g, " ").trim()
      .match(/Responsável\s*:?\s*(.*?)\s*Atendido por\s*:?\s*(.*)/i);
    let details = container.querySelector(".mzo-ticket-details");
    if (!names || times.every(value => value === "—")) {
      details?.remove();
      card.querySelector(".mzo-ticket-channel-mirrored")?.classList.remove("mzo-ticket-channel-mirrored");
      card.querySelector(".mzo-ticket-window-mirrored")?.classList.remove("mzo-ticket-window-mirrored");
      return;
    }

    const windowInfo = card.querySelector(".meta-window-info");
    const windowText = windowInfo?.textContent.replace(/\s+/g, " ").trim() || "";
    const windowState = windowText.replace(/^janela de contato\s*:?\s*/i, "");
    const channelPrefix = /^canal de entrada\s*:?\s*/i;
    const channel = [...card.querySelectorAll(".card-info :is(div,span,p,small,label)")]
      .reverse().find(node => {
        const text = node.textContent.trim();
        return channelPrefix.test(text) && !!text.replace(channelPrefix, "").trim() &&
          !node.querySelector(".name, .mzo-card-tools");
      });
    const channelValue = channel?.textContent.trim().replace(channelPrefix, "").trim() || "";
    const oldChannel = card.querySelector(".mzo-ticket-channel-mirrored");
    if (oldChannel !== channel) oldChannel?.classList.remove("mzo-ticket-channel-mirrored");
    channel?.classList.add("mzo-ticket-channel-mirrored");
    const values = [names[1] || "—", names[2] || "—", ...times, windowState, channelValue];
    if (!details) {
      details = document.createElement("details");
      details.className = "mzo-ticket-details";
      const summary = document.createElement("summary");
      summary.innerHTML = '<span class="mzo-ticket-details-label">Detalhes</span>';
      summary.addEventListener("click", event => event.stopPropagation());
      const grid = document.createElement("div");
      grid.className = "mzo-ticket-metrics";
      grid.innerHTML = ticketMetrics.map(([label, icon, layout = ""]) =>
        `<div class="mzo-ticket-metric ${layout}"><svg aria-hidden="true" viewBox="0 0 24 24">${icon}</svg><div><span>${label}</span><strong></strong></div></div>`
      ).join("");
      details.append(summary, grid);
      container.append(details);
    }
    [...details.querySelector(".mzo-ticket-metrics").children].forEach((metric, index) => {
      const value = metric.querySelector("strong");
      if (value.textContent !== values[index]) value.textContent = values[index];
      metric.hidden = !values[index];
    });
    windowInfo?.classList.toggle("mzo-ticket-window-mirrored", !!windowState && !windowInfo.querySelector("a, button, [ng-click]"));
    return details.querySelector("summary");
  }
  function ticketStatus(card) {
    // Message authorship takes precedence over native colors and window expiry.
    const confirmed=card.dataset.mzoServiceState;
    if (confirmed === "progress" || confirmed === "reply") return confirmed;
    const bar=card.querySelector(".card-status");
    const label=[bar?.textContent,bar?.title,bar?.getAttribute("aria-label")].join(" ");
    const operators=card.querySelector(".op-info-container")?.textContent || "";
    const attended=operators.match(/Atendido por\s*:?\s*(.*)/i)?.[1]?.trim() || "";
    const automation=/(?:^|\W)(?:bot|chatbot|ia|ai|assistente virtual|automação)(?:$|\W)/i;
    if (/aguardando (?:atendimento|resposta)|sem resposta|primeiro contato|primeira resposta|não atendido/i.test(label) ||
      !attended || /não atendido|nenhum|^[-—]$/i.test(attended) || automation.test(attended)) return "reply";
    if (/em atendimento|em andamento|aguardando (?:o )?cliente|respondido/i.test(label)) return "progress";
    // A native pending-customer indicator still matters before message data loads.
    if (bar) {
      const rgb=getComputedStyle(bar).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgb && Number(rgb[1])>=120 && rgb[1]-rgb[2]>=40 && rgb[1]-rgb[3]>=35) return "reply";
    }
    return "progress";
  }
  function flagTextColor(color) {
    const hex=/^#[0-9a-f]{6}$/i.test(color || "") ? color : "#13b870";
    const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
    const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
    return (luminance+.05)/.05 >= 1.05/(luminance+.05) ? "#000000" : "#ffffff";
  }
  function ticketWindowClosed(card) {
    const info=card.querySelector(".meta-window-info");
    return /fechada|expirada|encerrada/i.test([info?.textContent,info?.title,info?.getAttribute("aria-label")].join(" "));
  }
  function ticketWindowClosing(card) {
    const info=card.querySelector(".meta-window-info");
    const text=[info?.textContent,info?.title,info?.getAttribute("aria-label")].join(" ");
    if (/fechada|expirada|encerrada/i.test(text)) return false;
    if (/prestes a (?:fechar|expirar)|quase (?:fechando|expirando)/i.test(text)) return true;
    const countdown=text.match(/(?:expira|fecha|encerra) em\s+([^;|]+)/i)?.[1] ||
      text.match(/([\d:dhms\s]+)restantes?/i)?.[1] || "";
    const clock=countdown.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    const units={d:86400,h:3600,m:60,s:1};
    const parts=[...countdown.matchAll(/(\d+)\s*([dhms])(?:ias?|oras?|in(?:utos?)?|eg(?:undos?)?)?\b/gi)];
    const seconds=clock ? Number(clock[1])*3600+Number(clock[2])*60+Number(clock[3] || 0) : parts.reduce((sum,[,n,u])=>sum+Number(n)*units[u.toLowerCase()],0);
    return seconds>0 && seconds<=3600;
  }
  const statusDefaults = {
    progress:{name:"Em atendimento",color:"#3188df"},
    reply:{name:"Aguardando atendimento",color:"#ed9228"},
    closing:{name:"Janela prestes a fechar",color:"#e24949"},
    closed:{name:"Janela fechada",color:"#e24949"}
  };
  function statusConfig(key) {
    const base=statusDefaults[key];
    if(!base)return {name:"",color:"#3188df",custom:false};
    const custom=state.settings.statusStyles?.[key];
    return {name:typeof custom?.name==='string' && custom.name.trim() ? custom.name.trim().slice(0,60) : base.name,
      color:/^#[0-9a-f]{6}$/i.test(custom?.color || '') ? custom.color : base.color,
      custom:/^#[0-9a-f]{6}$/i.test(custom?.color || '')};
  }
  function statusSettingsHtml() {
    return `<div class="mzo-card"><h3>Personalizar status</h3><p class="mzo-muted">Escolha o nome e a cor exibidos nos cards e nos filtros. As regras de cada status continuam sendo determinadas pelo atendimento. As alterações são salvas automaticamente.</p>${Object.keys(statusDefaults).map(key=>{const value=statusConfig(key);return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 50px;gap:10px;margin:12px 0;align-items:end"><label>${safe(statusDefaults[key].name)}<input type="text" maxlength="60" data-status-name="${key}" value="${safe(value.name)}" style="width:100%;box-sizing:border-box" aria-label="Nome de ${safe(statusDefaults[key].name)}"></label><input type="color" data-status-color="${key}" value="${value.color}" aria-label="Cor de ${safe(statusDefaults[key].name)}" style="width:44px;height:34px;padding:2px"></div>`;}).join('')}<button class="mzo-btn secondary" data-action="reset-status-styles">Restaurar status padrão</button></div>`;
  }
  function paintTicketStatus(card, status) {
    if (ticketWindowClosed(card)) status = "closed";
    else if (ticketWindowClosing(card)) status = "closing";
    card.dataset.mzoVisualState = status || "reply";
    let badge = card.querySelector(".mzo-ticket-status");
    const container = card.querySelector(".mkz-card-container");
    if (!container) return;
    const summary = paintTicketMetrics(card, container);
    if (!status) {
      card.style.removeProperty("--mzo-state-color");
      badge?.remove();
      return;
    }
    const appearance = statusConfig(status);
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "mzo-ticket-status";
      badge.innerHTML = '<span class="mzo-ticket-status-icon" aria-hidden="true"></span><strong></strong>';
    }
    if (summary) {
      if (badge.parentElement !== summary) summary.prepend(badge);
    } else if (badge.parentElement !== container) {
      container.append(badge);
    }
    if (badge.dataset.status !== status) {
      badge.dataset.status = status;

    }
    const label=badge.querySelector("strong");
    if(label.textContent!==appearance.name)label.textContent=appearance.name;
    if(appearance.custom){
      card.style.setProperty('--mzo-state-color',appearance.color);
      const hex=appearance.color.slice(1),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
      const light=rgb.map(n=>{n/=255;return n<=0.04045?n/12.92:Math.pow((n+0.055)/1.055,2.4);});
      const luminance=light[0]*0.2126+light[1]*0.7152+light[2]*0.0722;
      const text=luminance>0.179?'#000000':'#ffffff';
      badge.style.setProperty('background',appearance.color,'important');
      badge.style.setProperty('border-color',appearance.color,'important');
      badge.style.setProperty('color',text,'important');
      badge.style.setProperty('-webkit-text-fill-color',text,'important');
      badge.querySelector('.mzo-ticket-status-icon').style.setProperty('color',text,'important');
    }else{
      card.style.removeProperty('--mzo-state-color');
      for(const property of ['background','border-color','color','-webkit-text-fill-color'])badge.style.removeProperty(property);
      badge.querySelector('.mzo-ticket-status-icon').style.removeProperty('color');
    }
  }
  function paintTicket(card, phone, status = ticketStatus(card)) {
    paintTicketStatus(card, status);
    const controls = card.querySelector(".mzo-card-controls");
    const header = card.querySelector(".card-info .contact") || card.querySelector(".card-info") ||
      card.querySelector(".mkz-card-container");
    let tools = card.querySelector(".mzo-card-tools");
    if (controls && header) {
      if (!tools) {
        tools = document.createElement("div");
        tools.className = "mzo-card-tools";
      }
      if (tools.parentElement !== header) {
        header.classList.add("mzo-card-header");
        header.append(tools);
      }
      if (controls.parentElement !== tools) tools.prepend(controls);
    }
    const flag = state.flags[phone] || state.flags[card.dataset.mzoPhone] || state.flags[`phone:${card.dataset.mzoPhone}`] || {};
    card.style.setProperty("--mzo-flag-color", flag.color || "#13b870");
    card.style.setProperty("--mzo-flag-text", flagTextColor(flag.color));
    card.dataset.mzoLabeled = flag.label ? "true" : "false";
    card.dataset.mzoLabel = flag.label || "";
    const folderId = state.folderAssignments[ticketFolderKey(card)] || "";
    const folderButton = card.querySelector(".mzo-card-folder-button");
    if (folderButton) {
      const folder = state.folders.find(item => item.id === folderId);
      folderButton.classList.toggle("mzo-folder-assigned", !!folder);
      folderButton.title = folder ? `Pasta: ${folder.name}` : "Adicionar conversa a uma pasta";
      folderButton.style.setProperty("--mzo-card-folder-color", folder?.color || "#7da5c3");
    }
    const hasFlag = !!(flag.icon || flag.color || flag.label);
    const statusFilterMatches = !activeStatusFilter || activeStatusFilter === "all" || card.dataset.mzoVisualState === activeStatusFilter;
    const folderFilterMatches = activeStatusFilter ? true : activeFolder ? folderId === activeFolder : !folderId;
    card.classList.toggle("mzo-filter-hidden", !matchesTicketSearch(card,flag) || !folderFilterMatches || !statusFilterMatches);
    const button = card.querySelector(".mzo-flag-button");
    if (button) {
      const icon = flag.icon || "⚑";
      if (button.textContent !== icon) button.textContent = icon;
      button.classList.toggle("mzo-flag-active", hasFlag);
      button.title = hasFlag ? "Editar sinalização" : "Sinalizar chat";
      button.setAttribute("aria-label", button.title);
    }
    let tag = card.querySelector(".mzo-tag-row");
    if (!tag) {
      tag = document.createElement("span"); tag.className = "mzo-tag-row";
    }
    if (tools && tag.parentElement !== tools) tools.append(tag);
    const tagText = [flag.icon, flag.label || (flag.color ? "Sinalizado" : "")].filter(Boolean).join(" ");
    if (tag.textContent !== tagText) {
      tag.textContent = tagText;
      tag.title = tagText;
    }
    tag.hidden = !tag.textContent;
    card.classList.add("mzo-card-ready");
  }
  function syncOrderButton() {
    const button = document.querySelector(".mzo-order-toggle");
    if (!button) return;
    const custom = state.settings.customOrder === true;
    button.textContent = custom ? "Ordem personalizada ✓" : "Sem resposta primeiro ✓";
    button.setAttribute("aria-pressed", String(custom));
    button.classList.toggle("active", custom);
  }
  const ticketSearchInputs=new WeakMap();
  let ticketSearchTerm='',ticketSearchLocal=false,ticketSearchInitialized=false;
  const normalizeTicketSearch=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function flagSearchText(flag) {
    const color=flagPalette.find(([value])=>value && value.toLowerCase()===String(flag.color || '').toLowerCase())?.[1] || '';
    return normalizeTicketSearch([flag.label,flag.icon,color].filter(Boolean).join(' '));
  }
  function matchesTicketSearch(card,flag) {
    if(!ticketSearchLocal || !ticketSearchTerm)return true;
    const text=normalizeTicketSearch([card.querySelector('.card-info .name')?.textContent,card.querySelector('.card-info .contact')?.textContent,card.dataset.mzoPhone,flagSearchText(flag)].filter(Boolean).join(' '));
    return text.includes(normalizeTicketSearch(ticketSearchTerm));
  }
  function installTicketSearch() {
    const original=document.querySelector('.block-search input[ng-model="vm.nameFilter"]');
    if(!original)return;
    let input=ticketSearchInputs.get(original);
    if(!input?.isConnected) {
      input=document.createElement('input');input.type='search';input.className=original.className;
      input.classList.add('mzo-ticket-search');input.placeholder='Pesquisar nome, número ou sinalização…';input.setAttribute('aria-label','Pesquisar nome, número ou sinalização');
      input.value=ticketSearchInitialized ? ticketSearchTerm : original.value;
      ticketSearchInitialized=true;
      original.classList.add('mzo-native-search');original.setAttribute('aria-hidden','true');original.tabIndex=-1;
      original.before(input);ticketSearchInputs.set(original,input);
      const test=original.getAttribute('data-test');if(test){input.setAttribute('data-test',test);original.removeAttribute('data-test');}
      input.addEventListener('input',()=>{ticketSearchTerm=input.value;updateTicketSearch(original);scanTickets();});
      ticketSearchTerm=input.value;
    }
    updateTicketSearch(original);
  }
  function updateTicketSearch(original) {
    const query=normalizeTicketSearch(ticketSearchTerm);
    const local=!!query && Object.values(state.flags).some(flag=>flagSearchText(flag).includes(query));
    if(local!==ticketSearchLocal) {
      ticketSearchLocal=local;
      window.postMessage({source:'mzo-flag-search-mode',enabled:local},location.origin);
    }
    const nativeValue=local?'':ticketSearchTerm;
    if(original.dataset.mzoFlagSearchMode!==String(local))original.dataset.mzoFlagSearchMode=String(local);
    if(original.value!==nativeValue) {
      original.value=nativeValue;original.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
  window.addEventListener('message',event=>{
    if(event.source!==window || event.origin!==location.origin || event.data?.source!=='mzo-finalization-confirmed')return;
    const phone=String(event.data.phone || '').replace(/\D/g,'');
    const keys=new Set((Array.isArray(event.data.keys)?event.data.keys:[]).filter(key=>typeof key==='string' && key.startsWith('attendances-card-')));
    const userId=String(event.data.userId || '');
    if(userId)keys.add('attendances-card-'+userId);
    for(const key of Object.keys(state.flags)) {
      const isPhone=/^(?:phone:)?\d{10,13}$/.test(key);
      if(isPhone && phone.length>=10 && key.replace(/\D/g,'').endsWith(phone.slice(-10)))keys.add(key);
    }
    let changed=false;
    for(const key of keys)if(Object.hasOwn(state.flags,key)){delete state.flags[key];changed=true;}
    if(changed){save('flags');scanTickets();}
  });

  const chatBubbleParts = new WeakMap();
  const chatDatePattern = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
  const chatWeekday = new Intl.DateTimeFormat("pt-BR", { weekday:"long" });
  const nativeReplySelector = [
    '[ng-click*="reply" i]', '[ng-click*="mention" i]',
    ':is(button,a,[role="button"]):is([title*="mencionar" i],[aria-label*="mencionar" i],[uib-tooltip*="mencionar" i])',
    ':is(button,a,[role="button"]):has(:is(.fa-reply,.fa-mail-reply,.fa-share))'
  ].join(",");
  function decorateChatBubble(bubble, stamp, reply) {
    let parts = chatBubbleParts.get(bubble);
    if (!parts) {
      parts = {};
      chatBubbleParts.set(bubble, parts);
    }

    if (parts.stamp !== stamp) {
      parts.stamp?.classList.remove("mzo-native-chat-meta");
      parts.stamp = stamp;
      parts.stampMarkup = undefined;
    }
    if (stamp) {
      if (!stamp.classList.contains("mzo-native-chat-meta")) stamp.classList.add("mzo-native-chat-meta");
      if (!parts.footer) {
        parts.footer = document.createElement("div");
        parts.footer.className = "msg-date mzo-chat-stamp";
      }
      if (parts.footer.parentElement !== bubble) bubble.append(parts.footer);
      if (parts.stampMarkup !== stamp.innerHTML) {
        const content = stamp.cloneNode(true);
        for (const child of content.querySelectorAll("[id]")) child.removeAttribute("id");
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const text = walker.currentNode;
          if (chatDatePattern.test(text.data)) text.data = text.data.replace(chatDatePattern, "").replace(/^\s*[,·–-]\s*/, "").trimStart();
        }
        parts.footer.replaceChildren(...content.childNodes);
        parts.stampMarkup = stamp.innerHTML;
      }
    } else {
      parts.footer?.remove();
    }

    if (!parts.copy) {
      parts.copy=document.createElement('button');
      parts.copy.type='button';parts.copy.className='mzo-bubble-copy';
      parts.copy.title='Copiar mensagem completa';parts.copy.setAttribute('aria-label','Copiar mensagem completa');
      parts.copy.innerHTML='<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/></svg>';
      parts.copy.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();
        const source=bubble.querySelector('.message-wrap') || bubble;
        const clone=source.cloneNode(true);
        clone.querySelectorAll('button,script,style,.msg-date,.name,.mzo-chat-stamp,.mzo-native-chat-meta,.mzo-bubble-copy,.mzo-bubble-reply').forEach(node=>node.remove());
        clone.querySelectorAll('img[alt]').forEach(node=>node.replaceWith(document.createTextNode(node.alt)));
        clone.querySelectorAll('br').forEach(node=>node.replaceWith(document.createTextNode('\n')));
        clone.querySelectorAll('p,div,li,blockquote').forEach(node=>node.append(document.createTextNode('\n')));
        const text=clone.textContent.replace(/\n{3,}/g,'\n\n').trim();
        if(!text){parts.copy.title='Esta mensagem não possui texto para copiar';return;}
        try{
          await navigator.clipboard.writeText(text);
          parts.copy.title='Mensagem copiada';parts.copy.dataset.copied='true';
        }catch{parts.copy.title='Não foi possível copiar. Tente novamente.';}
        clearTimeout(parts.copyReset);
        parts.copyReset=setTimeout(()=>{parts.copy.title='Copiar mensagem completa';delete parts.copy.dataset.copied;},2000);
      });
    }
    if(parts.copy.parentElement!==bubble)bubble.prepend(parts.copy);
    parts.copy.style.right=reply?'26px':'4px';
    if (parts.reply !== reply) {
      parts.reply?.classList.remove("mzo-native-chat-meta");
      parts.reply = reply;
    }
    if (!reply) {
      parts.button?.remove();
      return;
    }
    if (!reply.classList.contains("mzo-native-chat-meta")) reply.classList.add("mzo-native-chat-meta");
    if (!parts.button) {
      parts.button = document.createElement("button");
      parts.button.type = "button";
      parts.button.className = "mzo-bubble-reply";
      parts.button.title = "Mencionar mensagem";
      parts.button.setAttribute("aria-label", "Mencionar mensagem");
      parts.button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4 2.5 7.5 6 11m-3.5-3.5h6a4 4 0 0 1 4 4"/></svg>';
      parts.button.addEventListener("click", event => {
        event.stopPropagation();
        parts.reply?.click();
      });
    }
    parts.button.disabled = !!reply.disabled || reply.getAttribute("aria-disabled") === "true";
    if (parts.button.parentElement !== bubble) bubble.prepend(parts.button);
  }
  function groupChatSenders(modal) {
    let previousSender = "";
    let previousDay = "";
    const unusedSeparators = new Set(modal.querySelectorAll(".mzo-chat-day"));
    const seenStamps = new Set();
    const seenReplies = new Set();
    for (const bubble of modal.querySelectorAll(".bubble-container .bubble")) {
      const name = [...bubble.querySelectorAll(".name")].find(node =>
        !node.closest(".message-wrap, blockquote, .mzo-quoted-block")
      );
      const direction = bubble.matches(".left-bubble") ? "in" : bubble.matches(".right-bubble") ? "out" : "";
      const label = name?.textContent.replace(/\s+/g, " ").trim();
      const author = bubble.getAttribute("data-sender-id") || name?.getAttribute("data-sender-id") || label;
      const sender = direction && label ? direction + ":" + author : "";
      const row = bubble.closest(".bubble-container");
      const nativeStamp = row?.querySelector(".msg-date:not(.mzo-chat-stamp)");
      const stamp = nativeStamp && !seenStamps.has(nativeStamp) ? nativeStamp : null;
      const nativeReply = row?.querySelector(`:is(${nativeReplySelector}):not(.mzo-bubble-reply)`);
      const reply = nativeReply && !seenReplies.has(nativeReply) ? nativeReply : null;
      if (reply) seenReplies.add(reply);
      const timestamp = stamp?.textContent || "";
      const day = timestamp.match(chatDatePattern)?.[0] || "";
      if (stamp) seenStamps.add(stamp);
      decorateChatBubble(bubble, stamp, reply);
      if (day && day !== previousDay) {
        // Keep the date inside the Angular ng-repeat block; sibling markers get moved past messages on each digest.
        let separator = row.querySelector(":scope > .mzo-chat-day");
        if (!separator?.matches(".mzo-chat-day")) {
          separator = document.createElement("div");
          separator.className = "mzo-chat-day";
          separator.append(document.createElement("span"));
          row.prepend(separator);
        }
        // Native rows reserve padding on the incoming/outgoing side. Center across the whole row.
        const rowStyle = getComputedStyle(row);
        const margins = {marginLeft:-(parseFloat(rowStyle.paddingLeft)||0)+"px",marginRight:-(parseFloat(rowStyle.paddingRight)||0)+"px"};
        for(const [property,value] of Object.entries(margins))if(separator.style[property]!==value)separator.style[property]=value;
        if (separator.dataset.day !== day) {
          const [date, month, year] = day.split("/").map(Number);
          const weekday = chatWeekday.format(new Date(year, month - 1, date, 12));
          separator.firstElementChild.textContent = weekday + " · " + day;
          separator.dataset.day = day;
        }
        unusedSeparators.delete(separator);
      }
      const repeated = !!sender && sender === previousSender && (!day || !previousDay || day === previousDay);
      name?.classList.toggle("mzo-repeated-sender", repeated);
      previousSender = sender;
      if (day) previousDay = day;
    }
    for (const separator of unusedSeparators) separator.remove();
  }
  function equalizeClosedCards(cards) {
    const dashboard = document.querySelector(".calls-dashboard");
    if (!dashboard) return;
    let height = 126;
    const pixels = value => parseFloat(value) || 0;
    for (const card of cards) {
      const box = card.querySelector(".mkz-card-container");
      if (!box || !box.getClientRects().length) continue;
      const style = getComputedStyle(box);
      let natural = pixels(style.paddingTop) + pixels(style.paddingBottom) +
        pixels(style.borderTopWidth) + pixels(style.borderBottomWidth);
      let visibleChildren = 0;
      for (const child of box.children) {
        const part = child.matches(".mzo-ticket-details") ? child.querySelector("summary") : child;
        if (!part) continue;
        const size = part.getBoundingClientRect().height;
        if (!size) continue;
        const childStyle = getComputedStyle(child);
        if (childStyle.position === "absolute" || childStyle.position === "fixed") continue;
        const footer = child.matches(".mzo-ticket-details, .mzo-ticket-status");
        natural += size + pixels(childStyle.marginBottom) +
          (footer ? pixels(childStyle.borderTopWidth) : pixels(childStyle.marginTop));
        visibleChildren++;
      }
      natural += Math.max(0, visibleChildren - 1) * pixels(style.rowGap);
      height = Math.max(height, Math.ceil(natural));
    }
    const next = height + "px";
    if (dashboard.style.getPropertyValue("--mzo-closed-card-height") !== next) {
      dashboard.style.setProperty("--mzo-closed-card-height", next);
    }
  }
  const displayedTicketPhones = new WeakMap();
  function formatTicketPhone(value) {
    const text = value.trim();
    if (!/^\+?[\d ()-]+$/.test(text)) return null;
    const digits = text.replace(/\D/g, "");
    const withCountry = /^55\d{10,11}$/.test(digits);
    if (text.startsWith("+") && !withCountry) return null;
    const national = withCountry ? digits.slice(2) : digits;
    const parts = national.match(/^([1-9]\d)(\d{4,5})(\d{4})$/);
    if (!parts) return null;
    const [, area, number, suffix] = parts;
    return { digits, formatted: `+55 (${area}) ${number}-${suffix}` };
  }
  function displayTicketPhone(card) {
    for (const info of card.querySelectorAll(".contact .info-info")) {
      if (info.closest(".mzo-ticket-channel-mirrored")) continue;
      const walker = document.createTreeWalker(info, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode;
        if (text.parentElement?.closest(".mzo-ticket-channel-mirrored")) continue;
        const previous = displayedTicketPhones.get(text);
        if (previous && text.data === previous.formatted) return previous.digits;
        const phone = formatTicketPhone(text.data);
        if (!phone) continue;
        displayedTicketPhones.set(text, phone);
        if (text.data !== phone.formatted) text.data = phone.formatted;
        return phone.digits;
      }
    }
    return "";
  }
  const recorderTimers=new WeakMap();
  function syncRecorderTimer(mic,recording) {
    let state=recorderTimers.get(mic);
    function clear(){if(!state)return;clearInterval(state.interval);state.node.remove();recorderTimers.delete(mic);delete mic.dataset.mzoNativeElapsed;}
    if(!recording){clear();return;}
    if(state)return;
    const node=document.createElement('span');node.className='mzo-recording-timer';node.setAttribute('role','timer');node.setAttribute('aria-live','off');mic.append(node);
    state={node,started:performance.now(),anchored:false,interval:null};recorderTimers.set(mic,state);
    function tick(){
      if(!mic.isConnected || !mic.classList.contains('mzo-recording')){clear();return;}
      const native=mic.dataset.mzoNativeElapsed===undefined?NaN:Number(mic.dataset.mzoNativeElapsed);
      let elapsed=Math.floor((performance.now()-state.started)/1000);
      if(Number.isFinite(native) && native>=0){
        if(state.lastNative!==undefined && native<state.lastNative){state.started=performance.now()-native*1000;state.anchored=true;}
        if(!state.anchored || native>elapsed+1){state.started=performance.now()-Math.max(native,elapsed)*1000;state.anchored=true;}
        state.lastNative=native;
        elapsed=Math.max(native,Math.floor((performance.now()-state.started)/1000));
      }
      const seconds=Math.floor(elapsed),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);
      const text=(hours?String(hours).padStart(2,'0')+':':'')+String(hours?minutes%60:minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
      if(node.textContent!==text){node.textContent=text;node.setAttribute('aria-label','Tempo de gravação: '+text);}
    }
    tick();state.interval=setInterval(tick,250);
  }

  function syncRecorderButton(row) {
    const mic=row.querySelector('.mic');if(!mic)return;
    const selector='.button-stop-recorder,[id="stopRecording"],[ng-click*="stopRecord"]';
    const candidates=[...mic.querySelectorAll(selector)];
    const visible=element=>element.style.display!=='none' && !element.closest('.ng-hide,[aria-hidden="true"]') && getComputedStyle(element).display!=='none' && getComputedStyle(element).visibility!=='hidden';
    const flagged=!!mic.querySelector('ng-audio-recorder.bg-danger');
    const recording=flagged || candidates.some(element=>visible(element)&&element.getClientRects().length);
    const stop=recording ? candidates.find(visible) || candidates[0] || mic.querySelector('.audioRecorder > a,.audioRecorder > button') : null;
    mic.classList.toggle('mzo-recording',recording);
    for(const element of mic.querySelectorAll('.mzo-stop-recording'))if(element!==stop)element.classList.remove('mzo-stop-recording');
    if(stop) {
      if(!stop.classList.contains('mzo-stop-recording'))stop.classList.add('mzo-stop-recording');
      if(stop.getAttribute('aria-label')!=='Parar gravação')stop.setAttribute('aria-label','Parar gravação');
      stop.setAttribute('role','button');stop.tabIndex=0;
      if(!stop.dataset.mzoComposerKeys){stop.dataset.mzoComposerKeys='true';stop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();stop.click();}});}
    }
    const start=mic.querySelector('.mic-link');
    if(start && start!==stop && start.getAttribute('aria-label')!=='Gravar áudio')start.setAttribute('aria-label','Gravar áudio');
    syncRecorderTimer(mic,recording);
  }

  function installFinalizationControl(){
    const select=document.querySelector('#dlgChatModal [data-test="finalization-chat-button"]');
    if(!select)return;
    const container=select.previousElementSibling;
    if(container?.classList.contains('select2-container')){
      if(!container.classList.contains('mzo-finalize-control'))container.classList.add('mzo-finalize-control');
      const choice=container.querySelector('.select2-choice');
      if(choice && choice.getAttribute('aria-label')!=='Finalizar atendimento'){choice.setAttribute('aria-label','Finalizar atendimento');choice.title='Finalizar atendimento';}
      // Status labels can contain a native .btn with its own inline blue surface.
      for(const label of container.querySelectorAll('.select2-chosen,.select2-chosen *')){
        const styles={'transition':'none','background-color':'transparent','background-image':'none','box-shadow':'none','border-width':'0px','padding':'0px','margin':'0px','min-height':'0px','height':'auto','min-width':'0px','width':'auto','font':'inherit','color':'rgb(255, 255, 255)','-webkit-text-fill-color':'rgb(255, 255, 255)'};
        for(const [property,value] of Object.entries(styles))if(label.style.getPropertyValue(property)!==value || label.style.getPropertyPriority(property)!=='important')label.style.setProperty(property,value,'important');
      }
    }else if(!select.classList.contains('mzo-finalize-select'))select.classList.add('mzo-finalize-select');
  }
  const composerFields=new WeakMap();
  function installComposerLayout() {
    const row=document.querySelector('#dlgChatModal #resizable-footer-field');
    if(!row)return;
    syncRecorderButton(row);
    const send=row.querySelector('.send > .btn:first-child');
    if(send && !send.hasAttribute('aria-label'))send.setAttribute('aria-label','Enviar mensagem');
    const attach=row.querySelector('.attachment > a');
    if(attach && !attach.hasAttribute('aria-label')){attach.setAttribute('aria-label','Anexar arquivo');attach.setAttribute('title','Anexar arquivo');attach.setAttribute('role','button');attach.tabIndex=0;}
    const emoji=row.querySelector('.emoji-span');
    if(emoji && !emoji.hasAttribute('aria-label')){emoji.setAttribute('aria-label','Escolher emoji');emoji.setAttribute('role','button');emoji.tabIndex=0;}
    const field=row.querySelector('textarea');
    const mic=row.querySelector('.mic-link');
    if(mic && !mic.hasAttribute('aria-label')){mic.setAttribute('aria-label','Gravar áudio');mic.setAttribute('role','button');mic.tabIndex=0;}
    for(const control of [attach,emoji,mic].filter(Boolean))if(!control.dataset.mzoComposerKeys){
      control.dataset.mzoComposerKeys='true';control.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();control.click();}});
    }
    if(field){
      if(field.rows!==1)field.rows=1;
      if(!composerFields.has(field)){
        let previousValue,previousWidth;
        const update=()=>{
          if(row.style.height && row.style.height!=='auto'){
            if(row.style.getPropertyValue('--mzo-compose-auto-height'))row.style.removeProperty('--mzo-compose-auto-height');
            previousValue=undefined;previousWidth=undefined;return;
          }
          if(previousValue===field.value && previousWidth===field.clientWidth)return;
          previousValue=field.value;previousWidth=field.clientWidth;
          // A stretched flex field with height:auto retains the grid's previous height.
          // Measure content at zero height so deletions can shrink the composer too.
          const saved=['height','min-height'].map(property=>[property,field.style.getPropertyValue(property),field.style.getPropertyPriority(property)]);
          let natural;
          try {
            for(const [property] of saved)field.style.setProperty(property,'0px','important');
            natural=Math.max(40,Math.min(220,field.scrollHeight));
          } finally {
            for(const [property,value,priority] of saved)if(value)field.style.setProperty(property,value,priority);else field.style.removeProperty(property);
          }
          const value=natural+'px';if(row.style.getPropertyValue('--mzo-compose-auto-height')!==value)row.style.setProperty('--mzo-compose-auto-height',value);
        };
        composerFields.set(field,update);field.addEventListener('input',update);
      }
      composerFields.get(field)();
    }
    const limit=row.querySelector('.hide-mobile')?.textContent.trim();
    if(field && limit && field.title!==limit){field.title=limit;field.setAttribute('aria-description',limit);}
  }
  function scanTickets() {
    const safeRun = (area, callback) => {
      try { callback(); }
      catch (error) { reportExtensionError(area, error); }
    };
    safeRun("layout do compositor", installComposerLayout);
    safeRun("controle de finalização", installFinalizationControl);
    safeRun("campo de pesquisa", installTicketSearch);
    safeRun("barra de atendimentos", installWorkspaceBar);
    safeRun("filtro de pastas", renderFolderShelf);
    syncOrderButton();
    safeRun("controles do chat", installChatControls);
    safeRun("ícones de perfil", installProfileIcons);
    safeRun("aviso de janela", markMetaWindowNotice);
    safeRun("mensagens citadas", repairQuotedMessages);
    if (!scanTickets.lastContrast || Date.now() - scanTickets.lastContrast > 900) safeRun("contraste das mensagens", () => { repairMessageContrast(); scanTickets.lastContrast = Date.now(); });
    const openChat = document.querySelector("#dlgChatModal.show, #dlgChatModal[style*='display: block']");
    for (const conversation of [openChat, document.querySelector('#historico')].filter(Boolean)) {
      safeRun("organização das mensagens", () => groupChatSenders(conversation));
      safeRun("abertura automática de mídias", () => autoOpenNativeMedia(conversation));
      safeRun("prévia de imagens", () => expandChatImages(conversation));
      safeRun("prévia de documentos", () => expandChatDocuments(conversation));
      safeRun("leitura dos anexos", () => refreshBridgeImages(conversation));
    }
    let contactsChanged = false;
    const cards = [...document.querySelectorAll(".attendance-card-container[data-test]")];
    const statuses = cards.map(card => {
      try { return [card, ticketStatus(card)]; }
      catch (error) { reportExtensionError("leitura do status", error); return [card, null]; }
    });
    const defaultOrder = new Map([...statuses]
      .map(([card,status],index)=>({card,status,index,priority:status==="reply"?0:1}))
      .sort((a,b)=>a.priority-b.priority || a.index-b.index)
      .map((item,index)=>[item.card,String(index)]));
    for (const [card, status] of statuses) {
      safeRun("atualização de atendimento", () => {
      const key = card.getAttribute("data-test") || "";
      const phone = displayTicketPhone(card) || card.querySelector(".contact .info-info")?.textContent?.match(/\b\d{10,13}\b/)?.[0] || card.textContent.match(/\b\d{10,13}\b/)?.[0] || "";
      if (!card.dataset.mzoKey) card.dataset.mzoKey = key;
      card.dataset.mzoPhone = phone;
      const rank = state.manualOrder.indexOf(key);
      const order = state.settings.customOrder === true ? String(rank < 0 ? 99999 : rank) : defaultOrder.get(card) || "0";
      if (card.style.order !== order) card.style.order = order;
      if (phone && !state.contacts[`phone:${phone}`]) {
        state.contacts[`phone:${phone}`] = { name:card.querySelector(".card-info .name")?.textContent?.trim() || phone, status:"Novo", tags:"", priority:false, url:location.href };
        contactsChanged = true;
      }
      if (card.querySelector(".mzo-flag-button")) { paintTicket(card, key, status); return; }
      const button = document.createElement("button");
      button.type = "button"; button.className = "mzo-flag-button"; button.setAttribute("aria-label", "Sinalizar este chat");
      button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); flagPhone = key; showFlagPicker(event.clientX, event.clientY); });
      const controls = document.createElement("div"); controls.className = "mzo-card-controls";
      controls.append(button); card.append(controls);
      const handle = document.createElement("button");
      handle.type = "button"; handle.className = "mzo-drag-handle"; handle.draggable = true; handle.title = "Arrastar para mudar a ordem"; handle.setAttribute("aria-label", "Arrastar atendimento"); handle.textContent = "⠿";
      handle.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); });
      handle.addEventListener("dragstart", event => { if (state.settings.customOrder !== true) { state.settings.customOrder = true; syncOrderButton(); save("settings"); scanTickets(); } draggingKey = key; dragStartOrder = [...state.manualOrder]; dragCommitted = false; dragMoved = false; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", key); event.dataTransfer.setDragImage(card, 90, 40); card.classList.add("mzo-dragging"); });
      handle.addEventListener("dragend", async () => { if (!dragCommitted && dragMoved) await save("manualOrder"); else if (!dragCommitted) { state.manualOrder = dragStartOrder; scanTickets(); } draggingKey = ""; dragMoved = false; card.classList.remove("mzo-dragging"); document.querySelectorAll(".mzo-drop-target,.mzo-folder-drop").forEach(el => el.classList.remove("mzo-drop-target","mzo-folder-drop")); });
      card.addEventListener("dragover", event => {
        if (!draggingKey || draggingKey === key) return;
        event.preventDefault(); event.dataTransfer.dropEffect = "move";
        card.classList.add("mzo-drop-target");
        const cards = visibleCards(); const current = cards.map(el => el.dataset.mzoKey);
        const without = current.filter(id => id !== draggingKey);
        const target = without.indexOf(key); if (target < 0) return;
        const rect = card.getBoundingClientRect();
        const after = document.documentElement.classList.contains("mzo-list-view") ? event.clientY > rect.top + rect.height / 2 : event.clientX > rect.left + rect.width / 2;
        without.splice(target + (after ? 1 : 0), 0, draggingKey);
        if (without.some((id,i)=>id !== current[i])) previewOrder(without);
      });
      card.addEventListener("dragleave", () => card.classList.remove("mzo-drop-target"));
      card.addEventListener("drop", async event => { event.preventDefault(); event.stopPropagation(); dragCommitted = true; card.classList.remove("mzo-drop-target"); await save("manualOrder"); });
      controls.prepend(handle);
      const folderButton = document.createElement("button");
      folderButton.type = "button";
      folderButton.className = "mzo-card-folder-button";
      folderButton.setAttribute("aria-label", "Adicionar conversa a uma pasta");
      folderButton.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
      folderButton.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); showCardFolderPicker(card, folderButton); });
      controls.insertBefore(folderButton, button);
      paintTicket(card, key, status);
      });
    }
    safeRun("alinhamento dos cartões", () => equalizeClosedCards(cards));
    if (contactsChanged) save("contacts").catch(error => reportExtensionError("salvamento de contatos", error));
  }
  function showCardFolderPicker(card, button) {
    document.querySelector(".mzo-card-folder-picker")?.remove();
    const picker = document.createElement("div");
    picker.className = "mzo-card-folder-picker";
    picker.setAttribute("role", "menu");
    picker.setAttribute("aria-label", "Escolher pasta da conversa");
    const title = document.createElement("strong"); title.textContent = "Escolher pasta"; picker.append(title);
    const currentId = state.folderAssignments[ticketFolderKey(card)] || "";
    if (!state.folders.length) {
      const empty = document.createElement("p"); empty.textContent = "Nenhuma pasta criada."; picker.append(empty);
      const create = document.createElement("button"); create.type = "button"; create.textContent = "Criar pasta";
      create.addEventListener("click", event => { event.stopPropagation(); picker.remove(); tab = "pastas"; $(".mzo-panel").classList.add("open"); render(); $("#mzo-folder-name")?.focus(); });
      picker.append(create);
    } else {
      for (const folder of state.folders) {
        const option = document.createElement("button"); option.type = "button"; option.setAttribute("role", "menuitem");
        const dot = document.createElement("span"); dot.className = "mzo-card-folder-dot"; dot.style.backgroundColor = folder.color;
        const name = document.createElement("span"); name.textContent = folder.name;
        option.append(dot, name);
        if (folder.id === currentId) { option.classList.add("active"); option.title = "Clique para remover desta pasta"; option.setAttribute("aria-label", `Remover conversa da pasta ${folder.name}`); }
        option.addEventListener("click", async event => { event.preventDefault(); event.stopPropagation(); const key = ticketFolderKey(card); if (state.folderAssignments[key] === folder.id) delete state.folderAssignments[key]; else state.folderAssignments[key] = folder.id; await save("folderAssignments"); picker.remove(); scanTickets(); if (tab === "pastas" && $(".mzo-panel").classList.contains("open")) render(); });
        picker.append(option);
      }
    }
    document.body.append(picker);
    const rect = button.getBoundingClientRect();
    picker.style.left = `${Math.max(8, Math.min(rect.right - 250, innerWidth - 258))}px`;
    picker.style.top = `${rect.bottom + 8 + Math.min(300, picker.scrollHeight) > innerHeight ? Math.max(8, rect.top - Math.min(300, picker.scrollHeight) - 8) : rect.bottom + 8}px`;
  }
  function markMetaWindowNotice() {
    const modal = document.querySelector("#dlgChatModal.show, #dlgChatModal[style*='display: block']");
    if (!modal || modal.querySelector(".mzo-meta-window-notice")) return;
    const walker = document.createTreeWalker(modal, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!/cliente não respondeu nas últimas 24h/i.test(textNode.nodeValue || "")) continue;
      let block = textNode.parentElement;
      let notice = block;
      for (let depth=0; block && depth<5; depth++, block=block.parentElement) {
        if (notice === textNode.parentElement && /para continuar essa conversa/i.test(block.textContent)) notice = block;
        if ([...block.querySelectorAll("button")].some(button => /selecionar template/i.test(button.textContent || ""))) { block.classList.add("mzo-meta-window-notice"); return; }
      }
      notice?.classList.add("mzo-meta-window-notice"); return;
    }
  }
  function installProfileIcons() {
    const source = chrome.runtime.getURL("assets/profile.png");
    const slots = [document.querySelector("#dlgChatModal .modal-header .channel-container"), ...document.querySelectorAll(".attendance-card-container .card-info .channel")];
    for (const slot of slots) {
      if (!slot || slot.querySelector(":scope > .mzo-profile-icon")) continue;
      const icon = document.createElement("img");
      icon.className = "mzo-profile-icon";
      icon.alt = "";
      icon.decoding = "async";
      icon.onload = () => slot.classList.add("mzo-profile-ready");
      icon.onerror = () => { slot.classList.remove("mzo-profile-ready"); icon.remove(); };
      slot.append(icon);
      icon.src = source;
    }
  }
  const citationStyles = new WeakMap();
  function repairQuotedMessages() {
    const dialogs=':is(#dlgChatModal,#historico)';
    const controls='.attachment,.mic,.emoji,.send,.input-msg,button,a[role="button"],.mzo-bubble-reply';
    const light=document.documentElement.classList.contains('mzo-light');
    const palette=light ? {bg:'#e5eff5',text:'#172c3d',border:'#b2c9da',accent:'#16768a'} : {bg:'#283b4d',text:'#f1f7ff',border:'#647f96',accent:'#53dfc3'};
    const set=(el,key,value)=>{if(el.style.getPropertyValue(key)!==value || el.style.getPropertyPriority(key)!=='important') el.style.setProperty(key,value,'important');};
    const eligible=el=>!el.closest(controls) && !el.querySelector('textarea,.input-msg,.send,ng-audio-recorder') && !el.matches('button,a,input,i,svg');
    // The clickable native wrapper owns the one quote surface and accent bar.
    // Its inner .quoted-message is content, not a second quoted card.
    for(const root of document.querySelectorAll(dialogs+' :is(.bubble-quoted,.bubble-quoted-history)')) {
      if(root.closest(controls)) continue;
      const preview=!!root.closest('.mkz-input-area');
      const className=preview ? 'mzo-reply-preview' : 'mzo-quoted-block';
      if(!root.classList.contains(className)) root.classList.add(className);
    }
    // Never treat visibility conditions on the composer buttons as reply containers.
    for(const el of document.querySelectorAll(dialogs+' .mzo-reply-preview')) {
      if(!el.matches('.bubble-quoted,.bubble-quoted-history') && !eligible(el)) {
        el.classList.remove('mzo-reply-preview');
        for(const node of [el,...el.querySelectorAll('*')]) for(const key of ['background','border','border-left','border-inline-start','color','-webkit-text-fill-color']) {
          if(node.style.getPropertyValue(key).includes('--mzo-citation')) node.style.removeProperty(key);
        }
      }
    }
    for(const el of document.querySelectorAll(dialogs+' .bubble :is(div,span,blockquote)')) {
      if(el.closest('.mzo-quoted-block,.mzo-reply-preview') || !eligible(el) || el.matches('.message-wrap,.mzo-chat-stamp,.name')) continue;
      const semantic=el.matches('blockquote,.blockquote,[class*="quoted-message"],[class*="reply-preview"],[class*="reply-message"],[class*="message-reply"]');
      const border=parseFloat(getComputedStyle(el).borderLeftWidth)>=3 && el.getBoundingClientRect().width>60;
      if(semantic || border) el.classList.add('mzo-quoted-block');
    }
    for(const el of document.querySelectorAll(dialogs+' .mkz-input-area :is(div,span,blockquote)')) {
      if(!eligible(el) || el.closest('.mzo-reply-preview,.bubble')) continue;
      const expression=['ng-if','ng-show','data-ng-if'].map(key=>el.getAttribute(key)||'').join(' ');
      const binding=/quotingMessage\.reply/.test(expression) && !/!\s*(?:vm\.)?quotingMessage/.test(expression);
      const border=parseFloat(getComputedStyle(el).borderLeftWidth)>=3 && el.getBoundingClientRect().width>60;
      if(binding || border || el.matches('blockquote,[class*="reply-preview"],[class*="quoted-message"]')) el.classList.add('mzo-reply-preview');
    }
    for(const el of document.querySelectorAll(dialogs+' :is(.mzo-quoted-block,.mzo-reply-preview) :is(.mzo-quoted-block,.mzo-reply-preview)')) el.classList.remove('mzo-quoted-block','mzo-reply-preview');
    for(const root of document.querySelectorAll(dialogs+' :is(.mzo-quoted-block,.mzo-reply-preview)')) {
      for(const el of [root,...root.querySelectorAll('*')]) {
        set(el,'color',palette.text);
        set(el,'-webkit-text-fill-color',palette.text);
        set(el,'opacity','1');set(el,'text-shadow','none');set(el,'filter','none');
        set(el,'mix-blend-mode','normal');
        if(el!==root && el.matches('div,span,p,font,mark,b,strong,small,em,label,blockquote') && !el.closest('button,.btn')) {
          set(el,'border','0px none');
          set(el,'border-left-width','0px');set(el,'border-inline-start-width','0px');
          set(el,'box-shadow','none');
          set(el,'background-color','transparent');
        }
      }
      set(root,'isolation','isolate');
      set(root,'background',palette.bg);
      set(root,'border','1px solid '+palette.border);
      set(root,'border-inline-start','4px solid '+palette.accent);
      set(root,'border-left','4px solid '+palette.accent);
      for(const el of [root,...root.querySelectorAll('*')]) citationStyles.set(el,el.getAttribute('style'));
    }
  }
  function repairMessageContrast() {
    const rgb = value => { const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/); return m ? [Number(m[1]),Number(m[2]),Number(m[3]),m[4] === undefined ? 1 : Number(m[4])] : null; };
    const light = c => c && (c[0] * .2126 + c[1] * .7152 + c[2] * .0722);
    for (const el of document.querySelectorAll(":is(#dlgChatModal,#historico) .bubble-container :is(div,span,p,strong,em,a,blockquote,font)")) {
      if (!el.textContent?.trim() || el.closest(".mzo-quoted-block")) continue;
      const style = getComputedStyle(el);
      const fg = rgb(style.color);
      const fill = rgb(style.webkitTextFillColor || style.color);
      if ((!fg || light(fg) >= 115) && (!fill || light(fill) >= 115) && Number(style.opacity) >= .75) continue;
      let node = el, bg = null;
      while (node && node.matches?.(":is(#dlgChatModal,#historico) *")) {
        const value = rgb(getComputedStyle(node).backgroundColor);
        if (value && value[3] > .7) { bg = value; break; }
        node = node.parentElement;
      }
      if (bg && light(bg) < 150) {
        el.style.setProperty("color", "#f6fbff", "important");
        el.style.setProperty("-webkit-text-fill-color", "#f6fbff", "important");
        el.style.setProperty("opacity", "1", "important");
        el.style.setProperty("filter", "none", "important");
      }
    }
  }
  const imagePattern = /\.(?:png|jpe?g|webp|gif|avif|bmp|tiff?|heic|heif|svg)(?:[?#]|$)/i;
  const audioPattern = /\.(?:mp3|m4a|aac|wav|ogg|opus|flac)(?:[?#]|$)/i;
  const videoPattern = /\.(?:mp4|m4v|mov|webm|mkv|avi|3gp)(?:[?#]|$)/i;
  const filePattern = /\.[a-z0-9]{1,12}(?:[?#]|$)/i;
  const originalFileName = value => {
    if (typeof value !== 'string') return '';
    let name = value.trim();
    try { name = decodeURIComponent(name); } catch {}
    return name.split(/[\\/]/).pop().replace(/[<>:"|?*\x00-\x1f]/g,'_').slice(0,180);
  };
  function documentMarker(element) {
    const raw = element.getAttribute("ng-click") || "";
    if (!/\bdisplayFile\s*\(/i.test(raw) || !/\btype=document\b/i.test(raw)) return null;
    const url = raw.match(/\bfile=(https?:\/\/[^\s\]]+)/i)?.[1];
    if (!url) return null;
    let name = originalFileName(raw.match(/\bname=([^\]]+)/i)?.[1]) || "Documento";
    return {url,name,kind:"files"};
  }
  function documentFromLink(anchor) {
    if (anchor.closest('.mzo-document-card,.mkz-input-area') || !anchor.getAttribute('href')) return null;
    let url;
    try { url=new URL(anchor.getAttribute('href'),location.href); } catch { return null; }
    if(!/^(https?:|blob:)$/.test(url.protocol)) return null;
    const text=anchor.textContent.trim();
    const attachment=/^\s*Anexo\s*:/i.test(text) || anchor.hasAttribute('download');
    if(!attachment && !/\.(?:pdf|docx?|xlsx?|pptx?|csv|txt|rtf|odt|ods|odp|zip|rar|7z|cdr|ai|eps|psd|svg|dwg)(?:$|[?#])/i.test(url.href)) return null;
    let name=originalFileName(anchor.getAttribute('download') || text.replace(/^Anexo\s*:\s*/i,'') || url.pathname.split('/').pop()) || 'Documento';
    return {url:url.href,name,kind:'files'};
  }
  const documentCards=new WeakMap();
  function mountDocumentCard(source,file) {
    if(source.closest('.mkz-input-area')) return;
    const key=file.url+'\n'+file.name;
    const previous=documentCards.get(source);
    if(previous?.key===key && previous.card.isConnected) return;
    previous?.card.remove();
    const oldImage=source.nextElementSibling;
    if(oldImage?.matches('.mzo-inline-chat-image') && oldImage.src===file.url) oldImage.remove();
    const card=document.createElement('span');card.className='mzo-document-card';
    const icon=document.createElement('span');icon.className='mzo-document-icon';icon.textContent='▣';icon.setAttribute('aria-hidden','true');
    const details=document.createElement('span');details.className='mzo-document-details';
    const title=document.createElement('strong');title.textContent=file.name;
    const extension=(file.name.match(/\.([a-z0-9]{1,10})$/i)?.[1] || file.url.split(/[?#]/)[0].match(/\.([a-z0-9]{1,10})$/i)?.[1] || 'arquivo').toUpperCase();
    const hint=document.createElement('small');hint.textContent=extension+' · Documento';details.append(title,hint);
    const open=document.createElement('button');open.type='button';open.className='mzo-document-open';open.textContent='Abrir documento';
    open.setAttribute('aria-label','Abrir documento: '+file.name);
    open.onclick=event=>{event.preventDefault();event.stopPropagation();globalThis.mzoOfficePreview.open(file);};
    card.append(icon,details,open);
    let preview;
    if(extension==='PDF') {
      preview=document.createElement('iframe');preview.className='mzo-document-preview';preview.title=file.name;preview.loading='lazy';preview.src=file.url;
    } else if(/^(PNG|JPE?G|WEBP|GIF|AVIF|BMP|SVG)$/.test(extension)) {
      preview=document.createElement('img');preview.className='mzo-document-image';preview.alt=file.name;preview.loading='lazy';preview.src=file.url;
    } else if(/^(MP4|WEBM|MOV|M4V|3GP|MPEG|MPG|MP3|M4A|AAC|WAV|OGG|OPUS|FLAC)$/.test(extension)) {
      preview=document.createElement(/^(MP4|WEBM|MOV|M4V|3GP|MPEG|MPG)$/.test(extension)?'video':'audio');preview.className='mzo-document-media';preview.controls=true;preview.preload='metadata';preview.src=file.url;
    } else if(globalThis.mzoOfficePreview?.supported(extension)) {
      preview=document.createElement('span');preview.className='mzo-office-preview';
    } else {
      preview=document.createElement('span');preview.className='mzo-document-fallback';
      const type=document.createElement('strong');type.textContent=extension;
      const message=document.createElement('small');message.textContent='Abra o documento para visualizar o conteúdo';preview.append(type,message);
    }
    card.append(preview);source.after(card);source.classList.add('mzo-document-original');
    if(preview.classList.contains('mzo-office-preview'))globalThis.mzoOfficePreview.mount(preview,file);
    const bubble=source.closest('.bubble');if(bubble && !bubble.classList.contains('mzo-document-bubble'))bubble.classList.add('mzo-document-bubble');
    documentCards.set(source,{key,card,file});
  }
  function expandChatDocuments(modal) {
    for(const source of modal.querySelectorAll('.bubble [ng-click*="displayFile"]')) {
      const file=documentMarker(source);if(file)mountDocumentCard(source,file);
    }
    for(const source of modal.querySelectorAll('.bubble a[href]')) {
      const file=documentFromLink(source);if(file)mountDocumentCard(source,file);
    }
  }
  const openedNativeDocuments = new WeakSet();
  function autoOpenNativeDocuments(modal) {
    if (!modal.isConnected || !modal.getClientRects().length) return;
    for (const control of modal.querySelectorAll(".bubble [ng-click*='displayFile']")) {
      if (control.closest(".mkz-input-area") || control.matches(':disabled,[aria-disabled="true"]') || !control.getClientRects().length) continue;
      if (!/\b(?:carregar|visualizar)\s+(?:o\s+)?documento\b/i.test(control.textContent.trim())) continue;
      // Direct URLs are expanded below without opening additional tabs.
      if (documentMarker(control) || openedNativeDocuments.has(control)) continue;
      openedNativeDocuments.add(control);
      control.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();},{once:true});
      control.click();
    }
  }
  function autoOpenNativeMedia(modal) {
    autoOpenNativeDocuments(modal);
    const viewLabel = /(?:Visualizar\s+(?:(?:a|o)\s+)?(?:imagem|foto|vídeo|video|áudio|audio)|(?:Carregar|Reproduzir|Ouvir)\s+(?:o\s+)?(?:vídeo|video|áudio|audio))(?=\s|$|[.,:;!?])/i;
    for (const bubble of modal.querySelectorAll(".bubble-container .bubble")) {
      if (!viewLabel.test(bubble.textContent || "")) continue;
      const candidates = [...bubble.querySelectorAll("a,button,[ng-click],[role='button']")]
        .filter(el => viewLabel.test(el.textContent || "") && !el.classList.contains("mzo-inline-chat-image"))
        .sort((a,b) => a.textContent.length - b.textContent.length);
      const target = candidates[0] || [...bubble.querySelectorAll("*")].find(el => el.childElementCount === 0 && viewLabel.test(el.textContent || ""));
      if (!target) continue;
      const label = target.textContent.trim();
      if (bubble.dataset.mzoAutoOpened === label || bubble.querySelector("img, audio, video, iframe, embed, object")) continue;
      bubble.dataset.mzoAutoOpened = label;
      if (bubble.isConnected) target.click();
    }
  }
  const pendingImageRequests = new Map();
  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== "mzo-image-bridge") return;
    const resolve = pendingImageRequests.get(event.data.requestId);
    if (resolve) { pendingImageRequests.delete(event.data.requestId); resolve(event.data); }
  });
  function requestBridgeImages(modal) {
    return new Promise(resolve => {
      const requestId = uid();
      const timeout = setTimeout(() => {
        if (!pendingImageRequests.has(requestId)) return;
        pendingImageRequests.delete(requestId);
        resolve({ images:[], total:0 });
      }, 1300);
      pendingImageRequests.set(requestId, data => { clearTimeout(timeout); resolve(data); });
      window.postMessage({ source:"mzo-image-request", requestId, modalId:modal?.id || "dlgChatModal" }, location.origin);
    });
  }
  function chatFileSources(modal) {
    const sources = new Map();
    const received = el => !!el.closest(".left-bubble") && !el.closest(".mzo-quoted-block,[class*=quoted],[class*=reply-preview]");
    for(const source of modal.querySelectorAll('.bubble [ng-click*="displayFile"],.bubble a[href]')) {
      if(!received(source)) continue;
      const file=documentCards.get(source)?.file || documentMarker(source) || (source.matches('a[href]') && documentFromLink(source));
      if(file) sources.set(file.url,{url:file.url,name:originalFileName(file.name),kind:imagePattern.test(file.name) || imagePattern.test(file.url) ? 'images' : audioPattern.test(file.name) || audioPattern.test(file.url) ? 'audio' : videoPattern.test(file.name) || videoPattern.test(file.url) ? 'videos' : 'files'});
    }
    for (const control of modal.querySelectorAll(".bubble-container .bubble [ng-click*='displayFile']")) {
      const file = received(control) && documentMarker(control);
      if (file) sources.set(file.url,{...file,name:originalFileName(file.name)});
    }
    for (const item of modal.querySelectorAll(".bubble :is(img, video, audio, source, iframe[src], a[href], [data-src], [data-url], [data-image-url])")) {
      if (!received(item)) continue;
      if (item.matches("img") && item.closest(".emoji, .avatar, .channel")) continue;
      const candidates = [item.currentSrc, item.getAttribute("src"), item.getAttribute("href"), item.getAttribute("data-src"), item.getAttribute("data-url"), item.getAttribute("data-image-url")];
      for (const value of candidates) {
        if (!value || value.startsWith("data:") && !/^data:(?:image|video|audio|application)\//i.test(value)) continue;
        try {
          const url = value.startsWith("data:") || value.startsWith("blob:") ? value : new URL(value, location.href).href;
          if (!/^(?:https?:\/\/|blob:|data:(?:image|video|audio|application)\/)/i.test(url) || !(item.matches("img,video,audio,source") || filePattern.test(url) || item.hasAttribute("download") || url.startsWith("data:"))) continue;
          const name = originalFileName(item.getAttribute("download") || item.getAttribute("title") || item.getAttribute("aria-label") || "");
          const kind = item.matches("img") || imagePattern.test(url) || imagePattern.test(name) || /^data:image\//i.test(url) ? "images"
            : item.matches("audio") || !!item.closest("audio") || /audio/i.test(item.getAttribute("type") || "") || audioPattern.test(url) || audioPattern.test(name) || /^data:audio\//i.test(url) ? "audio"
            : item.matches("video") || !!item.closest("video") || /video/i.test(item.getAttribute("type") || "") || videoPattern.test(url) || videoPattern.test(name) || /^data:video\//i.test(url) ? "videos" : "files";
          const previous = sources.get(url);
          if (!previous || !previous.name && name || previous.kind === "files" && kind !== "files") sources.set(url,{url,name:name || previous?.name || "",kind});
        } catch {}
      }
    }
    return [...sources.values()];
  }
  function expandChatImages(modal) {
    for (const anchor of modal.querySelectorAll(".bubble-container .bubble a[href]")) {
      let url;
      try { url = new URL(anchor.getAttribute("href"), location.href).href; } catch { continue; }
      if (!imagePattern.test(url) || anchor.dataset.mzoExpanded) continue;
      anchor.dataset.mzoExpanded = "true";
      if (anchor.querySelector("img") || anchor.parentElement?.querySelector(".mzo-inline-chat-image")) continue;
      const preview = document.createElement("img");
      preview.className = "mzo-inline-chat-image";
      preview.src = url;
      preview.loading = "lazy";
      preview.alt = "Imagem da conversa";
      preview.onerror = () => preview.remove();
      anchor.after(preview);
    }
  }
  function expandBridgeImages(modal, result) {
    const bubbles = [...modal.querySelectorAll(".bubble-container .bubble")];
    for (const item of result.images || []) {
      const url = item.url;
      if (typeof url !== "string" || !/^(?:https?:\/\/|blob:|data:image\/)/i.test(url)) continue;
      const byId = item.id && [...modal.querySelectorAll("[id]")].find(node => node.id === `select-${item.id}`);
      const bubble = byId && modal.contains(byId) ? byId : result.total === bubbles.length ? bubbles[item.index] : null;
      if (!bubble || bubble.dataset.mzoImageFailed === url || bubble.querySelector("img")) continue;
      if (bubble.querySelector(".mzo-inline-chat-image")) continue;
      const preview = document.createElement("img");
      preview.className = "mzo-inline-chat-image";
      preview.src = url;
      preview.loading = "lazy";
      preview.alt = "Imagem da conversa";
      preview.onerror = () => { bubble.dataset.mzoImageFailed = url; preview.remove(); };
      const message = bubble.querySelector(".message-wrap");
      if (message) message.after(preview); else bubble.append(preview);
    }
  }
  function mountAvatar(slot, url) {
    if (!slot || typeof url !== "string" || !/^(?:https?:\/\/|data:image\/)/i.test(url)) return;
    if (slot.dataset.mzoAvatarFailed === url) return;
    let img = slot.querySelector(":scope > .mzo-avatar");
    if (!img) {
      img = document.createElement("img");
      img.className = "mzo-avatar";
      img.alt = "Foto do cliente";
      slot.append(img);
    }
    if (img.src === url) return;
    slot.classList.remove("mzo-has-avatar");
    img.onload = () => slot.classList.add("mzo-has-avatar");
    img.onerror = () => { slot.dataset.mzoAvatarFailed = url; slot.classList.remove("mzo-has-avatar"); img.remove(); };
    img.src = url;
  }
  function applyAvatars(modal, result) {
    mountAvatar(modal.querySelector(".modal-header .channel-container"), result.avatar);
    const cards = [...document.querySelectorAll(".attendance-card-container[data-test]")];
    for (const item of result.cards || []) {
      mountAvatar(cards[item.index]?.querySelector(".card-info .channel"), item.url);
    }
  }
  const bridgeScans = new WeakMap();
  function refreshBridgeImages(modal) {
    let scan = bridgeScans.get(modal);
    if (!scan) { scan = { last:0, timer:null }; bridgeScans.set(modal, scan); }
    const remaining = 2500 - (Date.now() - scan.last);
    if (remaining > 0) {
      scan.timer ||= setTimeout(() => {
        scan.timer = null;
        if (modal.isConnected && modal.getClientRects().length) refreshBridgeImages(modal);
      }, remaining);
      return;
    }
    scan.last = Date.now();
    requestBridgeImages(modal).then(result => {
      if (modal.isConnected) expandBridgeImages(modal, result);
    });
  }
  async function downloadChatFiles(modal, button, category) {
    const reset = () => { button.textContent = "↓ Baixar arquivos ▾"; };
    const categoryName = { files:"documentos", images:"imagens" }[category] || "itens";
    const emptyMessage = { files:"Nenhum documento encontrado", images:"Nenhuma imagem encontrada" }[category] || "Nenhum item encontrado";
    clearTimeout(button._mzoResetTimer);
    button.disabled = true;
    button.textContent = `Procurando ${categoryName}…`;
    try {
    const bridge = await requestBridgeImages(modal);
    const entries = new Map(chatFileSources(modal).map(item => [item.url,item]));
    for (const item of bridge.files || bridge.images || []) {
      if (typeof item.url !== "string" || item.incoming !== true) continue;
      const previous = entries.get(item.url);
      if (item.kind === "audio" || item.kind === "videos") continue;
      const kind = item.image || item.kind === "images" ? "images" : previous?.kind === "images" ? "images" : "files";
      entries.set(item.url,{url:item.url,name:originalFileName(item.name) || previous?.name || "",kind});
    }
    const files = [...entries.values()].filter(item => item.kind === category);
    if (!files.length) {
      button.disabled = false;
      button.textContent = emptyMessage;
      button._mzoResetTimer = setTimeout(reset, 3500);
      return;
    }
    let count = 0, failed = 0, batch = [];
    const sendBatch = items => new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({type:"mzo-download-files",files:items}, response => {
          const lastError = chrome.runtime.lastError;
          if (lastError || !response) { failed += items.length; resolve(); return; }
          count += Number(response.count) || 0;
          failed += Number(response.failed) || 0;
          resolve();
        });
      } catch { failed += items.length; resolve(); }
    });
    const flush = async () => {
      if (!batch.length) return;
      const current = batch;
      batch = [];
      await sendBatch(current);
    };
    button.textContent = `Baixando ${files.length} arquivo(s)…`;
    for (const item of files) {
      if (!item.url.startsWith("blob:")) {
        batch.push(item);
        if (batch.length >= 20) await flush();
        continue;
      }
      await flush();
      try {
        const response = await fetch(item.url);
        if (!response.ok) throw Error("Falha ao ler mídia local");
        const blob = await response.blob();
        const ext = blob.type.split("/")[1]?.split(";")[0]?.replace("jpeg","jpg")?.replace(/[^a-z0-9]/gi,"").slice(0,8) || "bin";
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve,reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(Error("Falha ao converter mídia local"));
          reader.readAsDataURL(blob);
        });
        await sendBatch([{url:dataUrl,name:originalFileName(item.name) || `${item.kind === "images" ? "imagem" : "arquivo"}.${ext}`}]);
      } catch { failed++; }
    }
    await flush();
    button.disabled = false;
    button.textContent = failed ? `${count} baixado(s), ${failed} falhou(aram)` : `${count} download(s) iniciado(s)`;
    button._mzoResetTimer = setTimeout(reset, 5000);
    } catch (error) {
      button.disabled = false;
      button.textContent = "Falha ao preparar downloads";
      button._mzoResetTimer = setTimeout(reset, 5000);
      reportExtensionError("download de arquivos", error);
    }
  }
  function renderFolderShelf() {
    const dashboard = document.querySelector(".calls-dashboard");
    if (!dashboard) return;
    let shelf = document.querySelector(".mzo-folder-shelf");
    if (!shelf) {
      shelf = document.createElement("div"); shelf.className = "mzo-folder-shelf";
      dashboard.parentElement.insertBefore(shelf, dashboard);
      shelf.addEventListener("click", event => {
        if (event.target.closest(".mzo-folder-create")) return;
        const chip = event.target.closest("[data-folder]");
        if (!chip) return;
        const selected = chip.dataset.folder;
        activeStatusFilter = "";
        activeFolder = activeFolder === selected ? "" : selected;
        scanTickets();
      });
      shelf.addEventListener("change", event => {
        if (!event.target.matches("[data-status-filter]")) return;
        activeStatusFilter = event.target.value;
        activeFolder = "";
        scanTickets();
      });
      shelf.addEventListener("dragover", event => {
        const chip = event.target.closest("[data-folder]");
        if (!chip || !draggingKey) return;
        event.preventDefault(); event.dataTransfer.dropEffect = "move";
        shelf.querySelectorAll(".mzo-folder-drop").forEach(el => el.classList.remove("mzo-folder-drop"));
        chip.classList.add("mzo-folder-drop");
      });
      shelf.addEventListener("dragleave", event => { if (!shelf.contains(event.relatedTarget)) shelf.querySelectorAll(".mzo-folder-drop").forEach(el => el.classList.remove("mzo-folder-drop")); });
      shelf.addEventListener("drop", async event => {
        const chip = event.target.closest("[data-folder]");
        if (!chip || !draggingKey) return;
        event.preventDefault(); event.stopPropagation();
        const card = [...document.querySelectorAll(".attendance-card-container[data-mzo-key]")].find(el => el.dataset.mzoKey === draggingKey);
        if (!card) return;
        const key = ticketFolderKey(card);
        if (chip.dataset.folder && chip.dataset.folder !== "__unfiled__") state.folderAssignments[key] = chip.dataset.folder;
        else delete state.folderAssignments[key];
        dragCommitted = true;
        await save("folderAssignments");
        scanTickets();
        if (tab === "pastas") render();
      });
    }
    const signature = JSON.stringify([activeFolder,activeStatusFilter,state.folders,state.settings.statusStyles]);
    if (shelf.dataset.signature === signature) return;
    shelf.dataset.signature = signature;
    shelf.innerHTML = `<span class="mzo-folder-heading">Pastas</span>${state.folders.map(folder=>`<button type="button" data-folder="${safe(folder.id)}" class="${activeFolder===folder.id?"active":""}" aria-pressed="${activeFolder===folder.id}" style="--mzo-folder-color:${safe(folder.color)}"><span class="mzo-folder-dot"></span>${safe(folder.name)}</button>`).join("")}<button type="button" class="mzo-folder-create">＋ Criar pasta</button><span class="mzo-folder-spacer" aria-hidden="true"></span><div class="mzo-status-controls"><label class="mzo-status-filter-label">Status<select data-status-filter aria-label="Filtrar atendimentos por status"><option value="" ${activeStatusFilter===""?"selected":""}>Todos os status</option><option value="all" ${activeStatusFilter==="all"?"selected":""}>Geral</option><option value="reply" ${activeStatusFilter==="reply"?"selected":""}>${safe(statusConfig("reply").name)}</option><option value="progress" ${activeStatusFilter==="progress"?"selected":""}>${safe(statusConfig("progress").name)}</option><option value="closing" ${activeStatusFilter==="closing"?"selected":""}>${safe(statusConfig("closing").name)}</option><option value="closed" ${activeStatusFilter==="closed"?"selected":""}>${safe(statusConfig("closed").name)}</option></select></label><button type="button" class="mzo-refresh-attendances" aria-label="Atualizar atendimentos" title="Atualizar a fila na ordem padrão">↻</button></div>`;
    shelf.querySelector(".mzo-folder-create").addEventListener("click", () => { tab = "pastas"; $(".mzo-panel").classList.add("open"); render(); $("#mzo-folder-name")?.focus(); });
    shelf.querySelector(".mzo-refresh-attendances").addEventListener("click", async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.classList.add("is-refreshing");
      button.title = "Atualizando atendimentos…";
      state.settings.customOrder = false;
      try {
        await save("settings");
        scanTickets();
        button.title = "Atendimentos atualizados";
      } catch (error) {
        reportExtensionError("atualização da fila", error);
        button.title = "Falha ao atualizar atendimentos";
      } finally {
        button.disabled = false;
        button.classList.remove("is-refreshing");
        setTimeout(() => { if (button.isConnected) button.title = "Atualizar a fila na ordem padrão"; }, 2000);
      }
    });
  }
  function installWorkspaceBar() {
    const dashboard = document.querySelector(".calls-dashboard");
    if (!dashboard || document.querySelector(".mzo-workspace-bar")) return;
    const bar = document.createElement("div");
    bar.className = "mzo-workspace-bar";
    bar.innerHTML = `<div class="mzo-workspace-title">Central de atendimentos<small>Organize sua fila e acompanhe os próximos passos</small></div><button type="button" class="mzo-view-toggle">☷ Visão em lista</button><button type="button" class="mzo-primary mzo-open-workspace">MKT ORGANIZER</button><button type="button" class="mzo-open-reminders" aria-label="Lembretes" title="Lembretes"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/></svg></button>`;
    bar.querySelector(".mzo-view-toggle").addEventListener("click", async () => { state.settings.localView = state.settings.localView === "list" ? "grid" : "list"; applySettings(); await save("settings"); });
    bar.querySelector(".mzo-open-workspace").addEventListener("click", () => { tab = "ajustes"; $(".mzo-panel").classList.add("open"); render(); });
    bar.querySelector(".mzo-open-reminders").addEventListener("click", () => { tab = "lembretes"; $(".mzo-panel").classList.add("open"); render(); });
    const sort = document.createElement("button"); sort.type = "button"; sort.className = "mzo-order-toggle";
    sort.onclick = async () => { state.settings.customOrder = state.settings.customOrder !== true; await save("settings"); syncOrderButton(); scanTickets(); };
    bar.insertBefore(sort,bar.querySelector(".mzo-open-workspace"));
    dashboard.parentElement.insertBefore(bar, dashboard);
    syncOrderButton();
    applySettings();
  }
  function currentConversation(modal) {
    const header = modal?.querySelector(".modal-header");
    if (!header) return null;
    const values = [...header.querySelectorAll("[data-clipboard-text]")].map(el => el.getAttribute("data-clipboard-text") || "");
    const phone = values.map(value => value.replace(/\D/g, "")).find(value => value.length >= 10 && value.length <= 13) || (header.textContent.match(/(?:\+?\d[\d\s()-]{8,20}\d)/)?.[0] || "").replace(/\D/g, "");
    const bsuid = values.find(value => /^BR\./i.test(value)) || "";
    const name = header.querySelector(".edited-name > span, .default-name")?.textContent?.trim() || "Contato";
    return { phone, name, id: phone ? `phone:${phone}` : bsuid ? `bsuid:${bsuid}` : `name:${name}` };
  }
  const metaRateInCents = 5;
  const metaCurrency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function installMetaCosts(modal, conversationId) {
    const contactInfo = modal.querySelector(".customer-info");
    if (!contactInfo) return;
    const observations = contactInfo.querySelector("textarea");
    const collapsible = observations?.closest(".collapse, [uib-collapse]");
    const section = collapsible && contactInfo.contains(collapsible) ? collapsible : contactInfo;

    let details = modal.querySelector(".mzo-meta-costs");
    function updateCost() {
      if (!details.open) return;
      const count = modal.querySelectorAll(".bubble-container .bubble.right-bubble").length;
      const output = details.querySelector("output");
      const text = `${count.toLocaleString("pt-BR")} enviadas · ${metaCurrency.format(count * metaRateInCents / 100)}`;
      if (output.textContent !== text) output.textContent = text;
    }

    if (!details) {
      details = document.createElement("details");
      details.className = "mzo-meta-costs";
      details.innerHTML = `<summary>CPM</summary><output></output><small>Histórico carregado · ${metaCurrency.format(metaRateInCents / 100)} por mensagem</small>`;
      details.addEventListener("toggle", updateCost);
    }
    if (details.dataset.conversationId !== conversationId) {
      details.open = false;
      details.dataset.conversationId = conversationId;
      details.querySelector("output").textContent = "";
    }
    if (details.parentElement !== section) section.append(details);
    updateCost();
  }
  function installChatControls() {
    const modal = document.querySelector("#dlgChatModal.show, #dlgChatModal[style*='display: block']");
    const header = modal?.querySelector(".modal-header .modal-actions");
    if (!modal) {
      const costs = document.querySelector("#dlgChatModal .mzo-meta-costs");
      if (costs) costs.open = false;
      return;
    }
    const current = currentConversation(modal);
    modal.dataset.mzoCurrentPhone = current?.phone || "";
    installMetaCosts(modal, current?.id || "");
    if (!header) return;
    if (current?.id) {
      if (!state.contacts[current.id]) { state.contacts[current.id] = { name:current.name, status:"Novo", tags:"", priority:false, url:location.href }; save("contacts"); }
      if (selectedId !== current.id) selectedId = current.id;
    }
    const ticketCard = [...document.querySelectorAll(".attendance-card-container[data-mzo-key]")].find(el => current?.phone && el.dataset.mzoPhone?.endsWith(current.phone.slice(-10)));
    const matchingPhoneFlag = current?.phone && Object.entries(state.flags).find(([key]) => key.startsWith("phone:") && key.replace(/\D/g, "").endsWith(current.phone.slice(-10)))?.[1];
    const currentFlag = state.flags[ticketCard?.dataset.mzoKey] || state.flags[current?.id] || matchingPhoneFlag || {};
    const existingFlag = header.querySelector(".mzo-chat-flag");
    let badge = modal.querySelector(".modal-header .mzo-chat-tag");
    if (!badge) { badge = document.createElement("span"); badge.className = "mzo-chat-tag"; badge.hidden = true; }
    const nameLine = modal.querySelector(".modal-header .card-info > .row > .contact") || modal.querySelector(".modal-header .card-info .contact");
    if (nameLine && badge.parentElement !== nameLine) nameLine.append(badge);
    const badgeText = [currentFlag.icon,currentFlag.label || (currentFlag.color ? "Sinalizado" : "")].filter(Boolean).join(" ");
    if (badge.textContent !== badgeText) {
      badge.textContent = badgeText;
      badge.title = badgeText;
    }
    badge.hidden = !badgeText;
    const tagColor = /^#[0-9a-f]{6}$/i.test(currentFlag.color || "") ? currentFlag.color : "#29465c";
    badge.style.setProperty("--mzo-chat-tag-bg",tagColor);
    badge.style.setProperty("--mzo-chat-tag-border",currentFlag.color || "#5681a0");
    badge.style.setProperty("--mzo-chat-tag-text",flagTextColor(tagColor));
    if (existingFlag && existingFlag.textContent !== "⚑ Sinalizar") existingFlag.textContent = "⚑ Sinalizar";
    if (header.querySelector(".mzo-chat-actions")) return;
    const actions = document.createElement("div");
    actions.className = "mzo-chat-actions";
    actions.innerHTML = `<button type="button" class="mzo-chat-flag">⚑ Sinalizar</button><div class="mzo-download-wrap"><button type="button" class="mzo-chat-download" aria-haspopup="menu" aria-expanded="false">↓ Baixar arquivos ▾</button><div class="mzo-download-menu" role="menu" hidden><button type="button" role="menuitem" data-mzo-download="images">Imagens</button><button type="button" role="menuitem" data-mzo-download="files">Documentos</button></div></div>`;
    actions.querySelector(".mzo-chat-flag").addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      const active = currentConversation(modal);
      const card = [...document.querySelectorAll(".attendance-card-container[data-mzo-phone]")].find(el => active?.phone && el.dataset.mzoPhone?.endsWith(active.phone.slice(-10)));
      flagPhone = card?.dataset.mzoKey || active?.id || "";
      if (flagPhone) showFlagPicker(event.clientX, event.clientY);
    });
    const downloadButton = actions.querySelector(".mzo-chat-download");
    const downloadMenu = actions.querySelector(".mzo-download-menu");
    downloadButton.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); downloadMenu.hidden = !downloadMenu.hidden; downloadButton.setAttribute("aria-expanded", String(!downloadMenu.hidden)); });
    downloadMenu.addEventListener("click", event => {
      const choice = event.target.closest("[data-mzo-download]");
      if (!choice) return;
      event.preventDefault(); event.stopPropagation();
      downloadMenu.hidden = true;
      downloadButton.setAttribute("aria-expanded", "false");
      downloadChatFiles(modal, downloadButton, choice.dataset.mzoDownload);
    });
    header.prepend(actions);
  }
  let scanTimer;
  const scheduleScan = () => {
    scanTimer ||= setTimeout(() => {
      scanTimer = null;
      try { scanTickets(); }
      catch (error) {
        reportExtensionError("atualização da tela", error);
        scanTimer = setTimeout(() => { scanTimer = null; scheduleScan(); }, 1000);
      }
    }, 120);
  };
  function selectFlagOption(picker, field, value) {
    picker.dataset[field] = value;
    for (const button of picker.querySelectorAll(`[data-${field}]`)) {
      const selected = button.dataset[field] === value;
      button.classList.toggle("chosen", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }
  function showFlagPicker(x, y) {
    const current = state.flags[flagPhone] || {};
    const picker = $(".mzo-flag-picker");
    picker.innerHTML = `<strong>Sinalizar chat</strong><div class="mzo-picker-icons">${flagIcons.map(icon=>`<button type="button" data-icon="${safe(icon)}" title="${icon||"Sem bandeira"}">${icon||"×"}</button>`).join("")}</div><div class="mzo-picker-colors">${flagPalette.map(([color,name])=>`<button type="button" data-color="${safe(color)}" title="${name}" style="--swatch:${color||"#52677e"}"></button>`).join("")}</div><div class="mzo-custom-row"><div><label class="mzo-field" for="mzo-flag-emoji">Qualquer emoji</label><input class="mzo-input" id="mzo-flag-emoji" maxlength="16" placeholder="Ex.: 💵" value="${safe(current.icon||"")}"></div><div><label class="mzo-field" for="mzo-flag-color">Qualquer cor</label><input class="mzo-input" id="mzo-flag-color" type="color" value="${/^#[0-9a-f]{6}$/i.test(current.color||"")?current.color:"#38bdf8"}"></div></div><input class="mzo-input" id="mzo-flag-label" maxlength="${flagLabelLimit}" placeholder="Etiqueta (até ${flagLabelLimit} caracteres)" value="${safe(current.label||"")}"><div class="mzo-row" style="margin-top:8px"><button class="mzo-btn" data-action="save-flag">Salvar</button><button class="mzo-btn secondary" data-action="clear-flag">Limpar</button></div>`;
    picker.style.left = `${Math.max(12, Math.min(x, innerWidth - 364))}px`;
    picker.style.top = `${Math.max(12, Math.min(y + 8, innerHeight - 400))}px`;
    selectFlagOption(picker, "icon", current.icon || "");
    selectFlagOption(picker, "color", current.color || "");
    picker.classList.add("open");
  }
  const save = async (...keys) => {
    const patch = Object.fromEntries(keys.map(key => [key, state[key]]));
    await chrome.storage.local.set(patch);
  };
  const active = () => state.contacts[selectedId] || null;
  const statuses = ["Novo", "Em andamento", "Aguardando", "Concluído"];
  const formatDate = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "Data inválida" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d); };
  const due = item => !item.done && new Date(item.at).getTime() <= Date.now();

  function render() {
    $$(".mzo-tabs button").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
    const body = $(".mzo-body");
    const remindersOpen = tab === "lembretes";
    $(".mzo-tabs").hidden = remindersOpen;
    $(".mzo-brand").textContent = remindersOpen ? "Lembretes" : "MKT ORGANIZER";
    $(".mzo-panel").setAttribute("aria-label", remindersOpen ? "Lembretes" : "Painel de organização");
    if (tab === "contatos") {
      const entries = Object.entries(state.contacts).filter(([,c]) => `${c.name} ${c.tags||""} ${c.status}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).sort((a,b) => (statuses.indexOf(a[1].status)-statuses.indexOf(b[1].status)) || a[1].name.localeCompare(b[1].name,"pt-BR"));
      body.innerHTML = `<div class="mzo-card"><h3>Novo contato</h3><div class="mzo-row"><input class="mzo-input mzo-grow" id="mzo-new-name" placeholder="Nome do contato" maxlength="100"><button class="mzo-btn" data-action="add-contact">Adicionar</button></div><p class="mzo-muted">Os dados ficam somente neste navegador.</p></div><input class="mzo-input" id="mzo-search" placeholder="Buscar nome, etiqueta ou etapa" value="${safe(query)}"><div class="mzo-divider"></div><div class="mzo-list">${entries.map(([id,c])=>`<div class="mzo-item"><div class="mzo-item-head"><div><div class="mzo-item-title">${safe(c.name)}</div><span class="mzo-pill">${safe(c.status||"Novo")}</span>${c.priority?`<span class="mzo-pill">★ Prioridade</span>`:""}${(c.tags||"").split(",").filter(Boolean).map(t=>`<span class="mzo-pill">${safe(t.trim())}</span>`).join("")}</div></div><div class="mzo-actions"><button data-action="select" data-id="${safe(id)}">Selecionar</button>${c.url?`<button data-action="open" data-id="${safe(id)}">Abrir chat</button>`:""}<button data-action="delete-contact" data-id="${safe(id)}">Excluir</button></div></div>`).join("")||`<div class="mzo-empty">Nenhum contato encontrado.</div>`}</div>`;
    } else if (tab === "pastas") {
      body.innerHTML = `<div class="mzo-card"><h3>Criar pasta</h3><p class="mzo-muted">Para organizar um cliente, clique no ícone de pasta no cartão ou arraste o cartão para a pasta na barra.</p><label class="mzo-field" for="mzo-folder-name">Nome</label><input class="mzo-input" id="mzo-folder-name" maxlength="48" placeholder="Ex.: Orçamentos"><label class="mzo-field" for="mzo-folder-color">Cor</label><input class="mzo-folder-color-input" id="mzo-folder-color" type="color" value="#55d9c3"><div style="height:12px"></div><button class="mzo-btn" data-action="add-folder">Criar pasta</button></div><div class="mzo-list">${state.folders.map(folder=>`<div class="mzo-item mzo-folder-item" style="--mzo-folder-color:${safe(folder.color)}"><div class="mzo-item-head"><div><span class="mzo-folder-dot"></span><strong>${safe(folder.name)}</strong></div><span class="mzo-muted">${Object.values(state.folderAssignments).filter(id=>id===folder.id).length} cliente(s)</span></div><div class="mzo-actions"><button data-action="show-folder" data-id="${safe(folder.id)}">Ver clientes</button><button data-action="rename-folder" data-id="${safe(folder.id)}">Renomear</button><label class="mzo-folder-color-control"><input class="mzo-folder-color-input" type="color" data-folder-color-id="${safe(folder.id)}" value="${safe(folder.color)}" aria-label="Cor da pasta ${safe(folder.name)}"> Cor</label><button data-action="delete-folder" data-id="${safe(folder.id)}">Excluir</button></div></div>`).join("")||`<div class="mzo-empty">Crie sua primeira pasta.</div>`}</div>`;
    } else if (tab === "lembretes") {
      const items = state.reminders.filter(r => !r.done).sort((a,b)=>new Date(a.at)-new Date(b.at));
      body.innerHTML = `<div class="mzo-card"><h3>Novo lembrete</h3><label class="mzo-field" for="mzo-rem-text">O que lembrar?</label><input class="mzo-input" id="mzo-rem-text" maxlength="240" placeholder="Escreva o que quiser lembrar"><div class="mzo-grid"><div><label class="mzo-field" for="mzo-rem-date">Data</label><input class="mzo-input" id="mzo-rem-date" type="date"></div><div><label class="mzo-field" for="mzo-rem-time">Horário (opcional)</label><input class="mzo-input" id="mzo-rem-time" type="time"></div></div><p class="mzo-muted">Sem horário, o aviso será às 09:00.</p><label class="mzo-field" for="mzo-rem-tone">Som</label><div class="mzo-row"><select class="mzo-select mzo-grow" id="mzo-rem-tone"><option value="padrao" selected>Padrão</option><option value="click">Click</option><option value="continuo">Contínuo</option><option value="nenhum">Sem som</option></select><button class="mzo-btn secondary" data-action="preview-tone">Testar</button></div><div style="height:12px"></div><button class="mzo-btn" data-action="add-reminder">Criar lembrete</button><p class="mzo-muted">O som Contínuo se repete até você silenciar ou concluir. Padrão e Click tocam uma vez.</p></div><h3>Pendentes (${items.length})</h3><div class="mzo-list">${items.map(r=>`<div class="mzo-item"><div class="mzo-item-title">${safe(r.text)}</div><div class="mzo-muted">${formatDate(r.at)} ${due(r)?"· Vencido":""}</div><div class="mzo-actions"><button data-action="done" data-id="${safe(r.id)}">Concluir</button><button data-action="mute" data-id="${safe(r.id)}">Silenciar</button><button data-action="delete-reminder" data-id="${safe(r.id)}">Excluir</button></div></div>`).join("")||`<div class="mzo-empty">Tudo em dia.</div>`}</div>`;
    } else {
      body.innerHTML = `<div class="mzo-card"><h3>Aparência</h3><label class="mzo-check"><input type="checkbox" id="mzo-dark" ${state.settings.dark?"checked":""}> Tema escuro</label><label class="mzo-check"><input type="checkbox" id="mzo-compact" ${state.settings.compact?"checked":""}> Lista mais compacta</label></div>${statusSettingsHtml()}<div class="mzo-card"><h3>Seus dados</h3><p class="mzo-muted">Os dados são salvos no armazenamento local da extensão. Exportar um backup evita perda ao reinstalá-la.</p><div class="mzo-row"><button class="mzo-btn secondary" data-action="export">Exportar backup</button><button class="mzo-btn secondary" data-action="import">Importar backup</button></div></div><div class="mzo-card"><h3>Sobre</h3><p><strong>MKT ORGANIZER</strong><br>Extensão por @andrz.wav</p><p class="mzo-muted">Extensão independente, sem vínculo oficial com o Mktzap. Nenhuma mensagem é enviada ou alterada pela extensão.</p></div>`;
    }
  }

  function select(id) { selectedId = id; render(); }
  function detectCurrent() {
    const key = urlKey();
    if (key && state.contacts[key]) { selectedId = key; render(); }
    else {
      const match = Object.entries(state.contacts).find(([,c]) => c.url === location.href);
      if (match) { selectedId = match[0]; render(); }
      else { selectedId = ""; render(); }
    }
  }

  shadow.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    const picker = $(".mzo-flag-picker");
    if(button.dataset.action === "reset-status-styles"){delete state.settings.statusStyles;await save("settings");render();scanTickets();return;}
    if (button.hasAttribute("data-icon")) { selectFlagOption(picker, "icon", button.dataset.icon); $("#mzo-flag-emoji").value = button.dataset.icon; return; }
    if (button.hasAttribute("data-color")) { selectFlagOption(picker, "color", button.dataset.color); if (button.dataset.color) $("#mzo-flag-color").value = button.dataset.color; return; }
    if (button.dataset.action === "save-flag" || button.dataset.action === "clear-flag") {
      const card = [...document.querySelectorAll(".attendance-card-container[data-mzo-key]")].find(el => el.dataset.mzoKey === flagPhone || el.dataset.mzoPhone && `phone:${el.dataset.mzoPhone}` === flagPhone);
      const current=currentConversation(document.querySelector("#dlgChatModal.show"));
      const sameConversation=current?.id===flagPhone || current?.phone && card?.dataset.mzoPhone?.endsWith(current.phone.slice(-10));
      const keys = [flagPhone, card?.dataset.mzoKey, card?.dataset.mzoPhone && `phone:${card.dataset.mzoPhone}`, sameConversation && current?.id].filter(Boolean);
      if (button.dataset.action === "clear-flag") keys.forEach(key => delete state.flags[key]);
      else {
        const typed = $("#mzo-flag-emoji").value.trim();
        const icon = typed ? (typeof Intl.Segmenter === "function" ? [...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(typed)][0]?.segment : [...typed][0]) : "";
        const color = picker.dataset.color;
        const typedLabel = $("#mzo-flag-label").value.trim();
        const label = typedLabel === state.flags[flagPhone]?.label ? typedLabel : typedLabel.slice(0, flagLabelLimit).trimEnd();
        const value = { icon, color, label };
        keys.forEach(key => { state.flags[key] = value; });
      }
      await save("flags");
      scanTickets();
      picker.classList.remove("open"); return;
    }
    if (button.classList.contains("mzo-launch")) { $(".mzo-panel").classList.add("open"); render(); return; }
    if (button.classList.contains("mzo-close")) { $(".mzo-panel").classList.remove("open"); return; }
    if (button.classList.contains("mzo-theme-toggle")) { state.settings.dark = !state.settings.dark; applySettings(); await save("settings"); render(); return; }
    if (button.dataset.tab || button.dataset.go) { tab = button.dataset.tab || button.dataset.go; render(); return; }
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "add-folder") {
      const name = $("#mzo-folder-name").value.trim();
      if (!name) { $("#mzo-folder-name").focus(); return; }
      state.folders.push({ id:uid(), name, color:$("#mzo-folder-color").value });
      await save("folders"); renderFolderShelf(); render(); return;
    }
    if (["show-folder","rename-folder","delete-folder"].includes(action)) {
      const folder = state.folders.find(item => item.id === id);
      if (!folder) return;
      if (action === "show-folder") { activeFolder = id; scanTickets(); $(".mzo-panel").classList.remove("open"); return; }
      if (action === "rename-folder") { const name = prompt("Novo nome da pasta:", folder.name)?.trim(); if (!name) return; folder.name = name.slice(0,48); }
      if (action === "delete-folder") { if (!confirm(`Excluir a pasta “${folder.name}”? Os clientes continuarão no Mktzap.`)) return; state.folders = state.folders.filter(item => item.id !== id); for (const [key,value] of Object.entries(state.folderAssignments)) if (value === id) delete state.folderAssignments[key]; if (activeFolder === id) activeFolder = ""; await save("folderAssignments"); }
      await save("folders"); renderFolderShelf(); scanTickets(); render(); return;
    }
    if (action === "add-contact") {
      const name = $("#mzo-new-name").value.trim();
      if (!name) return;
      const key = urlKey();
      const newId = key && !state.contacts[key] ? key : uid();
      state.contacts[newId] = { name, status: "Novo", tags: "", priority: false, url: location.href };
      selectedId = newId; await save("contacts"); tab = "contatos"; render();
    } else if (action === "select") { select(id); tab = "contatos"; render(); }
    else if (action === "save-contact" && active()) {
      const name = $("#mzo-name").value.trim(); if (!name) return;
      Object.assign(active(), { name, status: $("#mzo-status").value, tags: $("#mzo-tags").value.trim(), priority: $("#mzo-priority").checked });
      await save("contacts"); render();
    } else if (action === "link" && active()) { active().url = location.href; await save("contacts"); render(); }
    else if (action === "open") { const url = state.contacts[id]?.url; if (url?.startsWith("https://app3.mktzap.com.br/")) location.href = url; }
    else if (action === "delete-contact") {
      if (!confirm("Excluir este contato e seus lembretes?")) return;
      delete state.contacts[id]; state.reminders = state.reminders.filter(r => r.contactId !== id);
      if (selectedId === id) selectedId = "";
      await save("contacts", "reminders"); render();
    } else if (action === "preview-tone") {
      chrome.runtime.sendMessage({ type:"mzo-preview-tone", tone:$("#mzo-rem-tone").value });
    } else if (action === "add-reminder") {
      const input = $("#mzo-rem-text").value.trim();
      const date = $("#mzo-rem-date").value; const time = $("#mzo-rem-time").value || "09:00";
      const at = new Date(`${date}T${time}`);
      if (!input || !date || !Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) { alert("Informe o texto e uma data futura."); return; }
      state.reminders.push({ id: uid(), text: input, at: at.toISOString(), tone:$("#mzo-rem-tone").value, done: false });
      await save("reminders"); render();
    } else if (action === "mute") {
      chrome.runtime.sendMessage({ type:"mzo-stop-tone", id });
      button.textContent = "Silenciado";
    } else if (action === "done" || action === "delete-reminder") {
      if (action === "done") { const item = state.reminders.find(r => r.id === id); if (item) item.done = true; }
      else state.reminders = state.reminders.filter(r => r.id !== id);
      chrome.runtime.sendMessage({ type:"mzo-stop-tone", id });
      await save("reminders"); render();
    } else if (action === "export") {
      const blob = new Blob([JSON.stringify({ version: 3, contacts: state.contacts, reminders: state.reminders, settings: state.settings, flags: state.flags, manualOrder: state.manualOrder, folders: state.folders, folderAssignments: state.folderAssignments }, null, 2)], { type: "application/json" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `mktzap-organizado-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } else if (action === "import") $(".mzo-file").click();
  });

  shadow.addEventListener("input", event => {
    if (event.target.id === "mzo-flag-emoji") selectFlagOption($(".mzo-flag-picker"), "icon", event.target.value.trim());
    if (event.target.id === "mzo-search") { query = event.target.value; const caret = event.target.selectionStart; render(); $("#mzo-search")?.focus(); $("#mzo-search")?.setSelectionRange(caret, caret); }
  });
  shadow.addEventListener("change", async event => {
    const statusKey=event.target.dataset.statusName || event.target.dataset.statusColor;
    if(Object.hasOwn(statusDefaults,statusKey || '')){
      const updates=state.settings.statusStyles && typeof state.settings.statusStyles==='object' ? state.settings.statusStyles : {};
      updates[statusKey]={...(updates[statusKey] || {})};
      if(event.target.hasAttribute('data-status-name')){
        updates[statusKey].name=event.target.value.trim().slice(0,60) || statusDefaults[statusKey].name;
        event.target.value=updates[statusKey].name;
      }else if(/^#[0-9a-f]{6}$/i.test(event.target.value))updates[statusKey].color=event.target.value;
      state.settings.statusStyles=updates;
      await save('settings');scanTickets();return;
    }
    const folderId = event.target.dataset.folderColorId;
    if (folderId) {
      const folder = state.folders.find(item => item.id === folderId);
      if (!folder) return;
      folder.color = event.target.value;
      event.target.closest(".mzo-folder-item").style.setProperty("--mzo-folder-color", folder.color);
      await save("folders");
      scanTickets();
      return;
    }
    if (event.target.id === "mzo-flag-color") selectFlagOption($(".mzo-flag-picker"), "color", event.target.value);
    if (event.target.id === "mzo-dark" || event.target.id === "mzo-compact") {
      state.settings[event.target.id === "mzo-dark" ? "dark" : "compact"] = event.target.checked;
      applySettings(); await save("settings");
    }
    if (event.target.classList.contains("mzo-file") && event.target.files[0]) {
      try {
        const imported = JSON.parse(await event.target.files[0].text());
        if (!imported || !imported.contacts || typeof imported.contacts !== "object" || Array.isArray(imported.contacts) || !Array.isArray(imported.reminders)) throw Error("Formato inválido");
        if (!confirm("Substituir os dados atuais pelo backup selecionado?")) return;
        state = { settings: { ...defaults.settings, ...imported.settings }, contacts: imported.contacts, reminders: imported.reminders, flags: imported.flags || {}, manualOrder: imported.manualOrder || [], folders:Array.isArray(imported.folders)?imported.folders:[], folderAssignments:imported.folderAssignments && typeof imported.folderAssignments === "object" ? imported.folderAssignments : {} };
        selectedId = ""; activeFolder = ""; await save("settings", "contacts", "reminders", "flags", "manualOrder", "folders", "folderAssignments"); applySettings(); render(); scanTickets();
        document.querySelectorAll(".attendance-card-container[data-mzo-key]").forEach(card => paintTicket(card, card.dataset.mzoKey));
      } catch { alert("Não foi possível importar este backup."); }
      event.target.value = "";
    }
  });
  shadow.addEventListener("keydown", event => {
    if (event.key === "Escape") $(".mzo-panel").classList.remove("open");
    if (event.key === "Enter" && event.target.id === "mzo-new-name") { event.preventDefault(); shadow.querySelector('[data-action="add-contact"]').click(); }
  });

  document.addEventListener("click", event => {
    if (!event.target.closest?.(".mzo-card-folder-picker,.mzo-card-folder-button")) document.querySelector(".mzo-card-folder-picker")?.remove();
    for (const wrap of document.querySelectorAll(".mzo-download-wrap")) {
      if (wrap.contains(event.target)) continue;
      const menu = wrap.querySelector(".mzo-download-menu");
      const button = wrap.querySelector(".mzo-chat-download");
      if (menu) menu.hidden = true;
      if (button) button.setAttribute("aria-expanded", "false");
    }
    const row = event.target.closest("#dlgOperatorFilter .select-all, #dlgOperatorFilter tbody tr, #dlgOperatorFilter thead tr");
    if (!row || event.target.closest("input,button,a,label,select")) return;
    const checkbox = row.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.disabled) checkbox.click();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    document.querySelector(".mzo-card-folder-picker")?.remove();
    document.querySelectorAll(".mzo-download-menu").forEach(menu => { menu.hidden = true; menu.parentElement?.querySelector(".mzo-chat-download")?.setAttribute("aria-expanded", "false"); });
  });

  document.addEventListener("click", event => {
    const trigger=event.target.closest?.('#dlgChatModal .emoji-span');
    if(!trigger) {
      if(!event.target.closest?.('.mzo-emoji-picker')) document.querySelector('.mzo-emoji-picker')?.remove();
      return;
    }
    event.preventDefault();event.stopImmediatePropagation();
    const previous=document.querySelector('.mzo-emoji-picker');
    if(previous){previous.remove();return;}
    const field=document.querySelector('#dlgChatModal #fieldMessage');
    if(!field) return;
    const selection=[field.selectionStart,field.selectionEnd];
    const picker=document.createElement('section');
    picker.className='mzo-emoji-picker';picker.setAttribute('role','dialog');picker.setAttribute('aria-label','Escolher emoji');
    const header=document.createElement('header');
    const title=document.createElement('strong');title.textContent='Emojis';
    const close=document.createElement('button');close.type='button';close.className='mzo-emoji-close';close.textContent='×';close.setAttribute('aria-label','Fechar emojis');close.onclick=()=>{picker.remove();trigger.focus();};
    header.append(title,close);
    const search=document.createElement('input');search.type='search';search.placeholder='Buscar emoji';search.setAttribute('aria-label','Buscar emoji');
    const grid=document.createElement('div');grid.className='mzo-emoji-grid';
    const entries='😀 sorriso|😃 feliz|😄 alegria|😁 sorriso|😅 alívio|😂 risada|🥹 emocionado|😊 feliz|🙂 sorriso|😉 piscada|😍 apaixonado|🥰 amor|😘 beijo|😎 óculos|🤔 pensando|😐 neutro|🙁 triste|😢 choro|😭 choro|😤 irritado|😡 bravo|🤝 acordo|👍 positivo|👎 negativo|👏 palmas|🙌 celebração|🙏 obrigado|💪 força|👀 olhos|❤️ coração amor|🧡 coração laranja|💛 coração amarelo|💚 coração verde|💙 coração azul|💜 coração roxo|💯 cem|✅ certo aprovado|❌ errado|⚠️ atenção|🔥 fogo|⭐ estrela|🎉 festa|🎂 aniversário|📌 pino|📎 anexo|📷 foto|🎨 arte|💡 ideia|📦 caixa pedido|🚚 entrega|💰 dinheiro|💵 dinheiro|📅 data|🕒 hora|☎️ telefone|📞 ligação|💬 mensagem'.split('|').map(entry=>{const [emoji,...name]=entry.split(' ');return {emoji,name:name.join(' ')};});
    const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const render=()=>{
      grid.replaceChildren();
      const query=normalize(search.value);
      for(const {emoji,name} of entries.filter(item=>normalize(item.name+item.emoji).includes(query))) {
        const button=document.createElement('button');button.type='button';button.textContent=emoji;button.title=name;button.setAttribute('aria-label',name);
        button.onclick=e=>{e.preventDefault();field.focus();field.setSelectionRange(...selection);field.setRangeText(emoji,field.selectionStart,field.selectionEnd,'end');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));picker.remove();};
        grid.append(button);
      }
      if(!grid.children.length){const empty=document.createElement('p');empty.textContent='Nenhum emoji encontrado';grid.append(empty);}
    };
    search.addEventListener('input',render);render();
    picker.append(header,search,grid);document.body.append(picker);
    const anchor=trigger.getBoundingClientRect(),bounds=picker.getBoundingClientRect();
    picker.style.left=Math.max(8,Math.min(anchor.left,innerWidth-bounds.width-8))+'px';
    picker.style.top=Math.max(8,anchor.top>=bounds.height+16 ? anchor.top-bounds.height-8 : Math.min(anchor.bottom+8,innerHeight-bounds.height-8))+'px';
    search.focus();
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('.mzo-emoji-picker')?.remove();});
  window.addEventListener('resize',()=>document.querySelector('.mzo-emoji-picker')?.remove());

  let dragScrollY = null;
  let dragScrollFrame = 0;
  const scrollWhileDragging = () => {
    dragScrollFrame = 0;
    if (!draggingKey || dragScrollY === null) return;
    const amount = dragScrollY < 100 ? -18 : dragScrollY > innerHeight - 100 ? 18 : 0;
    if (amount) {
    let node = document.querySelector(".calls-dashboard");
    while (node && !(node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY))) node = node.parentElement;
    (node || document.scrollingElement)?.scrollBy(0, amount);
    }
    if (amount) dragScrollFrame = requestAnimationFrame(scrollWhileDragging);
  };
  document.addEventListener("dragover", event => {
    if (!draggingKey) return;
    dragScrollY = event.clientY;
    if (!dragScrollFrame) dragScrollFrame = requestAnimationFrame(scrollWhileDragging);
  });
  document.addEventListener("dragend", () => { dragScrollY = null; cancelAnimationFrame(dragScrollFrame); dragScrollFrame = 0; });

  chrome.storage.local.get(defaults).then(async data => {
    state = { ...defaults, ...data };
    applySettings(); detectCurrent(); render();
    try { scanTickets(); } catch (error) { reportExtensionError("primeira atualização", error); scheduleScan(); }
    document.documentElement.classList.remove("mzo-booting");
  }).catch(error => {
    reportExtensionError("carregamento das preferências", error);
    document.documentElement.classList.remove("mzo-booting");
    scheduleScan();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if(changes.flags){state.flags=changes.flags.newValue || {};scheduleScan();}
    if(!changes.reminders)return;
    state.reminders = changes.reminders.newValue || [];
    if (tab === "lembretes" && $(".mzo-panel").classList.contains("open") &&
      !$("#mzo-rem-text")?.value && !$("#mzo-rem-date")?.value && !$("#mzo-rem-time")?.value) render();
  });
  window.addEventListener("resize", scheduleScan);
  const scanRegions = ".calls-dashboard, .block-search, #dlgChatModal, #historico";
  const ownCardUi = ".mzo-bubble-copy, .mzo-recording-timer, .mzo-chat-day, .mzo-bubble-reply, .mzo-chat-stamp, .mzo-ticket-details, .mzo-card-tools, .mzo-card-controls, .mzo-ticket-metrics, .mzo-ticket-status, .mzo-tag-row, .mzo-profile-icon";
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (!target || target.closest(ownCardUi)) return false;
      if (record.type === "attributes") {
        if(target.closest('#resizable-footer-field .mic') && ['class','style'].includes(record.attributeName))return true;
        if(record.attributeName==='style' && target.id==='resizable-footer-field'){
          if(target.style.height && target.style.height!=='auto' && target.style.getPropertyValue('--mzo-compose-auto-height'))target.style.removeProperty('--mzo-compose-auto-height');
          return false;
        }
        if(target.closest(":is(#dlgChatModal,#historico) :is(.mzo-quoted-block,.mzo-reply-preview)")) return record.attributeName === "class" || record.attributeName === "style" && citationStyles.get(target)!==target.getAttribute("style");
        if (record.attributeName === "data-mzo-service-state") return target.matches(".attendance-card-container");
        return target.matches(":is(#dlgChatModal,#historico), .attendance-card-container") && record.attributeName === "class" ||
          target.matches(":is(#dlgChatModal,#historico)") && record.attributeName === "style" ||
          !!target.closest(".attendance-card-container :is(.card-status,.meta-window-info)") ||
          !!target.closest(".attendance-card-container .meta-window-info, :is(#dlgChatModal,#historico) .msg-date");
      }
      if (record.type === "characterData") {
        if(target.closest(":is(#dlgChatModal,#historico) :is(.mzo-quoted-block,.mzo-reply-preview)")) return true;
        return !!target.closest(".attendance-card-container :is(.card-status,.op-info-container,.time-info-container,.meta-window-info,.card-info), :is(#dlgChatModal,#historico) .bubble-container :is(.name,.msg-date)");
      }
      const changed = [...record.addedNodes, ...record.removedNodes];
      return target.closest(scanRegions)
        ? changed.some(node => !node.matches?.(ownCardUi))
        : changed.some(node => node.matches?.(scanRegions) || node.querySelector?.(scanRegions));
    })) scheduleScan();
  });
  observer.observe(document.body, {
    childList:true, subtree:true, characterData:true, attributes:true,
    attributeFilter:["class", "style", "title", "aria-label", "data-mzo-service-state"]
  });
  setInterval(() => {
    if (!document.hidden && document.querySelector(".calls-dashboard")) scheduleScan();
  }, 10000);
  let oldUrl = location.href;
  setInterval(() => { if (oldUrl !== location.href) { oldUrl = location.href; detectCurrent(); } }, 800);
  }
  if (location.pathname.startsWith("/chat")) start();
  else {
    const watcher = setInterval(() => {
      if (location.pathname.startsWith("/chat")) { clearInterval(watcher); start(); }
    }, 500);
  }
})();

// Preserve the dialog geometry and the reader's exact scroll position while using templates.
(() => {
  if(globalThis.mzoTemplateOverlayInitialized)return;
  globalThis.mzoTemplateOverlayInitialized=true;
  let chat,popup,pending=false,opened=false,timer,positions=[],windowPosition;
  function preserveScroll(){
    if(!chat?.isConnected || chat.style.display==='none' || chat.classList.contains('ng-hide'))return;
    for(const {node,top,left} of positions)if(node.isConnected)node.scrollTo({top,left,behavior:'instant'});
    if(windowPosition)window.scrollTo({left:windowPosition.left,top:windowPosition.top,behavior:'instant'});
  }
  function restore() {
    pending=false;opened=false;clearTimeout(timer);
    const visible=chat?.isConnected && chat.style.display!=='none' && !chat.classList.contains('ng-hide');
    if(visible){chat.classList.add('show');if(chat.classList.contains('modal'))document.body.classList.add('modal-open');}
    chat?.classList.remove('mzo-template-parent');popup?.classList.remove('mzo-template-over-chat');
    if(visible){chat.querySelector('#fieldMessage')?.focus({preventScroll:true});preserveScroll();requestAnimationFrame(preserveScroll);}
  }
  function update() {
    if(!pending)return;
    if(!chat?.isConnected){restore();return;}
    popup=document.getElementById('dlgActiveWhatsapp');
    if(!popup){if(opened)restore();return;}
    if(!popup.classList.contains('mzo-template-over-chat'))popup.classList.add('mzo-template-over-chat');
    if(popup.classList.contains('show') && getComputedStyle(popup).display!=='none'){opened=true;preserveScroll();requestAnimationFrame(preserveScroll);}
    else if(opened && (popup.style.display==='none' || popup.getAttribute('aria-hidden')==='true'))restore();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#dlgChatModal [ng-click*="showHsm"]');
    if(!button || button.matches(':disabled,[aria-disabled="true"]'))return;
    chat=document.getElementById('dlgChatModal');
    if(!chat || chat.classList.contains('ng-hide') || chat.style.display==='none')return;
    positions=[chat,...chat.querySelectorAll('.mkz-msg-area,.mkz-chat-area,.mkz-chat-container,.modal-body,[scroll-glue]')].map(node=>({node,top:node.scrollTop,left:node.scrollLeft}));
    windowPosition={top:window.scrollY,left:window.scrollX};
    pending=true;opened=false;chat.classList.add('mzo-template-parent');update();requestAnimationFrame(preserveScroll);
    clearTimeout(timer);timer=setTimeout(()=>{if(pending&&!opened)restore();},20000);
  },true);
  const observer=new MutationObserver(records=>{
    if(!pending)return;
    if(records.some(record=>record.target===chat || record.target===popup || record.target.id==='dlgActiveWhatsapp' || record.type==='childList' && [...record.addedNodes,...record.removedNodes].some(node=>node.id==='dlgActiveWhatsapp' || node.id==='dlgChatModal' || node.querySelector?.('#dlgActiveWhatsapp'))))update();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-hidden']});
})();
