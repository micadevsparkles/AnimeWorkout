const API_URL = "https://script.google.com/macros/s/AKfycby1Q9fElRaEmYDgeba2Kc32sFdX82Fm-o6ABBBC6pocSytZ__pT3-BQ-M6Gtjn-x8Uo/exec";

// ÁUDIOS E EFEITOS DO GOOGLE ACTIONS (Do código novo)
const somBeep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
const somFim = new Audio("https://actions.google.com/sounds/v1/magic/magic_chime.ogg");

// --- SISTEMA DE ÁUDIO (Restaurado do código antigo) ---
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

// --- SISTEMA DE PARTÍCULAS (Restaurado do código antigo) ---
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
let timerInterval = null;

// --- UTILITÁRIOS ---
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
  return await response.json();
}

// --- CADASTRO E LOGIN ---
async function validarNomeUsuario() {
  const user = document.getElementById("cadUser").value.trim();
  const alertBox = document.getElementById("userAlert");
  const btn = document.getElementById("btnCriarConta");

  if (user.length < 4) {
    alertBox.textContent = "Mínimo 4 caracteres.";
    btn.disabled = true;
    return;
  }

  const res = await apiCall({ action: "verificarUsuario", usuario: user });
  if (res.existe) {
    alertBox.textContent = "Usuário já existe!";
    btn.disabled = true;
  } else {
    alertBox.textContent = "Usuário disponível!";
    alertBox.style.color = "#34d399";
    btn.disabled = false;
  }
}

async function fazerLogin() {
  const user = document.getElementById("logUser").value.trim();
  const senha = document.getElementById("logSenha").value.trim();
  if (!user || !senha) return;
  showLoading(true);
  try {
    const res = await apiCall({ action: "login", usuario: user, senha: senha });
    if (res.sucesso) { userLogado = res.user; await iniciarHome(); }
    else { document.getElementById("logMsg").textContent = res.msg; }
  } catch (e) { console.error(e); }
  finally { showLoading(false); }
}

async function fazerCadastro() {
  const data = {
    action: "registrar",
    usuario: document.getElementById("cadUser").value.trim(),
    senha: document.getElementById("cadSenha").value.trim(),
    peso: document.getElementById("cadPeso").value,
    altura: document.getElementById("cadAltura").value,
    idade: document.getElementById("cadIdade").value,
    genero: document.getElementById("cadGenero").value,
    objetivo: document.getElementById("cadObjetivo").value
  };
  showLoading(true);
  const res = await apiCall(data);
  showLoading(false);
  if (res.sucesso) { trocarTela('loginScreen'); }
}

// --- DASHBOARD ---
async function iniciarHome() {
  trocarTela("homeScreen");
  const av = document.getElementById("avatarHome");
  if (userLogado.Icone) av.innerHTML = `<img src="${userLogado.Icone}">`;
  else av.innerText = userLogado.Usuario.charAt(0).toUpperCase();

  showLoading(true);
  const res = await apiCall({ action: "carregarHome", usuario: userLogado.Usuario });
  showLoading(false);
  
  renderizarTreinos("boxPadroes", res.padroes);
  renderizarTreinos("boxMeusTreinos", res.meusTreinos, true);
  
  const boxMissao = document.getElementById("boxMissao");
  if (res.missao) {
    renderizarTreinos("boxMissao", [res.missao]);
  } else {
    boxMissao.innerHTML = `<p style="color:#94a3b8; font-size:14px; text-align:center;">Nenhuma missão ativa para hoje.</p>`;
  }
}

function renderizarTreinos(id, lista, isMeus = false) {
  const box = document.getElementById(id);
  if (!lista || lista.length === 0) {
    box.innerHTML = `<p style="color:#94a3b8; font-size:14px; text-align:center;">Lista vazia.</p>`;
    return;
  }
  box.innerHTML = lista.map(t => `
    <div class="card-treino" onclick='abrirDetalhesTreino(${JSON.stringify(t)})'>
      <div>
        <h4>${t.NomeTreino || t.Missao}</h4>
        <p>🔁 ${t.Repeticoes} Reps | ⏱️ ${t.Duracao}m</p>
      </div>
      ${isMeus ? `<span class="edit-btn" onclick="event.stopPropagation(); excluirMeuTreino('${t.NomeTreino}')">🗑️</span>` : ''}
    </div>
  `).join("");
}

// --- CRIAR NOVO TREINO ---
function abrirCriacaoTreino() {
  const modal = `
    <div class="modal-overlay" id="modalCriar">
      <div class="modal-box">
        <h2>Criar Treino</h2>
        <input id="novoNomeT" placeholder="Nome do Treino">
        <textarea id="novoExs" placeholder="Exercícios (separe por vírgula)" style="width:100%; padding:12px; margin:10px 0; border-radius:8px; background:#1e293b; color:white; border:1px solid #334155; font-family:sans-serif;" rows="3"></textarea>
        <div class="grid-inputs">
           <input id="novoReps" type="number" placeholder="Repetições">
           <input id="novoDuracao" type="number" placeholder="Minutos">
        </div>
        <button onclick="salvarNovoTreino()">Salvar Treino</button>
        <button style="background:#334155;" onclick="document.getElementById('modalCriar').remove()">Cancelar</button>
      </div>
    </div>`;
  document.getElementById("modalContainer").insertAdjacentHTML('beforeend', modal);
}

async function salvarNovoTreino() {
  const nome = document.getElementById("novoNomeT").value;
  const exs = document.getElementById("novoExs").value;
  const reps = document.getElementById("novoReps").value;
  const dur = document.getElementById("novoDuracao").value;
  
  if(!nome || !exs) { alert("Preencha os campos principais."); return; }
  
  showLoading(true);
  await apiCall({ action: "salvarTreino", usuario: userLogado.Usuario, nome: nome, exercicios: exs, repeticoes: reps, duracao: dur, descanso: 30 });
  showLoading(false);
  document.getElementById('modalCriar').remove();
  iniciarHome();
}

async function excluirMeuTreino(nomeTreino) {
  if(!confirm("Deseja deletar este treino?")) return;
  showLoading(true);
  await apiCall({ action: "excluirTreino", usuario: userLogado.Usuario, nomeTreino: nomeTreino });
  showLoading(false);
  iniciarHome();
}

// --- PLAYER DE TREINO ---
function abrirDetalhesTreino(treino) {
  const modal = `
    <div class="modal-overlay" id="modalD">
      <div class="modal-box">
        <h2>${treino.NomeTreino || treino.Missao}</h2>
        <div style="color:#94a3b8; margin-bottom:15px; background:#0f172a; padding:10px; border-radius:8px;">
           <span style="display:block; margin-bottom:5px;">🔁 ${treino.Repeticoes} Repetições</span>
           <span>⏱️ ${treino.Duracao} Minutos Totais</span>
        </div>
        <ul style="text-align:left; color:#e2e8f0; font-size:14px; background:#1e293b; padding:15px 30px; border-radius:8px;">
          ${treino.Exercicios.split(",").map(e => `<li>${e.trim()}</li>`).join("")}
        </ul>
        <button onclick='iniciarContagemRegressiva(${JSON.stringify(treino)})'>COMEÇAR TREINO</button>
        <button style="background:#334155;" onclick="document.getElementById('modalD').remove()">Voltar</button>
      </div>
    </div>`;
  document.getElementById("modalContainer").innerHTML = modal;
}

function iniciarContagemRegressiva(treino) {
  document.getElementById('modalD').remove();
  let count = 5;
  const modal = document.createElement('div');
  modal.className = "modal-overlay";
  modal.id = "modalCountdown";
  document.getElementById("modalContainer").appendChild(modal);

  somBeep.play();
  const timer = setInterval(() => {
    modal.innerHTML = `<div class="modal-box"><h1 style="font-size:100px; margin:0; color:var(--accent); text-shadow: 0 0 20px var(--accent);">${count > 0 ? count : 'GO!'}</h1></div>`;
    
    if (count > 0) {
      somBeep.play();
    }
    if (count === 0) {
      tocarSom('inicio'); // Toca a trombeta no GO!
    }
    if (count < 0) {
      clearInterval(timer);
      modal.remove();
      executarTreino(treino);
    }
    count--;
  }, 1000);
}

async function executarTreino(treino) {
  showLoading(true);
  const res = await apiCall({ action: "detalharTreino", exerciciosStr: treino.Exercicios });
  showLoading(false);
  
  if(!res.exerciciosDetalhes || res.exerciciosDetalhes.length === 0) {
      alert("Nenhum exercício encontrado na base de dados (verifique os nomes).");
      return;
  }
  
  let index = 0;
  const rodarProximo = () => {
    if (index >= res.exerciciosDetalhes.length) {
      finalizarSessao(treino, res.exerciciosDetalhes.length);
      return;
    }
    
    const ex = res.exerciciosDetalhes[index];
    // Dividindo o tempo do treino pela quantidade de exercicios (em segundos)
    let tempo = Math.floor((treino.Duracao * 60) / res.exerciciosDetalhes.length);
    
    document.getElementById("modalContainer").innerHTML = `
      <div class="modal-overlay" id="player">
        <div class="modal-box">
          <h2>${ex.Exercício}</h2>
          <img src="${ex.GifLink}" onerror="this.src='https://via.placeholder.com/300x200.png?text=Sem+GIF'" class="player-gif">
          <p style="font-size:18px;">Repetições Indicadas: <strong>${treino.Repeticoes}</strong></p>
          <div id="clock" class="timer-display">${tempo}s</div>
          <button style="background:#ef4444;" onclick="pularExercicio()">Pular Exercício</button>
        </div>
      </div>`;

    timerInterval = setInterval(() => {
      tempo--;
      const clockElement = document.getElementById("clock");
      if(clockElement) clockElement.innerText = tempo + "s";
      
      if (tempo <= 3 && tempo > 0) somBeep.play(); // Beep nos 3 ultimos segundos
      
      if (tempo <= 0) {
        clearInterval(timerInterval);
        index++;
        rodarProximo();
      }
    }, 1000);
  };
  
  window.pularExercicio = function() {
      tocarSom('abortar'); // Toca o som de abortar ao pular
      clearInterval(timerInterval);
      index++;
      rodarProximo();
  };
  
  rodarProximo();
}

async function finalizarSessao(treino, qtd) {
  somFim.play();
  // Mostrar a tela animada da Esfera Magica para XP
  document.getElementById("modalContainer").innerHTML = `
    <div class="modal-overlay">
      <div class="modal-box" style="text-align:center;">
        <h2 style="color:#facc15; font-size:30px;">TREINO CONCLUÍDO!</h2>
        
        <div class="magic-sphere-container" style="margin: 30px auto;">
          <div class="particle p-blue" style="top: 10%; left: 20%; animation-delay: 0.1s;"></div>
          <div class="particle p-yellow" style="top: 80%; left: 70%; animation-delay: 0.3s;"></div>
          <div class="particle p-blue" style="top: 50%; left: 90%; animation-delay: 0.5s;"></div>
          <div class="particle p-yellow" style="top: 20%; left: 80%; animation-delay: 0.2s;"></div>
          <div class="magic-sphere"></div>
        </div>

        <h3 id="resultadoGanhos" style="margin-top:20px;">Calculando Poder...</h3>
        <button onclick="document.getElementById('modalContainer').innerHTML=''; iniciarHome();" style="margin-top:20px;">Voltar ao QG</button>
      </div>
    </div>`;
    
  const res = await apiCall({ action: "finalizarTreino", usuario: userLogado.Usuario, qtdExercicios: qtd });
  
  if (res.sucesso) {
      // Checa se subiu de Level com base nos dados que vieram do backend
      if (res.novoLevel > userLogado.Level) {
          dispararLevelUp(); // Dispara as partículas na tela toda
          tocarSom('inicio'); // Toca a trombeta
      }
      userLogado.Level = res.novoLevel; // Atualiza o cache do usuário local

      document.getElementById("resultadoGanhos").innerHTML = `
        <span style="color:#3b82f6;">+${res.xpGanho} XP</span> <br>
        <span style="color:#a855f7;">+${res.auraGanha} Aura</span> <br><br>
        <span style="font-size:14px; color:white;">Rank Atual: <strong>${res.novoRank}</strong></span><br>
        <span style="font-size:14px; color:white;">Level Atual: <strong>${res.novoLevel}</strong></span>
      `;
  }
}

// --- PERFIL E IMC ---
async function abrirPerfil() {
  trocarTela("perfilScreen");
  const res = await apiCall({ action: "carregarPerfil", usuario: userLogado.Usuario });
  const u = res.user;
  
  document.getElementById("perfilAvatarBox").innerHTML = u.Icone ? `<img src="${u.Icone}">` : u.Usuario.charAt(0);
  document.getElementById("perfilRankStr").innerText = u.Rank;
  
  // XP = Sobe Rank, Aura = Sobe Level.
  // Barras baseadas nas configs do backend. Para visual, deixaremos o limite dinâmico:
  document.getElementById("txtXP").innerText = `${u.XP} XP`;
  document.getElementById("barXP").style.width = (u.XP % 1000 / 10) + "%"; // Visual simples para a barra
  
  document.getElementById("txtAura").innerText = `${u.Aura} Aura`;
  document.getElementById("barAura").style.width = (u.Aura % 100) + "%"; // Baseado em 100 aura por level
  
  document.getElementById("perfilLevelStr").innerText = `Level ${u.Level}`;
  document.getElementById("perfilOfensiva").innerText = u.Ofensiva;

  // IMC
  if(u.Peso && u.Altura) {
    const altM = u.Altura / 100;
    const imc = u.Peso / (altM * altM);
    document.getElementById("imcResultado").innerText = `IMC: ${imc.toFixed(1)}`;
    const idealMin = (18.5 * altM * altM).toFixed(1);
    const idealMax = (24.9 * altM * altM).toFixed(1);
    document.getElementById("pesoIdeal").innerText = `Peso Ideal: ${idealMin}kg - ${idealMax}kg`;
  } else {
    document.getElementById("imcResultado").innerText = `Preencha Peso e Altura`;
    document.getElementById("pesoIdeal").innerText = ``;
  }

  document.getElementById("editUser").value = u.Usuario;
  document.getElementById("editPeso").value = u.Peso;
  document.getElementById("editAltura").value = u.Altura;
  document.getElementById("editRival").value = u.Rival || "";
  
  // Atualiza userLogado pra manter dados frescos
  userLogado = u;
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
  document.getElementById("editSenha").value = "";
  abrirPerfil();
}

async function abrirModalAvatar() {
  const res = await apiCall({ action: "listarAvatares" });
  const grid = res.lista.map(link => `<img src="${link.trim()}" onclick="selecionarAvatar('${link.trim()}')" class="avatar-opt">`).join("");
  const modal = `
    <div class="modal-overlay" id="modalAvatar">
      <div class="modal-box">
        <h3>Escolha seu Avatar</h3>
        <div class="avatar-grid">${grid}</div>
        <button style="background:#334155;" onclick="document.getElementById('modalAvatar').remove()">Fechar</button>
      </div>
    </div>`;
  document.getElementById("modalContainer").innerHTML = modal;
}

async function selecionarAvatar(url) {
  document.getElementById('modalAvatar').remove();
  showLoading(true);
  await apiCall({ action: "atualizarPerfil", usuario: userLogado.Usuario, icone: url });
  showLoading(false);
  abrirPerfil();
}
