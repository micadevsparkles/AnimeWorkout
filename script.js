const API_URL = "https://script.google.com/macros/s/AKfycbzSrH34fEhupCcVRpqHKNWv76brXzASJap4QN4Xa_a2ksQfnp_wwvHfRxX0rHdVGjFm/exec";

let usuarioLogado = null;

/* ========= UI ========= */

function showLoading(v){
  document.getElementById("loading").classList.toggle("hidden", !v);
}

function trocarTela(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function mostrarCadastro(){ trocarTela("cadastroScreen"); }
function mostrarLogin(){ trocarTela("loginScreen"); }

/* ========= LOGIN ========= */

async function login(){
  const usuario = loginUsuario.value.trim();
  const senha = loginSenha.value.trim();

  showLoading(true);

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify({
      action:"login",
      usuario,
      senha
    })
  });

  const data = await res.json();
  showLoading(false);

  if(!data.existe){
    loginMsg.textContent = "Usuário não existe.";
    return;
  }

  if(!data.senhaCorreta){
    loginMsg.textContent = "Senha incorreta.";
    return;
  }

  usuarioLogado = data.user;
  iniciarHome();
}

/* ========= CADASTRO ========= */

async function registrar(){
  showLoading(true);

  const payload = {
    action:"registrar",
    usuario: cadUsuario.value,
    senha: cadSenha.value,
    peso: cadPeso.value,
    altura: cadAltura.value,
    idade: cadIdade.value,
    genero: cadGenero.value,
    objetivo: cadObjetivo.value
  };

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify(payload)
  });

  await res.json();
  showLoading(false);

  cadMsg.textContent = "Usuário registrado com sucesso, faça login";

  setTimeout(()=>{
    mostrarLogin();
  },1500);
}

/* ========= HOME ========= */

function iniciarHome(){
  trocarTela("homeScreen");

  welcomeUser.textContent = "Bem-vindo, " + usuarioLogado.Usuario;

  // avatar
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
      action:"carregarHome",
      usuario: usuarioLogado.Usuario
    })
  });

  const data = await res.json();
  showLoading(false);

  missaoBox.textContent = data.missao || "Nenhuma missão hoje.";
  padraoBox.textContent = data.padrao || "Nenhum treino padrão.";
  meusTreinosBox.textContent = data.meus || "Nenhum treino ainda.";
}

/* ========= PLACEHOLDERS FUTUROS ========= */

function abrirConta(){
  alert("Tela Minha Conta — ETAPA 2");
}

function abrirNovoTreino(){
  alert("Criar treino — ETAPA 2");
}
