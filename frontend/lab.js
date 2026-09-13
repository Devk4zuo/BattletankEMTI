/*
 * BATTLE TANK EMTI - Programação do Tanque
 * Professor Kazuo
 *
 * O aluno escolhe UMA linguagem por partida, escreve até 5 funções
 * permitidas no mesmo programa, valida e finaliza. Depois de finalizar,
 * o laboratório fica bloqueado até a próxima partida.
 */

const MAX_ACTIVE_FUNCTIONS = 5;
const PLAYER_STORAGE_KEY = "battleTankPlayer";
const LAB_DRAFTS_KEY = "battleTankProgramDraftsV6";
const PROGRAM_ACCESS_KEY = "battleTankProgrammingAccess";
const LAB_RETURN_KEY = "battleTankLabReturn";

const params = new URLSearchParams(window.location.search);
const roomCode = (params.get("room") || "").trim();

const editor = document.getElementById("codeEditor");
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");
const validateButton = document.getElementById("validateButton");
const finalizeButton = document.getElementById("finalizeButton");
const confirmFinalize = document.getElementById("confirmFinalize");
const cancelFinalize = document.getElementById("cancelFinalize");
const chooseJavascript = document.getElementById("chooseJavascript");
const choosePython = document.getElementById("choosePython");
const pythonChoiceStatus = document.getElementById("pythonChoiceStatus");
const languageModal = document.getElementById("languageModal");
const confirmModal = document.getElementById("confirmModal");
const blockedOverlay = document.getElementById("blockedOverlay");
const blockedTitle = document.getElementById("blockedTitle");
const blockedMessage = document.getElementById("blockedMessage");
const languageLockedBadge = document.getElementById("languageLockedBadge");
const functionCatalog = document.getElementById("functionCatalog");
const activeFunctions = document.getElementById("activeFunctions");
const validationResults = document.getElementById("validationResults");
const validationStatus = document.getElementById("validationStatus");
const slotCounter = document.getElementById("slotCounter");
const consoleArea = document.getElementById("console");
const finalSummary = document.getElementById("finalSummary");
const fileName = document.getElementById("fileName");

const tankPreview = document.getElementById("tankPreview");
const speedValue = document.getElementById("speedValue");
const bulletSpeedValue = document.getElementById("bulletSpeedValue");
const fireRateValue = document.getElementById("fireRateValue");
const bulletCountValue = document.getElementById("bulletCountValue");
const damageValue = document.getElementById("damageValue");
const maxLifeValue = document.getElementById("maxLifeValue");
const reductionValue = document.getElementById("reductionValue");
const regenValue = document.getElementById("regenValue");

const FUNCTION_CATALOG = [
    { id:"motor2", category:"MOTOR", label:"Potência do motor", effect:"Velocidade +0,4", js:"potenciaMotor", py:"potencia_motor", jsSig:"potenciaMotor(potencia)", pySig:"potencia_motor(potencia)", tests:[{args:[2],expected:4},{args:[17],expected:34}], effectData:{speed:0.4} },
    { id:"turbo", category:"MOTOR", label:"Turbo", effect:"Velocidade +0,55", js:"ativarTurbo", py:"ativar_turbo", jsSig:"ativarTurbo(velocidade)", pySig:"ativar_turbo(velocidade)", tests:[{args:[4],expected:6},{args:[9],expected:11}], effectData:{speed:0.55} },
    { id:"tracao", category:"MOTOR", label:"Tração otimizada", effect:"Velocidade +0,25", js:"melhorarTracao", py:"melhorar_tracao", jsSig:"melhorarTracao(nivel)", pySig:"melhorar_tracao(nivel)", tests:[{args:[3],expected:4},{args:[8],expected:9}], effectData:{speed:0.25} },
    { id:"peso", category:"MOTOR", label:"Redução de peso", effect:"Velocidade +0,30", js:"reduzirPeso", py:"reduzir_peso", jsSig:"reduzirPeso(peso)", pySig:"reduzir_peso(peso)", tests:[{args:[100],expected:90},{args:[65],expected:55}], effectData:{speed:0.30} },
    { id:"eficiencia", category:"MOTOR", label:"Eficiência do motor", effect:"Velocidade +0,20", js:"eficienciaMotor", py:"eficiencia_motor", jsSig:"eficienciaMotor(consumo)", pySig:"eficiencia_motor(consumo)", tests:[{args:[100],expected:90},{args:[50],expected:45}], effectData:{speed:0.20} },
    { id:"proteger_motor", category:"MOTOR", label:"Proteção térmica", effect:"Velocidade +0,15", js:"protegerMotor", py:"proteger_motor", jsSig:"protegerMotor(temperatura)", pySig:"proteger_motor(temperatura)", tests:[{args:[95],expected:80},{args:[70],expected:70}], effectData:{speed:0.15} },

    { id:"bullet2", category:"MUNIÇÃO", label:"Projétil veloz", effect:"Vel. do tiro +4", js:"velocidadeProjetil", py:"velocidade_projetil", jsSig:"velocidadeProjetil(velocidade)", pySig:"velocidade_projetil(velocidade)", tests:[{args:[13],expected:17},{args:[7],expected:11}], effectData:{bulletSpeed:4} },
    { id:"propulsao", category:"MUNIÇÃO", label:"Propulsão do projétil", effect:"Vel. do tiro +2", js:"propulsaoProjetil", py:"propulsao_projetil", jsSig:"propulsaoProjetil(velocidade)", pySig:"propulsao_projetil(velocidade)", tests:[{args:[10],expected:12},{args:[15],expected:18}], effectData:{bulletSpeed:2} },
    { id:"municao_leve", category:"MUNIÇÃO", label:"Munição leve", effect:"Vel. do tiro +1,5", js:"municaoLeve", py:"municao_leve", jsSig:"municaoLeve(velocidade)", pySig:"municao_leve(velocidade)", tests:[{args:[8],expected:10},{args:[13],expected:15}], effectData:{bulletSpeed:1.5} },
    { id:"pressao", category:"MUNIÇÃO", label:"Pressão da câmara", effect:"Vel. do tiro +1", js:"pressaoCamara", py:"pressao_camara", jsSig:"pressaoCamara(velocidade)", pySig:"pressao_camara(velocidade)", tests:[{args:[12],expected:13},{args:[19],expected:20}], effectData:{bulletSpeed:1} },

    { id:"cannon2", category:"CANHÃO", label:"Cadência MK-II", effect:"Recarga -80 ms", js:"cadenciaCanhao", py:"cadencia_canhao", jsSig:"cadenciaCanhao(intervalo)", pySig:"cadencia_canhao(intervalo)", tests:[{args:[260],expected:180},{args:[300],expected:220}], effectData:{fireRate:-80} },
    { id:"recarga_rapida", category:"CANHÃO", label:"Recarga rápida", effect:"Recarga -45 ms", js:"recargaRapida", py:"recarga_rapida", jsSig:"recargaRapida(intervalo)", pySig:"recarga_rapida(intervalo)", tests:[{args:[200],expected:150},{args:[400],expected:300}], effectData:{fireRate:-45} },
    { id:"gatilho", category:"CANHÃO", label:"Gatilho rápido", effect:"Recarga -30 ms", js:"gatilhoRapido", py:"gatilho_rapido", jsSig:"gatilhoRapido(intervalo)", pySig:"gatilho_rapido(intervalo)", tests:[{args:[260],expected:230},{args:[180],expected:150}], effectData:{fireRate:-30} },
    { id:"sincronismo", category:"CANHÃO", label:"Sincronismo de disparo", effect:"Recarga -20 ms", js:"sincronizarDisparo", py:"sincronizar_disparo", jsSig:"sincronizarDisparo(intervalo)", pySig:"sincronizar_disparo(intervalo)", tests:[{args:[260],expected:240},{args:[160],expected:140}], effectData:{fireRate:-20} },

    { id:"tiro_duplo", category:"DISPARO", label:"Tiro duplo", effect:"2 projéteis", js:"quantidadeProjeteis", py:"quantidade_projeteis", jsSig:"quantidadeProjeteis(quantidade)", pySig:"quantidade_projeteis(quantidade)", tests:[{args:[1],expected:2},{args:[2],expected:3}], effectData:{bulletCount:2} },
    { id:"tiro_triplo", category:"DISPARO", label:"Tiro triplo", effect:"3 projéteis", js:"rajadaTripla", py:"rajada_tripla", jsSig:"rajadaTripla(quantidade)", pySig:"rajada_tripla(quantidade)", tests:[{args:[1],expected:3},{args:[2],expected:4}], effectData:{bulletCount:3} },
    { id:"dano", category:"DISPARO", label:"Dano aumentado", effect:"Dano +10", js:"danoProjetil", py:"dano_projetil", jsSig:"danoProjetil(dano)", pySig:"dano_projetil(dano)", tests:[{args:[25],expected:35},{args:[10],expected:20}], effectData:{bulletDamage:10} },
    { id:"penetracao", category:"DISPARO", label:"Penetração", effect:"Dano +7", js:"penetracaoProjetil", py:"penetracao_projetil", jsSig:"penetracaoProjetil(dano)", pySig:"penetracao_projetil(dano)", tests:[{args:[25],expected:32},{args:[13],expected:20}], effectData:{bulletDamage:7} },
    { id:"impacto", category:"DISPARO", label:"Carga de impacto", effect:"Dano +5", js:"cargaImpacto", py:"carga_impacto", jsSig:"cargaImpacto(dano)", pySig:"carga_impacto(dano)", tests:[{args:[25],expected:30},{args:[18],expected:23}], effectData:{bulletDamage:5} },
    { id:"explosiva", category:"DISPARO", label:"Munição explosiva", effect:"Dano +4 / projétil maior", js:"municaoExplosiva", py:"municao_explosiva", jsSig:"municaoExplosiva(dano)", pySig:"municao_explosiva(dano)", tests:[{args:[25],expected:29},{args:[11],expected:15}], effectData:{bulletDamage:4,bulletRadius:1} },

    { id:"calibre", category:"BALÍSTICA", label:"Calibre ampliado", effect:"Raio do projétil +2", js:"calibreProjetil", py:"calibre_projetil", jsSig:"calibreProjetil(raio)", pySig:"calibre_projetil(raio)", tests:[{args:[4],expected:6},{args:[2],expected:4}], effectData:{bulletRadius:2} },
    { id:"alcance", category:"BALÍSTICA", label:"Alcance ampliado", effect:"Duração do projétil +2 s", js:"alcanceProjetil", py:"alcance_projetil", jsSig:"alcanceProjetil(tempo)", pySig:"alcance_projetil(tempo)", tests:[{args:[5],expected:7},{args:[3],expected:5}], effectData:{bulletLifetime:2} },
    { id:"precisao", category:"BALÍSTICA", label:"Precisão", effect:"Menor abertura do tiro múltiplo", js:"precisaoCanhao", py:"precisao_canhao", jsSig:"precisaoCanhao(desvio)", pySig:"precisao_canhao(desvio)", tests:[{args:[6],expected:3},{args:[10],expected:5}], effectData:{spread:3} },
    { id:"estabilizador", category:"BALÍSTICA", label:"Estabilizador", effect:"Abertura mínima de 2°", js:"estabilizarCanhao", py:"estabilizar_canhao", jsSig:"estabilizarCanhao(desvio)", pySig:"estabilizar_canhao(desvio)", tests:[{args:[6],expected:4},{args:[1],expected:0}], effectData:{spread:2} },

    { id:"blindagem", category:"DEFESA", label:"Blindagem máxima", effect:"Vida +25", js:"blindagemMaxima", py:"blindagem_maxima", jsSig:"blindagemMaxima(vida)", pySig:"blindagem_maxima(vida)", tests:[{args:[100],expected:125},{args:[70],expected:95}], effectData:{maxLife:25} },
    { id:"blindagem2", category:"DEFESA", label:"Blindagem reforçada", effect:"Vida +15", js:"reforcarBlindagem", py:"reforcar_blindagem", jsSig:"reforcarBlindagem(vida)", pySig:"reforcar_blindagem(vida)", tests:[{args:[100],expected:115},{args:[50],expected:65}], effectData:{maxLife:15} },
    { id:"escudo", category:"DEFESA", label:"Escudo absorvente", effect:"Redução de dano +15%", js:"reduzirDano", py:"reduzir_dano", jsSig:"reduzirDano(dano)", pySig:"reduzir_dano(dano)", tests:[{args:[100],expected:80},{args:[25],expected:20}], effectData:{damageReduction:0.15} },
    { id:"amortecimento", category:"DEFESA", label:"Amortecimento", effect:"Redução de dano +10%", js:"amortecerImpacto", py:"amortecer_impacto", jsSig:"amortecerImpacto(dano)", pySig:"amortecer_impacto(dano)", tests:[{args:[25],expected:20},{args:[4],expected:0}], effectData:{damageReduction:0.10} },
    { id:"regeneracao", category:"DEFESA", label:"Regeneração", effect:"Regenera 1 vida/s", js:"regenerarBlindagem", py:"regenerar_blindagem", jsSig:"regenerarBlindagem(vida)", pySig:"regenerar_blindagem(vida)", tests:[{args:[50],expected:51},{args:[99],expected:100}], effectData:{regen:1} },
    { id:"emergencia", category:"DEFESA", label:"Blindagem de emergência", effect:"Vida +10 / regeneração +0,5/s", js:"blindagemEmergencia", py:"blindagem_emergencia", jsSig:"blindagemEmergencia(vida)", pySig:"blindagem_emergencia(vida)", tests:[{args:[40],expected:60},{args:[70],expected:70}], effectData:{maxLife:10,regen:0.5} },
];

const DEFAULT_LOADOUT = {
    skin: "azul",
    speed: 4.5,
    bulletSpeed: 13,
    fireRate: 260,
    bulletCount: 1,
    bulletDamage: 25,
    bulletRadius: 4,
    bulletLifetime: 5,
    bulletSpread: 6,
    maxLife: 100,
    damageReduction: 0,
    regen: 0,
    programmedFunctions: [],
    programmingLanguage: null,
    upgrades: {},
};

let language = null;
let validation = null;
let codeChangedSinceValidation = true;
let executionInProgress = false;
let pythonWorker = null;
let pythonReady = false;
let pythonPending = null;
let pythonTimeout = null;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function readPlayer() {
    try {
        const data = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || "{}");
        return { ...DEFAULT_LOADOUT, ...data, upgrades:{...(data.upgrades || {})} };
    } catch (_error) {
        return { ...DEFAULT_LOADOUT };
    }
}

function writePlayer(data) {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(data));
}

function readAccess() {
    try {
        return JSON.parse(localStorage.getItem(PROGRAM_ACCESS_KEY) || "null");
    } catch (_error) {
        return null;
    }
}

function writeAccess(patch) {
    const current = readAccess() || {};
    const next = { ...current, ...patch, roomCode: roomCode || current.roomCode || "" };
    localStorage.setItem(PROGRAM_ACCESS_KEY, JSON.stringify(next));
    return next;
}

function getDraftStore() {
    try {
        return JSON.parse(localStorage.getItem(LAB_DRAFTS_KEY) || "{}") || {};
    } catch (_error) {
        return {};
    }
}

function saveDraft() {
    if (!roomCode || !language) return;
    const drafts = getDraftStore();
    drafts[roomCode] = drafts[roomCode] || {};
    drafts[roomCode][language] = editor.value;
    localStorage.setItem(LAB_DRAFTS_KEY, JSON.stringify(drafts));
}

function starterCode(lang) {
    if (lang === "python") {
        return `# BATTLE TANK EMTI - Programa do tanque\n# Professor Kazuo\n# Escreva aqui até 5 funções permitidas.\n# Consulte o manual para aprender a sintaxe de cada função.\n\n`;
    }
    return `// BATTLE TANK EMTI - Programa do tanque\n// Professor Kazuo\n// Escreva aqui até 5 funções permitidas.\n// Consulte o manual para aprender a sintaxe de cada função.\n\n`;
}

function loadDraft() {
    const drafts = getDraftStore();
    const stored = drafts?.[roomCode]?.[language];
    editor.value = typeof stored === "string" ? stored : starterCode(language);
}

function functionName(item) {
    return language === "python" ? item.py : item.js;
}

function functionSignature(item) {
    return language === "python" ? item.pySig : item.jsSig;
}

function buildLoadout(functionIds) {
    const player = readPlayer();
    const result = {
        ...DEFAULT_LOADOUT,
        skin: ["azul","vermelho","bege","escuro"].includes(player.skin) ? player.skin : "azul",
        programmedFunctions: [...functionIds],
        programmingLanguage: language,
        upgrades: {},
    };

    let explicitSpread = null;

    for (const id of functionIds) {
        const item = FUNCTION_CATALOG.find((entry) => entry.id === id);
        if (!item) continue;
        result.upgrades[id] = true;
        const effect = item.effectData || {};
        if (effect.speed) result.speed += effect.speed;
        if (effect.bulletSpeed) result.bulletSpeed += effect.bulletSpeed;
        if (effect.fireRate) result.fireRate += effect.fireRate;
        if (effect.bulletCount) result.bulletCount = Math.max(result.bulletCount, effect.bulletCount);
        if (effect.bulletDamage) result.bulletDamage += effect.bulletDamage;
        if (effect.bulletRadius) result.bulletRadius += effect.bulletRadius;
        if (effect.bulletLifetime) result.bulletLifetime += effect.bulletLifetime;
        if (typeof effect.spread === "number") explicitSpread = explicitSpread === null ? effect.spread : Math.min(explicitSpread, effect.spread);
        if (effect.maxLife) result.maxLife += effect.maxLife;
        if (effect.damageReduction) result.damageReduction += effect.damageReduction;
        if (effect.regen) result.regen += effect.regen;
    }

    result.speed = Number(clamp(result.speed, 3.5, 6.5).toFixed(2));
    result.bulletSpeed = Number(clamp(result.bulletSpeed, 9, 20).toFixed(2));
    result.fireRate = Math.round(clamp(result.fireRate, 120, 500));
    result.bulletCount = Math.round(clamp(result.bulletCount, 1, 3));
    result.bulletDamage = Math.round(clamp(result.bulletDamage, 15, 55));
    result.bulletRadius = Number(clamp(result.bulletRadius, 3, 8).toFixed(2));
    result.bulletLifetime = Number(clamp(result.bulletLifetime, 3, 8).toFixed(2));
    result.bulletSpread = explicitSpread === null ? 6 : Number(clamp(explicitSpread, 1.5, 10).toFixed(2));
    result.maxLife = Math.round(clamp(result.maxLife, 80, 160));
    result.damageReduction = Number(clamp(result.damageReduction, 0, 0.35).toFixed(3));
    result.regen = Number(clamp(result.regen, 0, 2).toFixed(2));
    return result;
}

function updateTankPreview(loadout = readPlayer()) {
    const skin = ["azul","vermelho","bege","escuro"].includes(loadout.skin) ? loadout.skin : "azul";
    tankPreview.src = `assets/tanks/tanque_${skin}.png`;
    tankPreview.alt = `Tanque ${skin}`;
    speedValue.textContent = Number(loadout.speed ?? 4.5).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    bulletSpeedValue.textContent = Number(loadout.bulletSpeed ?? 13).toFixed(1).replace(/\.0$/, "");
    fireRateValue.textContent = `${Math.round(Number(loadout.fireRate ?? 260))} ms`;
    bulletCountValue.textContent = Math.round(Number(loadout.bulletCount ?? 1));
    damageValue.textContent = Math.round(Number(loadout.bulletDamage ?? 25));
    maxLifeValue.textContent = Math.round(Number(loadout.maxLife ?? 100));
    reductionValue.textContent = `${Math.round(Number(loadout.damageReduction ?? 0) * 100)}%`;
    regenValue.textContent = `${Number(loadout.regen ?? 0).toFixed(1).replace(/\.0$/, "")}/s`;
}

function renderCatalog(resultMap = new Map()) {
    let lastCategory = null;
    functionCatalog.innerHTML = FUNCTION_CATALOG.map((item) => {
        const state = resultMap.get(item.id);
        const category = item.category !== lastCategory ? `<div class="catalog-category">${item.category}</div>` : "";
        lastCategory = item.category;
        const className = state ? (state.passed ? "valid" : "invalid") : "";
        const stateText = state ? (state.passed ? "VALIDADA" : "COM ERRO") : "DISPONÍVEL";
        return `${category}<div class="function-item ${className}" data-function-id="${item.id}">
            <div class="function-top"><strong>${escapeHtml(item.label)}</strong><span class="state">${stateText}</span></div>
            <div class="function-signature">${escapeHtml(functionSignature(item))}</div>
            <div class="function-effect">${escapeHtml(item.effect)}</div>
        </div>`;
    }).join("");
}

function renderActive(validIds) {
    slotCounter.textContent = `${validIds.length} / ${MAX_ACTIVE_FUNCTIONS} FUNÇÕES`;
    if (!validIds.length) {
        activeFunctions.innerHTML = `<p class="muted">Nenhuma função validada.</p>`;
        return;
    }
    activeFunctions.innerHTML = validIds.map((id) => {
        const item = FUNCTION_CATALOG.find((entry) => entry.id === id);
        return `<div class="active-function"><strong>✓ ${escapeHtml(item.label)}</strong><small>${escapeHtml(item.effect)}</small></div>`;
    }).join("");
}

function writeConsole(message) {
    const line = document.createElement("div");
    line.textContent = `> ${message}`;
    consoleArea.appendChild(line);
    consoleArea.scrollTop = consoleArea.scrollHeight;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatValue(value) {
    if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
    if (typeof value === "string") return value;
    return String(value);
}

function setLanguage(nextLanguage) {
    const access = readAccess() || {};
    if (access.language && access.language !== nextLanguage) {
        writeConsole("A linguagem desta partida já está bloqueada.");
        return;
    }
    language = nextLanguage;
    writeAccess({ language: nextLanguage });
    languageLockedBadge.textContent = `LINGUAGEM: ${nextLanguage === "python" ? "PYTHON" : "JAVASCRIPT"}`;
    fileName.textContent = nextLanguage === "python" ? "tanque.py" : "tanque.js";
    languageModal.hidden = true;
    loadDraft();
    renderCatalog();
    validation = null;
    codeChangedSinceValidation = true;
    validationStatus.textContent = "AGUARDANDO";
    validationResults.innerHTML = `<p class="muted">Escreva seu programa e clique em VALIDAR PROGRAMA.</p>`;
    renderActive([]);
    updateTankPreview(buildLoadout([]));
    writeConsole(`${nextLanguage === "python" ? "Python" : "JavaScript"} selecionado para esta partida.`);
}

function ensureAccess() {
    const access = readAccess();
    if (!roomCode || !access || String(access.roomCode) !== roomCode) {
        blockLab("Acesso indisponível", "O laboratório só pode ser aberto durante a fase de programação da partida.");
        return false;
    }
    if (access.finalized) {
        blockLab("Programação finalizada", "Seu tanque já foi finalizado. Aguarde o professor iniciar a arena.");
        return false;
    }
    if (access.phase !== "programming") {
        blockLab("Programação encerrada", "A fase de programação não está ativa. Volte ao jogo e aguarde o professor.");
        return false;
    }
    if (access.language === "javascript" || access.language === "python") {
        language = access.language;
        languageLockedBadge.textContent = `LINGUAGEM: ${language === "python" ? "PYTHON" : "JAVASCRIPT"}`;
        fileName.textContent = language === "python" ? "tanque.py" : "tanque.js";
        languageModal.hidden = true;
        loadDraft();
    } else {
        languageModal.hidden = false;
    }
    return true;
}

function blockLab(title, message) {
    blockedTitle.textContent = title;
    blockedMessage.textContent = message;
    blockedOverlay.hidden = false;
}

function setPythonChoice(status, text) {
    pythonChoiceStatus.textContent = text;
    choosePython.disabled = status !== "ready";
}

function createPythonWorker() {
    if (pythonWorker) pythonWorker.terminate();
    pythonReady = false;
    setPythonChoice("loading", "Carregando Python...");
    pythonWorker = new Worker("python_worker_v6.mjs?v=6", { type:"module" });
    pythonWorker.onmessage = (event) => {
        const data = event.data || {};
        if (data.type === "status") {
            if (data.status === "ready") {
                pythonReady = true;
                setPythonChoice("ready", "Python pronto");
                writeConsole("Executor Python pronto.");
            } else if (data.status === "error") {
                pythonReady = false;
                setPythonChoice("error", "Python indisponível");
                writeConsole(data.message || "Falha ao carregar Python.");
                if (data.detail) writeConsole(`Detalhe: ${data.detail}`);
            }
            return;
        }
        if (data.type === "result" && pythonPending) {
            const resolve = pythonPending;
            pythonPending = null;
            if (pythonTimeout) clearTimeout(pythonTimeout);
            pythonTimeout = null;
            resolve(data);
        }
    };
    pythonWorker.onerror = (event) => {
        pythonReady = false;
        setPythonChoice("error", "Erro no Python");
        if (pythonPending) {
            const resolve = pythonPending;
            pythonPending = null;
            if (pythonTimeout) clearTimeout(pythonTimeout);
            pythonTimeout = null;
            resolve({ type:"result", success:false, error:{name:"PythonWorkerError",message:event.message || "Erro no executor Python."}, logs:[] });
        }
    };
    pythonWorker.postMessage({ type:"init" });
}

function workerCatalog() {
    return FUNCTION_CATALOG.map((item) => ({
        id:item.id,
        functionName: language === "python" ? item.py : item.js,
        tests:item.tests,
    }));
}

function runJavaScript(code) {
    return new Promise((resolve) => {
        const worker = new Worker("javascript_worker_v6.js?v=6");
        let done = false;
        const finish = (payload) => {
            if (done) return;
            done = true;
            worker.terminate();
            resolve(payload);
        };
        const timer = setTimeout(() => finish({ type:"result", success:false, timeout:true, error:{name:"TimeoutError",message:"Tempo limite excedido. Verifique se existe um loop infinito."}, logs:[] }), 2500);
        worker.onmessage = (event) => { clearTimeout(timer); finish(event.data); };
        worker.onerror = (event) => { clearTimeout(timer); finish({type:"result",success:false,error:{name:"JavaScriptError",message:event.message || "Erro ao executar JavaScript."},logs:[]}); };
        worker.postMessage({ type:"run", code, catalog:workerCatalog(), maxFunctions:MAX_ACTIVE_FUNCTIONS });
    });
}

function runPython(code) {
    return new Promise((resolve) => {
        if (!pythonWorker) createPythonWorker();
        if (pythonPending) {
            resolve({type:"result",success:false,error:{name:"BusyError",message:"O executor Python ainda está ocupado."},logs:[]});
            return;
        }
        pythonPending = resolve;
        pythonTimeout = setTimeout(() => {
            if (!pythonPending) return;
            const pending = pythonPending;
            pythonPending = null;
            pythonTimeout = null;
            pending({type:"result",success:false,timeout:true,error:{name:"TimeoutError",message:"Tempo limite excedido. Verifique se existe um loop infinito."},logs:[]});
            createPythonWorker();
        }, pythonReady ? 4500 : 18000);
        pythonWorker.postMessage({ type:"run", code, catalog:workerCatalog(), maxFunctions:MAX_ACTIVE_FUNCTIONS });
    });
}

async function validateProgram() {
    if (!language || executionInProgress) return;
    saveDraft();
    const code = editor.value.trim();
    if (!code || code === starterCode(language).trim()) {
        validation = { validIds:[], resultMap:new Map(), codeSignature:editor.value, definedCount:0 };
        codeChangedSinceValidation = false;
        validationStatus.textContent = "0 / 5 VÁLIDAS";
        validationResults.innerHTML = `<div class="result-card pass"><strong>Programa sem funções</strong>Você pode finalizar sem funções adicionais ou escrever até 5 funções permitidas.</div>`;
        renderCatalog();
        renderActive([]);
        const loadout = buildLoadout([]);
        writePlayer(loadout);
        updateTankPreview(loadout);
        return;
    }

    executionInProgress = true;
    validateButton.disabled = true;
    validateButton.textContent = "VALIDANDO...";
    validationStatus.textContent = "EXECUTANDO";
    validationResults.innerHTML = `<p class="muted">Executando seu programa...</p>`;
    writeConsole(`Validando programa em ${language === "python" ? "Python" : "JavaScript"}...`);

    try {
        const result = language === "python" ? await runPython(editor.value) : await runJavaScript(editor.value);
        (result.logs || []).forEach((line) => writeConsole(`SAÍDA: ${line}`));
        if (!result.success) {
            validation = null;
            codeChangedSinceValidation = true;
            validationStatus.textContent = "ERRO";
            validationResults.innerHTML = `<div class="result-card fail"><strong>${escapeHtml(result.error?.name || "Erro")}</strong>${escapeHtml(result.error?.message || "Não foi possível executar o programa.")}</div>`;
            writeConsole(`${result.error?.name || "Erro"}: ${result.error?.message || "Falha na execução."}`);
            return;
        }

        const functions = Array.isArray(result.functions) ? result.functions : [];
        const resultMap = new Map(functions.map((entry) => [entry.id, entry]));
        const validIds = functions.filter((entry) => entry.passed).map((entry) => entry.id);
        const definedCount = Number(result.definedCount || functions.length || 0);
        const tooMany = definedCount > MAX_ACTIVE_FUNCTIONS;

        validationResults.innerHTML = "";
        if (!functions.length) {
            validationResults.innerHTML = `<div class="result-card fail"><strong>Nenhuma função permitida encontrada</strong>Use os nomes exibidos na lista de FUNÇÕES PERMITIDAS.</div>`;
        } else {
            validationResults.innerHTML = functions.map((entry) => {
                const item = FUNCTION_CATALOG.find((fn) => fn.id === entry.id);
                const firstFail = (entry.tests || []).find((test) => !test.passed);
                return `<div class="result-card ${entry.passed ? "pass" : "fail"}">
                    <strong>${entry.passed ? "✓" : "✗"} ${escapeHtml(item?.label || entry.id)}</strong>
                    ${entry.passed ? escapeHtml(item?.effect || "Função validada.") : `Esperado ${escapeHtml(formatValue(firstFail?.expected))}; recebido ${escapeHtml(formatValue(firstFail?.received))}.`}
                </div>`;
            }).join("");
        }

        if (tooMany) {
            validationResults.insertAdjacentHTML("afterbegin", `<div class="result-card fail"><strong>Limite excedido</strong>Foram encontradas ${definedCount} funções permitidas. Use no máximo ${MAX_ACTIVE_FUNCTIONS} por partida.</div>`);
        }

        const allDefinedPassed = functions.length > 0 && functions.every((entry) => entry.passed);
        const validForFinalize = !tooMany && (functions.length === 0 || allDefinedPassed) && validIds.length <= MAX_ACTIVE_FUNCTIONS;

        validation = {
            validIds: validForFinalize ? validIds : [],
            candidateIds: validIds,
            resultMap,
            codeSignature: editor.value,
            definedCount,
            validForFinalize,
        };
        codeChangedSinceValidation = false;
        validationStatus.textContent = validForFinalize ? `${validIds.length} / ${MAX_ACTIVE_FUNCTIONS} VÁLIDAS` : "CORRIJA O CÓDIGO";
        renderCatalog(resultMap);
        renderActive(validForFinalize ? validIds : []);

        const loadout = buildLoadout(validForFinalize ? validIds : []);
        if (validForFinalize) writePlayer(loadout);
        updateTankPreview(loadout);
        writeConsole(validForFinalize ? `Programa validado: ${validIds.length} função(ões) ativa(s).` : "Existem funções com erro ou o limite foi excedido.");
    } finally {
        executionInProgress = false;
        validateButton.disabled = false;
        validateButton.textContent = "VALIDAR PROGRAMA";
    }
}

function canFinalize() {
    const code = editor.value.trim();
    const onlyStarter = code === starterCode(language).trim();
    if (!code || onlyStarter) return { ok:true, ids:[] };
    if (codeChangedSinceValidation || !validation || validation.codeSignature !== editor.value) {
        return { ok:false, message:"Valide o programa depois da última alteração antes de finalizar." };
    }
    if (!validation.validForFinalize) {
        return { ok:false, message:"Corrija as funções com erro e valide novamente." };
    }
    return { ok:true, ids:validation.validIds || [] };
}

function openFinalizeConfirmation() {
    const check = canFinalize();
    if (!check.ok) {
        writeConsole(check.message);
        validationStatus.textContent = "VALIDE PRIMEIRO";
        return;
    }
    const ids = check.ids;
    const items = ids.map((id) => FUNCTION_CATALOG.find((entry) => entry.id === id)).filter(Boolean);
    finalSummary.innerHTML = `
        <strong>Linguagem:</strong> ${language === "python" ? "Python" : "JavaScript"}<br>
        <strong>Funções ativas:</strong> ${ids.length} / ${MAX_ACTIVE_FUNCTIONS}<br>
        ${items.length ? items.map((item) => `✓ ${escapeHtml(item.label)} — ${escapeHtml(item.effect)}`).join("<br>") : "Sem funções adicionais. O tanque usará a configuração padrão."}
    `;
    confirmModal.hidden = false;
}

function finalizeProgramming() {
    const check = canFinalize();
    if (!check.ok) {
        confirmModal.hidden = true;
        writeConsole(check.message);
        return;
    }

    saveDraft();
    const loadout = buildLoadout(check.ids);
    writePlayer(loadout);
    writeAccess({ finalized:true, phase:"waiting", language });

    const payload = {
        finalized:true,
        ready:true,
        roomCode,
        language,
        programmedFunctions:[...check.ids],
        savedAt:Date.now(),
    };
    localStorage.setItem(LAB_RETURN_KEY, JSON.stringify(payload));

    try {
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type:"battle-tank-programming-finalized", ...payload }, window.location.origin);
            window.opener.focus();
            window.close();
            return;
        }
    } catch (_error) {
        // Usa o fallback abaixo.
    }
    window.location.href = "index.html?fromLab=1";
}

function monitorPhase() {
    const access = readAccess();
    if (!access || String(access.roomCode || "") !== roomCode) {
        blockLab("Acesso encerrado", "Volte ao jogo para continuar.");
        return;
    }
    if (access.finalized) {
        blockLab("Programação finalizada", "Seu tanque está pronto. Aguarde o professor iniciar a arena.");
        return;
    }
    if (access.phase !== "programming") {
        blockLab("Programação encerrada", "O professor encerrou a preparação. O laboratório não pode mais ser alterado.");
    }
}

chooseJavascript.addEventListener("click", () => setLanguage("javascript"));
choosePython.addEventListener("click", () => { if (pythonReady) setLanguage("python"); });
saveButton.addEventListener("click", () => {
    saveDraft();
    saveButton.textContent = "SALVO ✓";
    window.setTimeout(() => { saveButton.textContent = "SALVAR CÓDIGO"; }, 1200);
    writeConsole("Código salvo como rascunho. Ainda não foi finalizado.");
});
clearButton.addEventListener("click", () => {
    if (!language) return;
    editor.value = starterCode(language);
    saveDraft();
    validation = null;
    codeChangedSinceValidation = true;
    validationStatus.textContent = "AGUARDANDO";
    validationResults.innerHTML = `<p class="muted">Editor limpo. Escreva até 5 funções.</p>`;
    renderCatalog();
    renderActive([]);
    updateTankPreview(buildLoadout([]));
});
validateButton.addEventListener("click", validateProgram);
finalizeButton.addEventListener("click", openFinalizeConfirmation);
cancelFinalize.addEventListener("click", () => { confirmModal.hidden = true; });
confirmFinalize.addEventListener("click", finalizeProgramming);

editor.addEventListener("input", () => {
    codeChangedSinceValidation = true;
    validationStatus.textContent = "ALTERADO";
    saveDraft();
});
editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
        event.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.slice(0,start) + "    " + editor.value.slice(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
        codeChangedSinceValidation = true;
        saveDraft();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        validateProgram();
    }
});
window.addEventListener("beforeunload", saveDraft);
window.addEventListener("storage", (event) => {
    if (event.key === PROGRAM_ACCESS_KEY) monitorPhase();
});

function initialize() {
    createPythonWorker();
    updateTankPreview(readPlayer());
    if (!ensureAccess()) return;
    renderCatalog();
    renderActive([]);
    writeConsole("Escolha uma linguagem e programe até 5 funções permitidas.");
    window.setInterval(monitorPhase, 1000);
}

initialize();
