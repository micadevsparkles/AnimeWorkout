const API_URL = "https://script.google.com/macros/s/AKfycbxdZ8rpiiTr218lFUoHFVyv_OdaN9SqLuapbqJFzZV3ZSOSD1A1Hhb0vUHqug-BAmZB/exec";

// --- SISTEMA DE AUDIO (MANTIDO) ---
const sons = {};
function carregarSons() {
  const links = {
    inicio: "https://raw.githubusercontent.com/micadevsparkles/AnimeWorkout/ccaa4f0a6eedea1b4f99bf27554bcc974b5d7ac5/assets/sounds/trombeta.mp3",
    descanso: "https://raw.githubusercontent.com/micadevsparkles/AnimeWorkout/ccaa4f0a6eedea1b4f99bf27554bcc974b5d7ac5/assets/sounds/pause.mp3",
    abortar: "https://raw.githubusercontent.com/micadevsparkles/AnimeWorkout/ccaa4f0a6eedea1b4f99bf27554bcc974b5d7ac5/assets/sounds/abortmission.mp3"
  };
  for (let chave in links) {
    try { sons[chave] = new Audio(links[chave]); } catch (e) { console.log("Erro som: " + chave); }
  }
}
function tocarSom(nome) {
  try { if (sons[nome]) { sons[nome].currentTime = 0; sons[nome].play().catch(e => {}); } } catch (e) {}
}
carregarSons();

// --- SISTEMA DE PARTÍCULAS (MANTIDO) ---
function criarEfeitoMagico() {
    let canvas = document.getElementById('particleCanvas');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'particleCanvas'; document.body.appendChild(canvas); }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const particles = [];
    const cores = ['#fb923c', '#facc15', '#38bdf8', '#8b5cf6']; 
    for (let i = 0; i < 100; i++) {
        particles.push({ x: canvas.width / 2, y: canvas.height / 2, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, size: Math.random() * 5 + 2, color: cores[Math.floor(Math.random() * cores.length)], alpha: 1 });
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy; p.alpha -= 0.01;
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            if (p.alpha <= 0) particles.splice(i, 1);
        });
        if (particles.length > 0) requestAnimationFrame(animate); else canvas.remove();
    }
    animate();
}

function dispararLevelUp() {
    criarEfeitoMagico();
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = `<h1 class="level-up-text">LEVEL UP!</h1>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2000);
}

let userLogado = null;
let exerciciosDB = []; 
let treinoAtivo = null; 
let timerInterval = null;

/* ================= UTILS ================= */
function showLoading(show) { document.getElementById("loading").classList.toggle("hidden", !show); }
function trocarTela(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

async function apiCall(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Falha na rede");
  return await response.json();
}

/* ================= AUTH ================= */
async function fazerLogin() {
  const user = document.getElementById("logUser").value.trim();
  const senha = document.getElementById("logSenha").value.trim();
  const msg = document.getElementById("logMsg");
  if (!user || !senha) return msg.textContent = "Preencha tudo!";
  showLoading(true);
  try {
    const res = await apiCall({ action: "login", usuario: user, senha: senha });
    if (res.sucesso) { userLogado = res.user; msg.textContent = ""; await iniciarHome(); }
    else { msg.textContent = res.msg || "Dados incorretos."; }
  } catch (err) { msg.textContent = "Erro de conexão."; }
  finally { showLoading(false); }
}

async function fazerCadastro() {
  const data = {
    action: "registrar",
    usuario: document.getElementById("cadUser").value.trim(),
    senha: document.getElementById("cadSenha").value.trim(),
    peso: document.getElementById("cadPeso").value.trim(),
    altura: document.getElementById("cadAltura").value.trim(),
    idade: document.getElementById("cadIdade").value.trim(),
    genero: document.getElementById("cadGenero").value,
    objetivo: document.getElementById("cadObjetivo").value
  };
  const msg = document.getElementById("cadMsg");
  if (!data.usuario || !data.senha) return msg.textContent = "Obrigatórios!";
  showLoading(true);
  const res = await apiCall(data);
  showLoading(false);
  if (res.sucesso) { msg.className = "msg sucesso"; msg.textContent = res.msg; setTimeout(() => trocarTela('loginScreen'), 2000); }
  else { msg.className = "msg"; msg.textContent = res.msg; }
}

/* ================= DASHBOARD (HOME) ================= */
async function iniciarHome() {
  trocarTela("homeScreen");
  const avatar = document.getElementById("avatarHome");
  if (avatar && userLogado) {
    // Ao clicar no circulo do avatar, abre a tela de perfil (Minha Conta)
    avatar.onclick = abrirPerfil; 
    if (userLogado.Icone) { avatar.innerHTML = `<img src="${userLogado.Icone}">`; }
    else { avatar.innerHTML = userLogado.Usuario.charAt(0).toUpperCase(); }
  }
  showLoading(true);
  const res = await apiCall({ action: "carregarHome", usuario: userLogado.Usuario });
  showLoading(false);
  if (res.sucesso) {
    renderizarTreinos("boxMissao", res.missao ? [res.missao] : []);
    renderizarTreinos("boxPadroes", res.padroes);
    renderizarTreinos("boxMeusTreinos", res.meusTreinos);
  }
}

function renderizarTreinos(containerId, lista) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!lista || lista.length === 0) { container.innerHTML = "<p>Nenhum treino.</p>"; return; }
  container.innerHTML = lista.map(t => {
    const titulo = t.NomeTreino || t.Missao;
    const isMeuTreino = containerId === "boxMeusTreinos";
    return `
      <div class="card-treino" style="position:relative;">
        <div onclick='abrirDetalhesTreino(${JSON.stringify(t)})' style="width:80%">
          <h4>${titulo}</h4>
          <p>⏱️ ${t.Duracao}min | 🔁 ${t.Repeticoes} rep | ⏸️ ${t.Descanso || '30s'}</p>
        </div>
        ${isMeuTreino ? `
          <div style="position:absolute; right:10px; top:12px; display:flex; gap:10px; font-size:18px;">
            <span onclick='abrirCriacaoTreino(${JSON.stringify(t)})' style="cursor:pointer">📝</span>
            <span onclick='deletarTreino("${titulo}", this)' style="cursor:pointer">🗑️</span>
          </div>` : ''}
      </div>`;
  }).join("");
}

async function deletarTreino(nomeTreino, elementoBotao) {
  if (!confirm(`Destruir "${nomeTreino}"?`)) return;
  const card = elementoBotao.closest('.card-treino');
  if (card) card.classList.add('smoke-out');
  setTimeout(async () => {
    showLoading(true);
    const res = await apiCall({ action: "excluirTreino", usuario: userLogado.Usuario, nomeTreino: nomeTreino });
    showLoading(false);
    if (res.sucesso) iniciarHome();
  }, 500);
}

/* ================= CRIAÇÃO / EDIÇÃO ================= */
async function abrirCriacaoTreino(treinoParaEditar = null) {
  showLoading(true);
  const res = await apiCall({ action: "listarExercicios" });
  showLoading(false);
  if(res.sucesso) exerciciosDB = res.exercicios;
  const selecionados = treinoParaEditar ? treinoParaEditar.Exercicios.split(",").map(e => e.trim()) : [];
  const htmlLista = exerciciosDB.map(ex => `
    <label class="ex-item">
      <input type="checkbox" value="${ex.Exercício}" ${selecionados.includes(ex.Exercício) ? 'checked' : ''}> ${ex.Exercício}
    </label>`).join("");
  const modalHtml = `
    <div class="modal-overlay" id="modalCriacao">
      <div class="modal-box">
        <h2>${treinoParaEditar ? 'Editar' : 'Criar'} Treino</h2>
        <input id="novoNome" placeholder="Nome" value="${treinoParaEditar ? (treinoParaEditar.NomeTreino || '') : ''}">
        <div class="lista-ex-container" id="listaExercicios">${htmlLista}</div>
        <input id="novoDescanso" type="number" placeholder="Descanso" value="${treinoParaEditar ? treinoParaEditar.Descanso : ''}">
        <input id="novoReps" type="number" placeholder="Reps" value="${treinoParaEditar ? treinoParaEditar.Repeticoes : ''}">
        <input id="novoDuracao" type="number" placeholder="Minutos" value="${treinoParaEditar ? treinoParaEditar.Duracao : ''}">
        <button onclick='salvarNovoTreino(${treinoParaEditar ? JSON.stringify(treinoParaEditar) : 'null'})'>Salvar</button>
        <button onclick="fecharModal('modalCriacao')">Cancelar</button>
      </div>
    </div>`;
  document.getElementById("modalContainer").innerHTML = modalHtml;
}

async function salvarNovoTreino(treinoOriginal = null) {
  const checks = Array.from(document.querySelectorAll("#listaExercicios input:checked"));
  const nome = document.getElementById("novoNome").value;
  if (checks.length === 0 || !nome) return alert("Preencha tudo!");
  const payload = {
    action: treinoOriginal ? "editarTreino" : "salvarTreino",
    usuario: userLogado.Usuario,
    nomeAntigo: treinoOriginal ? (treinoOriginal.NomeTreino || treinoOriginal.Missao) : null,
    nome: nome,
    exercicios: checks.map(c => c.value).join(","),
    descanso: document.getElementById("novoDescanso").value || 30,
    repeticoes: document.getElementById("novoReps").value || 1,
    duracao: document.getElementById("novoDuracao").value || 10
  };
  showLoading(true);
  await apiCall(payload);
  showLoading(false);
  fecharModal("modalCriacao");
  iniciarHome();
}

/* ================= PLAYER (MANTIDO) ================= */
function fecharModal(id) {
  if(id === 'modalPlayer' && treinoAtivo) tocarSom('abortar');
  const el = document.getElementById(id); if(el) el.remove();
  clearInterval(timerInterval);
}

function abrirDetalhesTreino(treino) {
  const titulo = treino.NomeTreino || treino.Missao;
  const exLista = treino.Exercicios.split(",").map(e => `<li>${e.trim()}</li>`).join("");
  const modalHtml = `
    <div class="modal-overlay" id="modalDetalhes">
      <div class="modal-box">
        <h2>${titulo}</h2>
        <button onclick='iniciarModoEvolucao(${JSON.stringify(treino)})'>🚀 Modo Evolução</button>
        <ul>${exLista}</ul>
        <button onclick="fecharModal('modalDetalhes')">Voltar</button>
      </div>
    </div>`;
  document.getElementById("modalContainer").innerHTML = modalHtml;
}

async function iniciarModoEvolucao(treino) {
  tocarSom('inicio');
  showLoading(true);
  const res = await apiCall({ action: "detalharTreino", exerciciosStr: treino.Exercicios });
  showLoading(false);
  if(!res.sucesso) return;
  fecharModal("modalDetalhes");
  treinoAtivo = { dadosBase: treino, exercicios: res.exerciciosDetalhes, indexAtual: 0, pausado: false, tempoRestante: 0 };
  tocarExercicio();
}

function tocarExercicio() {
  if (treinoAtivo.indexAtual >= treinoAtivo.exercicios.length) return finalizarTreinoAtual();
  const ex = treinoAtivo.exercicios[treinoAtivo.indexAtual];
  treinoAtivo.tempoRestante = Math.floor((parseInt(treinoAtivo.dadosBase.Duracao) * 60) / treinoAtivo.exercicios.length);
  renderPlayer(ex.Exercício, ex.GifLink || "", treinoAtivo.dadosBase.Repeticoes, false);
  iniciarTimerPlayer(() => telaDescanso());
}

function telaDescanso() {
  tocarSom('descanso');
  treinoAtivo.tempoRestante = parseInt(treinoAtivo.dadosBase.Descanso) || 30;
  renderPlayer("Descanso", "", "-", true);
  iniciarTimerPlayer(() => { treinoAtivo.indexAtual++; tocarExercicio(); });
}

function renderPlayer(titulo, gifLink, reps, isDescanso) {
  const html = `
    <div class="modal-overlay" id="modalPlayer">
      <div class="modal-box">
        <h2>${titulo}</h2>
        ${!isDescanso && gifLink ? `<img src="${gifLink}" class="player-gif">` : ''}
        <div id="playerTimer" class="timer-display">${treinoAtivo.tempoRestante}s</div>
        <button onclick="togglePausePlayer()">Pausa</button>
        <button onclick="pularEtapaPlayer()">Pular</button>
        <button onclick="fecharModal('modalPlayer')">Abortar</button>
      </div>
    </div>`;
  document.getElementById("modalContainer").innerHTML = html;
}

function iniciarTimerPlayer(onFinish) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (treinoAtivo.pausado) return;
    treinoAtivo.tempoRestante--;
    const display = document.getElementById("playerTimer");
    if(display) display.textContent = treinoAtivo.tempoRestante + "s";
    if (treinoAtivo.tempoRestante <= 0) { clearInterval(timerInterval); onFinish(); }
  }, 1000);
}

async function finalizarTreinoAtual() {
  const backupQtd = treinoAtivo.exercicios.length;
  fecharModal("modalPlayer");
  showLoading(true);
  const res = await apiCall({ action: "finalizarTreino", usuario: userLogado.Usuario, qtdExercicios: backupQtd });
  showLoading(false);
  if (res.sucesso) {
    if (res.level > userLogado.Level) { dispararLevelUp(); tocarSom('inicio'); }
    userLogado.Level = res.level; iniciarHome();
  }
}

/* ================= PERFIL (MINHA CONTA) ================= */
async function abrirPerfil() {
  trocarTela("perfilScreen");
  showLoading(true);
  const res = await apiCall({ action: "carregarPerfil", usuario: userLogado.Usuario });
  showLoading(false);
  if (res.sucesso) { userLogado = res.user; renderizarPerfil(res.user, res.rival); }
}

function renderizarPerfil(u, rival) {
  const avatarBox = document.getElementById("perfilAvatarBox");
  avatarBox.innerHTML = u.Icone ? `<img src="${u.Icone}">` : u.Usuario.charAt(0).toUpperCase();
  document.getElementById("perfilOfensiva").textContent = u.Ofensiva || 0;
  document.getElementById("perfilRankStr").textContent = u.Rank;
  
  // Lógica de Barras de Progresso
  let nextXP = u.Rank.includes("Rank E") ? 1000 : 3000; // Simplificado p/ visual
  document.getElementById("barXP").style.width = Math.min(100, (u.XP / nextXP) * 100) + "%";
  document.getElementById("txtXP").textContent = `${u.XP} / ${nextXP} XP`;

  document.getElementById("perfilLevelStr").textContent = "Level " + u.Level;
  document.getElementById("barAura").style.width = Math.min(100, (u.Aura / 2700) * 100) + "%";
  document.getElementById("txtAura").textContent = `${u.Aura} Aura`;

  // Preencher Inputs de Edição
  document.getElementById("editUser").value = u.Usuario;
  document.getElementById("editSenha").value = u.Senha;
  document.getElementById("editPeso").value = u.Peso;
  document.getElementById("editAltura").value = u.Altura;
  document.getElementById("editRival").value = u.Rival || "";

  document.getElementById("nomeRivalStr").textContent = u.Rival || "Nenhum";
  if (rival) {
    document.getElementById("rivalStats").innerHTML = `<p>${rival.Rank} | Lvl ${rival.Level}</p>`;
  }
}

async function salvarPerfil() {
  const dados = {
    action: "atualizarPerfil",
    usuario: userLogado.Usuario,
    senha: document.getElementById("editSenha").value,
    peso: document.getElementById("editPeso").value,
    altura: document.getElementById("editAltura").value,
    rival: document.getElementById("editRival").value
  };
  showLoading(true);
  await apiCall(dados);
  showLoading(false);
  abrirPerfil();
}

async function abrirModalAvatar() {
  showLoading(true);
  const res = await apiCall({ action: "listarAvatares" });
  showLoading(false);
  const gridHtml = res.lista.map(link => `
    <img src="${link.trim()}" onclick="selecionarNovoAvatar('${link.trim()}')" style="width:60px; cursor:pointer;">
  `).join("");
  document.getElementById("modalContainer").innerHTML = `
    <div class="modal-overlay" id="modalAvatar">
      <div class="modal-box"><h2>Avatares</h2><div style="display:flex; flex-wrap:wrap; gap:10px;">${gridHtml}</div><button onclick="fecharModal('modalAvatar')">Sair</button></div>
    </div>`;
}

async function selecionarNovoAvatar(url) {
  fecharModal("modalAvatar");
  showLoading(true);
  await apiCall({ action: "atualizarPerfil", usuario: userLogado.Usuario, icone: url });
  showLoading(false);
  abrirPerfil();
}
