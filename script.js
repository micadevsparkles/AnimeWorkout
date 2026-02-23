const API_URL = "https://script.google.com/macros/s/AKfycbyZUT_Rd5d6-0XuyWHZa6xdV2nte91Meycq-oU-VrbUyIJCnO7tQIS1xOZ62Aj7ptGm/exec";

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
  renderizarTreinos("boxMissao", res.missao ? [res.missao] : []);
}

function renderizarTreinos(id, lista, isMeus = false) {
  const box = document.getElementById(id);
  box.innerHTML = lista.map(t => `
    <div class="card-treino" onclick='abrirDetalhesTreino(${JSON.stringify(t)})'>
      <div>
        <h4>${t.NomeTreino || t.Missao}</h4>
        <p>🔁 ${t.Repeticoes} Reps | ⏱️ ${t.Duracao}m</p>
      </div>
      ${isMeus ? `<span class="edit-btn">📝</span>` : ''}
    </div>
  `).join("");
}

// --- PLAYER DE TREINO ---
function abrirDetalhesTreino(treino) {
  const modal = `
    <div class="modal-overlay" id="modalD">
      <div class="modal-box">
        <h2>${treino.NomeTreino || treino.Missao}</h2>
        <div style="color:#94a3b8; margin-bottom:15px;">
           <span>🔁 ${treino.Repeticoes} Repetições</span> | 
           <span>⏱️ ${treino.Duracao} Minutos</span>
        </div>
        <button onclick='iniciarContagemRegressiva(${JSON.stringify(treino)})'>COMEÇAR TREINO</button>
        <ul style="text-align:left;">${treino.Exercicios.split(",").map(e => `<li>${e}</li>`).join("")}</ul>
        <button onclick="document.getElementById('modalD').remove()">Voltar</button>
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

  const timer = setInterval(() => {
    modal.innerHTML = `<div class="modal-box"><h1 style="font-size:80px;">${count > 0 ? count : 'COMECE!'}</h1></div>`;
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
  
  let index = 0;
  const rodarProximo = () => {
    if (index >= res.exerciciosDetalhes.length) {
      finalizarSessao(treino, res.exerciciosDetalhes.length);
      return;
    }
    
    const ex = res.exerciciosDetalhes[index];
    let tempo = (treino.Duracao * 60) / res.exerciciosDetalhes.length;
    
    document.getElementById("modalContainer").innerHTML = `
      <div class="modal-overlay" id="player">
        <div class="modal-box">
          <h2>${ex.Exercício}</h2>
          <img src="${ex.GifLink}" class="player-gif">
          <p>Reps: ${treino.Repeticoes}</p>
          <div id="clock" class="timer-display">${Math.floor(tempo)}s</div>
          <button onclick="pular()">Pular</button>
        </div>
      </div>`;

    timerInterval = setInterval(() => {
      tempo--;
      document.getElementById("clock").innerText = Math.floor(tempo) + "s";
      if (tempo <= 0) {
        clearInterval(timerInterval);
        index++;
        rodarProximo();
      }
    }, 1000);
  };
  rodarProximo();
}

async function finalizarSessao(treino, qtd) {
  document.getElementById("modalContainer").innerHTML = `
    <div class="modal-overlay"><div class="modal-box"><h2>Parabéns!</h2><button onclick="iniciarHome()">Sair</button></div></div>`;
  await apiCall({ action: "finalizarTreino", usuario: userLogado.Usuario, qtdExercicios: qtd });
}

// --- PERFIL E IMC ---
async function abrirPerfil() {
  trocarTela("perfilScreen");
  const res = await apiCall({ action: "carregarPerfil", usuario: userLogado.Usuario });
  const u = res.user;
  
  document.getElementById("perfilAvatarBox").innerHTML = u.Icone ? `<img src="${u.Icone}">` : u.Usuario.charAt(0);
  document.getElementById("perfilRankStr").innerText = u.Rank;
  document.getElementById("txtXP").innerText = `${u.XP} XP`;
  document.getElementById("barXP").style.width = (u.XP % 1000 / 10) + "%";
  document.getElementById("txtAura").innerText = `${u.Aura} Aura`;
  document.getElementById("barAura").style.width = (u.Aura % 2700 / 27) + "%";
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
  }

  document.getElementById("editUser").value = u.Usuario;
  document.getElementById("editPeso").value = u.Peso;
  document.getElementById("editAltura").value = u.Altura;
  document.getElementById("editRival").value = u.Rival || "";
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
  const res = await apiCall({ action: "listarAvatares" });
  const grid = res.lista.map(link => `<img src="${link.trim()}" onclick="selecionarAvatar('${link.trim()}')" class="avatar-opt">`).join("");
  document.getElementById("modalContainer").innerHTML = `<div class="modal-overlay"><div class="modal-box"><h3>Escolha seu Avatar</h3><div class="avatar-grid">${grid}</div><button onclick="document.getElementById('modalContainer').innerHTML=''">Fechar</button></div></div>`;
}

async function selecionarAvatar(url) {
  await apiCall({ action: "atualizarPerfil", usuario: userLogado.Usuario, icone: url });
  document.getElementById("modalContainer").innerHTML = "";
  abrirPerfil();
}
