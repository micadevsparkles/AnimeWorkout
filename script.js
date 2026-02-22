const API_URL = "https://script.google.com/macros/s/AKfycbyvAmwVmYkPzltLw8z9sLaikVAFOvbulx-JKDM7Oz0Gc_ok-5VbgOu5Z_1yrmolcev3/exec";

let userLogado = null;
let exerciciosDB = []; // Salva a lista de exercícios para pesquisa
let treinoAtivo = null; // Armazena o treino que está rodando
let timerInterval = null;

/* ================= UTILS ================= */
function showLoading(show) {
  document.getElementById("loading").classList.toggle("hidden", !show);
}

function trocarTela(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

async function apiCall(data) {
  const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(data) });
  return await res.json();
}

/* ================= AUTH ================= */
async function fazerLogin() {
  const user = document.getElementById("logUser").value.trim();
  const senha = document.getElementById("logSenha").value.trim();
  const msg = document.getElementById("logMsg");

  if (!user || !senha) return msg.textContent = "Preencha tudo!";
  
  showLoading(true);
  const res = await apiCall({ action: "login", usuario: user, senha: senha });
  showLoading(false);

  if (!res.sucesso) {
    msg.textContent = res.msg;
  } else {
    userLogado = res.user;
    msg.textContent = "";
    iniciarHome();
  }
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
  if (!data.usuario || !data.senha) return msg.textContent = "Usuário e Senha são obrigatórios!";

  showLoading(true);
  const res = await apiCall(data);
  showLoading(false);

  if (res.sucesso) {
    msg.className = "msg sucesso";
    msg.textContent = res.msg;
    setTimeout(() => trocarTela('loginScreen'), 2000);
  } else {
    msg.className = "msg";
    msg.textContent = res.msg;
  }
}

/* ================= DASHBOARD (HOME) ================= */
async function iniciarHome() {
  trocarTela("homeScreen");
  
  // Renderiza Avatar
  const avatar = document.getElementById("avatarHome");
  if (userLogado.Icone) {
    avatar.innerHTML = `<img src="${userLogado.Icone}">`;
  } else {
    avatar.innerHTML = userLogado.Usuario.charAt(0).toUpperCase();
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
  if (!lista || lista.length === 0) {
    container.innerHTML = "<p>Nenhum treinamento encontrado.</p>";
    return;
  }

  container.innerHTML = lista.map(t => {
    const titulo = t.NomeTreino || t.Missao;
    const isMeuTreino = containerId === "boxMeusTreinos";

    return `
      <div class="card-treino" style="position:relative;">
        <div onclick='abrirDetalhesTreino(${JSON.stringify(t)})' style="width:80%">
          <h4>${titulo}</h4>
          <p>⏱️ ${t.Duracao}min | 🔁 ${t.Repeticoes} rep | ⏸️ ${t.Descanso ? t.Descanso+'s' : '30s'}</p>
        </div>
        ${isMeuTreino ? `
          <div style="position:absolute; right:10px; top:12px; display:flex; gap:10px; font-size:18px;">
            <span onclick='abrirCriacaoTreino(${JSON.stringify(t)})' style="cursor:pointer">📝</span>
            <span onclick='deletarTreino("${titulo}")' style="cursor:pointer">🗑️</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
}

async function deletarTreino(nomeTreino) {
  if (!confirm(`Deseja destruir o treino "${nomeTreino}" permanentemente?`)) return;
  
  showLoading(true);
  const res = await apiCall({ 
    action: "excluirTreino", 
    usuario: userLogado.Usuario, 
    nomeTreino: nomeTreino 
  });
  showLoading(false);

  if (res.sucesso) iniciarHome();
  else alert("Erro ao excluir!");
}
/* ================= CRIAÇÃO E EDIÇÃO DE TREINO ================= */
async function abrirCriacaoTreino(treinoParaEditar = null) {
  showLoading(true);
  const res = await apiCall({ action: "listarExercicios" });
  showLoading(false);

  if(res.sucesso) exerciciosDB = res.exercicios;

  const selecionados = treinoParaEditar ? treinoParaEditar.Exercicios.split(",").map(e => e.trim()) : [];

  const htmlLista = exerciciosDB.map(ex => `
    <label class="ex-item">
      <input type="checkbox" value="${ex.Exercício}" ${selecionados.includes(ex.Exercício) ? 'checked' : ''}> ${ex.Exercício}
    </label>
  `).join("");

  const modalHtml = `
    <div class="modal-overlay" id="modalCriacao">
      <div class="modal-box">
        <h2>${treinoParaEditar ? 'Editar' : 'Criar'} Treinamento</h2>
        <input id="novoNome" placeholder="Nome do Treinamento" value="${treinoParaEditar ? (treinoParaEditar.NomeTreino || '') : ''}">
        <input id="buscaEx" placeholder="Buscar técnica..." oninput="filtrarEx()">
        <div class="lista-ex-container" id="listaExercicios">${htmlLista}</div>
        <div style="display:flex; gap:10px;">
          <input id="novoDescanso" type="number" placeholder="Descanso (s)" value="${treinoParaEditar ? treinoParaEditar.Descanso : ''}">
          <input id="novoReps" type="number" placeholder="Reps" value="${treinoParaEditar ? treinoParaEditar.Repeticoes : ''}">
        </div>
        <input id="novoDuracao" type="number" placeholder="Tempo Total (min)" value="${treinoParaEditar ? treinoParaEditar.Duracao : ''}">
        
        <button onclick='salvarNovoTreino(${treinoParaEditar ? JSON.stringify(treinoParaEditar) : 'null'})'>
          ${treinoParaEditar ? 'Atualizar Treino' : 'Salvar Treino'}
        </button>
        <button onclick="fecharModal('modalCriacao')" style="background:transparent; border:1px solid #94a3b8;">Cancelar</button>
      </div>
    </div>
  `;
  document.getElementById("modalContainer").innerHTML = modalHtml;
}

function filtrarEx() {
  const termo = document.getElementById("buscaEx").value.toLowerCase();
  document.querySelectorAll(".ex-item").forEach(label => {
    label.style.display = label.textContent.toLowerCase().includes(termo) ? "flex" : "none";
  });
}

async function salvarNovoTreino(treinoOriginal = null) {
  const checks = Array.from(document.querySelectorAll("#listaExercicios input:checked"));
  if (checks.length === 0) return alert("Selecione técnicas!");
  
  const nome = document.getElementById("novoNome").value;
  if(!nome) return alert("Nome obrigatório!");

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
/* ================= DETALHES DO TREINO ================= */
function fecharModal(id) {
  const el = document.getElementById(id);
  if(el) el.remove();
  clearInterval(timerInterval); // Para timers se existirem
}

function abrirDetalhesTreino(treino) {
  const titulo = treino.NomeTreino || treino.Missao;
  const exLista = treino.Exercicios.split(",").map(e => `<li>${e.trim()}</li>`).join("");

  const modalHtml = `
    <div class="modal-overlay" id="modalDetalhes">
      <div class="modal-box">
        <h2>${titulo}</h2>
        <p><strong>Tempo Total:</strong> ${treino.Duracao} minutos</p>
        <p><strong>Sequência:</strong> ${treino.Repeticoes} repetições</p>
        <p><strong>Descanso:</strong> ${treino.Descanso || 30} segundos</p>
        
        <button onclick='iniciarModoEvolucao(${JSON.stringify(treino)})' style="background:linear-gradient(90deg, #3b82f6, #06b6d4);">🚀 Modo Evolução</button>
        
        <h4 style="margin-top:20px;">Técnicas:</h4>
        <ul style="color:#94a3b8; font-size:14px;">${exLista}</ul>

        <button onclick="fecharModal('modalDetalhes')" style="background:transparent; border:1px solid #94a3b8; margin-top:20px;">Voltar</button>
      </div>
    </div>
  `;
  document.getElementById("modalContainer").innerHTML = modalHtml;
}

/* ================= MODO EVOLUÇÃO (PLAYER) ================= */
async function iniciarModoEvolucao(treino) {
  showLoading(true);
  // Busca os gifs e detalhes dos exercícios lá do sheets
  const res = await apiCall({ action: "detalharTreino", exerciciosStr: treino.Exercicios });
  showLoading(false);

  if(!res.sucesso) return alert("Erro ao carregar os dados dos exercícios.");

  fecharModal("modalDetalhes");

  treinoAtivo = {
    dadosBase: treino,
    exercicios: res.exerciciosDetalhes,
    indexAtual: 0,
    pausado: false,
    tempoRestante: 0
  };

  tocarExercicio();
}

function tocarExercicio() {
  if (treinoAtivo.indexAtual >= treinoAtivo.exercicios.length) {
    return finalizarTreinoAtual();
  }

  const ex = treinoAtivo.exercicios[treinoAtivo.indexAtual];
  const totalMinutos = parseInt(treinoAtivo.dadosBase.Duracao) || 10;
  // Divide o tempo total pelo número de exercícios (apenas para ter um cronometro coerente por exercício)
  const tempoPorExercicio = Math.floor((totalMinutos * 60) / treinoAtivo.exercicios.length);
  
  treinoAtivo.tempoRestante = tempoPorExercicio;
  treinoAtivo.pausado = false;

  renderPlayer(
    ex.Exercício, 
    ex.GifLink || "https://via.placeholder.com/300x200.png?text=Sem+GIF", 
    treinoAtivo.dadosBase.Repeticoes,
    false
  );
  
  iniciarTimerPlayer(() => telaDescanso());
}

function telaDescanso() {
  treinoAtivo.tempoRestante = parseInt(treinoAtivo.dadosBase.Descanso) || 30;
  treinoAtivo.pausado = false;

  renderPlayer("Repouse um pouco, guerreiro shounen", "", "-", true);
  
  iniciarTimerPlayer(() => {
    treinoAtivo.indexAtual++;
    tocarExercicio();
  });
}

function renderPlayer(titulo, gifLink, reps, isDescanso) {
  const html = `
    <div class="modal-overlay" id="modalPlayer">
      <div class="modal-box" style="text-align:center;">
        <h2>${titulo}</h2>
        ${!isDescanso && gifLink ? `<img src="${gifLink}" class="player-gif">` : ''}
        ${!isDescanso ? `<p>Repetições: <strong>${reps}</strong></p>` : ''}
        
        <div id="playerTimer" class="timer-display">${treinoAtivo.tempoRestante}s</div>
        
        <div class="player-controls">
          <button id="btnPause" onclick="togglePausePlayer()" style="background:#475569;">Pausa</button>
          <button onclick="pularEtapaPlayer()">Pular</button>
        </div>
        <button onclick="fecharModal('modalPlayer')" style="background:transparent; color:#fb7185; margin-top:20px;">Abortar Missão</button>
      </div>
    </div>
  `;
  document.getElementById("modalContainer").innerHTML = html;
}

function iniciarTimerPlayer(onFinish) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (treinoAtivo.pausado) return;
    
    treinoAtivo.tempoRestante--;
    const display = document.getElementById("playerTimer");
    if(display) display.textContent = treinoAtivo.tempoRestante + "s";

    if (treinoAtivo.tempoRestante <= 0) {
      clearInterval(timerInterval);
      onFinish();
    }
  }, 1000);
}

function togglePausePlayer() {
  treinoAtivo.pausado = !treinoAtivo.pausado;
  document.getElementById("btnPause").textContent = treinoAtivo.pausado ? "Retomar" : "Pausa";
}

function pularEtapaPlayer() {
  clearInterval(timerInterval);
  // Se está numa tela de descanso (sem gif), pula para o proximo exercicio. 
  // Se está num exercicio, pula para o descanso dele.
  const isDescanso = document.getElementById("modalPlayer").innerHTML.includes("Repouse");
  if (isDescanso) {
    treinoAtivo.indexAtual++;
    tocarExercicio();
  } else {
    telaDescanso();
  }
}

/* ================= RPG: FINALIZAR TREINO ================= */
async function finalizarTreinoAtual() {
  fecharModal("modalPlayer");
  showLoading(true);
  
  const qtdEx = treinoAtivo.exercicios.length;
  const res = await apiCall({ action: "finalizarTreino", usuario: userLogado.Usuario, qtdExercicios: qtdEx });
  
  showLoading(false);
  
  const modalHtml = `
    <div class="modal-overlay" id="modalFim">
      <div class="modal-box" style="text-align:center; border: 2px solid #fb923c;">
        <h2 style="color:#34d399; font-size:28px;">🔥 TREINO CONCLUÍDO!</h2>
        <p style="font-size:16px;">Muito bem, shounen. Seu treinamento de hoje foi muito bom!</p>
        <div style="background:#0f172a; padding:15px; border-radius:8px; margin:20px 0;">
          <p style="color:#34d399; font-weight:bold;">+ ${qtdEx} XP Base</p>
          <p style="color:#c084fc; font-weight:bold;">+ ${qtdEx * 3} Aura Base</p>
          <p style="font-size:12px; color:#94a3b8;">(Bônus de ofensiva aplicados em seu perfil)</p>
        </div>
        <button onclick="fecharModal('modalFim'); iniciarHome();">Voltar ao QG</button>
      </div>
    </div>
  `;
  document.getElementById("modalContainer").innerHTML = modalHtml;
}

/* ================= PERFIL E AVATAR ================= */
async function abrirPerfil() {
  trocarTela("perfilScreen");
  showLoading(true);
  const res = await apiCall({ action: "carregarPerfil", usuario: userLogado.Usuario });
  showLoading(false);

  if (res.sucesso) {
    userLogado = res.user; // Atualiza dados locais
    renderizarPerfil(res.user, res.rival);
  }
}

function renderizarPerfil(u, rival) {
  // Avatar e Básicos
  const avatarBox = document.getElementById("perfilAvatarBox");
  avatarBox.innerHTML = u.Icone ? `<img src="${u.Icone}">` : u.Usuario.charAt(0).toUpperCase();
  document.getElementById("perfilOfensiva").textContent = u.Ofensiva || 0;
  
  // XP e Rank
  document.getElementById("perfilRankStr").textContent = u.Rank;
  let nextXP = u.Rank.includes("Rank E") ? 1000 : u.Rank.includes("Rank D") ? 3000 : u.Rank.includes("Rank C") ? 7000 : u.Rank.includes("Rank B") ? 15000 : u.Rank.includes("Rank A") ? 30000 : u.Rank.includes("Rank S -") ? 60000 : 100000;
  let pctXP = Math.min(100, (Number(u.XP) / nextXP) * 100);
  document.getElementById("barXP").style.width = pctXP + "%";
  document.getElementById("txtXP").textContent = `${u.XP} / ${nextXP} XP`;

  // Aura e Level
  document.getElementById("perfilLevelStr").textContent = "Level " + u.Level;
  let nextAura = 2700; // Simplificado para mostrar a barra baseada no máximo
  let pctAura = Math.min(100, (Number(u.Aura) / nextAura) * 100);
  document.getElementById("barAura").style.width = pctAura + "%";
  document.getElementById("txtAura").textContent = `${u.Aura} Aura`;

  // Conquistas
  const conqBox = document.getElementById("perfilConquistas");
  const arrayConq = (u.Conquistas || "").split(",").filter(c=>c);
  conqBox.innerHTML = arrayConq.length > 0 ? arrayConq.map(c => `<span class="conquista-badge">🏅 ${c}</span>`).join("") : "<p style='color:#94a3b8; font-size:12px;'>Ainda não há conquistas.</p>";

  // Inputs Editáveis
  document.getElementById("editUser").value = u.Usuario;
  document.getElementById("editSenha").value = u.Senha;
  document.getElementById("editPeso").value = u.Peso;
  document.getElementById("editAltura").value = u.Altura;
  document.getElementById("editGenero").value = u.Genero;
  document.getElementById("editObjetivo").value = u.Objetivo;
  document.getElementById("editRival").value = u.Rival || "";

  // Rival
  document.getElementById("nomeRivalStr").textContent = u.Rival || "Nenhum";
  if (rival) {
    document.getElementById("rivalStats").innerHTML = `
      <p style="font-size:14px;"><strong>${rival.Rank}</strong> | Lvl ${rival.Level}</p>
      <p style="font-size:12px;">🔥 Ofensiva: ${rival.Ofensiva} | 🏅 Conquistas: ${(rival.Conquistas || "").split(",").filter(c=>c).length}</p>
    `;
  } else {
    document.getElementById("rivalStats").innerHTML = "Defina um rival válido para comparar o poder de luta!";
  }
}

async function salvarPerfil() {
  const dados = {
    action: "atualizarPerfil",
    usuario: userLogado.Usuario,
    senha: document.getElementById("editSenha").value,
    peso: document.getElementById("editPeso").value,
    altura: document.getElementById("editAltura").value,
    genero: document.getElementById("editGenero").value,
    objetivo: document.getElementById("editObjetivo").value,
    rival: document.getElementById("editRival").value
  };

  showLoading(true);
  await apiCall(dados);
  showLoading(false);
  alert("Atributos atualizados!");
  abrirPerfil(); // Recarrega
}

/* ================= TROCAR AVATAR ================= */
async function abrirModalAvatar() {
  showLoading(true);
  const res = await apiCall({ action: "listarAvatares" });
  showLoading(false);

  if (!res.sucesso) return alert("Erro ao carregar avatares.");

  const gridHtml = res.lista.map(link => `
    <img src="${link.trim()}" style="width:70px; height:70px; border-radius:50%; cursor:pointer; border:2px solid transparent;" 
         onclick="selecionarNovoAvatar('${link.trim()}')">
  `).join("");

  const modalHtml = `
    <div class="modal-overlay" id="modalAvatar">
      <div class="modal-box">
        <h2>Escolha sua Forma</h2>
        <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-top:20px;">
          ${gridHtml}
        </div>
        <button onclick="fecharModal('modalAvatar')" style="background:transparent; border:1px solid #94a3b8; margin-top:20px;">Cancelar</button>
      </div>
    </div>
  `;
  document.getElementById("modalContainer").innerHTML = modalHtml;
}

async function selecionarNovoAvatar(url) {
  fecharModal("modalAvatar");
  showLoading(true);
  await apiCall({ action: "atualizarPerfil", usuario: userLogado.Usuario, icone: url });
  showLoading(false);
  abrirPerfil();
}
