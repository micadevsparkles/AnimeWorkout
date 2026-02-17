const API_URL = "https://script.google.com/macros/s/AKfycbzOTUzFDPnxr-a3ZYAvMhfy1s1QkDwLGpaF0JNTOv1d07273mvKURbOjQyYdzgN5uA3/exec";

// --- Estado Global ---
let currentUser = null;
let allExercises = [];
let availableAvatars = [];
let myWorkouts = [];
let defaultWorkouts = [];
let currentWorkoutSession = null;
let timerInterval = null;
let isPaused = false;
let execIndex = 0;
let timeLeft = 0;

// --- Navegação ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    
    const header = document.getElementById('app-header');
    if (id === 'execution-screen' || id === 'login-screen' || id === 'register-screen') {
        header?.classList.add('hidden');
    } else {
        header?.classList.remove('hidden');
    }
}

function showLogin() { showScreen('login-screen'); }
function showRegister() { showScreen('register-screen'); }
function showHome() { 
    showScreen('home-screen'); 
    renderWorkouts();
    updateHeaderAvatar();
}

function showMyAccount() {
    showScreen('account-screen');
    loadProfileData();
}

// --- Autenticação ---
async function handleLogin() {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    if(!u || !p) return alert("Preencha usuário e senha");

    try {
        const res = await fetch(`${API_URL}?action=login&user=${u}&pass=${p}`).then(r => r.json());
        if(res.status === 'success') {
            currentUser = res.userData;
            currentUser.pass = p; 
            await loadAppData();
            showHome();
        } else {
            alert(res.message);
        }
    } catch(e) { alert("Erro de conexão."); }
}

async function checkUsername() {
    const u = document.getElementById('reg-user').value;
    const btn = document.getElementById('btn-create-acc');
    const warn = document.getElementById('user-warning');
    if(u.length < 4) {
        warn.innerText = "Mínimo 4 caracteres";
        btn.disabled = true;
        return;
    }
    const res = await fetch(`${API_URL}?action=checkUser&user=${u}`).then(r => r.json());
    if(res.exists) { warn.innerText = "Usuário já existe"; btn.disabled = true; } 
    else { warn.innerText = ""; btn.disabled = false; }
}

async function handleRegister() {
    const data = {
        action: 'register',
        user: document.getElementById('reg-user').value,
        pass: document.getElementById('reg-pass').value,
        weight: document.getElementById('reg-weight').value,
        height: document.getElementById('reg-height').value,
        age: document.getElementById('reg-age').value,
        gender: document.getElementById('reg-gender').value,
        goal: document.getElementById('reg-goal').value
    };
    const res = await fetch(API_URL, { method: 'POST', body: new URLSearchParams(data) }).then(r => r.json());
    if(res.status === 'success') { alert("Conta criada!"); showLogin(); }
    else { alert("Erro: " + res.message); }
}

// --- Dados & App ---
async function loadAppData() {
    const res = await fetch(`${API_URL}?action=getData&user=${currentUser.user}`).then(r => r.json());
    allExercises = res.exercises || [];
    defaultWorkouts = res.defaultWorkouts || [];
    myWorkouts = res.myWorkouts || [];
    availableAvatars = res.avatars || [];
}

function renderWorkouts() {
    const defContainer = document.getElementById('default-workouts-container');
    const myContainer = document.getElementById('my-workouts-container');
    if(!defContainer || !myContainer) return;

    defContainer.innerHTML = '';
    myContainer.innerHTML = '';

    const createCard = (w) => {
        const div = document.createElement('div');
        div.className = 'workout-card';
        div.innerHTML = `<h4>${w.name}</h4><small>${w.dur} min / ${w.reps} reps</small>`;
        div.onclick = () => openWorkoutDetail(w);
        return div;
    };

    defaultWorkouts.forEach(w => defContainer.appendChild(createCard(w)));
    myWorkouts.forEach(w => myContainer.appendChild(createCard(w)));
}

function updateHeaderAvatar() {
    const img = document.getElementById('header-avatar');
    const init = document.getElementById('header-initial');
    if(!img || !init) return;
    if(currentUser.icon) {
        img.src = currentUser.icon;
        img.style.display = 'block';
        init.style.display = 'none';
    } else {
        img.style.display = 'none';
        init.style.display = 'block';
        init.innerText = currentUser.user[0].toUpperCase();
    }
}

// --- Perfil ---
function loadProfileData() {
    document.getElementById('profile-user-name').innerText = currentUser.user;
    document.getElementById('edit-user').value = currentUser.user;
    document.getElementById('edit-pass').value = currentUser.pass || "";
    document.getElementById('edit-weight').value = currentUser.weight || "";
    document.getElementById('edit-height').value = currentUser.height || "";
    document.getElementById('edit-age').value = currentUser.age || "";
    document.getElementById('edit-gender').value = currentUser.gender || "M";
    document.getElementById('edit-goal').value = currentUser.goal || "Emagrecer";
    document.getElementById('profile-avatar').src = currentUser.icon || "https://via.placeholder.com/100?text=User";

    const h = parseFloat(currentUser.height);
    const w = parseFloat(currentUser.weight);
    if(h > 0 && w > 0) {
        const imc = (w / (h * h)).toFixed(2);
        document.getElementById('imc-display').innerText = imc;
        const idealMin = (18.5 * (h * h)).toFixed(1);
        const idealMax = (24.9 * (h * h)).toFixed(1);
        document.getElementById('imc-ideal').innerText = `Peso Ideal: ${idealMin}kg - ${idealMax}kg`;
    }
}

async function saveProfileChanges() {
    const data = {
        action: 'updateProfile',
        user: currentUser.user,
        pass: document.getElementById('edit-pass').value,
        weight: document.getElementById('edit-weight').value,
        height: document.getElementById('edit-height').value,
        age: document.getElementById('edit-age').value,
        gender: document.getElementById('edit-gender').value,
        goal: document.getElementById('edit-goal').value
    };

    await fetch(API_URL, { method: 'POST', body: new URLSearchParams(data) });
    currentUser = {...currentUser, ...data};
    alert("Perfil salvo!");
    loadProfileData();
    updateHeaderAvatar();
}

function openAvatarSelector() {
    const modal = document.getElementById('avatar-modal');
    const list = document.getElementById('avatar-list');
    list.innerHTML = '';
    availableAvatars.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.onclick = async () => {
            currentUser.icon = url;
            modal.classList.add('hidden');
            document.getElementById('profile-avatar').src = url;
            updateHeaderAvatar();
            await fetch(API_URL, { method: 'POST', body: new URLSearchParams({ action: 'updateProfile', user: currentUser.user, icon: url }) });
        };
        list.appendChild(img);
    });
    modal.classList.remove('hidden');
}

function closeAvatarModal() { document.getElementById('avatar-modal').classList.add('hidden'); }

// --- Detalhes do Treino ---
function openWorkoutDetail(workout) {
    currentWorkoutSession = JSON.parse(JSON.stringify(workout));
    document.getElementById('detail-title').innerText = workout.name;
    document.getElementById('detail-reps').innerText = workout.reps;
    document.getElementById('detail-dur').innerText = workout.dur;
    
    const list = document.getElementById('detail-exercise-list');
    list.innerHTML = '';

    let exercises = [];
    if (typeof workout.list === 'string') {
        exercises = workout.list.startsWith('[') ? JSON.parse(workout.list) : workout.list.split(',').map(i => i.trim());
    } else { exercises = workout.list; }

    currentWorkoutSession.parsedExercises = exercises;
    exercises.forEach(exName => {
        const li = document.createElement('li');
        li.innerText = exName;
        list.appendChild(li);
    });
    showScreen('workout-detail-screen');
}

// --- Criar Treino ---
function showCreateWorkout() {
    showScreen('create-workout-screen');
    const list = document.getElementById('exercise-selection-list');
    list.innerHTML = '';
    allExercises.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'select-item';
        div.innerHTML = `<input type="checkbox" value="${ex.name}"> <span>${ex.name}</span>`;
        list.appendChild(div);
    });
}

function filterExercises() {
    const term = document.getElementById('search-exercise').value.toLowerCase();
    document.querySelectorAll('.select-item').forEach(div => {
        div.style.display = div.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
    });
}

async function submitNewWorkout() {
    const name = document.getElementById('new-workout-name').value;
    const reps = document.getElementById('new-reps').value;
    const dur = document.getElementById('new-dur').value;
    const rest = document.getElementById('new-rest').value;
    const selected = [];
    document.querySelectorAll('#exercise-selection-list input:checked').forEach(c => selected.push(c.value));
    
    if(!name || selected.length === 0) return alert("Preencha o nome e escolha exercícios");

    await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({ action: 'saveWorkout', user: currentUser.user, name, exercises: JSON.stringify(selected), reps, duration: dur, rest })
    });
    alert("Treino salvo!");
    await loadAppData();
    showHome();
}

// --- Execução do Treino ---
function startWorkoutSession() {
    showScreen('execution-screen');
    execIndex = 0;
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('rest-screen').classList.add('hidden');
    startCountdown();
}

function startCountdown() {
    const overlay = document.getElementById('start-countdown');
    const num = document.getElementById('start-count-number');
    overlay.classList.remove('hidden');
    let count = 5;
    num.innerText = count;
    const int = setInterval(() => {
        count--;
        if(count > 0) num.innerText = count;
        else {
            num.innerText = "GO!";
            clearInterval(int);
            setTimeout(() => { overlay.classList.add('hidden'); runExercise(); }, 1000);
        }
    }, 1000);
}

function runExercise() {
    if(execIndex >= currentWorkoutSession.parsedExercises.length) {
        finishWorkout();
        return;
    }
    const exName = currentWorkoutSession.parsedExercises[execIndex];
    const exData = allExercises.find(e => e.name.toLowerCase() === exName.toLowerCase()) || { gif: '' };

    document.getElementById('exec-name').innerText = exName;
    document.getElementById('exec-reps').innerText = currentWorkoutSession.reps;
    document.getElementById('exec-gif').src = exData.gif || 'https://via.placeholder.com/300?text=Sem+Gif';
    
    timeLeft = Math.floor(parseFloat(currentWorkoutSession.dur) * 60);
    updateTimerDisplay(timeLeft, 'exec-timer');
    
    isPaused = false;
    document.getElementById('btn-pause').innerText = "Pausar";
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if(!isPaused) {
            timeLeft--;
            updateTimerDisplay(timeLeft, 'exec-timer');
            if(timeLeft <= 0) { clearInterval(timerInterval); startRest(); }
        }
    }, 1000);
}

function skipExercise() {
    clearInterval(timerInterval);
    document.getElementById('rest-screen').classList.add('hidden');
    execIndex++;
    runExercise();
}

function startRest() {
    const restScreen = document.getElementById('rest-screen');
    if (execIndex >= currentWorkoutSession.parsedExercises.length - 1) {
        finishWorkout();
        return;
    }
    restScreen.classList.remove('hidden');
    const nextEx = currentWorkoutSession.parsedExercises[execIndex + 1];
    document.getElementById('next-exercise-name').innerText = nextEx;
    let restTime = parseInt(currentWorkoutSession.rest) || 10;
    updateTimerDisplay(restTime, 'rest-timer');

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if(!isPaused) {
            restTime--;
            updateTimerDisplay(restTime, 'rest-timer');
            if(restTime <= 0) {
                clearInterval(timerInterval);
                restScreen.classList.add('hidden');
                execIndex++;
                runExercise();
            }
        }
    }, 1000);
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('btn-pause').innerText = isPaused ? "Retomar" : "Pausar";
}

function updateTimerDisplay(sec, elemId) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    const el = document.getElementById(elemId);
    if(el) el.innerText = `${m}:${s}`;
}

function finishWorkout() { 
    clearInterval(timerInterval);
    document.getElementById('end-screen').classList.remove('hidden'); 
}
function restartWorkout() { startWorkoutSession(); }
function exitWorkout() { showHome(); }
