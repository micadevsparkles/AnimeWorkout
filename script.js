const API_URL = "https://script.google.com/macros/s/AKfycbyG2xQRn4hCwFHT4YeKpM1Uzzicav2swI_V9S8xbxS5KLPAEar7tF3nSJOcDf27rD8U/exec";

let usuarioLogado = null;
let treinoAtual = null;
let exercicioIndex = 0;
let timer = null;
let tempoRestante = 0;

/* ================= UI ================= */

function showLoading(v){
  document.getElementById("loading").classList.toggle("hidden", !v);
}

function trocarTela(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function mostrarCadastro(){ trocarTela("cadastroScreen"); }
function mostrarLogin(){ trocarTela("loginScreen"); }

/* ================= LOGIN ================= */

async function login() {
  showLoading(true);

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      usuario: document.getElementById("loginUsuario").value,
      senha: document.getElementById("loginSenha").value
    })
  });

  const data = await res.json();
  showLoading(false);

  if (!data.existe || !data.senhaCorreta) {
    document.getElementById("loginMsg").textContent = "Usuário ou senha inválidos!";
    return;
  }

  usuarioLogado = data.user;
  iniciarHome();
}

/* ================= CADASTRO ================= */

async function registrar(){
  showLoading(true);

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({
      action:"registrar",
      usuario: cadUsuario.value,
      senha: cadSenha.value,
      peso: cadPeso.value,
      altura: cadAltura.value,
      idade: cadIdade.value,
      genero: cadGenero.value,
      objetivo: cadObjetivo.value
    })
  });

  await res.json();
  showLoading(false);

  cadMsg.textContent = "Usuário registrado com sucesso, faça login";

  setTimeout(()=>mostrarLogin(),1500);
}

function sair() {
  usuarioLogado = null;
  document.getElementById("loginUsuario").value = "";
  document.getElementById("loginSenha").value = "";
  document.getElementById("loginMsg").textContent = "";
  trocarTela("loginScreen");
}

/* ================= HOME ================= */

function iniciarHome(){
  trocarTela("homeScreen");

  welcomeUser.textContent = "Bem-vindo, " + usuarioLogado.Usuario;

  if(usuarioLogado.Icone){
    avatarCircle.innerHTML = `<img src="${usuarioLogado.Icone}">`;
  }else{
    avatarCircle.textContent = usuarioLogado.Usuario[0].toUpperCase();
  }

  carregarHome();
}

async function carregarHome(){
  showLoading(true);

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({
      action:"listarTreinos",
      usuario: usuarioLogado.Usuario
    })
  });

  const data = await res.json();
  showLoading(false);

  renderTreinos(data.meusTreinos);
}


function sair() {
  localStorage.removeItem("usuarioLogado");
  window.location.href = "index.html";
}

function abrirConta() {
  trocarTela("perfilScreen");
  atualizarDadosTelaPerfil();
}

function atualizarDadosTelaPerfil() {
  const u = usuarioLogado;
  
  // Avatar
  const pAvatar = document.getElementById("perfilAvatar");
  if(u.Icone) pAvatar.innerHTML = `<img src="${u.Icone}">`;
  else pAvatar.textContent = u.Usuario[0].toUpperCase();

  // Dados Básicos
  document.getElementById("perfilOfensiva").textContent = u.Ofensiva || 0;
  document.getElementById("txtRank").textContent = u.Rank;
  document.getElementById("txtXP").textContent = u.XP;
  document.getElementById("txtLevel").textContent = u.Level;
  document.getElementById("txtAura").textContent = u.Aura;

  // Barras (Exemplo de cálculo simples de progresso)
  document.getElementById("barXP").style.width = Math.min(100, (u.XP / 1000) * 100) + "%";
  document.getElementById("barAura").style.width = Math.min(100, (u.Aura / 100) * 100) + "%";

  // Inputs
  document.getElementById("editUser").value = u.Usuario;
  document.getElementById("editSenha").value = u.Senha;
  document.getElementById("editPeso").value = u.Peso;
  document.getElementById("editAltura").value = u.Altura;
  document.getElementById("editGenero").value = u.Genero;
  document.getElementById("editObjetivo").value = u.Objetivo;
  document.getElementById("editRivalNome").value = u.Rival || "";

  // Conquistas
  const box = document.getElementById("conquistasBox");
  box.innerHTML = (u.Conquistas || "").split(",").map(c => c ? `<span class="badge">🏅 ${c}</span>` : "").join("");
}

async function salvarDadosPerfil() {
  showLoading(true);
  // Aqui você deve criar uma nova "action" no code.gs chamada "atualizarPerfil" 
  // que de um update na linha do usuário com os valores dos inputs acima.
  // ... lógica de fetch similar ao registrar ...
  showLoading(false);
  alert("Dados atualizados, shounen!");
}

async function editarAvatar(){

  showLoading(true);

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({action:"listarAvatares"})
  });

  const data = await res.json();
  showLoading(false);

  const imgs = data.lista.map(url=>`
    <img src="${url}" class="avatarPick"
      onclick="selecionarAvatar('${url}')">
  `).join("");

  const html = `
    <div class="modal">
      <div class="modalBox modalScroll">
        <h3>Escolha seu avatar</h3>
        <div class="avatarGrid">${imgs}</div>
        <button onclick="fecharModal()">Fechar</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);
}

async function selecionarAvatar(url){

  showLoading(true);

  await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({
      action:"salvarAvatar",
      usuario: usuarioLogado.Usuario,
      url
    })
  });

  showLoading(false);
  fecharModal();
  fecharModal();
  iniciarHome();
}
/* ================= RENDER TREINOS ================= */

function renderTreinos(lista){
  if(!lista || lista.length===0){
    meusTreinosBox.innerHTML = "Nenhum treino ainda.";
    return;
  }

  meusTreinosBox.innerHTML = lista.map(t=>`
    <div class="cardTreino" onclick='abrirTreino(${JSON.stringify(t)})'>
      ⚡ ${t.NomeTreino}
    </div>
  `).join("");
}

/* ================= NOVO TREINO ================= */

async function abrirNovoTreino(){
  showLoading(true);

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({action:"listarExercicios"})
  });

  const data = await res.json();
  showLoading(false);

  const lista = data.exercicios.map(e=>`
    <label class="checkItem">
      <input type="checkbox" value="${e.Exercício}">
      ${e.Exercício}
    </label>
  `).join("");

  const html = `
    <div class="modal">
      <div class="modalBox modalScroll">

        <h3>Novo Treinamento</h3>

        <input id="novoNome" placeholder="Nome do Treino">

        <input id="novoDescanso" placeholder="Descanso (seg)">
        <input id="novoReps" placeholder="Repetições">
        <input id="novoDuracao" placeholder="Duração total (min)">

        <h4>Selecionar técnicas</h4>
        <input id="buscaEx" placeholder="Buscar exercício" oninput="filtrarExercicios()">

        <div id="listaEx" class="listaExercicios">
          ${lista}
        </div>

        <button onclick="salvarTreino()">Salvar</button>
        <button onclick="fecharModal()">Cancelar</button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);
}
/* ================= SALVAR TREINO ================= */

async function salvarTreino(){

  const checks = [...document.querySelectorAll("#listaEx input:checked")];

  if(checks.length === 0){
    alert("⚠️ Selecione pelo menos uma técnica, shounen!");
    return;
  }

  if(!novoNome.value){
    alert("⚠️ Defina um nome para o treino.");
    return;
  }

  const exercicios = checks.map(c=>c.value).join(",");

  showLoading(true);

  await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({
      action:"salvarTreino",
      usuario: usuarioLogado.Usuario,
      nome: novoNome.value,
      exercicios,
      descanso: novoDescanso.value,
      repeticoes: novoReps.value,
      duracao: novoDuracao.value
    })
  });

  showLoading(false);
  fecharModal();
  carregarHome();
}

function filtrarExercicios(){
  const termo = buscaEx.value.toLowerCase();
  document.querySelectorAll("#listaEx label").forEach(l=>{
    l.style.display =
      l.textContent.toLowerCase().includes(termo)
        ? "block"
        : "none";
  });
}
/* ================= MODAL ================= */

function fecharModal(){
  document.querySelector(".modal")?.remove();
}

/* ================= ABRIR TREINO ================= */

function abrirTreino(treino){
  treinoAtual = treino;
  exercicioIndex = 0;

  const lista = treino.Exercicios.split(",")
    .map(e=>`<li>${e}</li>`).join("");

  const html = `
    <div class="modal">
      <div class="modalBox">

        <h2>${treino.NomeTreino}</h2>
        <p>Duração: ${treino.Duracao} min</p>
        <p>Repetições: ${treino.Repeticoes}</p>
        <p>Descanso: ${treino.Descanso}s</p>

        <button onclick="modoEvolucao()">🚀 Modo evolução</button>

        <ul>${lista}</ul>

        <button onclick="fecharModal()">Fechar</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);
}

/* ================= MODO EVOLUÇÃO ================= */

async function modoEvolucao(){
  fecharModal();

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({
      action:"detalharExercicios",
      nomes: treinoAtual.Exercicios
    })
  });

  const data = await res.json();
  treinoAtual.listaDetalhada = data.lista;

  iniciarExercicio();
}

function iniciarExercicio(){
  if(exercicioIndex >= treinoAtual.listaDetalhada.length){
    finalizarTreino();
    return;
  }

  const ex = treinoAtual.listaDetalhada[exercicioIndex];
  tempoRestante = treinoAtual.Repeticoes * 2;

  const html = `
    <div class="modal">
      <div class="modalBox">

        <img src="${ex.GifLink}" style="width:200px">
        <h2>${ex.Exercício}</h2>
        <h3 id="timerEx">${tempoRestante}</h3>

        <button onclick="pausarTimer()">Pausa</button>
        <button onclick="pularExercicio()">Pular</button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  timer = setInterval(()=>{
    tempoRestante--;
    timerEx.textContent = tempoRestante;

    if(tempoRestante<=0){
      clearInterval(timer);
      descanso();
    }
  },1000);
}

function pausarTimer(){
  clearInterval(timer);
}

function pularExercicio(){
  clearInterval(timer);
  exercicioIndex++;
  fecharModal();
  iniciarExercicio();
}

function descanso(){
  fecharModal();

  tempoRestante = treinoAtual.Descanso;

  const html = `
    <div class="modal">
      <div class="modalBox">
        <h2>Repouse um pouco, guerreiro shounen</h2>
        <h3 id="timerDesc">${tempoRestante}</h3>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  timer = setInterval(()=>{
    tempoRestante--;
    timerDesc.textContent = tempoRestante;

    if(tempoRestante<=0){
      clearInterval(timer);
      exercicioIndex++;
      fecharModal();
      iniciarExercicio();
    }
  },1000);
}

async function finalizarTreino(){
  fecharModal();

  await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({
      action:"finalizarTreino",
      usuario: usuarioLogado.Usuario,
      qtdExercicios: treinoAtual.listaDetalhada.length
    })
  });

  alert("Muito bem, shounen. Seu treinamento de hoje foi muito bom!");
  carregarHome();
}
