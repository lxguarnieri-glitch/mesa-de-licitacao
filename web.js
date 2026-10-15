/* Mesa de Licitação – versão web (opção B)
   Liga o sistema ao Supabase (login, banco compartilhado, arquivos) e, se configurado,
   ao Claude por uma função do Supabase. O restante do sistema é o mesmo do claude.ai:
   este arquivo oferece as mesmas peças (db, user, assets, downloads, sample) que o claude.ai oferece. */
window.MESA_WEB = true;
(() => {
  const cfg = window.MESA_CONFIG || {};
  const configurado = /^https:\/\/.+\.supabase\.co\/?$/.test(cfg.url || "") && (cfg.anonKey || "").length > 20;
  const sb = configurado ? supabase.createClient(cfg.url.replace(/\/$/, ""), cfg.anonKey) : null;
  const T = "docs", BUCKET = "arquivos";
  let sessao = null, liberar;
  const pronto = new Promise(res => { liberar = res; });
  const uid = () => sessao?.user?.id || null;
  const emailAtual = () => (sessao?.user?.email || "").toLowerCase();
  const admins = (cfg.admins || []).map(e => String(e).toLowerCase().trim()).filter(Boolean);
  const souAdminWeb = () => !admins.length || admins.includes(emailAtual());
  const erro = (e, code) => Object.assign(new Error(e?.message || String(e)), {code: code || (/permission|policy|row-level/i.test(e?.message || "") ? "invalid_argument" : "unavailable")});
  const colDe = p => p.split("/").slice(0, -1).join("/");
  const copia = x => x == null ? x : JSON.parse(JSON.stringify(x));

  /* ---------- tela de entrada ---------- */
  function telaLogin(msg){
    let el = document.getElementById("webLogin");
    if(!el){
      document.body.insertAdjacentHTML("beforeend", `<div id="webLogin" style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0f1424e6;padding:16px;font-family:system-ui,-apple-system,sans-serif">
        <form id="wlForm" style="background:#fff;color:#16191f;border-radius:18px;padding:26px;width:min(400px,100%);box-shadow:0 20px 60px #0006">
          <h2 style="margin:0 0 4px;font-size:22px">Mesa de Licitação</h2>
          <p style="margin:0 0 16px;color:#667085;font-size:14px">${esc0(cfg.orgao || "Prefeitura")} · entre com seu e-mail</p>
          <div style="display:flex;gap:6px;margin-bottom:14px"><button type="button" data-wl="entrar" class="wlTab">Entrar</button><button type="button" data-wl="criar" class="wlTab">Criar conta</button></div>
          <label id="wlNomeL" style="display:none;font-size:13px;font-weight:600">Seu nome<input id="wlNome" autocomplete="name" style="display:block;width:100%;box-sizing:border-box;margin:4px 0 10px;padding:10px;border:1px solid #d0d5dd;border-radius:10px;font:inherit"></label>
          <label style="font-size:13px;font-weight:600">E-mail<input id="wlEmail" type="email" required autocomplete="email" style="display:block;width:100%;box-sizing:border-box;margin:4px 0 10px;padding:10px;border:1px solid #d0d5dd;border-radius:10px;font:inherit"></label>
          <label style="font-size:13px;font-weight:600">Senha<input id="wlSenha" type="password" required minlength="6" autocomplete="current-password" style="display:block;width:100%;box-sizing:border-box;margin:4px 0 14px;padding:10px;border:1px solid #d0d5dd;border-radius:10px;font:inherit"></label>
          <button id="wlBtn" style="width:100%;padding:12px;border:0;border-radius:10px;background:#2f54eb;color:#fff;font:inherit;font-weight:700;cursor:pointer">Entrar</button>
          <p id="wlMsg" style="font-size:13px;color:#b42318;min-height:18px;margin:10px 0 0"></p>
        </form></div>
        <style>#webLogin input{background:#fff!important;color:#16191f!important;-webkit-text-fill-color:#16191f}.wlTab{flex:1;padding:8px;border:1px solid #d0d5dd;background:#fff;border-radius:999px;font:inherit;font-size:13px;cursor:pointer}.wlTab[aria-pressed=true]{background:#eef2ff;border-color:#2f54eb;color:#2f54eb;font-weight:700}</style>`);
      el = document.getElementById("webLogin");
      let modo = "entrar";
      const aba = m => { modo = m; el.querySelectorAll(".wlTab").forEach(b => b.setAttribute("aria-pressed", b.dataset.wl === m)); document.getElementById("wlNomeL").style.display = m === "criar" ? "block" : "none"; document.getElementById("wlBtn").textContent = m === "criar" ? "Criar conta e entrar" : "Entrar"; document.getElementById("wlSenha").autocomplete = m === "criar" ? "new-password" : "current-password"; };
      el.querySelectorAll(".wlTab").forEach(b => b.onclick = () => aba(b.dataset.wl)); aba("entrar");
      document.getElementById("wlForm").onsubmit = async e => {
        e.preventDefault(); const m = document.getElementById("wlMsg"), b = document.getElementById("wlBtn");
        const email = document.getElementById("wlEmail").value.trim(), senha = document.getElementById("wlSenha").value, nome = document.getElementById("wlNome").value.trim();
        if(modo === "criar" && !nome){ m.textContent = "Informe seu nome."; return; }
        b.disabled = true; m.style.color = "#667085"; m.textContent = "Aguarde…";
        try {
          const r = modo === "criar" ? await sb.auth.signUp({email, password:senha, options:{data:{nome}}}) : await sb.auth.signInWithPassword({email, password:senha});
          if(r.error) throw r.error;
          if(!r.data.session){ m.style.color = "#067647"; m.textContent = "Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre."; }
        } catch(err){ m.style.color = "#b42318"; m.textContent = traduz(err.message); }
        b.disabled = false;
      };
    }
    if(msg){ const m = document.getElementById("wlMsg"); m.style.color = "#b42318"; m.textContent = msg; }
  }
  const esc0 = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function traduz(m){
    m = String(m || "");
    if(/invalid login/i.test(m)) return "E-mail ou senha incorretos.";
    if(/already registered|already exists/i.test(m)) return "Este e-mail já tem conta. Use a aba Entrar.";
    if(/password.*(6|short)/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
    if(/email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que recebeu antes de entrar.";
    if(/rate limit/i.test(m)) return "Muitas tentativas. Aguarde alguns minutos.";
    return m || "Não foi possível entrar.";
  }
  async function aoEntrar(s){
    if(!s || sessao) return; sessao = s;
    document.getElementById("webLogin")?.remove();
    const nome = s.user.user_metadata?.nome || emailAtual().split("@")[0];
    try { await sb.from(T).upsert({path:"usuarios/" + uid(), col:"usuarios", data:{nome, email:emailAtual()}, updated_by:uid()}); } catch(e){}
    liberar();
    setTimeout(() => { const t = document.getElementById("btnTema"); if(t && !document.getElementById("btnSair")) t.insertAdjacentHTML("beforebegin", `<button class="tema" id="btnSair" type="button" title="${esc0(emailAtual())}"><span>Sair (${esc0(nome)})</span></button>`); document.getElementById("btnSair")?.addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); }); }, 500);
  }

  /* ---------- banco compartilhado (mesmo formato do claude.ai) ---------- */
  const assistidos = {};   // coleção -> {ouvintes:Set, canal, t}
  function snapColecao(rows, q){
    let docs = rows.filter(r => r.col === q.col).map(r => ({id:r.path.split("/").pop(), ref:{path:r.path}, exists:true, data:() => copia(r.data)}));
    for(const [f, v] of q.where) docs = docs.filter(d => d.data()?.[f] === v);
    return {docs, size:docs.length, empty:!docs.length, docChanges:() => [], metadata:{fromCache:false, hasPendingWrites:false}};
  }
  async function buscarColecao(col){ const {data, error} = await sb.from(T).select("path,col,data").eq("col", col); if(error) throw erro(error); return data || []; }
  function avisar(col){
    const a = assistidos[col]; if(!a) return; clearTimeout(a.t);
    a.t = setTimeout(async () => { try { const rows = await buscarColecao(col); a.ouvintes.forEach(o => { try { o.q.type === "doc" ? o.next(snapDocDe(rows, o.q.path)) : o.next(snapColecao(rows, o.q)); } catch(e){ console.error(e); } }); } catch(e){ a.ouvintes.forEach(o => o.error?.(e)); } }, 250);
  }
  const snapDocDe = (rows, path) => { const r = rows.find(x => x.path === path); return {id:path.split("/").pop(), exists:!!r, data:() => copia(r?.data), metadata:{fromCache:false, hasPendingWrites:false}}; };
  function assistir(q, next, error){
    const col = q.type === "doc" ? colDe(q.path) : q.col;
    const a = assistidos[col] = assistidos[col] || {ouvintes:new Set()};
    const o = {q, next, error}; a.ouvintes.add(o);
    if(!a.canal){
      a.canal = sb.channel("c-" + col.replace(/[^\w]/g, "_")).on("postgres_changes", {event:"*", schema:"public", table:T, filter:"col=eq." + col}, () => avisar(col)).subscribe();
      a.poll = setInterval(() => avisar(col), 30000);
    }
    buscarColecao(col).then(rows => { if(!a.ouvintes.has(o)) return; q.type === "doc" ? next(snapDocDe(rows, q.path)) : next(snapColecao(rows, q)); }).catch(e => error?.(e));
    return () => a.ouvintes.delete(o);
  }
  const db = {
    doc(path){
      const id = path.split("/").pop(), col = colDe(path);
      return {
        id, path,
        async get(){ const {data, error} = await sb.from(T).select("data").eq("path", path).maybeSingle(); if(error) throw erro(error); return {id, exists:!!data, data:() => copia(data?.data), metadata:{fromCache:false, hasPendingWrites:false}}; },
        async set(d){ const {error} = await sb.from(T).upsert({path, col, data:copia(d), updated_by:uid(), updated_at:new Date().toISOString()}); if(error) throw erro(error); avisar(col); },
        async update(d){ const g = await this.get(); if(!g.exists) throw erro("documento não existe", "invalid_argument"); const junta = (a, b) => { for(const [k, v] of Object.entries(b)){ if(v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) junta(a[k], v); else a[k] = v; } return a; }; await this.set(junta(g.data() || {}, copia(d))); },
        async delete(){ const {error} = await sb.from(T).delete().eq("path", path); if(error) throw erro(error); avisar(col); },
        async acquire(o){ try { const g = await this.get(); await this.set({...(g.data() || {}), ...(o?.data || {})}); return {acquired:true, holder:o?.holder}; } catch(e){ return {acquired:false}; } },
        onSnapshot(next, error){ return assistir({type:"doc", path}, next, error); }
      };
    },
    collection(col){
      const q = {type:"col", col, where:[]};
      const api = { where(f, op, v){ q.where.push([f, v]); return api; }, orderBy(){ return api; }, limit(){ return api; },
        async get(){ return snapColecao(await buscarColecao(col), q); },
        onSnapshot(next, error){ return assistir(q, next, error); },
        doc(id){ return db.doc(col + "/" + id); } };
      return api;
    }
  };

  /* ---------- quem está usando ---------- */
  const nomes = {};
  const user = {
    id: async () => uid(), isOwner: async () => souAdminWeb(), canEdit: async () => souAdminWeb(), can: async () => true,
    me: async () => ({id:uid(), name:sessao?.user?.user_metadata?.nome || emailAtual()}),
    profiles: async ids => {
      const falta = ids.filter(i => i && !(i in nomes));
      if(falta.length){ const {data} = await sb.from(T).select("path,data").in("path", falta.map(i => "usuarios/" + i)); (data || []).forEach(r => nomes[r.path.split("/").pop()] = r.data?.nome || ""); falta.forEach(i => { if(!(i in nomes)) nomes[i] = ""; }); }
      return Object.fromEntries(ids.map(i => [i, {id:i, name:nomes[i] || ""}]));
    },
    search: async () => []
  };

  /* ---------- arquivos (modelos, comprovantes, base legal) ---------- */
  const assets = {
    async upload(blob){ const id = crypto.randomUUID().replace(/-/g, ""); const {error} = await sb.storage.from(BUCKET).upload(id, blob, {contentType:blob.type || "application/octet-stream"}); if(error) throw erro(error); return {id, url:"/_blob/" + id, sizeBytes:blob.size, contentType:blob.type}; },
    async delete(id){ await sb.storage.from(BUCKET).remove([id]); },
    async list(){ return {assets:[], usage:{}}; }
  };
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    const s = typeof u === "string" ? u : u?.url || "";
    const m = s.match(/(?:^|\/)_blob\/([\w-]+)/);
    if(m && sb){ const {data, error} = await sb.storage.from(BUCKET).download(m[1]); if(error) return new Response("", {status:404}); return new Response(data, {status:200, headers:{"Content-Type":data.type || "application/octet-stream"}}); }
    return fetchOriginal(u, o);
  };
  document.addEventListener("click", async e => {
    const a = e.target.closest?.('a[href*="/_blob/"]'); if(!a) return;
    e.preventDefault(); e.stopPropagation();
    const r = await fetch(a.getAttribute("href")); if(r.ok) window.open(URL.createObjectURL(await r.blob()), "_blank");
  }, true);

  /* ---------- downloads ---------- */
  const downloads = { async save({filename, data}){ const b = data instanceof Blob ? data : new Blob([data]); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = filename; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); } };

  /* ---------- Claude (opcional: função "claude" no Supabase com a chave da Anthropic) ---------- */
  const paraB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
  let sample = null;
  if(cfg.claude){
    sample = async (input, opts = {}) => {
      const messages = typeof input === "string" ? [{role:"user", content:input}] : input;
      const images = [];
      for(const b of opts.images || []) images.push({media_type:b.type || "image/jpeg", data:await paraB64(b)});
      const {data, error} = await sb.functions.invoke("claude", {body:{messages, images}});
      if(error) throw erro(error, /429/.test(error.message) ? "rate_limited" : "unavailable");
      const text = data?.text || ""; try { opts.onText?.({text, delta:text}); } catch(e){}
      return {text, truncated:!!data?.truncated};
    };
    sample.json = async (input, opts) => { const {text} = await sample(input, opts); const m = text.match(/[\[{][\s\S]*[\]}]/); return JSON.parse(m ? m[0] : text); };
    sample.limits = async () => ({images:{maxCount:5}});
  }

  /* ---------- o "claude.use" que o sistema já conhece ---------- */
  const peças = {db, user, assets, downloads, sample};
  window.claude = { use: async nome => { if(!sb) return null; await pronto; return peças[nome] ?? null; } };

  if(!sb){ document.addEventListener("DOMContentLoaded", () => document.body.insertAdjacentHTML("afterbegin", '<div style="background:#b42318;color:#fff;padding:10px 16px;font:14px system-ui">Falta configurar o arquivo config.js (endereço e chave pública do Supabase).</div>')); return; }
  sb.auth.onAuthStateChange((ev, s) => { if(s) aoEntrar(s); });
  document.addEventListener("DOMContentLoaded", async () => { const {data} = await sb.auth.getSession(); if(data.session) aoEntrar(data.session); else telaLogin(); });
})();
