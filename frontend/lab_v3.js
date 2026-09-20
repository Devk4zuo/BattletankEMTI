/*
 * BATTLE TANK EMTI - Laboratório de Programação
 * Professor Kazuo
 *
 * Objetivo: o aluno escreve código real em JavaScript ou Python,
 * executa testes e transforma o resultado em upgrades do tanque.
 */

const editor = document.getElementById("codeEditor");
const testButton = document.getElementById("testButton");
const resetButton = document.getElementById("resetButton");
const hintButton = document.getElementById("hintButton");
const nextButton = document.getElementById("nextButton");
const testResults = document.getElementById("testResults");
const consoleArea = document.getElementById("console");
const javascriptButton = document.getElementById("javascriptButton");
const pythonButton = document.getElementById("pythonButton");
const pythonStatus = document.getElementById("pythonStatus");
const fileName = document.getElementById("fileName");
const challengeNumber = document.getElementById("challengeNumber");
const challengeTitle = document.getElementById("challengeTitle");
const challengeDescription = document.getElementById("challengeDescription");
const challengeConcept = document.getElementById("challengeConcept");
const challengeAllowed = document.getElementById("challengeAllowed");
const challengeExample = document.getElementById("challengeExample");
const challengeHint = document.getElementById("challengeHint");
const challengeList = document.getElementById("challengeList");

const DRAFT_STORAGE_KEY = "battleTankLabDraftsV2";
const PLAYER_STORAGE_KEY = "battleTankPlayer";

let language = "javascript";
let currentChallengeIndex = 0;
let executionInProgress = false;
let pythonWorker = null;
let pythonReady = false;
let pythonPendingRun = null;
let pythonTimeoutHandle = null;

// ======================================================
// DESAFIOS
// ======================================================

const challenges = [
    {
        id: "motor2",
        number: "DESAFIO 01",
        title: "Sistema de potência do motor",
        concept: "Funções, parâmetros, return e multiplicação",
        allowed: "function / def, parâmetro, return, operador *",
        description:
            "Crie uma função que receba a potência atual do motor e retorne o dobro.",
        hint:
            "A função recebe um número. Você precisa devolver esse número multiplicado por 2.",
        exampleText: "Entrada: 10  →  Resultado esperado: 20",
        upgradeLabel: "Motor MK-II",
        upgradeKey: "motor2",
        statEffect: "Velocidade 4.5 → 4.9",
        javascript: {
            file: "motor.js",
            functionName: "potenciaMotor",
            template:
`function potenciaMotor(potencia) {
    // Escreva seu código aqui

    return potencia;
}`,
        },
        python: {
            file: "motor.py",
            functionName: "potencia_motor",
            template:
`def potencia_motor(potencia):
    # Escreva seu código aqui

    return potencia
`,
        },
        tests: [
            { args: [2], expected: 4, visible: true },
            { args: [10], expected: 20, visible: true },
            { args: [17], expected: 34, visible: false },
            { args: [41], expected: 82, visible: false },
        ],
        apply(tank) {
            tank.upgrades.motor2 = true;
            tank.speed = 4.9;
        },
    },
    {
        id: "bullet2",
        number: "DESAFIO 02",
        title: "Munição de alta velocidade",
        concept: "Funções, parâmetros, return e soma",
        allowed: "function / def, parâmetro, return, operador +",
        description:
            "Crie uma função que receba a velocidade atual do projétil e acrescente 4 unidades.",
        hint:
            "Se a velocidade recebida for 13, a função precisa devolver 17. Pense em uma soma.",
        exampleText: "Entrada: 13  →  Resultado esperado: 17",
        upgradeLabel: "Munição MK-II",
        upgradeKey: "bullet2",
        statEffect: "Velocidade do tiro 13 → 17",
        javascript: {
            file: "municao.js",
            functionName: "velocidadeProjetil",
            template:
`function velocidadeProjetil(velocidade) {
    // Escreva seu código aqui

    return velocidade;
}`,
        },
        python: {
            file: "municao.py",
            functionName: "velocidade_projetil",
            template:
`def velocidade_projetil(velocidade):
    # Escreva seu código aqui

    return velocidade
`,
        },
        tests: [
            { args: [9], expected: 13, visible: true },
            { args: [13], expected: 17, visible: true },
            { args: [5], expected: 9, visible: false },
            { args: [16], expected: 20, visible: false },
        ],
        apply(tank) {
            tank.upgrades.bullet2 = true;
            tank.bulletSpeed = 17;
        },
    },
    {
        id: "cannon2",
        number: "DESAFIO 03",
        title: "Sistema de recarga do canhão",
        concept: "Funções, parâmetros, return e subtração",
        allowed: "function / def, parâmetro, return, operador -",
        description:
            "Crie uma função que receba o intervalo atual de disparo e reduza 80 milissegundos.",
        hint:
            "Quanto menor o intervalo, mais rápido o canhão dispara. Subtraia 80 do valor recebido.",
        exampleText: "Entrada: 260  →  Resultado esperado: 180",
        upgradeLabel: "Canhão rápido MK-II",
        upgradeKey: "cannon2",
        statEffect: "Cadência 260 ms → 180 ms",
        javascript: {
            file: "canhao.js",
            functionName: "cadenciaCanhao",
            template:
`function cadenciaCanhao(intervalo) {
    // Escreva seu código aqui

    return intervalo;
}`,
        },
        python: {
            file: "canhao.py",
            functionName: "cadencia_canhao",
            template:
`def cadencia_canhao(intervalo):
    # Escreva seu código aqui

    return intervalo
`,
        },
        tests: [
            { args: [260], expected: 180, visible: true },
            { args: [300], expected: 220, visible: true },
            { args: [240], expected: 160, visible: false },
            { args: [200], expected: 120, visible: false },
        ],
        apply(tank) {
            tank.upgrades.cannon2 = true;
            tank.fireRate = 180;
        },
    },
];

// ======================================================
// DADOS DO TANQUE
// ======================================================

const defaultTankData = {
    speed: 4.5,
    bulletSpeed: 13,
    fireRate: 260,
    upgrades: {
        motor2: false,
        bullet2: false,
        cannon2: false,
    },
    completedChallenges: [],
};

function cloneDefaultTankData() {
    return {
        ...defaultTankData,
        upgrades: { ...defaultTankData.upgrades },
        completedChallenges: [],
    };
}

function loadTankData() {
    try {
        const saved = localStorage.getItem(PLAYER_STORAGE_KEY);

        if (!saved) {
            return cloneDefaultTankData();
        }

        const data = JSON.parse(saved);

        return {
            ...cloneDefaultTankData(),
            ...data,
            upgrades: {
                ...defaultTankData.upgrades,
                ...(data.upgrades || {}),
            },
            completedChallenges: Array.isArray(data.completedChallenges)
                ? data.completedChallenges
                : [],
        };
    }
    catch (error) {
        console.warn("Progresso local inválido. Usando padrão.", error);
        return cloneDefaultTankData();
    }
}

let playerTank = loadTankData();

function saveTankData() {
    localStorage.setItem(
        PLAYER_STORAGE_KEY,
        JSON.stringify(playerTank)
    );

    window.dispatchEvent(
        new StorageEvent("storage", {
            key: PLAYER_STORAGE_KEY,
            newValue: JSON.stringify(playerTank),
        })
    );
}

// ======================================================
// RASCUNHOS DO EDITOR
// ======================================================

function loadDrafts() {
    try {
        return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "{}") || {};
    }
    catch (_error) {
        return {};
    }
}

let drafts = loadDrafts();

function saveDrafts() {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function getChallengeLanguageConfig(challenge = challenges[currentChallengeIndex]) {
    return challenge[language];
}

function getDraft(challenge, lang) {
    const stored = drafts?.[challenge.id]?.[lang];
    return typeof stored === "string"
        ? stored
        : challenge[lang].template;
}

function storeCurrentDraft() {
    const challenge = challenges[currentChallengeIndex];

    drafts[challenge.id] = drafts[challenge.id] || {};
    drafts[challenge.id][language] = editor.value;
    saveDrafts();
}

function resetCurrentDraft() {
    const challenge = challenges[currentChallengeIndex];
    const template = challenge[language].template;

    drafts[challenge.id] = drafts[challenge.id] || {};
    drafts[challenge.id][language] = template;
    saveDrafts();
    editor.value = template;
}

// ======================================================
// VISUAL DO TANQUE E PROGRESSO
// ======================================================

function updateTankPanel() {
    document.getElementById("speedValue").textContent =
        Number(playerTank.speed).toFixed(1);

    document.getElementById("bulletSpeedValue").textContent =
        Number(playerTank.bulletSpeed).toFixed(0);

    document.getElementById("fireRateValue").textContent =
        `${Number(playerTank.fireRate).toFixed(0)} ms`;

    document.getElementById("speedLevel").textContent =
        playerTank.upgrades.motor2 ? "MK-II" : "MK-I";

    document.getElementById("bulletLevel").textContent =
        playerTank.upgrades.bullet2 ? "MK-II" : "MK-I";

    document.getElementById("cannonLevel").textContent =
        playerTank.upgrades.cannon2 ? "MK-II" : "MK-I";

    renderUpgradeList();
    renderChallengeList();
}

function renderUpgradeList() {
    const list = document.getElementById("upgradeList");

    list.innerHTML = challenges
        .map((challenge) => {
            const unlocked = Boolean(playerTank.upgrades[challenge.upgradeKey]);

            return `
                <div class="upgrade ${unlocked ? "unlocked" : "locked"}">
                    ${unlocked ? "✓" : "🔒"} ${escapeHtml(challenge.upgradeLabel)}
                    <small>${escapeHtml(challenge.statEffect)}</small>
                </div>
            `;
        })
        .join("");
}

function isChallengeLocked(index) {
    if (index <= 0) {
        return false;
    }

    const previous = challenges[index - 1];
    return !playerTank.upgrades[previous.upgradeKey];
}

function renderChallengeList() {
    challengeList.innerHTML = challenges
        .map((challenge, index) => {
            const solved = Boolean(playerTank.upgrades[challenge.upgradeKey]);
            const locked = isChallengeLocked(index);
            const active = index === currentChallengeIndex;

            return `
                <button
                    class="mission-card ${active ? "active" : ""} ${solved ? "solved" : ""}"
                    type="button"
                    data-challenge-index="${index}"
                    ${locked ? "disabled" : ""}
                >
                    <span class="mission-index">${String(index + 1).padStart(2, "0")}</span>
                    <span class="mission-name">${escapeHtml(challenge.title)}</span>
                    <span class="mission-state">${
                        solved ? "CONCLUÍDO" : locked ? "BLOQUEADO" : "DISPONÍVEL"
                    }</span>
                </button>
            `;
        })
        .join("");

    challengeList.querySelectorAll("[data-challenge-index]").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.challengeIndex);
            selectChallenge(index);
        });
    });
}

// ======================================================
// DESAFIO ATUAL
// ======================================================

function selectChallenge(index) {
    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= challenges.length ||
        isChallengeLocked(index)
    ) {
        return;
    }

    storeCurrentDraft();
    currentChallengeIndex = index;
    loadCurrentChallenge();
}

function loadCurrentChallenge() {
    const challenge = challenges[currentChallengeIndex];
    const config = getChallengeLanguageConfig(challenge);

    challengeNumber.textContent = challenge.number;
    challengeTitle.textContent = challenge.title;
    challengeDescription.textContent = challenge.description;
    challengeConcept.textContent = challenge.concept;
    challengeAllowed.textContent = challenge.allowed;
    challengeExample.textContent = challenge.exampleText;
    challengeHint.textContent = challenge.hint;
    challengeHint.hidden = true;
    hintButton.textContent = "MOSTRAR DICA";

    fileName.textContent = config.file;
    editor.value = getDraft(challenge, language);

    const solved = Boolean(playerTank.upgrades[challenge.upgradeKey]);
    nextButton.hidden = !solved || currentChallengeIndex >= challenges.length - 1;

    renderChallengeList();
    clearTestResults();

    if (solved) {
        writeConsole(`${challenge.upgradeLabel} já está desbloqueado.`);
    }
}

// ======================================================
// TROCAR LINGUAGEM
// ======================================================

function selectLanguage(nextLanguage) {
    if (!challenges[currentChallengeIndex][nextLanguage]) {
        return;
    }

    storeCurrentDraft();
    language = nextLanguage;

    javascriptButton.classList.toggle("active", language === "javascript");
    pythonButton.classList.toggle("active", language === "python");

    loadCurrentChallenge();

    writeConsole(
        language === "javascript"
            ? "JavaScript selecionado."
            : "Python selecionado."
    );
}

javascriptButton.addEventListener("click", () => selectLanguage("javascript"));
pythonButton.addEventListener("click", () => selectLanguage("python"));

// ======================================================
// EXECUTOR JAVASCRIPT
// ======================================================

function runJavaScriptTests(code, challenge) {
    return new Promise((resolve) => {
        const worker = new Worker("javascript_worker_v3.js");
        let finished = false;

        const finish = (result) => {
            if (finished) {
                return;
            }

            finished = true;
            worker.terminate();
            resolve(result);
        };

        const timeout = setTimeout(() => {
            finish({
                type: "result",
                success: false,
                timeout: true,
                error: {
                    name: "TimeoutError",
                    message:
                        "Tempo limite excedido. Verifique se existe um loop infinito no seu código.",
                },
                logs: [],
            });
        }, 2000);

        worker.onmessage = (event) => {
            clearTimeout(timeout);
            finish(event.data);
        };

        worker.onerror = (error) => {
            clearTimeout(timeout);
            finish({
                type: "result",
                success: false,
                error: {
                    name: "JavaScriptError",
                    message: error.message || "Erro ao executar JavaScript.",
                },
                logs: [],
            });
        };

        worker.postMessage({
            type: "run",
            code,
            challenge: {
                functionName: challenge.javascript.functionName,
                tests: challenge.tests,
            },
        });
    });
}

// ======================================================
// EXECUTOR PYTHON / PYODIDE
// ======================================================

function setPythonStatus(status, message) {
    pythonStatus.dataset.status = status;
    pythonStatus.textContent = message;
}

function createPythonWorker() {
    if (pythonWorker) {
        pythonWorker.terminate();
    }

    pythonReady = false;
    pythonWorker = new Worker("python_worker_v3.js");
    setPythonStatus("loading", "carregando...");

    pythonWorker.onmessage = (event) => {
        const data = event.data || {};

        if (data.type === "status") {
            if (data.status === "ready") {
                pythonReady = true;
                setPythonStatus("ready", "pronto");
                writeConsole("Python carregado e pronto para executar códigos.");
            }
            else if (data.status === "loading") {
                setPythonStatus("loading", "carregando...");
            }
            else if (data.status === "error") {
                pythonReady = false;
                setPythonStatus("error", "indisponível");
                writeConsole(data.message || "Falha ao carregar Python.");
            }

            return;
        }

        if (data.type === "result" && pythonPendingRun) {
            const resolve = pythonPendingRun;
            pythonPendingRun = null;

            if (pythonTimeoutHandle) {
                clearTimeout(pythonTimeoutHandle);
                pythonTimeoutHandle = null;
            }

            resolve(data);
        }
    };

    pythonWorker.onerror = (error) => {
        pythonReady = false;
        setPythonStatus("error", "erro");

        if (pythonPendingRun) {
            const resolve = pythonPendingRun;
            pythonPendingRun = null;

            if (pythonTimeoutHandle) {
                clearTimeout(pythonTimeoutHandle);
                pythonTimeoutHandle = null;
            }

            resolve({
                type: "result",
                success: false,
                error: {
                    name: "PythonWorkerError",
                    message: error.message || "Erro ao iniciar o executor Python.",
                },
                logs: [],
            });
        }
    };

    pythonWorker.postMessage({ type: "init" });
}

function runPythonTests(code, challenge) {
    return new Promise((resolve) => {
        if (!pythonWorker) {
            createPythonWorker();
        }

        if (pythonPendingRun) {
            resolve({
                type: "result",
                success: false,
                error: {
                    name: "BusyError",
                    message: "O executor Python ainda está ocupado.",
                },
                logs: [],
            });
            return;
        }

        pythonPendingRun = resolve;

        const timeoutMs = pythonReady ? 3500 : 15000;

        pythonTimeoutHandle = setTimeout(() => {
            if (!pythonPendingRun) {
                return;
            }

            const pendingResolve = pythonPendingRun;
            pythonPendingRun = null;
            pythonTimeoutHandle = null;

            pendingResolve({
                type: "result",
                success: false,
                timeout: true,
                error: {
                    name: "TimeoutError",
                    message:
                        "Tempo limite excedido. Verifique se existe um loop infinito no seu código.",
                },
                logs: [],
            });

            createPythonWorker();
        }, timeoutMs);

        pythonWorker.postMessage({
            type: "run",
            code,
            challenge: {
                functionName: challenge.python.functionName,
                tests: challenge.tests,
            },
        });
    });
}

// ======================================================
// EXECUTAR E PROCESSAR TESTES
// ======================================================

async function executeCurrentChallenge() {
    if (executionInProgress) {
        return;
    }

    storeCurrentDraft();

    const challenge = challenges[currentChallengeIndex];
    const code = editor.value.trim();

    if (!code) {
        displayError({
            name: "Código vazio",
            message: "Digite sua solução antes de executar os testes.",
        });
        return;
    }

    executionInProgress = true;
    testButton.disabled = true;
    testButton.textContent = "EXECUTANDO...";

    testResults.innerHTML = `
        <div class="waiting-card">
            <span class="spinner"></span>
            <strong>Executando seu código...</strong>
            <small>${language === "python" ? "Python no navegador" : "JavaScript em ambiente isolado"}</small>
        </div>
    `;

    writeConsole(
        `Executando ${challenge.number.toLowerCase()} em ${
            language === "python" ? "Python" : "JavaScript"
        }...`
    );

    try {
        const result = language === "javascript"
            ? await runJavaScriptTests(code, challenge)
            : await runPythonTests(code, challenge);

        processTestResults(result, challenge);
    }
    catch (error) {
        displayError({
            name: error?.name || "Erro",
            message: error?.message || String(error),
        });
    }
    finally {
        executionInProgress = false;
        testButton.disabled = false;
        testButton.textContent = "EXECUTAR TESTES";
    }
}

function processTestResults(data, challenge) {
    appendStudentLogs(data.logs || []);

    if (!data.success) {
        displayError(data.error || {
            name: "Erro",
            message: "Não foi possível executar seu código.",
        });
        return;
    }

    const results = Array.isArray(data.results) ? data.results : [];
    const allPassed = results.length > 0 && results.every((test) => test.passed);

    testResults.innerHTML = results
        .map((test, index) => renderTestResult(test, index))
        .join("");

    if (allPassed) {
        unlockChallenge(challenge);

        testResults.insertAdjacentHTML(
            "beforeend",
            `
                <div class="mission-success">
                    <strong>MISSÃO CONCLUÍDA</strong>
                    <span>${escapeHtml(challenge.upgradeLabel)} desbloqueado.</span>
                    <small>${escapeHtml(challenge.statEffect)}</small>
                </div>
            `
        );
    }
    else {
        const hiddenFailure = results.some(
            (test) => !test.visible && !test.passed
        );

        writeConsole(
            hiddenFailure
                ? "Um teste adicional falhou. Evite programar somente para o exemplo mostrado."
                : "Alguns testes falharam. Leia os valores esperado e recebido."
        );
    }
}

function renderTestResult(test, index) {
    const passed = Boolean(test.passed);

    if (!test.visible) {
        return `
            <div class="test-card ${passed ? "pass" : "fail"}">
                <div class="test-card-title">
                    <span>${passed ? "✓" : "✗"}</span>
                    Teste adicional ${index + 1}
                </div>
                <div class="test-card-body">
                    ${
                        passed
                            ? "Sua função também funcionou para outro valor."
                            : "Sua função ainda não funciona para todos os valores testados."
                    }
                </div>
            </div>
        `;
    }

    return `
        <div class="test-card ${passed ? "pass" : "fail"}">
            <div class="test-card-title">
                <span>${passed ? "✓" : "✗"}</span>
                Teste ${index + 1}
            </div>
            <div class="test-values">
                <span>Entrada <strong>${escapeHtml(formatValue(test.args))}</strong></span>
                <span>Esperado <strong>${escapeHtml(formatValue(test.expected))}</strong></span>
                <span>Recebido <strong>${escapeHtml(formatValue(test.received))}</strong></span>
            </div>
        </div>
    `;
}

function unlockChallenge(challenge) {
    const alreadyUnlocked = Boolean(playerTank.upgrades[challenge.upgradeKey]);

    challenge.apply(playerTank);

    if (!playerTank.completedChallenges.includes(challenge.id)) {
        playerTank.completedChallenges.push(challenge.id);
    }

    saveTankData();
    updateTankPanel();

    if (alreadyUnlocked) {
        writeConsole(`${challenge.upgradeLabel} já estava desbloqueado.`);
    }
    else {
        writeConsole(`${challenge.upgradeLabel} desbloqueado. O tanque foi atualizado.`);
    }

    if (currentChallengeIndex < challenges.length - 1) {
        nextButton.hidden = false;
    }
}

// ======================================================
// ERROS E CONSOLE
// ======================================================

function displayError(error) {
    const name = error?.name || "Erro";
    const message = error?.message || String(error || "Erro desconhecido.");
    const line = error?.line ? `Linha ${error.line}` : "";
    const text = error?.text ? String(error.text) : "";

    testResults.innerHTML = `
        <div class="error-panel">
            <strong>${escapeHtml(name)}</strong>
            ${line ? `<span>${escapeHtml(line)}</span>` : ""}
            <p>${escapeHtml(message)}</p>
            ${text ? `<code>${escapeHtml(text)}</code>` : ""}
            <small>Corrija o código e execute novamente.</small>
        </div>
    `;

    writeConsole(`${name}: ${message}`);
}

function appendStudentLogs(logs) {
    logs.forEach((message) => {
        writeConsole(`SAÍDA: ${message}`);
    });
}

function writeConsole(message) {
    const line = document.createElement("div");
    line.className = "console-line";
    line.textContent = `> ${message}`;
    consoleArea.appendChild(line);
    consoleArea.scrollTop = consoleArea.scrollHeight;
}

function clearTestResults() {
    testResults.innerHTML = `
        <p class="waiting">
            Escreva sua solução e clique em EXECUTAR TESTES.
        </p>
    `;
}

function formatValue(value) {
    if (Array.isArray(value)) {
        if (value.length === 1) {
            return formatValue(value[0]);
        }

        return value.map(formatValue).join(", ");
    }

    if (value === null) {
        return "null";
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        }
        catch (_error) {
            return String(value);
        }
    }

    return String(value);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ======================================================
// CONTROLES DO EDITOR
// ======================================================

testButton.addEventListener("click", executeCurrentChallenge);

resetButton.addEventListener("click", () => {
    resetCurrentDraft();
    clearTestResults();
    writeConsole("Código do desafio reiniciado para o modelo inicial.");
    editor.focus();
});

hintButton.addEventListener("click", () => {
    const willShow = challengeHint.hidden;
    challengeHint.hidden = !willShow;
    hintButton.textContent = willShow ? "OCULTAR DICA" : "MOSTRAR DICA";
});

nextButton.addEventListener("click", () => {
    const nextIndex = currentChallengeIndex + 1;

    if (nextIndex < challenges.length && !isChallengeLocked(nextIndex)) {
        selectChallenge(nextIndex);
    }
});

editor.addEventListener("input", () => {
    storeCurrentDraft();
});

editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
        event.preventDefault();

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const indentation = "    ";

        editor.value =
            editor.value.slice(0, start) +
            indentation +
            editor.value.slice(end);

        editor.selectionStart = editor.selectionEnd =
            start + indentation.length;

        storeCurrentDraft();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        executeCurrentChallenge();
    }
});

window.addEventListener("beforeunload", storeCurrentDraft);

// ======================================================
// INICIALIZAÇÃO
// ======================================================

function initializeLab() {
    updateTankPanel();
    loadCurrentChallenge();
    createPythonWorker();

    writeConsole("Battle Tank Engine - Laboratório pronto.");
    writeConsole("Digite seu código. Atalho: Ctrl + Enter executa os testes.");
}

initializeLab();
