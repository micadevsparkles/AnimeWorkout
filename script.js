const API_URL = "COLE_AQUI_SUA_URL_DO_WEB_APP";

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
    const titulo = t.NomeTreino || t.Missao; // NomeTreino ou MissaoDiaria
    // Transforma o objeto em string para passar na função onclick
    return `
      <div class="card-treino" onclick='abrirDetalhesTreino(${JSON.stringify(t)})'>
        <h4>${titulo}</h4>
        <p>⏱️ ${t.Duracao}min | 🔁 ${t.Repeticoes} repetições | ⏸️ ${t.Descanso ? t.Descanso+'s' : 'N/A'}</p>
      </div>
    `;
  }).join("");
}

/* ================= CRIAÇÃO DE TREINO ================= */
async function abrirCriacaoTreino() {
  showLoading(true);
  const res = await apiCall({ action: "listarExercicios" });
  showLoading(false);

  if(res.sucesso) exerciciosDB = res.exercicios;

  const htmlLista = exerciciosDB.map(ex => `
    <label class="ex-item">
      <input type="checkbox" value="${ex.Exercício}"> ${ex.Exercício}
    </label>
  `).join("");

  const modalHtml = `
    <div class="modal-overlay" id="modalCriacao">
      <div class="modal-box">
        <h2>Criar Treinamento Solo</h2>
        <input id="novoNome" placeholder="Nome do Treinamento">
        <input id="buscaEx" placeholder="Buscar técnica..." oninput="filtrarEx()">
        <div class="lista-ex-container" id="listaExercicios">${htmlLista}</div>
        <div style="display:flex; gap:10px;">
          <input id="novoDescanso" type="number" placeholder="Descanso (segundos)">
          <input id="novoReps" type="number" placeholder="Repetições">
        </div>
        <input id="novoDuracao" type="number" placeholder="Tempo Total Estimado (min)">
        
        <button onclick="salvarNovoTreino()">Salvar Treino</button>
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

async function salvarNovoTreino() {
  const checks = Array.from(document.querySelectorAll("#listaExercicios input:checked"));
  if (checks.length === 0) return alert("Selecione ao menos 1 técnica!");
  
  const nome = document.getElementById("novoNome").value;
  if(!nome) return alert("Dê um nome ao treinamento!");

  const treino = {
    action: "salvarTreino",
    usuario: userLogado.Usuario,
    nome: nome,
    exercicios: checks.map(c => c.value).join(","),
    descanso: document.getElementById("novoDescanso").value || 30,
    repeticoes: document.getElementById("novoReps").value || 1,
    duracao: document.getElementById("novoDuracao").value || 10
  };

  showLoading(true);
  await apiCall(treino);
  showLoading(false);

  fecharModal("modalCriacao");
  iniciarHome(); // Recarrega a home para mostrar o novo treino
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

function finalizarTreinoAtual() {
  fecharModal("modalPlayer");
  
  // Aqui, no futuro, faremos a chamada para salvar XP, Aura, Conquistas, etc.
  
  const modalHtml = `
    <div class="modal-overlay" id="modalFim">
      <div class="modal-box" style="text-align:center;">
        <h2 style="color:#34d399; font-size:32px;">Treino Concluído!</h2>
        <p style="font-size:18px;">Muito bem, shounen. Seu treinamento de hoje foi muito bom, continue assim e um dia será invencível!</p>
        <button onclick="fecharModal('modalFim')" style="margin-top:20px;">Voltar ao QG</button>
      </div>
    </div>
  `;
  document.getElementById("modalContainer").innerHTML = modalHtml;
}

function abrirPerfil() {
  alert("A aba Minha Conta será o nosso próximo passo, guerreiro!");
}
