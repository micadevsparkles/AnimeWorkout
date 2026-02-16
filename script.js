// URL da API do Apps Script (substitua pela sua após implantar)
const API_URL = "https://script.google.com/macros/s/AKfycbzTWreT5oZEi_pDJVPQPU6nSV8OJrwTrZ1vqJyUJG6XIP1qVdwFilvW2-oWPGxILEy9/exec"; 

// API KEY do Google Gemini (Substitua pela sua)
const GEMINI_API_KEY = "SUA_API_KEY_GEMINI_AQUI"; 

// Estado Global
let currentUser = null;
let allExercises = [];
let availableAvatars = [];
let currentWorkout = null;
let workoutInterval = null;
let isPaused = false;
let currentExerciseIndex = 0;
let remainingTime = 0;

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados iniciais (Exercicios e Treinos Padrao)
    fetchData();
});

function showScreen(screenId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('section').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    target.classList.add('active');

    // Headers
    if (screenId === 'login-screen' || screenId === 'signup-screen') {
        document.getElementById('app-header').classList.add('hidden');
        document.getElementById('ai-fab').classList.add('hidden');
    } else {
        document.getElementById('app-header').classList.remove('hidden');
        document.getElementById('ai-fab').classList.remove('hidden');
        if(screenId === 'dashboard-screen') loadDashboard();
        if(screenId === 'profile-screen') loadProfile();
    }
}

// --- Autenticação ---

function checkUsername() {
    const user = document.getElementById('reg-user').value;
    const btn = document.getElementById('btn-create-acc');
    const errorSpan = document.getElementById('user-error');
    
    if (user.length < 4) {
        btn.disabled = true;
        errorSpan.textContent = "Mínimo 4 caracteres";
        return;
    }

    fetch(`${API_URL}?op=checkUser&user=${user}`)
    .then(r => r.json())
    .then(data => {
        if (data.exists) {
            btn.disabled = true;
            errorSpan.textContent = "Usuário já existe!";
        } else {
            btn.disabled = false;
            errorSpan.textContent = "";
        }
    });
}

function signup() {
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;
    
    const data = {
        op: 'signup',
        username: user,
        password: pass,
        weight: document.getElementById('reg-weight').value,
        height: document.getElementById('reg-height').value,
        age: document.getElementById('reg-age').value,
        gender: document.getElementById('reg-gender').value,
        goal: document.getElementById('reg-goal').value
    };

    fetch(API_URL, {method: 'POST', body: JSON.stringify(data)})
    .then(r => r.json())
    .then(res => {
        if(res.status === 'success') {
            alert('Conta criada!');
            showScreen('login-screen');
        }
    });
}

function login() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    fetch(`${API_URL}?op=login&user=${user}&pass=${pass}`)
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            currentUser = data.user;
            availableAvatars = data.avatars;
            updateHeaderAvatar();
            showScreen('dashboard-screen');
            fetchData(); // Recarrega dados para pegar "Meus Treinos"
        } else {
            alert('Login falhou. Verifique os dados.');
        }
    });
}

// --- Dashboard e Dados ---

function fetchData() {
    fetch(`${API_URL}?op=getData`)
    .then(r => r.json())
    .then(data => {
        allExercises = data.exercises;
        renderStandardWorkouts(data.standardWorkouts);
        if(currentUser) renderMyWorkouts(data.allUserWorkouts);
    });
}

function renderStandardWorkouts(workouts) {
    const container = document.getElementById('standard-workouts-container');
    container.innerHTML = '';
    workouts.forEach(w => {
        const div = document.createElement('div');
        div.className = 'workout-card';
        div.innerHTML = `<h4>${w.name}</h4><small>Padrão</small>`;
        div.onclick = () => openWorkoutDetail(w);
        container.appendChild(div);
    });
}

function renderMyWorkouts(allWorkouts) {
    const container = document.getElementById('my-workouts-container');
    container.innerHTML = '';
    // Filtra treinos do usuario logado
    const myWorkouts = allWorkouts.filter(w => w.user === currentUser.username);
    
    myWorkouts.forEach(w => {
        const div = document.createElement('div');
        div.className = 'workout-card';
        div.innerHTML = `<h4>${w.name}</h4><small>Personalizado</small>`;
        div.onclick = () => openWorkoutDetail(w);
        container.appendChild(div);
    });
}

// --- Profile e Imagem ---

function updateHeaderAvatar() {
    const img = document.getElementById('header-avatar');
    const txt = document.getElementById('header-initial');
    
    // Se icon for url de imagem
    if (currentUser.icon && currentUser.icon.length > 5) {
        img.src = currentUser.icon;
        img.classList.remove('hidden');
        txt.classList.add('hidden');
    } else {
        img.classList.add('hidden');
        txt.classList.remove('hidden');
        txt.textContent = currentUser.username.charAt(0).toUpperCase();
    }
}

function toggleProfileMenu() {
    showScreen('profile-screen');
}

function loadProfile() {
    document.getElementById('profile-username').textContent = currentUser.username;
    
    // Preenche campos de edição
    document.getElementById('edit-weight').value = currentUser.weight;
    document.getElementById('edit-height').value = currentUser.height;
    document.getElementById('edit-goal').value = currentUser.goal;
    
    // Avatar
    const img = document.getElementById('profile-avatar');
    if (currentUser.icon && currentUser.icon.length > 5) img.src = currentUser.icon;
    
    calculateBMI();
}

function calculateBMI() {
    const h = parseFloat(currentUser.height) / 100;
    const w = parseFloat(currentUser.weight);
    if(h && w) {
        const bmi = (w / (h*h)).toFixed(1);
        document.getElementById('imc-value').textContent = bmi;
        
        let desc = "";
        if(bmi < 18.5) desc = "Abaixo do peso";
        else if(bmi < 24.9) desc = "Peso ideal";
        else desc = "Sobrepeso";
        
        // Ajuste baseado no objetivo
        if (currentUser.goal === 'Massa Muscular' && bmi > 25) desc += " (Bulking?)";
        
        document.getElementById('imc-desc').textContent = desc;
    }
}

function openAvatarSelector() {
    const modal = document.getElementById('avatar-modal');
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = '';
    
    availableAvatars.forEach(url => {
        const img = document.createElement('img');
        img.src = url.trim();
        img.className = 'grid-avatar';
        img.onclick = () => {
            currentUser.icon = url.trim();
            document.getElementById('profile-avatar').src = url.trim();
            closeAvatarModal();
        };
        grid.appendChild(img);
    });
    
    modal.classList.remove('hidden');
}

function closeAvatarModal() {
    document.getElementById('avatar-modal').classList.add('hidden');
}

function saveProfileChanges() {
    currentUser.weight = document.getElementById('edit-weight').value;
    currentUser.height = document.getElementById('edit-height').value;
    currentUser.goal = document.getElementById('edit-goal').value;

    const data = {
        op: 'updateProfile',
        username: currentUser.username,
        icon: currentUser.icon,
        weight: currentUser.weight,
        height: currentUser.height,
        age: currentUser.age,
        goal: currentUser.goal
    };

    fetch(API_URL, {method: 'POST', body: JSON.stringify(data)})
    .then(() => {
        alert('Perfil atualizado!');
        calculateBMI();
        updateHeaderAvatar();
    });
}

// --- Criação de Treino ---

function openCreateWorkout() {
    showScreen('create-workout-screen');
    const list = document.getElementById('exercise-list-selection');
    list.innerHTML = '';
    
    allExercises.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'exercise-check-item';
        div.innerHTML = `
            <input type="checkbox" value="${ex.name}" class="ex-checkbox">
            <span>${ex.name} (${ex.category})</span>
        `;
        list.appendChild(div);
    });
}

function filterExercises() {
    const term = document.getElementById('exercise-search').value.toLowerCase();
    const items = document.querySelectorAll('.exercise-check-item');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

function saveNewWorkout() {
    const name = document.getElementById('new-workout-name').value;
    const checkboxes = document.querySelectorAll('.ex-checkbox:checked');
    const selectedEx = Array.from(checkboxes).map(cb => cb.value);
    
    if(!name || selectedEx.length === 0) {
        alert("Preencha o nome e selecione exercícios.");
        return;
    }

    const data = {
        op: 'createWorkout',
        username: currentUser.username,
        workoutName: name,
        exercises: selectedEx,
        restTime: document.getElementById('new-rest').value || 30,
        reps: document.getElementById('new-reps').value || 10,
        duration: document.getElementById('new-duration').value || 45
    };

    fetch(API_URL, {method: 'POST', body: JSON.stringify(data)})
    .then(() => {
        alert("Treino Criado!");
        fetchData(); // Recarrega para aparecer na lista
        showScreen('dashboard-screen');
    });
}

// --- Detalhes e Execução do Treino ---

function openWorkoutDetail(workout) {
    currentWorkout = workout;
    showScreen('workout-detail-screen');
    
    document.getElementById('detail-title').textContent = workout.name;
    document.getElementById('detail-reps').textContent = workout.reps;
    document.getElementById('detail-duration').textContent = workout.duration;
    
    const list = document.getElementById('detail-exercise-list');
    list.innerHTML = '';
    
    // Tratamento se exercises for string (do sheets) ou array
    let exNames = [];
    if (typeof workout.exercises === 'string') {
        exNames = workout.exercises.split(',').map(s => s.trim());
    } else {
        exNames = workout.exercises;
    }

    exNames.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        list.appendChild(li);
    });
}

function startWorkout() {
    showScreen('execution-screen');
    currentExerciseIndex = 0;
    
    // Contagem Inicial
    const overlay = document.getElementById('start-countdown-overlay');
    const countEl = document.getElementById('start-count');
    overlay.classList.remove('hidden');
    let count = 5;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countEl.textContent = count;
        } else {
            countEl.textContent = "COMECE!";
            clearInterval(interval);
            setTimeout(() => {
                overlay.classList.add('hidden');
                runExercise();
            }, 1000);
        }
    }, 1000);
}

function runExercise() {
    document.getElementById('rest-ui').classList.add('hidden');
    document.getElementById('active-workout-ui').classList.remove('hidden');
    
    // Parse exercícios
    let exNames = typeof currentWorkout.exercises === 'string' ? currentWorkout.exercises.split(',') : currentWorkout.exercises;
    
    if (currentExerciseIndex >= exNames.length) {
        finishWorkout();
        return;
    }

    const exName = exNames[currentExerciseIndex].trim();
    // Achar o objeto completo do exercício para pegar o GIF
    const exObj = allExercises.find(e => e.name === exName) || {gif: '', name: exName};

    document.getElementById('exec-name').textContent = exObj.name;
    document.getElementById('exec-gif').src = exObj.gif;
    document.getElementById('exec-reps-display').textContent = `x ${currentWorkout.reps}`;

    remainingTime = parseInt(currentWorkout.duration);
    updateTimerDisplay();
    isPaused = false;
    document.getElementById('btn-pause').textContent = "Pause";

    clearInterval(workoutInterval);
    workoutInterval = setInterval(() => {
        if (!isPaused) {
            remainingTime--;
            updateTimerDisplay();
            if (remainingTime <= 0) {
                clearInterval(workoutInterval);
                startRest();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const min = Math.floor(remainingTime / 60);
    const sec = remainingTime % 60;
    document.getElementById('exec-timer').textContent = `${min < 10 ? '0'+min : min}:${sec < 10 ? '0'+sec : sec}`;
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('btn-pause').textContent = isPaused ? "Continuar" : "Pause";
}

function nextExercise() {
    clearInterval(workoutInterval);
    startRest();
}

function startRest() {
    document.getElementById('active-workout-ui').classList.add('hidden');
    document.getElementById('rest-ui').classList.remove('hidden');
    
    let exNames = typeof currentWorkout.exercises === 'string' ? currentWorkout.exercises.split(',') : currentWorkout.exercises;
    
    // Verifica se tem proximo
    if (currentExerciseIndex + 1 >= exNames.length) {
        finishWorkout();
        return;
    }

    document.getElementById('next-exercise-name').textContent = exNames[currentExerciseIndex + 1];
    
    let restTime = parseInt(currentWorkout.rest);
    const restTimerEl = document.getElementById('rest-timer');
    restTimerEl.textContent = restTime;

    const restInt = setInterval(() => {
        restTime--;
        restTimerEl.textContent = restTime;
        if (restTime <= 0) {
            clearInterval(restInt);
            currentExerciseIndex++;
            runExercise();
        }
    }, 1000);
}

function finishWorkout() {
    clearInterval(workoutInterval);
    document.getElementById('active-workout-ui').classList.add('hidden');
    document.getElementById('rest-ui').classList.add('hidden');
    document.getElementById('finish-ui').classList.remove('hidden');
}

function restartWorkout() {
    document.getElementById('finish-ui').classList.add('hidden');
    startWorkout();
}

// --- AI Chat (Gemini) ---

function toggleAIChat() {
    const chat = document.getElementById('ai-chat-window');
    chat.classList.toggle('hidden');
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value;
    if(!text) return;

    addMessage('user', text);
    input.value = '';

    // Contexto do treino atual
    let context = "Você é um treinador pessoal chamado Sensei IA. O usuário está no app Anime Workout.";
    if (currentWorkout && !document.getElementById('execution-screen').classList.contains('hidden')) {
        context += ` O usuário está fazendo o treino ${currentWorkout.name}.`;
    }

    const prompt = `${context} O usuário pergunta: ${text}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                contents: [{parts: [{text: prompt}]}]
            })
        });
        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        addMessage('ai', aiResponse);
    } catch (e) {
        addMessage('ai', 'Desculpe, estou com problemas de conexão. Tente novamente.');
        console.error(e);
    }
}

function addMessage(sender, text) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.textContent = text;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}
