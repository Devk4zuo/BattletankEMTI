// ==========================================================
// BATTLE TANK EMTI
// GAME.JS
// MUNDO ABERTO / BATTLE ROYALE
// ==========================================================


// ==========================================================
// CANVAS / VIEW
// ==========================================================

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


// Botão de mutar só a música (efeitos sonoros continuam tocando).
const musicToggleButton =
    document.getElementById("musicToggleButton");

if (musicToggleButton) {

    function refreshMusicToggleButton() {
        const isEnabled =
            window.battleTankMusic &&
            window.battleTankMusic.isEnabled();

        musicToggleButton.textContent =
            isEnabled ? "🎵" : "🔇";

        musicToggleButton.classList.toggle(
            "music-muted",
            !isEnabled
        );
    }

    musicToggleButton.addEventListener("click", () => {
        if (window.battleTankMusic) {
            window.battleTankMusic.toggle();
        }

        refreshMusicToggleButton();
    });

    refreshMusicToggleButton();
}


const VIEW_WIDTH =
    canvas.width;

const VIEW_HEIGHT =
    canvas.height;


// ==========================================================
// AJUSTE VISUAL DA ARENA À JANELA
// ==========================================================
//
// IMPORTANTE:
// O Canvas continua LOGICAMENTE em 1600 x 900.
// Alteramos somente o tamanho visual no navegador.
// Isso não muda câmera, tiros, colisões ou coordenadas.
//
function fitGameDisplay() {

    const arena =
        document.querySelector(
            ".arena-container"
        );

    const header =
        document.querySelector(
            ".game-header"
        );

    const controls =
        document.querySelector(
            ".controls"
        );


    if (
        !arena ||
        !header ||
        !controls
    ) {
        return;
    }


    const bodyStyle =
        getComputedStyle(
            document.body
        );


    const paddingTop =
        parseFloat(
            bodyStyle.paddingTop
        ) || 0;

    const paddingBottom =
        parseFloat(
            bodyStyle.paddingBottom
        ) || 0;

    const paddingLeft =
        parseFloat(
            bodyStyle.paddingLeft
        ) || 0;

    const paddingRight =
        parseFloat(
            bodyStyle.paddingRight
        ) || 0;


    const headerStyle =
        getComputedStyle(
            header
        );

    const controlsStyle =
        getComputedStyle(
            controls
        );


    const headerMarginBottom =
        parseFloat(
            headerStyle.marginBottom
        ) || 0;

    const controlsMarginTop =
        parseFloat(
            controlsStyle.marginTop
        ) || 0;


    const reservedHeight =
        paddingTop +
        paddingBottom +
        header.offsetHeight +
        headerMarginBottom +
        controls.offsetHeight +
        controlsMarginTop +
        8;


    const availableHeight =
        Math.max(
            280,
            window.innerHeight -
            reservedHeight
        );


    const availableWidth =
        Math.max(
            500,
            window.innerWidth -
            paddingLeft -
            paddingRight
        );


    const scale =
        Math.min(
            availableWidth /
            VIEW_WIDTH,

            availableHeight /
            VIEW_HEIGHT,

            1
        );


    const displayWidth =
        Math.floor(
            VIEW_WIDTH *
            scale
        );

    const displayHeight =
        Math.floor(
            VIEW_HEIGHT *
            scale
        );


    arena.style.width =
        `${displayWidth}px`;

    arena.style.height =
        `${displayHeight}px`;

    arena.style.marginLeft =
        "auto";

    arena.style.marginRight =
        "auto";


    canvas.style.width =
        "100%";

    canvas.style.height =
        "100%";
}


window.addEventListener(
    "resize",
    fitGameDisplay
);


// ==========================================================
// TAMANHO REAL DO MUNDO
// ==========================================================

const WORLD_WIDTH = 12288;
const WORLD_HEIGHT = 6912;


// ==========================================================
// CONFIGURAÇÃO DA PARTIDA
// ==========================================================

const MAX_PLAYERS = 20;

let roundNumber = 0;

let gameReady = false;
let assetsLoaded = false;
let serverMatchState = null;
let gameLoopStarted = false;

// ==========================================================
// SOM DE TIRO (sintetizado, sem arquivo de áudio)
// ==========================================================

let sfxContext = null;

// Canvas auxiliar reutilizável para "tingir" o sprite do tanque
// (usa a própria imagem como máscara, então a cor só cobre o
// desenho de verdade, não o retângulo inteiro da imagem).
const tintCanvas = document.createElement("canvas");
const tintCtx = tintCanvas.getContext("2d");
tintCanvas.width = 160;
tintCanvas.height = 160;

function drawTintedTankOverlay(
    image,
    width,
    height,
    color,
    alpha
) {

    if (
        width > tintCanvas.width ||
        height > tintCanvas.height
    ) {
        tintCanvas.width = Math.ceil(width);
        tintCanvas.height = Math.ceil(height);
    }

    tintCtx.clearRect(
        0,
        0,
        tintCanvas.width,
        tintCanvas.height
    );

    tintCtx.drawImage(
        image,
        0,
        0,
        width,
        height
    );

    tintCtx.globalCompositeOperation =
        "source-atop";

    tintCtx.fillStyle =
        color;

    tintCtx.fillRect(
        0,
        0,
        width,
        height
    );

    tintCtx.globalCompositeOperation =
        "source-over";

    ctx.globalAlpha =
        alpha;

    ctx.drawImage(
        tintCanvas,
        0,
        0,
        width,
        height,
        -width / 2,
        -height / 2,
        width,
        height
    );

    ctx.globalAlpha =
        1;
}


// Mesmo valor do dano padrão de tiro no servidor (BULLET_DAMAGE = 25) x 2.
// "faltando 2 tiros" para o tanque no padrão sem upgrades.
const LOW_HEALTH_BLINK_THRESHOLD = 50;
function getSfxContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) {
        return null;
    }

    if (!sfxContext) {
        sfxContext = new AudioCtx();
    }

    if (sfxContext.state === "suspended") {
        sfxContext.resume();
    }

    return sfxContext;
}

function playShotSound() {
    const ctx = getSfxContext();

    if (!ctx) {
        return;
    }

    const now = ctx.currentTime;

    // Estouro de ruído filtrado = "crack" do disparo.
    const bufferSize = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(3200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(280, now + 0.15);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Estampido grave = peso do canhão.
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(120, now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.12);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.45, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.18);

    thump.start(now);
    thump.stop(now + 0.15);
}


// ==========================================================
// SOM DE MOTOR (contínuo, sobe/desce de volume ao andar)
// ==========================================================

let engineGainNode = null;

function ensureEngineSound() {

    if (engineGainNode) {
        return;
    }

    const audioCtx =
        getSfxContext();

    if (!audioCtx) {
        return;
    }

    const osc1 =
        audioCtx.createOscillator();

    osc1.type = "sawtooth";
    osc1.frequency.value = 52;

    const osc2 =
        audioCtx.createOscillator();

    osc2.type = "sawtooth";
    osc2.frequency.value = 78;

    const filter =
        audioCtx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 260;

    const gain =
        audioCtx.createGain();

    gain.gain.value = 0;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();

    engineGainNode = gain;
}

function updateEngineSound(isMoving) {

    const audioCtx =
        getSfxContext();

    if (!audioCtx) {
        return;
    }

    ensureEngineSound();

    if (!engineGainNode) {
        return;
    }

    // Discreto de propósito — é um motorzinho de fundo, não protagonista.
    const targetGain =
        isMoving ? 0.045 : 0;

    engineGainNode.gain.setTargetAtTime(
        targetGain,
        audioCtx.currentTime,
        0.09
    );
}

function playImpactSound() {

    const ctx =
        getSfxContext();

    if (!ctx) {
        return;
    }

    const now =
        ctx.currentTime;

    // Estouro curto e seco = "clank" de metal recebendo o impacto.
    const bufferSize =
        Math.floor(ctx.sampleRate * 0.08);

    const buffer =
        ctx.createBuffer(1, bufferSize, ctx.sampleRate);

    const data =
        buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise =
        ctx.createBufferSource();

    noise.buffer = buffer;

    const noiseFilter =
        ctx.createBiquadFilter();

    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 0.7;

    const noiseGain =
        ctx.createGain();

    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Ping metálico curto por cima.
    const ping =
        ctx.createOscillator();

    ping.type = "triangle";
    ping.frequency.setValueAtTime(420, now);
    ping.frequency.exponentialRampToValueAtTime(180, now + 0.1);

    const pingGain =
        ctx.createGain();

    pingGain.gain.setValueAtTime(0.28, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    ping.connect(pingGain);
    pingGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.09);

    ping.start(now);
    ping.stop(now + 0.12);
}

function playPowerupSound() {

    const ctx =
        getSfxContext();

    if (!ctx) {
        return;
    }

    const now =
        ctx.currentTime;

    // Três notas curtas e ascendentes = "coletou algo bom".
    const notes = [660, 880, 1180];

    notes.forEach((frequency, index) => {

        const start =
            now + index * 0.06;

        const osc =
            ctx.createOscillator();

        osc.type = "sine";
        osc.frequency.value = frequency;

        const gain =
            ctx.createGain();

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.18);
    });
}

function playThunderSound() {

    const ctx =
        getSfxContext();

    if (!ctx) {
        return;
    }

    const now =
        ctx.currentTime;

    // Ruído grave e longo, com um "estalo" inicial mais agudo —
    // trovão distante, não é pra ser mais alto que o resto do jogo.
    const bufferSize =
        Math.floor(ctx.sampleRate * 0.9);

    const buffer =
        ctx.createBuffer(1, bufferSize, ctx.sampleRate);

    const data =
        buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }

    const noise =
        ctx.createBufferSource();

    noise.buffer = buffer;

    const filter =
        ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.9);

    const gain =
        ctx.createGain();

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.9);
}

function playBombSound() {

    const ctx =
        getSfxContext();

    if (!ctx) {
        return;
    }

    const now =
        ctx.currentTime;

    // Estouro de ruído + estampido grave, mais "cheio" que o
    // impacto de tiro comum — é uma bomba, não uma bala.
    const bufferSize =
        Math.floor(ctx.sampleRate * 0.35);

    const buffer =
        ctx.createBuffer(1, bufferSize, ctx.sampleRate);

    const data =
        buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise =
        ctx.createBufferSource();

    noise.buffer = buffer;

    const filter =
        ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.32);

    const noiseGain =
        ctx.createGain();

    noiseGain.gain.setValueAtTime(0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    const thump =
        ctx.createOscillator();

    thump.type = "sine";
    thump.frequency.setValueAtTime(85, now);
    thump.frequency.exponentialRampToValueAtTime(28, now + 0.3);

    const thumpGain =
        ctx.createGain();

    thumpGain.gain.setValueAtTime(0.55, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.35);

    thump.start(now);
    thump.stop(now + 0.32);
}

// Movimento multiplayer: o cliente envia intenção de movimento
// e o servidor confirma a posição oficial dos jogadores humanos.
let movementSequence = 0;
let lastMovementSentAt = 0;
let lastMovementSignature = "";
const MOVEMENT_SEND_INTERVAL_MS = 50;

let showHitboxes = false;

let score = 0;


// ==========================================================
// HTML
// ==========================================================

const lifeValue =
    document.getElementById("lifeValue");

const ammoValue =
    document.getElementById("ammoValue");

const scoreValue =
    document.getElementById("scoreValue");

const gameMessages =
    document.getElementById("gameMessages");


// ==========================================================
// PROGRESSO DO LABORATÓRIO
// ==========================================================

function loadPlayerProgress() {

    const defaultProgress = {

        skin: "azul",

        speed: 4.5,

        bulletSpeed: 13,

        fireRate: 260,

        upgrades: {

            motor2: false,

            bullet2: false,

            cannon2: false
        }
    };


    const saved =
        localStorage.getItem(
            "battleTankPlayer"
        );


    if (!saved) {

        return defaultProgress;
    }


    try {

        const data =
            JSON.parse(saved);


        return {

            ...defaultProgress,

            ...data,

            upgrades: {

                ...defaultProgress.upgrades,

                ...(data.upgrades || {})
            }
        };

    }

    catch (error) {

        console.error(
            "Erro ao carregar progresso:",
            error
        );


        return defaultProgress;
    }
}


const playerProgress =
    loadPlayerProgress();


// ==========================================================
// CARREGAMENTO DE IMAGEM
// ==========================================================

function loadImage(src) {

    return new Promise(

        (resolve, reject) => {

            const image =
                new Image();


            image.onload =
                () => resolve(image);


            image.onerror =
                () => {

                    reject(

                        new Error(
                            `Não foi possível carregar: ${src}`
                        )
                    );
                };


            image.src =
                src;
        }
    );
}


// ==========================================================
// ASSETS
// ==========================================================

// Todos os tipos de barreira/especial existentes hoje.
// Adicionar um novo tipo aqui é o único passo necessário
// (o carregamento e o catálogo de tamanho/hitbox vêm do servidor).
const ALL_BARRIER_TYPES = [
    "barrier1", "barrier2", "barrier4", "barrier5",
    "barrier7", "barrier8", "barrier9", "barrier10",
    "barrier12", "barrier13", "barrier14", "barrier15",
    "barrier17", "barrier18", "barrier19", "barrier20",
    "barrier21", "barrier22", "barrier23", "barrier24",
    "barrier27", "barrier29", "barrier30",
    "barrier33", "barrier34", "barrier35",
    "barrier36",
    "special1", "special2", "special3", "special4", "special5",
    "special6", "special7", "special8", "special9", "special10",
    "special11", "special12", "special13", "special14", "special15",
    "special16", "special17",
];

function barrierAssetPath(typeName) {
    const number = typeName.replace("barrier", "").replace("special", "");
    const fileBase = typeName.startsWith("special") ? "especial" : "barreira";
    return `assets/obstacles/${fileBase}${number}.png`;
}

const assets = {

    terrains: {

        mapa1: null,

        mapa2: null
    },


    barriers: {},


    trees: {

        tree1: null,

        tree2: null
    },


    tanks: {

        azul: null,

        vermelho: null,

        bege: null,

        escuro: null
    }
};


// ==========================================================
// CARREGAR TODOS OS ASSETS
// ==========================================================

async function loadAssets() {

    try {

        const [
            mapa1,
            mapa2,

            tree1,
            tree2,

            tankBlue,
            tankRed,
            tankBeige,
            tankDark,

            barrierImages,
        ] = await Promise.all([

            // TERRENOS
            loadImage("assets/terrain/mapa1.webp"),
            loadImage("assets/terrain/mapa2.webp"),

            // ÁRVORES - CAMADA DE COBERTURA
            // Não entram na colisão do tanque.
            loadImage("assets/tree/arvore1.png"),
            loadImage("assets/tree/arvore2.png"),

            // TANQUES
            loadImage("assets/tanks/tanque_azul.png"),
            loadImage("assets/tanks/tanque_vermelho.png"),
            loadImage("assets/tanks/tanque_bege.png"),
            loadImage("assets/tanks/tanque_escuro.png"),

            // BARREIRAS + ESPECIAIS
            // Carregadas em lote: adicionar um novo tipo em
            // ALL_BARRIER_TYPES é o único passo necessário aqui.
            Promise.all(
                ALL_BARRIER_TYPES.map(
                    (typeName) => loadImage(barrierAssetPath(typeName))
                )
            ),
        ]);


        assets.terrains.mapa1 =
            mapa1;

        assets.terrains.mapa2 =
            mapa2;


        ALL_BARRIER_TYPES.forEach((typeName, index) => {
            assets.barriers[typeName] = barrierImages[index];
        });


        assets.trees.tree1 =
            tree1;

        assets.trees.tree2 =
            tree2;


        assets.tanks.azul =
            tankBlue;

        assets.tanks.vermelho =
            tankRed;

        assets.tanks.bege =
            tankBeige;

        assets.tanks.escuro =
            tankDark;


        assetsLoaded =
            true;


        console.log(
            "Todos os assets foram carregados. Aguardando início da sessão."
        );


        tryStartServerMatch();

    }

    catch (error) {

        console.error(error);


        drawLoadingError(
            error.message
        );
    }
}


// ==========================================================
// TERRENO ATUAL
// ==========================================================

const terrainNames = [

    "mapa1",

    "mapa2"
];


let currentTerrainName =
    "mapa1";


function chooseTerrain() {

    const index =
        Math.floor(

            Math.random() *
            terrainNames.length
        );


    currentTerrainName =
        terrainNames[index];


    console.log(
        "Terreno escolhido:",
        currentTerrainName
    );
}


// ==========================================================
// CÂMERA
// ==========================================================

const camera = {

    x: 0,

    y: 0
};


let spectatorTargetId =
    null;


// ==========================================================
// ATMOSFERA DA PARTIDA (efeito visual, não mexe na física real)
// ==========================================================
// A cada ciclo de ~90s de batalha: escurece gradualmente por um
// tempo ("cai a noite") e, logo depois, um tremor curto de câmera.
// Tudo isso é só desenho — a posição real dos tanques/tiros no
// servidor nunca é afetada, então não muda a jogabilidade de verdade.

// ==========================================================
// ATMOSFERA DA PARTIDA (efeito visual/sonoro, não mexe na física)
// ==========================================================
// Ciclo de ~100s de batalha com 3 eventos, cada um avisado por uma
// faixa de texto alguns segundos antes de começar:
//   - Tempestade (chuva + raios aleatórios)
//   - Noite (escurece e clareia de volta)
//   - Tremor (câmera balança rapidamente)
// Tudo isso é só desenho/som — a posição real dos tanques/tiros
// no servidor nunca é afetada, então não muda a jogabilidade.

let matchStartedAt = null;

const ATMOSPHERE_CYCLE_SECONDS = 100;

const RAIN_WINDOW_START = 25;
const RAIN_FADE_SECONDS = 3;
const RAIN_HOLD_SECONDS = 10;

const NIGHT_WINDOW_START = 58;
const NIGHT_FADE_SECONDS = 4;
const NIGHT_HOLD_SECONDS = 10;

const TREMOR_WINDOW_START = 84;
const TREMOR_DURATION_SECONDS = 7;

// Tempo de "mira" mostrado antes de uma bomba explodir (visual —
// o servidor já manda o atraso exato de cada bomba junto do aviso).
const AIRRAID_TELEGRAPH_MS = 2200;

let currentAtmosphere = {
    nightAlpha: 0,
    rainIntensity: 0,
    shakeX: 0,
    shakeY: 0,
};

function easeWindow(
    cycleTime,
    start,
    fadeIn,
    hold,
    fadeOut
) {

    const holdEnd = start + fadeIn + hold;
    const end = holdEnd + fadeOut;

    if (cycleTime < start || cycleTime >= end) {
        return 0;
    }

    const t = cycleTime - start;

    if (t < fadeIn) {
        return t / fadeIn;
    }

    if (cycleTime < holdEnd) {
        return 1;
    }

    return 1 - (cycleTime - holdEnd) / fadeOut;
}

function computeAtmosphereState() {

    if (!matchStartedAt) {
        return { nightAlpha: 0, rainIntensity: 0, shakeX: 0, shakeY: 0 };
    }

    const elapsedSeconds =
        (performance.now() - matchStartedAt) / 1000;

    const cycleTime =
        elapsedSeconds % ATMOSPHERE_CYCLE_SECONDS;

    const rainIntensity =
        easeWindow(
            cycleTime,
            RAIN_WINDOW_START,
            RAIN_FADE_SECONDS,
            RAIN_HOLD_SECONDS,
            RAIN_FADE_SECONDS
        );

    const nightAlpha =
        easeWindow(
            cycleTime,
            NIGHT_WINDOW_START,
            NIGHT_FADE_SECONDS,
            NIGHT_HOLD_SECONDS,
            NIGHT_FADE_SECONDS
        );

    // --- Tremor curto de câmera ---
    let shakeX = 0;
    let shakeY = 0;
    const tremorEnd =
        TREMOR_WINDOW_START + TREMOR_DURATION_SECONDS;

    if (
        cycleTime >= TREMOR_WINDOW_START &&
        cycleTime < tremorEnd
    ) {
        const t = cycleTime - TREMOR_WINDOW_START;

        const rampUp = 0.3;
        const intensity =
            t < rampUp
                ? t / rampUp
                : Math.max(
                    0,
                    1 - (t - rampUp) / (TREMOR_DURATION_SECONDS - rampUp)
                );

        const magnitude = 7 * intensity;
        const now = performance.now();

        shakeX =
            Math.sin(now / 35) * magnitude +
            Math.sin(now / 17) * magnitude * 0.4;

        shakeY =
            Math.cos(now / 41) * magnitude +
            Math.cos(now / 23) * magnitude * 0.4;
    }

    updateAtmosphereBanner(cycleTime);

    return {
        nightAlpha: Math.max(0, Math.min(1, nightAlpha)),
        rainIntensity: Math.max(0, Math.min(1, rainIntensity)),
        shakeX,
        shakeY,
    };
}


// --- Faixa de aviso de narrador, alguns segundos antes de cada evento ---

let atmospherePhase = "calm";
let bannerText = "";
let bannerSetAt = 0;

function updateAtmosphereBanner(cycleTime) {

    let phase = "calm";

    if (cycleTime >= RAIN_WINDOW_START - 3 && cycleTime < RAIN_WINDOW_START) {
        phase = "rain-incoming";
    }
    else if (cycleTime >= NIGHT_WINDOW_START - 3 && cycleTime < NIGHT_WINDOW_START) {
        phase = "night-incoming";
    }
    else if (cycleTime >= TREMOR_WINDOW_START - 2 && cycleTime < TREMOR_WINDOW_START) {
        phase = "tremor-incoming";
    }

    if (phase === atmospherePhase) {
        return;
    }

    atmospherePhase = phase;

    const messages = {
        "rain-incoming": "🌩️ TEMPESTADE SE APROXIMANDO...",
        "night-incoming": "🌙 A NOITE ESTÁ CAINDO...",
        "tremor-incoming": "⚠️ TREMOR À VISTA!",
    };

    if (messages[phase]) {
        bannerText = messages[phase];
        bannerSetAt = performance.now();
    }
}

function drawAtmosphereBanner() {

    if (!bannerText) {
        return;
    }

    const elapsed =
        (performance.now() - bannerSetAt) / 1000;

    const fadeIn = 0.4;
    const hold = 3.2;
    const fadeOut = 0.8;
    const total = fadeIn + hold + fadeOut;

    if (elapsed >= total) {
        bannerText = "";
        return;
    }

    let alpha = 1;

    if (elapsed < fadeIn) {
        alpha = elapsed / fadeIn;
    }
    else if (elapsed > fadeIn + hold) {
        alpha = 1 - (elapsed - fadeIn - hold) / fadeOut;
    }

    ctx.save();

    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.font = "bold 26px Arial";

    const textY = 64;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    const textWidth = ctx.measureText(bannerText).width;
    ctx.fillRect(
        VIEW_WIDTH / 2 - textWidth / 2 - 24,
        textY - 32,
        textWidth + 48,
        44
    );

    ctx.fillStyle = "#f4f6f1";
    ctx.fillText(bannerText, VIEW_WIDTH / 2, textY);

    ctx.restore();
}


// --- Chuva ---

const rainDrops = [];
const RAIN_DROP_COUNT = 140;

function ensureRainDrops() {

    if (rainDrops.length > 0) {
        return;
    }

    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
        rainDrops.push({
            x: Math.random() * VIEW_WIDTH,
            y: Math.random() * VIEW_HEIGHT,
            length: 14 + Math.random() * 16,
            speed: 9 + Math.random() * 7,
        });
    }
}

let lightningFlashAlpha = 0;
let nextLightningCheckAt = 0;

function updateAndDrawRain() {

    if (currentAtmosphere.rainIntensity <= 0) {
        lightningFlashAlpha = 0;
        return;
    }

    ensureRainDrops();

    const alpha =
        currentAtmosphere.rainIntensity * 0.5;

    ctx.save();
    ctx.strokeStyle = `rgba(190, 210, 235, ${alpha})`;
    ctx.lineWidth = 1.4;

    for (const drop of rainDrops) {

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - drop.length * 0.25, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= drop.speed * 0.25;

        if (drop.y > VIEW_HEIGHT) {
            drop.y = -drop.length;
            drop.x = Math.random() * VIEW_WIDTH;
        }

        if (drop.x < -20) {
            drop.x = VIEW_WIDTH + 20;
        }
    }

    ctx.restore();

    // Raio aleatório: só quando a chuva está forte de verdade.
    const now = performance.now();

    if (
        currentAtmosphere.rainIntensity > 0.75 &&
        now >= nextLightningCheckAt
    ) {
        nextLightningCheckAt = now + 900;

        if (Math.random() < 0.3) {
            lightningFlashAlpha = 0.85;
            playThunderSound();
        }
    }

    if (lightningFlashAlpha > 0.01) {

        ctx.fillStyle =
            `rgba(220, 230, 255, ${lightningFlashAlpha})`;

        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

        lightningFlashAlpha *= 0.82;
    }
    else {
        lightningFlashAlpha = 0;
    }
}


function drawNightOverlay() {

    if (currentAtmosphere.nightAlpha <= 0) {
        return;
    }

    ctx.fillStyle =
        `rgba(6, 10, 22, ${currentAtmosphere.nightAlpha * 0.68})`;

    ctx.fillRect(
        0,
        0,
        VIEW_WIDTH,
        VIEW_HEIGHT
    );
}


// ==========================================================
// ATAQUE AÉREO (avião ou disco voador soltando bombas)
// ==========================================================
// O servidor decide tudo que importa: posição das bombas e
// quando de fato causam dano. Aqui é só a animação/aviso —
// o veículo é decorativo (tela), a mira de cada bomba é
// desenhada na posição real do mundo, pra combinar com onde
// o dano vai acontecer de verdade.

let activeAirRaid = null;

function handleAirRaidEvent(detail) {

    const startedAt =
        performance.now();

    activeAirRaid = {
        vehicle: detail.vehicle,
        startedAt,
        flightDurationMs:
            (
                Math.max(
                    ...detail.bombs.map(b => b.delay)
                ) + 2.2
            ) * 1000,
        bombs: detail.bombs.map(bomb => ({
            x: bomb.x,
            y: bomb.y,
            triggerAt: startedAt + bomb.delay * 1000,
            exploded: false,
            explodedAt: 0,
        })),
    };
}

function drawVehicleSilhouette(
    vehicle,
    screenX,
    screenY,
    angle
) {

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(18, 22, 20, 0.88)";

    if (vehicle === "ufo") {

        ctx.beginPath();
        ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, -8, 15, 11, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(120, 220, 255, 0.55)";
        ctx.beginPath();
        ctx.ellipse(0, 2, 30, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    else {

        // Avião: fuselagem + asas simples, visto de cima.
        ctx.beginPath();
        ctx.moveTo(38, 0);
        ctx.lineTo(-30, -5);
        ctx.lineTo(-22, 0);
        ctx.lineTo(-30, 5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 28);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function updateAndDrawAirRaid() {

    if (!activeAirRaid) {
        return;
    }

    const elapsed =
        performance.now() - activeAirRaid.startedAt;

    const progress =
        elapsed / activeAirRaid.flightDurationMs;

    // Veículo cruza a tela de um lado ao outro (só decorativo).
    if (progress <= 1) {

        const screenX =
            -80 + progress * (VIEW_WIDTH + 160);

        const screenY =
            70 +
            Math.sin(progress * Math.PI) * 26;

        drawVehicleSilhouette(
            activeAirRaid.vehicle,
            screenX,
            screenY,
            0
        );
    }

    const now =
        performance.now();

    let allDone = true;

    for (const bomb of activeAirRaid.bombs) {

        if (bomb.exploded && now - bomb.explodedAt > 900) {
            continue;
        }

        allDone = false;

        const screenX =
            worldToScreenX(bomb.x);

        const screenY =
            worldToScreenY(bomb.y);

        if (
            screenX < -60 || screenX > VIEW_WIDTH + 60 ||
            screenY < -60 || screenY > VIEW_HEIGHT + 60
        ) {

            if (!bomb.exploded && now >= bomb.triggerAt) {
                bomb.exploded = true;
                bomb.explodedAt = now;
            }

            continue;
        }

        if (!bomb.exploded) {

            const countdown =
                Math.max(0, bomb.triggerAt - now);

            const countdownRatio =
                Math.max(0, Math.min(1, countdown / (AIRRAID_TELEGRAPH_MS)));

            const pulseSpeed =
                40 + (1 - countdownRatio) * 140;

            const pulse =
                (Math.sin(now / pulseSpeed) + 1) / 2;

            ctx.save();
            ctx.strokeStyle =
                `rgba(255, 60, 40, ${0.5 + pulse * 0.4})`;
            ctx.lineWidth = 3;

            const radius =
                14 + countdownRatio * 30;

            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle =
                `rgba(255, 60, 40, ${0.18 + pulse * 0.12})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            if (now >= bomb.triggerAt) {
                bomb.exploded = true;
                bomb.explodedAt = now;

                createImpactParticles(bomb.x, bomb.y);
                createImpactParticles(bomb.x, bomb.y);

                playBombSound();
            }
        }
        else {

            const sinceExplosion =
                now - bomb.explodedAt;

            const ringAlpha =
                Math.max(0, 1 - sinceExplosion / 500);

            if (ringAlpha > 0) {

                ctx.save();
                ctx.strokeStyle =
                    `rgba(255, 200, 120, ${ringAlpha})`;
                ctx.lineWidth = 4;

                ctx.beginPath();
                ctx.arc(
                    screenX,
                    screenY,
                    18 + (sinceExplosion / 500) * 60,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    if (progress > 1 && allDone) {
        activeAirRaid = null;
    }
}


function updateCamera() {

    let cameraTarget =
        localPlayer;


    if (
        serverMatchState &&
        localPlayer &&
        !localPlayer.alive
    ) {

        let spectatorTarget =
            participants.find(
                participant =>
                    participant.alive &&
                    participant.id ===
                    spectatorTargetId
            );


        if (
            !spectatorTarget
        ) {

            spectatorTarget =
                participants.find(
                    participant =>
                        participant.alive
                );


            spectatorTargetId =
                spectatorTarget
                    ? spectatorTarget.id
                    : null;
        }


        if (
            spectatorTarget
        ) {
            cameraTarget =
                spectatorTarget;
        }
    }


    if (
        !cameraTarget
    ) {
        return;
    }


    camera.x =
        cameraTarget.x -
        VIEW_WIDTH / 2;


    camera.y =
        cameraTarget.y -
        VIEW_HEIGHT / 2;


    camera.x =
        Math.max(

            0,

            Math.min(

                camera.x,

                WORLD_WIDTH -
                VIEW_WIDTH
            )
        );


    camera.y =
        Math.max(

            0,

            Math.min(

                camera.y,

                WORLD_HEIGHT -
                VIEW_HEIGHT
            )
        );


    // Tremor da atmosfera: aplicado por cima, depois do
    // enquadramento normal — puro efeito visual de câmera.
    camera.x += currentAtmosphere.shakeX;
    camera.y += currentAtmosphere.shakeY;
}


function worldToScreenX(
    worldX
) {

    return (
        worldX -
        camera.x
    );
}


function worldToScreenY(
    worldY
) {

    return (
        worldY -
        camera.y
    );
}


// ==========================================================
// SPAWNS
// ==========================================================
//
// Temos 20 regiões de nascimento.
// Futuramente o servidor será o responsável por isso.
// ==========================================================

const spawnPoints = [

    { x: 450, y: 450 },

    { x: 1500, y: 450 },

    { x: 2600, y: 450 },

    { x: 3700, y: 450 },

    { x: 4800, y: 450 },


    { x: 800, y: 1150 },

    { x: 2000, y: 1150 },

    { x: 3100, y: 1150 },

    { x: 4200, y: 1150 },

    { x: 5450, y: 1150 },


    { x: 650, y: 2200 },

    { x: 1800, y: 2200 },

    { x: 2900, y: 2200 },

    { x: 4100, y: 2200 },

    { x: 5350, y: 2200 },


    { x: 450, y: 3000 },

    { x: 1600, y: 3000 },

    { x: 2900, y: 3000 },

    { x: 4300, y: 3000 },

    { x: 5600, y: 3000 }
];


// ==========================================================
// EMBARALHAR ARRAY
// ==========================================================

function shuffleArray(array) {

    const copy =
        [...array];


    for (

        let i =
            copy.length - 1;

        i > 0;

        i--

    ) {

        const j =
            Math.floor(

                Math.random() *
                (i + 1)
            );


        [
            copy[i],
            copy[j]

        ] = [

            copy[j],
            copy[i]
        ];
    }


    return copy;
}


// ==========================================================
// SKINS DISPONÍVEIS
// ==========================================================

const tankSkins = [

    "azul",

    "vermelho",

    "bege",

    "escuro"
];


function randomSkin() {

    return tankSkins[

        Math.floor(

            Math.random() *
            tankSkins.length
        )
    ];
}


// ==========================================================
// PARTICIPANTES
// ==========================================================

let participants = [];

let localPlayer = null;


// ==========================================================
// CRIAR PARTICIPANTES
// ==========================================================
//
// POR ENQUANTO:
//
// ALUNO
// +
// BOT 01 até BOT 19
//
// Quando tivermos backend:
//
// jogadores reais entram primeiro
// e os bots completam as vagas.
// ==========================================================

function createParticipants() {

    participants = [];


    if (
        serverMatchState &&
        Array.isArray(
            serverMatchState.participants
        )
    ) {

        const localClientId =
            window.battleTankNetwork
                ?.clientId;


        for (
            const source
            of serverMatchState.participants
        ) {

            const isLocal =
                source.id ===
                localClientId;


            const spawn =
                source.spawn || {
                    x: WORLD_WIDTH / 2,
                    y: WORLD_HEIGHT / 2
                };


            const participant = {

                id:
                    source.id,

                name:
                    source.name,

                type:
                    source.type,

                local:
                    isLocal,

                x:
                    Number(
                        source.x ??
                        spawn.x
                    ),

                y:
                    Number(
                        source.y ??
                        spawn.y
                    ),

                width:
                    72,

                height:
                    128,

                collisionRadius:
                    29,

                speed:
                    Number(
                        source.speed ??
                        4.5
                    ),

                bulletSpeed:
                    Number(
                        source.bulletSpeed ??
                        13
                    ),

                fireRate:
                    Number(
                        source.fireRate ??
                        260
                    ),

                angle:
                    Number(
                        source.angle ??
                        0
                    ),

                skin:
                    source.skin ||
                    "azul",

                life:
                    Number(
                        source.life ??
                        100
                    ),

                alive:
                    source.alive !== false,

                kills:
                    Number(
                        source.kills ??
                        0
                    )
            };


            if (
                source.type ===
                "bot"
            ) {

                const aiSource =
                    source.ai || {};


                participant.ai = {

                    targetX:
                        spawn.x,

                    targetY:
                        spawn.y,

                    changeTargetAt:
                        0,

                    targetId:
                        null,

                    lastShot:
                        0,

                    detectionRange:
                        Number(
                            aiSource.detectionRange ??
                            1200
                        ),

                    attackRange:
                        Number(
                            aiSource.attackRange ??
                            900
                        ),

                    preferredDistance:
                        Number(
                            aiSource.preferredDistance ??
                            360
                        ),

                    aimError:
                        Number(
                            aiSource.aimError ??
                            0.04
                        ),

                    evadeDirection:
                        Number(
                            aiSource.evadeDirection ??
                            1
                        )
                };
            }


            participants.push(
                participant
            );


            if (
                isLocal
            ) {

                localPlayer =
                    participant;
            }
        }


        if (
            !localPlayer
        ) {

            console.error(
                "Jogador local não encontrado no estado da partida.",
                localClientId,
                serverMatchState
            );

            return;
        }


        console.log(
            "Participantes recebidos do servidor:",
            participants
        );

        return;
    }


    // Fallback de desenvolvimento local.
    const randomizedSpawns =
        shuffleArray(
            spawnPoints
        );


    localPlayer = {

        id:
            "player_local",

        name:
            "ALUNO",

        type:
            "human",

        local:
            true,

        x:
            randomizedSpawns[0].x,

        y:
            randomizedSpawns[0].y,

        width:
            72,

        height:
            128,

        collisionRadius:
            29,

        speed:
            playerProgress.speed,

        bulletSpeed:
            playerProgress.bulletSpeed,

        fireRate:
            playerProgress.fireRate,

        angle:
            0,

        skin:
            playerProgress.skin || "azul",

        life:
            100,

        alive:
            true,

        kills:
            0
    };


    participants.push(
        localPlayer
    );


    for (
        let i = 1;
        i < MAX_PLAYERS;
        i++
    ) {

        const botNumber =
            String(i)
                .padStart(
                    2,
                    "0"
                );


        const spawn =
            randomizedSpawns[i];


        participants.push({

            id:
                `bot_${botNumber}`,

            name:
                `BOT ${botNumber}`,

            type:
                "bot",

            local:
                false,

            x:
                spawn.x,

            y:
                spawn.y,

            width:
                72,

            height:
                128,

            collisionRadius:
                29,

            speed:
                3.2 +
                Math.random() *
                0.8,

            bulletSpeed:
                10.5 +
                Math.random() *
                2.5,

            fireRate:
                700 +
                Math.random() *
                450,

            angle:
                Math.random() *
                Math.PI *
                2,

            skin:
                randomSkin(),

            life:
                100,

            alive:
                true,

            kills:
                0,

            ai: {

                targetX:
                    spawn.x,

                targetY:
                    spawn.y,

                changeTargetAt:
                    0,

                targetId:
                    null,

                lastShot:
                    0,

                detectionRange:
                    1050 +
                    Math.random() *
                    350,

                attackRange:
                    900,

                preferredDistance:
                    320 +
                    Math.random() *
                    120,

                aimError:
                    0.025 +
                    Math.random() *
                    0.045,

                evadeDirection:
                    Math.random() < 0.5
                        ? -1
                        : 1
            }
        });
    }


    console.log(
        "Participantes locais:",
        participants
    );
}


// ==========================================================
// BARREIRAS
// ==========================================================
//
// Esses valores são INICIAIS.
//
// Como as 7 imagens têm geometrias diferentes,
// depois vamos calibrando com H.
// ==========================================================

const barrierTypes = {

    barrier1: {

        image:
            "barrier1",

        width:
            330,

        height:
            330,

        hitbox: {

            x:
                0.08,

            y:
                0.38,

            width:
                0.84,

            height:
                0.28
        }
    },


    barrier2: {

        image:
            "barrier2",

        width:
            310,

        height:
            310,

        hitbox: {

            x:
                0.08,

            y:
                0.40,

            width:
                0.84,

            height:
                0.23
        }
    },


    // DESTROÇO DE AVIÃO

    barrier4: {

        image:
            "barrier4",

        width:
            430,

        height:
            430,

        hitbox: {

            x:
                0.12,

            y:
                0.25,

            width:
                0.76,

            height:
                0.52
        }
    },


    // CONSTRUÇÃO

    barrier5: {

        image:
            "barrier5",

        width:
            360,

        height:
            360,

        hitbox: {

            x:
                0.18,

            y:
                0.18,

            width:
                0.64,

            height:
                0.64
        }
    },


    // DISCO VOADOR

    barrier7: {

        image:
            "barrier7",

        width:
            320,

        height:
            320,

        hitbox: {

            x:
                0.20,

            y:
                0.20,

            width:
                0.60,

            height:
                0.60
        }
    },


    // FORMAÇÃO ROCHOSA

    barrier8: {

        image:
            "barrier8",

        width:
            340,

        height:
            340,

        hitbox: {

            x:
                0.12,

            y:
                0.22,

            width:
                0.76,

            height:
                0.58
        }
    },


    // TRINCHEIRA / BARRICADA

    barrier9: {

        image:
            "barrier9",

        width:
            420,

        height:
            240,

        hitbox: {

            x:
                0.06,

            y:
                0.34,

            width:
                0.88,

            height:
                0.34
        }
    },


    // CRATERA / DESTROÇO CIRCULAR

    barrier10: {

        image:
            "barrier10",

        width:
            330,

        height:
            330,

        hitbox: {

            x:
                0.16,

            y:
                0.16,

            width:
                0.68,

            height:
                0.68
        }
    }
};


// ==========================================================
// CATÁLOGO ATIVO DE BARREIRAS (tamanho + hitbox)
// ==========================================================
// Em partida real, o servidor manda o catálogo completo
// (todas as variantes, incluindo as novas) em cada match_start.
// `barrierTypes` acima fica só como fallback do modo offline
// (sem servidor), que continua usando as 8 barreiras originais.
let activeBarrierCatalog = barrierTypes;

function buildBarrierCatalogFromServer(serverCatalog) {
    if (!serverCatalog) {
        return null;
    }

    const catalog = {};

    for (const typeName of Object.keys(serverCatalog)) {
        const entry = serverCatalog[typeName];

        catalog[typeName] = {
            image: entry.image,
            width: entry.width,
            height: entry.height,
            hitbox: {
                x: entry.hitbox.x,
                y: entry.hitbox.y,
                width: entry.hitbox.width,
                height: entry.hitbox.height,
            },
        };
    }

    return catalog;
}


const barrierTypeNames = [

    "barrier1",

    "barrier2",

    "barrier4",

    "barrier5",

    "barrier7",

    "barrier8",

    "barrier9",

    "barrier10"
];


// ==========================================================
// ÁRVORES / COBERTURA DE EMBOSCADA
// ==========================================================
//
// As árvores são propositalmente separadas das barreiras:
// - o tanque pode atravessar a copa;
// - não existe colisão com a árvore;
// - a copa é desenhada DEPOIS dos tanques;
// - para adversários, o tanque fica escondido;
// - quando o jogador local entra na copa, ela fica levemente
//   transparente apenas na tela dele para permitir orientação.
// ==========================================================

const treeTypes = {

    tree1: {

        image:
            "tree1",

        width:
            300,

        height:
            300
    },


    tree2: {

        image:
            "tree2",

        width:
            520,

        height:
            260
    }
};


const treeTypeNames = [

    "tree1",

    "tree1",

    "tree2"
];


let barriers = [];

let trees = [];


// ==========================================================
// PEGAR HITBOX DA BARREIRA
// ==========================================================

function getBarrierHitbox(
    barrier
) {

    const config =
        activeBarrierCatalog[
            barrier.type
        ];


    return {

        x:

            barrier.x +

            barrier.width *
            config.hitbox.x,


        y:

            barrier.y +

            barrier.height *
            config.hitbox.y,


        width:

            barrier.width *
            config.hitbox.width,


        height:

            barrier.height *
            config.hitbox.height
    };
}


// ==========================================================
// RETÂNGULOS SE SOBREPÕEM?
// ==========================================================

function rectanglesOverlap(
    a,
    b,
    padding = 0
) {

    return !(

        a.x +
        a.width +
        padding <
        b.x

        ||

        b.x +
        b.width +
        padding <
        a.x

        ||

        a.y +
        a.height +
        padding <
        b.y

        ||

        b.y +
        b.height +
        padding <
        a.y
    );
}


// ==========================================================
// POSIÇÃO PERTO DE SPAWN?
// ==========================================================

function isNearSpawn(
    candidate
) {

    const centerX =

        candidate.x +
        candidate.width / 2;


    const centerY =

        candidate.y +
        candidate.height / 2;


    for (
        const spawn
        of spawnPoints
    ) {

        const distance =
            Math.hypot(

                centerX -
                spawn.x,

                centerY -
                spawn.y
            );


        if (
            distance < 340
        ) {

            return true;
        }
    }


    return false;
}


// ==========================================================
// GERAR OBSTÁCULOS DO MUNDO
// ==========================================================

function generateWorldObstacles() {

    barriers = [];


    // mundo muito maior:
    // podemos usar dezenas de obstáculos.

    const desiredQuantity =
        52;


    let attempts =
        0;


    const maximumAttempts =
        5000;


    while (

        barriers.length <
        desiredQuantity

        &&

        attempts <
        maximumAttempts

    ) {

        attempts++;


        const typeName =

            barrierTypeNames[

                Math.floor(

                    Math.random() *
                    barrierTypeNames.length
                )
            ];


        const config =
            barrierTypes[
                typeName
            ];


        const margin =
            80;


        const candidate = {

            type:
                typeName,

            x:

                margin +

                Math.random() *

                (
                    WORLD_WIDTH -
                    config.width -
                    margin * 2
                ),


            y:

                margin +

                Math.random() *

                (
                    WORLD_HEIGHT -
                    config.height -
                    margin * 2
                ),


            width:
                config.width,

            height:
                config.height
        };


        // NÃO COBRIR SPAWNS

        if (
            isNearSpawn(
                candidate
            )
        ) {

            continue;
        }


        // NÃO SOBREPOR OUTROS ASSETS

        let overlaps =
            false;


        for (
            const existing
            of barriers
        ) {

            if (
                rectanglesOverlap(

                    candidate,

                    existing,

                    40
                )
            ) {

                overlaps =
                    true;

                break;
            }
        }


        if (
            overlaps
        ) {

            continue;
        }


        barriers.push(
            candidate
        );
    }


    console.log(
        "Obstáculos gerados:",
        barriers.length
    );
}


// ==========================================================
// GERAR ÁRVORES DO MUNDO
// ==========================================================
//
// Árvores NÃO entram na lista `barriers`.
// Portanto não participam de nenhuma colisão.
// ==========================================================

function generateWorldTrees() {

    trees = [];


    const desiredQuantity =
        13;


    let attempts =
        0;


    const maximumAttempts =
        3000;


    const margin =
        70;


    while (

        trees.length <
        desiredQuantity

        &&

        attempts <
        maximumAttempts

    ) {

        attempts++;


        const typeName =

            treeTypeNames[

                Math.floor(

                    Math.random() *
                    treeTypeNames.length
                )
            ];


        const config =
            treeTypes[
                typeName
            ];


        const candidate = {

            type:
                typeName,

            x:

                margin +

                Math.random() *

                (
                    WORLD_WIDTH -
                    config.width -
                    margin * 2
                ),

            y:

                margin +

                Math.random() *

                (
                    WORLD_HEIGHT -
                    config.height -
                    margin * 2
                ),

            width:
                config.width,

            height:
                config.height
        };


        // Evitar que alguém nasça completamente coberto.

        if (
            isNearSpawn(
                candidate
            )
        ) {

            continue;
        }


        // Não desenhar copas por cima de obstáculos sólidos.

        let blocked =
            false;


        for (
            const barrier
            of barriers
        ) {

            if (
                rectanglesOverlap(
                    candidate,
                    barrier,
                    20
                )
            ) {

                blocked =
                    true;

                break;
            }
        }


        if (
            blocked
        ) {

            continue;
        }


        // Evitar árvores empilhadas umas nas outras.

        for (
            const existing
            of trees
        ) {

            if (
                rectanglesOverlap(
                    candidate,
                    existing,
                    -25
                )
            ) {

                blocked =
                    true;

                break;
            }
        }


        if (
            blocked
        ) {

            continue;
        }


        trees.push(
            candidate
        );
    }


    console.log(
        "Árvores de cobertura geradas:",
        trees.length
    );
}


// ==========================================================
// COLISÃO CÍRCULO x RETÂNGULO
// ==========================================================

function circleRectangleCollision(

    circleX,

    circleY,

    radius,

    rectangle

) {

    const closestX =
        Math.max(

            rectangle.x,

            Math.min(

                circleX,

                rectangle.x +
                rectangle.width
            )
        );


    const closestY =
        Math.max(

            rectangle.y,

            Math.min(

                circleY,

                rectangle.y +
                rectangle.height
            )
        );


    const distanceX =
        circleX -
        closestX;


    const distanceY =
        circleY -
        closestY;


    return (

        distanceX *
        distanceX

        +

        distanceY *
        distanceY

    ) <

    radius *
    radius;
}


// ==========================================================
// PODE MOVER?
// ==========================================================
//
// A colisão entre tanques é apenas física. Encostar em outro
// tanque bloqueia a passagem, mas NÃO causa dano.
// ==========================================================

const TANK_TO_TANK_PADDING = 10;

function canParticipantMoveTo(
    participant,
    x,
    y
) {

    const radius =
        participant.collisionRadius;


    // ------------------------------------------------------
    // LIMITES DO MUNDO
    // ------------------------------------------------------

    if (
        x - radius < 0
        ||
        y - radius < 0
        ||
        x + radius > WORLD_WIDTH
        ||
        y + radius > WORLD_HEIGHT
    ) {
        return false;
    }


    // ------------------------------------------------------
    // COLISÃO COM OBSTÁCULOS
    // ------------------------------------------------------

    for (
        const barrier
        of barriers
    ) {

        const box =
            getBarrierHitbox(
                barrier
            );


        if (
            circleRectangleCollision(
                x,
                y,
                radius,
                box
            )
        ) {
            return false;
        }
    }


    // ------------------------------------------------------
    // COLISÃO TANQUE x TANQUE
    // ------------------------------------------------------

    for (
        const other
        of participants
    ) {

        if (
            other === participant
            ||
            !other.alive
        ) {
            continue;
        }


        const minimumDistance =
            radius +
            other.collisionRadius +
            TANK_TO_TANK_PADDING;


        const distance =
            Math.hypot(
                x - other.x,
                y - other.y
            );


        if (
            distance < minimumDistance
        ) {
            return false;
        }
    }


    return true;
}


// ==========================================================
// MOUSE
// ==========================================================

const mouse = {

    x:
        VIEW_WIDTH / 2,

    y:
        VIEW_HEIGHT / 2,

    worldX:
        0,

    worldY:
        0,

    inside:
        false
};


canvas.addEventListener(

    "mousemove",

    event => {

        const rect =
            canvas.getBoundingClientRect();


        const scaleX =
            canvas.width /
            rect.width;


        const scaleY =
            canvas.height /
            rect.height;


        mouse.x =

            (
                event.clientX -
                rect.left
            )

            *

            scaleX;


        mouse.y =

            (
                event.clientY -
                rect.top
            )

            *

            scaleY;


        mouse.worldX =
            mouse.x +
            camera.x;


        mouse.worldY =
            mouse.y +
            camera.y;


        mouse.inside =
            true;
    }
);


canvas.addEventListener(

    "mouseleave",

    () => {

        mouse.inside =
            false;
    }
);


canvas.addEventListener(

    "contextmenu",

    event => {

        event.preventDefault();
    }
);


// ==========================================================
// TECLADO
// ==========================================================

const keys = {};

window.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    keys[key] = true;


    // impedir que as setas rolem a página
    if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
    ) {
        event.preventDefault();
    }



    // hitboxes

    if (
        key === "h" &&
        !event.repeat
    ) {

        showHitboxes =
            !showHitboxes;

        showGameMessage(
            showHitboxes
                ? "HITBOXES ATIVADAS"
                : "HITBOXES DESATIVADAS"
        );
    }


    // nova rodada

    if (
        key === "r" &&
        !event.repeat
    ) {

        if (
            serverMatchState
        ) {
            showGameMessage(
                "NOVA RODADA CONTROLADA PELO PROFESSOR"
            );
        }
        else {
            startNewRound();
        }
    }


    // espaço também dispara

    if (
        event.code === "Space" &&
        !event.repeat
    ) {

        event.preventDefault();

        if (
            gameReady &&
            localPlayer &&
            localPlayer.alive
        ) {
            shoot();
        }
    }
});


window.addEventListener("keyup", event => {

    keys[event.key.toLowerCase()] = false;
});




// ==========================================================
// MOVIMENTO DO JOGADOR
// ==========================================================
//
// Permite 8 direções. Quando duas teclas são pressionadas,
// o vetor é normalizado para a diagonal não ficar mais rápida.
// O corpo do tanque aponta para a direção do deslocamento.
// ==========================================================

function getCurrentMoveInput() {

    let moveX = 0;
    let moveY = 0;


    if (
        keys["arrowup"] ||
        keys["w"]
    ) {
        moveY -= 1;
    }


    if (
        keys["arrowdown"] ||
        keys["s"]
    ) {
        moveY += 1;
    }


    if (
        keys["arrowleft"] ||
        keys["a"]
    ) {
        moveX -= 1;
    }


    if (
        keys["arrowright"] ||
        keys["d"]
    ) {
        moveX += 1;
    }


    const length =
        Math.hypot(
            moveX,
            moveY
        );


    if (
        length > 0
    ) {
        moveX /= length;
        moveY /= length;
    }


    return {
        moveX,
        moveY
    };
}


function sendMovementIntent(
    moveX,
    moveY
) {

    if (
        !serverMatchState ||
        !window.battleTankNetwork ||
        window.battleTankNetwork.role !== "player"
    ) {
        return;
    }


    const now =
        performance.now();


    const signature =
        `${moveX.toFixed(3)},${moveY.toFixed(3)}`;


    const changed =
        signature !==
        lastMovementSignature;


    if (
        !changed &&
        now - lastMovementSentAt <
        MOVEMENT_SEND_INTERVAL_MS
    ) {
        return;
    }


    movementSequence++;


    window.battleTankNetwork
        .sendPlayerInput(
            moveX,
            moveY,
            movementSequence
        );


    lastMovementSignature =
        signature;


    lastMovementSentAt =
        now;
}


function applyServerMatchState(
    detail
) {

    if (
        !detail ||
        !Array.isArray(
            detail.players
        )
    ) {
        return;
    }


    if (
        serverMatchState &&
        detail.match_id &&
        serverMatchState.match_id &&
        detail.match_id !==
        serverMatchState.match_id
    ) {
        return;
    }


    for (
        const state
        of detail.players
    ) {

        const participant =
            participants.find(
                item =>
                    item.id ===
                    state.id
            );


        if (
            !participant
        ) {
            continue;
        }


        const serverX =
            Number(
                state.x
            );


        const serverY =
            Number(
                state.y
            );


        const serverAngle =
            Number(
                state.angle
            );


        if (
            participant.local &&
            participant.type === "human"
        ) {

            const distance =
                Math.hypot(
                    serverX -
                    participant.x,

                    serverY -
                    participant.y
                );


            // Predição local para resposta imediata.
            // Se houver divergência grande, o servidor vence.
            if (
                distance >
                90
            ) {
                participant.x =
                    serverX;

                participant.y =
                    serverY;
            }
            else {
                participant.x +=
                    (
                        serverX -
                        participant.x
                    )
                    *
                    0.14;

                participant.y +=
                    (
                        serverY -
                        participant.y
                    )
                    *
                    0.14;
            }
        }
        else {

            // Jogadores remotos são suavizados.
            participant.x +=
                (
                    serverX -
                    participant.x
                )
                *
                0.45;

            participant.y +=
                (
                    serverY -
                    participant.y
                )
                *
                0.45;
        }


        if (
            Number.isFinite(
                serverAngle
            )
        ) {

            if (
                !Number.isFinite(
                    participant.angle
                )
            ) {
                participant.angle =
                    serverAngle;
            }
            else {

                // Caminho mais curto (evita girar "pelo lado errado"
                // quando o ângulo cruza de +180° para -180°).
                let angleDiff =
                    serverAngle - participant.angle;

                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                participant.angle +=
                    angleDiff * 0.35;
            }
        }


        const wasAlive =
            participant.alive;


        if (
            typeof state.alive ===
            "boolean"
        ) {
            participant.alive =
                state.alive;
        }


        if (
            participant.local &&
            wasAlive &&
            !participant.alive
        ) {

            spectatorTargetId =
                null;


            showGameMessage(
                "VOCÊ FOI ELIMINADO • MODO ESPECTADOR"
            );
        }


        if (
            Number.isFinite(
                Number(
                    state.life
                )
            )
        ) {
            const newLife =
                Number(state.life);

            const previousLife =
                Number.isFinite(participant.life)
                    ? participant.life
                    : newLife;

            // Vida caiu = levou um tiro (seja o tanque local ou
            // outro). O servidor é quem decide isso; o cliente só
            // reage ao que já aconteceu, mostrando o efeito e o som.
            if (
                newLife < previousLife &&
                participant.alive
            ) {

                createImpactParticles(
                    participant.x,
                    participant.y
                );

                playImpactSound();
            }

            participant.life =
                newLife;
        }


        if (
            Number.isFinite(
                Number(
                    state.kills
                )
            )
        ) {
            participant.kills =
                Number(
                    state.kills
                );
        }


        participant.invincible =
            Boolean(state.invincible);

        participant.quadShot =
            Boolean(state.quadShot);

        participant.speedBoost =
            Boolean(state.speedBoost);
    }

    // ======================================================
    // PROJÉTEIS OFICIAIS DO SERVIDOR
    // ======================================================
    //
    // Este bloco PRECISA ficar aqui, pois `detail` é o
    // snapshot recebido no evento match_state.
    //
    // A versão anterior colocou este trecho por engano em
    // updateLocalPlayer(), onde `detail` não existe. Isso
    // gerava ReferenceError assim que o aluno tentava andar
    // e parava o requestAnimationFrame.
    // ======================================================

    if (
        Array.isArray(
            detail.bullets
        )
    ) {

        bullets.length =
            0;


        for (
            const serverBullet
            of detail.bullets
        ) {

            bullets.push({
                id:
                    serverBullet.id,

                ownerId:
                    serverBullet.owner_id,

                x:
                    Number(
                        serverBullet.x
                    ),

                y:
                    Number(
                        serverBullet.y
                    ),

                angle:
                    Number(
                        serverBullet.angle
                    ),

                speed:
                    Number(
                        serverBullet.speed
                    ),

                radius:
                    Number(
                        serverBullet.radius
                    ) || 4,

                serverControlled:
                    true
            });
        }
    }


    if (
        Array.isArray(
            detail.powerups
        )
    ) {

        const previousPowerups =
            powerups.slice();

        powerups.length =
            0;

        for (
            const serverPowerup
            of detail.powerups
        ) {

            powerups.push({
                id:
                    serverPowerup.id,

                type:
                    serverPowerup.type,

                x:
                    Number(
                        serverPowerup.x
                    ),

                y:
                    Number(
                        serverPowerup.y
                    ),
            });
        }


        // Um power-up que sumiu perto do jogador local = foi ele
        // quem pegou. É só um efeito de som local, então uma
        // aproximação por distância é suficiente aqui.
        if (localPlayer) {

            const stillHere =
                new Set(
                    powerups.map(p => p.id)
                );

            for (
                const oldPowerup
                of previousPowerups
            ) {

                if (stillHere.has(oldPowerup.id)) {
                    continue;
                }

                const distance =
                    Math.hypot(
                        localPlayer.x - oldPowerup.x,
                        localPlayer.y - oldPowerup.y
                    );

                if (distance <= 90) {
                    playPowerupSound();
                    break;
                }
            }
        }
    }

}


function showMatchEndedOverlay(
    detail
) {

    gameReady =
        false;


    const existing =
        document.getElementById(
            "battleMatchEndedOverlay"
        );


    if (
        existing
    ) {
        existing.remove();
    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "battleMatchEndedOverlay";


    overlay.style.position =
        "fixed";

    overlay.style.inset =
        "0";

    overlay.style.zIndex =
        "9999";

    overlay.style.display =
        "flex";

    overlay.style.alignItems =
        "center";

    overlay.style.justifyContent =
        "center";

    overlay.style.background =
        "rgba(3, 6, 3, 0.86)";

    overlay.style.color =
        "#ffffff";

    overlay.style.fontFamily =
        "Arial, Helvetica, sans-serif";

    overlay.style.textAlign =
        "center";


    const winner =
        detail?.winner;


    const title =
        winner
            ? "FIM DA BATALHA"
            : "PARTIDA ENCERRADA";


    const subtitle =
        winner
            ? `VENCEDOR: ${winner.name}`
            : "ENCERRADA PELO PROFESSOR";


    overlay.innerHTML =
        `
            <div style="
                width:min(620px,90vw);
                padding:42px;
                border:1px solid #5b6a5b;
                border-radius:14px;
                background:#141a14;
                box-shadow:0 25px 70px rgba(0,0,0,.65);
            ">
                <div style="
                    font-size:13px;
                    letter-spacing:3px;
                    color:#8da08d;
                    margin-bottom:12px;
                ">
                    BATTLE TANK EMTI
                </div>

                <h2 style="
                    margin:0 0 14px;
                    font-size:34px;
                    letter-spacing:2px;
                ">
                    ${title}
                </h2>

                <div style="
                    font-size:22px;
                    font-weight:bold;
                    color:#dce6d9;
                ">
                    ${subtitle}
                </div>

                ${
                    winner
                        ? `
                            <div style="
                                margin-top:12px;
                                color:#9faa9f;
                            ">
                                ${winner.kills ?? 0} eliminações
                            </div>
                        `
                        : ""
                }
            </div>
        `;


    document.body.appendChild(
        overlay
    );
}


function updateLocalPlayer() {

    if (
        !localPlayer ||
        !localPlayer.alive
    ) {

        updateEngineSound(false);


        if (
            serverMatchState
        ) {
            sendMovementIntent(
                0,
                0
            );
        }

        return;
    }


    const input =
        getCurrentMoveInput();


    const moveX =
        input.moveX;


    const moveY =
        input.moveY;


    updateEngineSound(
        moveX !== 0 || moveY !== 0
    );


    if (
        serverMatchState
    ) {
        sendMovementIntent(
            moveX,
            moveY
        );
    }


    if (
        moveX === 0 &&
        moveY === 0
    ) {
        return;
    }


    // Predição local: gira suavemente até a direção do movimento,
    // em vez de "pular" direto pro ângulo (fica mais natural,
    // principalmente nas diagonais). A posição/ângulo oficiais
    // continuam sendo corrigidos pelo servidor.
    const targetAngle =
        Math.atan2(
            moveY,
            moveX
        )
        +
        Math.PI / 2;

    if (
        !Number.isFinite(
            localPlayer.angle
        )
    ) {
        localPlayer.angle =
            targetAngle;
    }

    let angleDiff =
        targetAngle - localPlayer.angle;

    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const maxTurnPerFrame =
        0.23;

    angleDiff =
        Math.max(
            -maxTurnPerFrame,
            Math.min(maxTurnPerFrame, angleDiff)
        );

    localPlayer.angle +=
        angleDiff;


    // Mesmo multiplicador do power-up de velocidade no servidor
    // (POWERUP_SPEED_MULTIPLIER no main.py). Sem isso, a predição
    // local anda mais devagar que o servidor enquanto o power-up
    // está ativo, e a divergência acumulada causa um "teleporte"
    // de correção repetido — parece travamento.
    const speedMultiplier =
        localPlayer.speedBoost ? 1.6 : 1.0;

    const stepX =
        moveX *
        localPlayer.speed *
        speedMultiplier;


    const stepY =
        moveY *
        localPlayer.speed *
        speedMultiplier;


    if (
        stepX !== 0 &&
        canParticipantMoveTo(
            localPlayer,
            localPlayer.x + stepX,
            localPlayer.y
        )
    ) {
        localPlayer.x += stepX;
    }


    if (
        stepY !== 0 &&
        canParticipantMoveTo(
            localPlayer,
            localPlayer.x,
            localPlayer.y + stepY
        )
    ) {
        localPlayer.y += stepY;
    }
}


// ==========================================================
// IA DOS BOTS
// ==========================================================
//
// Os bots agora:
// - procuram o inimigo vivo mais próximo;
// - perseguem humanos e outros bots;
// - recuam quando ficam perto demais;
// - evitam obstáculos/tanques;
// - verificam linha de visão;
// - miram e disparam com pequena imprecisão.
// ==========================================================

function chooseBotTarget(
    bot
) {

    bot.ai.targetId = null;


    bot.ai.targetX =
        200 +
        Math.random() *
        (
            WORLD_WIDTH -
            400
        );


    bot.ai.targetY =
        200 +
        Math.random() *
        (
            WORLD_HEIGHT -
            400
        );


    bot.ai.changeTargetAt =
        performance.now() +
        2500 +
        Math.random() *
        3500;
}


function findClosestEnemy(
    bot
) {

    let closest = null;
    let closestDistance = Infinity;


    for (
        const participant
        of participants
    ) {

        if (
            !participant.alive
            ||
            participant.id === bot.id
        ) {
            continue;
        }


        const distance =
            Math.hypot(
                participant.x - bot.x,
                participant.y - bot.y
            );


        if (
            distance < closestDistance
        ) {
            closest = participant;
            closestDistance = distance;
        }
    }


    if (
        closest &&
        closestDistance <=
        bot.ai.detectionRange
    ) {
        return {
            participant: closest,
            distance: closestDistance
        };
    }


    return null;
}


function segmentIntersectsRectangle(
    x1,
    y1,
    x2,
    y2,
    rect
) {

    const dx = x2 - x1;
    const dy = y2 - y1;

    let tMin = 0;
    let tMax = 1;


    const axes = [
        {
            start: x1,
            delta: dx,
            min: rect.x,
            max: rect.x + rect.width
        },
        {
            start: y1,
            delta: dy,
            min: rect.y,
            max: rect.y + rect.height
        }
    ];


    for (
        const axis
        of axes
    ) {

        if (
            Math.abs(
                axis.delta
            ) < 0.000001
        ) {

            if (
                axis.start < axis.min
                ||
                axis.start > axis.max
            ) {
                return false;
            }

            continue;
        }


        let t1 =
            (
                axis.min -
                axis.start
            ) /
            axis.delta;


        let t2 =
            (
                axis.max -
                axis.start
            ) /
            axis.delta;


        if (
            t1 > t2
        ) {
            [t1, t2] = [t2, t1];
        }


        tMin =
            Math.max(
                tMin,
                t1
            );


        tMax =
            Math.min(
                tMax,
                t2
            );


        if (
            tMin > tMax
        ) {
            return false;
        }
    }


    return true;
}


function hasLineOfSight(
    shooter,
    target
) {

    for (
        const barrier
        of barriers
    ) {

        const box =
            getBarrierHitbox(
                barrier
            );


        if (
            segmentIntersectsRectangle(
                shooter.x,
                shooter.y,
                target.x,
                target.y,
                box
            )
        ) {
            return false;
        }
    }


    return true;
}


function moveBotVector(
    bot,
    vectorX,
    vectorY,
    faceMovement = true
) {

    const length =
        Math.hypot(
            vectorX,
            vectorY
        );


    if (
        length < 0.0001
    ) {
        return true;
    }


    const directionX =
        vectorX / length;


    const directionY =
        vectorY / length;


    if (
        faceMovement
    ) {
        bot.angle =
            Math.atan2(
                directionY,
                directionX
            )
            +
            Math.PI / 2;
    }


    const stepX =
        directionX *
        bot.speed;


    const stepY =
        directionY *
        bot.speed;


    let moved = false;


    if (
        stepX !== 0 &&
        canParticipantMoveTo(
            bot,
            bot.x + stepX,
            bot.y
        )
    ) {
        bot.x += stepX;
        moved = true;
    }


    if (
        stepY !== 0 &&
        canParticipantMoveTo(
            bot,
            bot.x,
            bot.y + stepY
        )
    ) {
        bot.y += stepY;
        moved = true;
    }


    return moved;
}


function tryBotShoot(
    bot,
    target,
    now
) {

    if (
        now -
        bot.ai.lastShot <
        bot.fireRate
    ) {
        return;
    }


    const baseAngle =
        Math.atan2(
            target.y - bot.y,
            target.x - bot.x
        );


    const aimError =
        (
            Math.random() * 2 - 1
        ) *
        bot.ai.aimError;


    bot.ai.lastShot = now;


    fireProjectile(
        bot,
        baseAngle + aimError
    );
}


// ==========================================================
// ATUALIZAR BOTS
// ==========================================================

function updateBots() {

    const now =
        performance.now();


    for (
        const bot
        of participants
    ) {

        if (
            bot.type !== "bot"
            ||
            !bot.alive
        ) {
            continue;
        }


        const enemyInfo =
            findClosestEnemy(
                bot
            );


        // --------------------------------------------------
        // ENCONTROU INIMIGO
        // --------------------------------------------------

        if (
            enemyInfo
        ) {

            const target =
                enemyInfo.participant;


            const distance =
                enemyInfo.distance;


            bot.ai.targetId =
                target.id;


            const dx =
                target.x -
                bot.x;


            const dy =
                target.y -
                bot.y;


            const targetAngle =
                Math.atan2(
                    dy,
                    dx
                );


            const visible =
                hasLineOfSight(
                    bot,
                    target
                );


            let moved = true;


            // Muito longe: aproxima.
            if (
                distance >
                bot.ai.preferredDistance +
                90
            ) {

                moved =
                    moveBotVector(
                        bot,
                        dx,
                        dy,
                        false
                    );
            }


            // Muito perto: dá ré mantendo a frente voltada
            // para o inimigo.
            else if (
                distance <
                bot.ai.preferredDistance -
                110
            ) {

                moved =
                    moveBotVector(
                        bot,
                        -dx,
                        -dy,
                        false
                    );
            }


            // Se ficou preso, tenta contornar pelo lado.
            if (
                !moved
            ) {

                const sideX =
                    -dy *
                    bot.ai.evadeDirection;


                const sideY =
                    dx *
                    bot.ai.evadeDirection;


                const escaped =
                    moveBotVector(
                        bot,
                        sideX,
                        sideY,
                        true
                    );


                if (
                    !escaped
                ) {
                    bot.ai.evadeDirection *= -1;
                    chooseBotTarget(
                        bot
                    );
                }
            }


            // Se tem linha de visão, encara o alvo e atira.
            if (
                visible &&
                distance <=
                bot.ai.attackRange
            ) {

                bot.angle =
                    targetAngle +
                    Math.PI / 2;


                tryBotShoot(
                    bot,
                    target,
                    now
                );
            }


            continue;
        }


        // --------------------------------------------------
        // SEM INIMIGO PRÓXIMO: PATRULHA
        // --------------------------------------------------

        if (
            now >
            bot.ai.changeTargetAt
            ||
            Math.hypot(
                bot.ai.targetX - bot.x,
                bot.ai.targetY - bot.y
            ) < 80
        ) {
            chooseBotTarget(
                bot
            );
        }


        const patrolX =
            bot.ai.targetX -
            bot.x;


        const patrolY =
            bot.ai.targetY -
            bot.y;


        const moved =
            moveBotVector(
                bot,
                patrolX,
                patrolY,
                true
            );


        if (
            !moved
        ) {
            bot.ai.evadeDirection *= -1;
            chooseBotTarget(
                bot
            );
        }
    }
}


// ==========================================================
// TIROS
// ==========================================================

const bullets = [];
const powerups = [];

let lastShot =
    0;


canvas.addEventListener(
    "mousedown",
    event => {

        if (
            event.button === 0
            &&
            gameReady
            &&
            localPlayer
            &&
            localPlayer.alive
        ) {
            shoot();
        }
    }
);


function fireProjectile(
    shooter,
    shotAngle
) {

    const barrelLength =
        shooter.height /
        2
        +
        5;


    const startX =
        shooter.x +
        Math.cos(
            shotAngle
        ) *
        barrelLength;


    const startY =
        shooter.y +
        Math.sin(
            shotAngle
        ) *
        barrelLength;


    bullets.push({
        ownerId:
            shooter.id,

        x:
            startX,

        y:
            startY,

        angle:
            shotAngle,

        speed:
            shooter.bulletSpeed || 12,

        radius:
            4,

        damage:
            25
    });


    createMuzzleParticles(
        startX,
        startY
    );
}


// ==========================================================
// DISPARAR - JOGADOR LOCAL
// ==========================================================

function shoot() {

    const now =
        performance.now();


    if (
        now -
        lastShot <
        localPlayer.fireRate
    ) {
        return;
    }


    lastShot =
        now;


    // Em multiplayer o servidor cria e valida o projétil.
    if (
        serverMatchState &&
        window.battleTankNetwork
    ) {

        window.battleTankNetwork
            .sendPlayerShoot();

        playShotSound();


        // Feedback imediato do cano, sem criar dano local.
        const shotAngle =
            localPlayer.angle -
            Math.PI / 2;


        const barrelLength =
            localPlayer.height /
            2
            +
            5;


        createMuzzleParticles(
            localPlayer.x +
            Math.cos(
                shotAngle
            ) *
            barrelLength,

            localPlayer.y +
            Math.sin(
                shotAngle
            ) *
            barrelLength
        );


        return;
    }


    const shotAngle =
        localPlayer.angle -
        Math.PI / 2;


    playShotSound();

    fireProjectile(
        localPlayer,
        shotAngle
    );
}


// ==========================================================
// ATUALIZAR TIROS
// ==========================================================

function updateBullets() {

    // Em partidas online, posição, colisão, dano e morte
    // das balas são controlados exclusivamente pelo FastAPI.
    if (
        serverMatchState
    ) {
        return;
    }


    for (

        let i =
            bullets.length - 1;

        i >= 0;

        i--

    ) {

        const bullet =
            bullets[i];


        bullet.x +=

            Math.cos(
                bullet.angle
            )

            *

            bullet.speed;


        bullet.y +=

            Math.sin(
                bullet.angle
            )

            *

            bullet.speed;


        // --------------------------------------------------
        // FORA DO MUNDO
        // --------------------------------------------------

        if (

            bullet.x < 0

            ||

            bullet.x >
            WORLD_WIDTH

            ||

            bullet.y < 0

            ||

            bullet.y >
            WORLD_HEIGHT

        ) {

            bullets.splice(
                i,
                1
            );

            continue;
        }


        // --------------------------------------------------
        // BARREIRAS
        // --------------------------------------------------

        let hitBarrier =
            false;


        for (
            const barrier
            of barriers
        ) {

            const box =
                getBarrierHitbox(
                    barrier
                );


            if (

                bullet.x >=
                box.x

                &&

                bullet.x <=
                box.x +
                box.width

                &&

                bullet.y >=
                box.y

                &&

                bullet.y <=
                box.y +
                box.height

            ) {

                createImpactParticles(

                    bullet.x,

                    bullet.y
                );


                hitBarrier =
                    true;


                break;
            }
        }


        if (
            hitBarrier
        ) {

            bullets.splice(
                i,
                1
            );

            continue;
        }


        // --------------------------------------------------
        // PARTICIPANTES
        // --------------------------------------------------

        let hitPlayer =
            false;


        for (
            const participant
            of participants
        ) {

            if (

                !participant.alive

                ||

                participant.id ===
                bullet.ownerId

            ) {

                continue;
            }


            const distance =
                Math.hypot(

                    participant.x -
                    bullet.x,

                    participant.y -
                    bullet.y
                );


            if (

                distance <

                participant
                    .collisionRadius

            ) {

                participant.life -=
                    bullet.damage || 25;


                createImpactParticles(

                    bullet.x,

                    bullet.y
                );


                if (
                    participant.life <= 0
                ) {

                    participant.life =
                        0;


                    participant.alive =
                        false;


                    const shooter =
                        participants.find(

                            p =>
                                p.id ===
                                bullet.ownerId
                        );


                    if (
                        shooter
                    ) {

                        shooter.kills++;
                    }


                    if (
                        bullet.ownerId ===
                        localPlayer.id
                    ) {

                        score +=
                            100;


                        showGameMessage(

                            `${participant.name} ELIMINADO`
                        );
                    }


                    if (
                        participant.local &&
                        shooter
                    ) {
                        showGameMessage(
                            `ELIMINADO POR ${shooter.name}`
                        );
                    }
                }


                hitPlayer =
                    true;


                break;
            }
        }


        if (
            hitPlayer
        ) {

            bullets.splice(
                i,
                1
            );
        }
    }
}


// ==========================================================
// PARTÍCULAS
// ==========================================================

const particles = [];


function createMuzzleParticles(
    x,
    y
) {

    for (
        let i = 0;
        i < 10;
        i++
    ) {

        particles.push({

            x:
                x,

            y:
                y,

            vx:
                Math.random() *
                5 -
                2.5,

            vy:
                Math.random() *
                5 -
                2.5,

            size:
                Math.random() *
                4 +
                2,

            life:
                1,

            type:
                "fire"
        });
    }
}


function createImpactParticles(
    x,
    y
) {

    for (
        let i = 0;
        i < 20;
        i++
    ) {

        particles.push({

            x:
                x,

            y:
                y,

            vx:
                Math.random() *
                8 -
                4,

            vy:
                Math.random() *
                8 -
                4,

            size:
                Math.random() *
                5 +
                2,

            life:
                1,

            type:
                "impact"
        });
    }
}


// ==========================================================
// POEIRA ATRÁS DOS TANQUES EM MOVIMENTO
// ==========================================================

const dustTrailLastPos = new Map();

function createDustParticles(
    x,
    y
) {

    for (
        let i = 0;
        i < 2;
        i++
    ) {

        particles.push({

            x:
                x +
                (Math.random() * 14 - 7),

            y:
                y +
                (Math.random() * 14 - 7),

            vx:
                Math.random() * 1.1 - 0.55,

            vy:
                Math.random() * 1.1 - 0.55,

            size:
                Math.random() * 7 + 5,

            life:
                1,

            fade:
                0.018,

            type:
                "dust"
        });
    }
}

function maybeSpawnDustTrail(
    participant
) {

    const previous =
        dustTrailLastPos.get(
            participant.id
        );

    dustTrailLastPos.set(
        participant.id,
        { x: participant.x, y: participant.y }
    );

    if (!previous) {
        return;
    }

    const dx =
        participant.x - previous.x;

    const dy =
        participant.y - previous.y;

    const distance =
        Math.hypot(dx, dy);

    // Só levanta poeira quando o tanque está de fato andando.
    if (distance < 0.6) {
        return;
    }

    // Um pouco de aleatoriedade pra não ficar um rastro contínuo demais.
    if (Math.random() > 0.55) {
        return;
    }

    const travelAngle =
        Math.atan2(dy, dx);

    const rearOffset =
        (participant.height || 58) / 2;

    createDustParticles(
        participant.x -
        Math.cos(travelAngle) * rearOffset * 0.7,

        participant.y -
        Math.sin(travelAngle) * rearOffset * 0.7
    );
}


function updateParticles() {

    for (

        let i =
            particles.length - 1;

        i >= 0;

        i--

    ) {

        const particle =
            particles[i];


        particle.x +=
            particle.vx;


        particle.y +=
            particle.vy;


        particle.vx *=
            0.94;


        particle.vy *=
            0.94;


        particle.life -=
            (particle.fade || 0.04);


        if (
            particle.life <= 0
        ) {

            particles.splice(
                i,
                1
            );
        }
    }
}


// ==========================================================
// NOVA RODADA
// ==========================================================

function startNewRound() {

    roundNumber++;


    if (
        serverMatchState
    ) {

        currentTerrainName =
            serverMatchState.terrain ||
            "mapa1";


        barriers =
            Array.isArray(
                serverMatchState.obstacles
            )
                ? serverMatchState.obstacles.map(
                    obstacle => ({
                        type:
                            obstacle.type,

                        x:
                            Number(
                                obstacle.x
                            ),

                        y:
                            Number(
                                obstacle.y
                            ),

                        width:
                            Number(
                                obstacle.width
                            ),

                        height:
                            Number(
                                obstacle.height
                            )
                    })
                )
                : [];


        trees =
            Array.isArray(
                serverMatchState.trees
            )
                ? serverMatchState.trees.map(
                    tree => ({
                        type:
                            tree.type,

                        x:
                            Number(
                                tree.x
                            ),

                        y:
                            Number(
                                tree.y
                            ),

                        width:
                            Number(
                                tree.width
                            ),

                        height:
                            Number(
                                tree.height
                            )
                    })
                )
                : [];


        console.log(
            "Arena recebida do servidor:",
            {
                matchId:
                    serverMatchState.match_id,
                terrain:
                    currentTerrainName,
                obstacles:
                    barriers.length,
                trees:
                    trees.length
            }
        );
    }

    else {

        chooseTerrain();

        generateWorldObstacles();

        generateWorldTrees();
    }


    createParticipants();


    bullets.length =
        0;


    particles.length =
        0;


    score =
        0;


    for (
        const participant
        of participants
    ) {

        if (
            participant.type ===
            "bot"
        ) {

            chooseBotTarget(
                participant
            );
        }
    }


    updateCamera();


    updateHUD();


    const roomText =
        serverMatchState
            ? `SESSÃO ${serverMatchState.room_code}`
            : `RODADA ${roundNumber}`;


    showGameMessage(
        `${roomText} - ${participants.length} PARTICIPANTES`
    );
}


// ==========================================================
// TERRENO
// ==========================================================
//
// mapa1 / mapa2 agora representam o terreno INTEIRO do mundo.
//
// Antes a mesma imagem era repetida lado a lado. Como a imagem
// não é uma textura seamless, as bordas ficavam visíveis.
//
// Agora recortamos somente a parte da imagem correspondente à
// posição da câmera e ampliamos esse recorte para o Canvas.
// Resultado: uma única imagem contínua, sem emendas.
// ==========================================================

function drawTerrain() {

    const image =
        assets.terrains[
            currentTerrainName
        ];


    if (
        !image ||
        !image.complete ||
        image.naturalWidth <= 0 ||
        image.naturalHeight <= 0
    ) {

        ctx.fillStyle =
            "#263b27";

        ctx.fillRect(
            0,
            0,
            VIEW_WIDTH,
            VIEW_HEIGHT
        );

        return;
    }


    // Os mapas têm exatamente 12288 x 6912,
    // a mesma resolução lógica do mundo. Portanto a câmera
    // recorta pixels reais do mapa, sem ampliar o terreno.
    const scaleX =
        image.naturalWidth /
        WORLD_WIDTH;


    const scaleY =
        image.naturalHeight /
        WORLD_HEIGHT;


    const sourceWidth =
        Math.round(
            VIEW_WIDTH *
            scaleX
        );


    const sourceHeight =
        Math.round(
            VIEW_HEIGHT *
            scaleY
        );


    const maxSourceX =
        Math.max(
            0,
            image.naturalWidth -
            sourceWidth
        );


    const maxSourceY =
        Math.max(
            0,
            image.naturalHeight -
            sourceHeight
        );


    const sourceX =
        Math.max(
            0,
            Math.min(
                maxSourceX,
                Math.round(
                    camera.x *
                    scaleX
                )
            )
        );


    const sourceY =
        Math.max(
            0,
            Math.min(
                maxSourceY,
                Math.round(
                    camera.y *
                    scaleY
                )
            )
        );


    // Em escala 1:1 não precisamos borrar pixels vizinhos.
    ctx.imageSmoothingEnabled =
        false;


    ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        VIEW_WIDTH,
        VIEW_HEIGHT
    );
}


// ==========================================================
// POWER-UPS NA ARENA
// ==========================================================

const POWERUP_VISUALS = {
    speed: { color: "#5ac8ff", symbol: "»" },
    invincibility: { color: "#ffd966", symbol: "★" },
    quadshot: { color: "#ff6b6b", symbol: "×4" },
    heal: { color: "#7CFC9A", symbol: "+" },
};

function drawPowerups() {

    for (
        const powerup
        of powerups
    ) {

        const screenX =
            worldToScreenX(powerup.x);

        const screenY =
            worldToScreenY(powerup.y);

        if (
            screenX < -60 ||
            screenX > VIEW_WIDTH + 60 ||
            screenY < -60 ||
            screenY > VIEW_HEIGHT + 60
        ) {
            continue;
        }

        const visual =
            POWERUP_VISUALS[powerup.type] ||
            { color: "#ffffff", symbol: "?" };

        // Flutua suavemente pra chamar atenção.
        const bobOffset =
            Math.sin(performance.now() / 260 + powerup.x) * 4;

        const radius = 22;

        ctx.save();

        ctx.translate(screenX, screenY + bobOffset);

        // Auréola pulsante.
        const glowAlpha =
            0.25 + (Math.sin(performance.now() / 200) + 1) / 2 * 0.2;

        ctx.beginPath();
        ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
        ctx.globalAlpha = glowAlpha;
        ctx.fillStyle = visual.color;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Disco principal.
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10, 14, 10, 0.85)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = visual.color;
        ctx.stroke();

        // Símbolo.
        ctx.fillStyle = visual.color;
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(visual.symbol, 0, 1);

        ctx.restore();
    }
}


// ==========================================================
// DESENHAR BARREIRAS
// ==========================================================

function drawBarriers() {

    for (
        const barrier
        of barriers
    ) {

        const config =
            activeBarrierCatalog[
                barrier.type
            ];


        const image =
            assets.barriers[
                config.image
            ];


        const screenX =
            worldToScreenX(
                barrier.x
            );


        const screenY =
            worldToScreenY(
                barrier.y
            );


        // --------------------------------------------------
        // CULLING
        // não desenhar fora da câmera
        // --------------------------------------------------

        if (

            screenX +
            barrier.width <
            0

            ||

            screenY +
            barrier.height <
            0

            ||

            screenX >
            VIEW_WIDTH

            ||

            screenY >
            VIEW_HEIGHT

        ) {

            continue;
        }


        ctx.save();


        ctx.shadowColor =
            "rgba(0,0,0,0.55)";


        ctx.shadowBlur =
            12;


        ctx.shadowOffsetX =
            7;


        ctx.shadowOffsetY =
            9;


        ctx.drawImage(

            image,

            screenX,

            screenY,

            barrier.width,

            barrier.height
        );


        ctx.restore();
    }
}


// ==========================================================
// DESENHAR ÁRVORES / COPAS
// ==========================================================
//
// Esta função é chamada DEPOIS de tanques e tiros.
// Assim a copa cobre visualmente quem estiver embaixo.
//
// Para o jogador local, a copa fica semitransparente quando
// ele está dentro dela. Isso não afeta o que os adversários veem.
// ==========================================================

function localPlayerUnderTree(
    tree
) {

    if (
        !localPlayer ||
        !localPlayer.alive
    ) {

        return false;
    }


    const paddingX =
        tree.width *
        0.10;


    const paddingY =
        tree.height *
        0.10;


    return (

        localPlayer.x >=
        tree.x +
        paddingX

        &&

        localPlayer.x <=
        tree.x +
        tree.width -
        paddingX

        &&

        localPlayer.y >=
        tree.y +
        paddingY

        &&

        localPlayer.y <=
        tree.y +
        tree.height -
        paddingY
    );
}


function drawTrees() {

    for (
        const tree
        of trees
    ) {

        const config =
            treeTypes[
                tree.type
            ];


        if (
            !config
        ) {

            continue;
        }


        const image =
            assets.trees[
                config.image
            ];


        if (
            !image
        ) {

            continue;
        }


        const screenX =
            worldToScreenX(
                tree.x
            );


        const screenY =
            worldToScreenY(
                tree.y
            );


        if (

            screenX +
            tree.width <
            0

            ||

            screenY +
            tree.height <
            0

            ||

            screenX >
            VIEW_WIDTH

            ||

            screenY >
            VIEW_HEIGHT

        ) {

            continue;
        }


        ctx.save();


        // Fora da copa: opacidade total.
        // Debaixo da copa: só o próprio jogador ganha visão parcial.

        if (
            localPlayerUnderTree(
                tree
            )
        ) {

            ctx.globalAlpha =
                0.58;
        }


        ctx.shadowColor =
            "rgba(0,0,0,0.42)";


        ctx.shadowBlur =
            10;


        ctx.shadowOffsetX =
            6;


        ctx.shadowOffsetY =
            8;


        ctx.drawImage(

            image,

            screenX,

            screenY,

            tree.width,

            tree.height
        );


        ctx.restore();
    }
}


// ==========================================================
// DESENHAR PARTICIPANTE
// ==========================================================

function drawParticipant(
    participant
) {

    if (
        !participant.alive
    ) {

        return;
    }


    maybeSpawnDustTrail(
        participant
    );


    const screenX =
        worldToScreenX(
            participant.x
        );


    const screenY =
        worldToScreenY(
            participant.y
        );


    if (

        screenX <
        -150

        ||

        screenX >
        VIEW_WIDTH +
        150

        ||

        screenY <
        -150

        ||

        screenY >
        VIEW_HEIGHT +
        150

    ) {

        return;
    }


    const image =
        assets.tanks[
            participant.skin
        ];


    // Segurança: um asset ausente não pode congelar o game loop.
    if (
        !image
    ) {

        console.error(
            "[GAME] Asset de tanque ausente:",
            participant.skin,
            participant
        );

        return;
    }


    ctx.save();


    ctx.translate(

        screenX,

        screenY
    );


    ctx.rotate(
        participant.angle
    );


    ctx.shadowColor =
        "rgba(0,0,0,0.65)";


    ctx.shadowBlur =
        10;


    ctx.shadowOffsetX =
        6;


    ctx.shadowOffsetY =
        8;


    ctx.drawImage(

        image,

        -participant.width / 2,

        -participant.height / 2,

        participant.width,

        participant.height
    );


    // Pouca vida = pisca vermelho por cima do tanque (só onde tem
    // desenho, não o retângulo inteiro), como alerta.
    if (
        participant.life > 0 &&
        participant.life <= LOW_HEALTH_BLINK_THRESHOLD
    ) {

        const blinkAlpha =
            (Math.sin(performance.now() / 120) + 1) / 2;

        drawTintedTankOverlay(
            image,
            participant.width,
            participant.height,
            "#ff2a2a",
            blinkAlpha * 0.6
        );
    }


    // Invencibilidade (power-up) = pisca branco, mesma técnica.
    if (participant.invincible) {

        const blinkAlpha =
            (Math.sin(performance.now() / 90) + 1) / 2;

        drawTintedTankOverlay(
            image,
            participant.width,
            participant.height,
            "#ffffff",
            blinkAlpha * 0.65
        );
    }


    ctx.restore();


    // ------------------------------------------------------
    // NOME
    // ------------------------------------------------------

    ctx.save();


    ctx.font =
        participant.local

            ? "bold 14px Arial"

            : "12px Arial";


    ctx.textAlign =
        "center";


    ctx.fillStyle =
        participant.local

            ? "#70ff9a"

            : "#ffffff";


    ctx.strokeStyle =
        "rgba(0,0,0,0.9)";


    ctx.lineWidth =
        4;


    ctx.strokeText(

        participant.name,

        screenX,

        screenY -
        participant.height / 2 -
        15
    );


    ctx.fillText(

        participant.name,

        screenX,

        screenY -
        participant.height / 2 -
        15
    );


    // ------------------------------------------------------
    // VIDA
    // ------------------------------------------------------

    const lifeWidth =
        60;


    const lifePercentage =

        participant.life /
        (participant.maxLife || 500);


    ctx.fillStyle =
        "rgba(0,0,0,0.65)";


    ctx.fillRect(

        screenX -
        lifeWidth / 2,

        screenY -
        participant.height / 2 -
        9,

        lifeWidth,

        5
    );


    ctx.fillStyle =
        "#62d77c";


    ctx.fillRect(

        screenX -
        lifeWidth / 2,

        screenY -
        participant.height / 2 -
        9,

        lifeWidth *
        lifePercentage,

        5
    );


    ctx.restore();
}


// ==========================================================
// DESENHAR TODOS OS PARTICIPANTES
// ==========================================================

function drawParticipants() {

    // bots primeiro

    for (
        const participant
        of participants
    ) {

        if (
            !participant.local
        ) {

            drawParticipant(
                participant
            );
        }
    }


    // jogador local por último

    if (
        localPlayer
    ) {

        drawParticipant(
            localPlayer
        );
    }
}


// ==========================================================
// DESENHAR TIROS
// ==========================================================

function drawBullets() {

    for (
        const bullet
        of bullets
    ) {

        const screenX =
            worldToScreenX(
                bullet.x
            );


        const screenY =
            worldToScreenY(
                bullet.y
            );


        if (

            screenX <
            -30

            ||

            screenX >
            VIEW_WIDTH +
            30

            ||

            screenY <
            -30

            ||

            screenY >
            VIEW_HEIGHT +
            30

        ) {

            continue;
        }


        const gradient =
            ctx.createRadialGradient(

                screenX,

                screenY,

                0,

                screenX,

                screenY,

                13
            );


        gradient.addColorStop(

            0,

            "rgba(255,255,220,1)"
        );


        gradient.addColorStop(

            0.35,

            "rgba(255,180,50,0.9)"
        );


        gradient.addColorStop(

            1,

            "rgba(255,80,0,0)"
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.arc(

            screenX,

            screenY,

            13,

            0,

            Math.PI * 2
        );


        ctx.fill();


        ctx.fillStyle =
            "#fff7ce";


        ctx.beginPath();


        ctx.arc(

            screenX,

            screenY,

            bullet.radius,

            0,

            Math.PI * 2
        );


        ctx.fill();
    }
}


// ==========================================================
// PARTÍCULAS
// ==========================================================

function drawParticles(
    onlyDust = false
) {

    for (
        const particle
        of particles
    ) {

        const isDust =
            particle.type === "dust";

        // Poeira desenha numa passada separada (atrás do tanque);
        // faísca/impacto desenham na passada normal (na frente).
        if (onlyDust !== isDust) {
            continue;
        }

        const screenX =
            worldToScreenX(
                particle.x
            );


        const screenY =
            worldToScreenY(
                particle.y
            );


        if (
            particle.type ===
            "fire"
        ) {

            ctx.fillStyle =

                `rgba(
                    255,
                    170,
                    40,
                    ${particle.life}
                )`;

        }

        else if (
            particle.type ===
            "dust"
        ) {

            ctx.fillStyle =

                `rgba(
                    176,
                    156,
                    118,
                    ${particle.life * 0.4}
                )`;

        }

        else {

            ctx.fillStyle =

                `rgba(
                    210,
                    180,
                    120,
                    ${particle.life}
                )`;
        }


        ctx.beginPath();


        ctx.arc(

            screenX,

            screenY,

            particle.size,

            0,

            Math.PI * 2
        );


        ctx.fill();
    }
}


// ==========================================================
// MIRA
// ==========================================================

function drawCrosshair() {

    if (
        !mouse.inside
    ) {

        return;
    }


    const size =
        17;


    ctx.save();


    ctx.strokeStyle =
        "rgba(235,245,235,0.95)";


    ctx.lineWidth =
        2;


    ctx.beginPath();


    ctx.arc(

        mouse.x,

        mouse.y,

        10,

        0,

        Math.PI * 2
    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(

        mouse.x -
        size,

        mouse.y
    );


    ctx.lineTo(

        mouse.x -
        5,

        mouse.y
    );


    ctx.moveTo(

        mouse.x +
        5,

        mouse.y
    );


    ctx.lineTo(

        mouse.x +
        size,

        mouse.y
    );


    ctx.moveTo(

        mouse.x,

        mouse.y -
        size
    );


    ctx.lineTo(

        mouse.x,

        mouse.y -
        5
    );


    ctx.moveTo(

        mouse.x,

        mouse.y +
        5
    );


    ctx.lineTo(

        mouse.x,

        mouse.y +
        size
    );


    ctx.stroke();


    ctx.restore();
}


// ==========================================================
// HITBOXES
// ==========================================================

function drawDebugHitboxes() {

    if (
        !showHitboxes
    ) {

        return;
    }


    // participantes

    for (
        const participant
        of participants
    ) {

        if (
            !participant.alive
        ) {

            continue;
        }


        ctx.strokeStyle =

            participant.local

                ? "#00ff88"

                : "#00aaff";


        ctx.lineWidth =
            2;


        ctx.beginPath();


        ctx.arc(

            worldToScreenX(
                participant.x
            ),

            worldToScreenY(
                participant.y
            ),

            participant.collisionRadius,

            0,

            Math.PI * 2
        );


        ctx.stroke();
    }


    // barreiras

    ctx.strokeStyle =
        "#ff3333";


    for (
        const barrier
        of barriers
    ) {

        const box =
            getBarrierHitbox(
                barrier
            );


        ctx.strokeRect(

            worldToScreenX(
                box.x
            ),

            worldToScreenY(
                box.y
            ),

            box.width,

            box.height
        );
    }
}


// ==========================================================
// MINIMAPA
// ==========================================================

function drawMiniMap() {

    const mapWidth =
        280;


    const mapHeight =
        158;


    const padding =
        18;


    const x =

        VIEW_WIDTH -
        mapWidth -
        padding;


    const y =
        padding;


    const scaleX =

        mapWidth /
        WORLD_WIDTH;


    const scaleY =

        mapHeight /
        WORLD_HEIGHT;


    ctx.save();


    ctx.fillStyle =
        "rgba(5,10,5,0.78)";


    ctx.fillRect(

        x,

        y,

        mapWidth,

        mapHeight
    );


    ctx.strokeStyle =
        "rgba(220,235,220,0.45)";


    ctx.lineWidth =
        2;


    ctx.strokeRect(

        x,

        y,

        mapWidth,

        mapHeight
    );


    // ------------------------------------------------------
    // OBSTÁCULOS
    // ------------------------------------------------------

    ctx.fillStyle =
        "rgba(175,145,100,0.50)";


    for (
        const barrier
        of barriers
    ) {

        ctx.fillRect(

            x +
            barrier.x *
            scaleX,

            y +
            barrier.y *
            scaleY,

            Math.max(

                2,

                barrier.width *
                scaleX
            ),

            Math.max(

                2,

                barrier.height *
                scaleY
            )
        );
    }


    // ------------------------------------------------------
    // PARTICIPANTES
    // ------------------------------------------------------

    for (
        const participant
        of participants
    ) {

        if (
            !participant.alive
        ) {

            continue;
        }


        ctx.fillStyle =

            participant.local

                ? "#00ff88"

                : "#ff5a5a";


        ctx.beginPath();


        ctx.arc(

            x +

            participant.x *
            scaleX,

            y +

            participant.y *
            scaleY,

            participant.local
                ? 4
                : 2.5,

            0,

            Math.PI * 2
        );


        ctx.fill();
    }


    // ------------------------------------------------------
    // CÂMERA
    // ------------------------------------------------------

    ctx.strokeStyle =
        "rgba(255,255,255,0.30)";


    ctx.lineWidth =
        1;


    ctx.strokeRect(

        x +
        camera.x *
        scaleX,

        y +
        camera.y *
        scaleY,

        VIEW_WIDTH *
        scaleX,

        VIEW_HEIGHT *
        scaleY
    );


    // título

    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "11px Arial";


    ctx.fillText(

        "MAPA",

        x + 8,

        y + 14
    );


    ctx.restore();
}


// ==========================================================
// CONTADOR DE VIVOS
// ==========================================================

function getAliveCount() {

    return participants.filter(

        participant =>
            participant.alive

    ).length;
}


// ==========================================================
// INFORMAÇÕES DA PARTIDA
// ==========================================================

function drawMatchInfo() {

    const alive =
        getAliveCount();


    ctx.save();


    ctx.fillStyle =
        "rgba(5,10,5,0.70)";


    ctx.fillRect(

        18,

        18,

        255,

        125
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.20)";


    ctx.strokeRect(

        18,

        18,

        255,

        125
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "bold 15px Arial";


    ctx.fillText(

        `VIVOS: ${alive} / 20`,

        32,

        45
    );


    ctx.font =
        "13px Arial";


    ctx.fillText(

        `RODADA: ${roundNumber}`,

        32,

        70
    );


    ctx.fillText(

        `MAPA: ${currentTerrainName.toUpperCase()}`,

        32,

        94
    );


    ctx.fillText(

        `ELIMINAÇÕES: ${localPlayer?.kills ?? 0}`,

        32,

        118
    );


    ctx.restore();
}


// ==========================================================
// VINHETA
// ==========================================================

function drawVignette() {

    const gradient =
        ctx.createRadialGradient(

            VIEW_WIDTH / 2,

            VIEW_HEIGHT / 2,

            VIEW_HEIGHT * 0.30,

            VIEW_WIDTH / 2,

            VIEW_HEIGHT / 2,

            VIEW_WIDTH * 0.75
        );


    gradient.addColorStop(

        0,

        "rgba(0,0,0,0)"
    );


    gradient.addColorStop(

        1,

        "rgba(0,0,0,0.22)"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(

        0,

        0,

        VIEW_WIDTH,

        VIEW_HEIGHT
    );
}


// ==========================================================
// HUD HTML
// ==========================================================

function updateHUD() {

    if (
        !localPlayer
    ) {

        return;
    }


    if (
        lifeValue
    ) {

        lifeValue.textContent =
            localPlayer.life;
    }


    if (
        ammoValue
    ) {

        ammoValue.textContent =
            "∞";
    }


    if (
        scoreValue
    ) {

        scoreValue.textContent =
            serverMatchState
                ? (
                    Number(
                        localPlayer.kills
                    ) || 0
                ) * 100
                : score;
    }
}


// ==========================================================
// MENSAGENS
// ==========================================================

let messageTimer =
    null;


function showGameMessage(
    message
) {

    if (
        !gameMessages
    ) {

        return;
    }


    gameMessages.textContent =
        message;


    gameMessages.style.opacity =
        "1";


    if (
        messageTimer
    ) {

        clearTimeout(
            messageTimer
        );
    }


    messageTimer =
        setTimeout(

            () => {

                gameMessages.style.opacity =
                    "0";

            },

            1600
        );
}


// ==========================================================
// DESENHAR MUNDO
// ==========================================================

function draw() {

    ctx.clearRect(

        0,

        0,

        VIEW_WIDTH,

        VIEW_HEIGHT
    );


    drawTerrain();


    drawBarriers();


    drawPowerups();


    drawBullets();


    // Poeira desenha ANTES dos tanques, pra ficar por baixo.
    drawParticles(true);


    drawParticipants();


    // A copa é uma camada visual de cobertura.
    // Quem está embaixo fica escondido para quem está de fora.
    drawTrees();


    // Faísca de tiro e impacto desenham DEPOIS, por cima.
    drawParticles(false);


    updateAndDrawAirRaid();


    drawVignette();


    updateAndDrawRain();


    drawNightOverlay();


    drawMatchInfo();


    drawMiniMap();


    drawCrosshair();


    drawDebugHitboxes();


    drawAtmosphereBanner();
}


// ==========================================================
// UPDATE
// ==========================================================

function update() {

    if (
        !localPlayer
    ) {

        return;
    }


    updateLocalPlayer();


    // Em partidas online, os bots são autoridade do servidor.
    // O modo local preserva a IA antiga para testes offline.
    if (
        !serverMatchState
    ) {
        updateBots();
    }


    updateBullets();


    updateParticles();


    currentAtmosphere =
        computeAtmosphereState();


    updateCamera();


    updateHUD();
}


// ==========================================================
// GAME LOOP
// ==========================================================

function gameLoop() {

    if (
        !gameReady
    ) {

        return;
    }


    try {

        update();

        draw();
    }
    catch (error) {

        console.error(
            "[BATTLE TANK] Erro no game loop:",
            error
        );

        showGameMessage(
            "ERRO NO JOGO - CONSULTE O CONSOLE"
        );

        gameReady = false;

        return;
    }


    requestAnimationFrame(
        gameLoop
    );
}


// ==========================================================
// ERRO
// ==========================================================

function drawLoadingError(
    message
) {

    ctx.fillStyle =
        "#111111";


    ctx.fillRect(

        0,

        0,

        VIEW_WIDTH,

        VIEW_HEIGHT
    );


    ctx.fillStyle =
        "#ff5555";


    ctx.font =
        "bold 30px Arial";


    ctx.fillText(

        "ERRO AO CARREGAR ASSETS",

        60,

        90
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "18px Arial";


    ctx.fillText(

        message,

        60,

        140
    );


    ctx.fillText(

        "Confira os nomes e as pastas dos arquivos.",

        60,

        180
    );
}


// ==========================================================
// PARTIDA RECEBIDA DO SERVIDOR
// ==========================================================

function tryStartServerMatch() {

    fitGameDisplay();


    if (
        !assetsLoaded ||
        !serverMatchState
    ) {
        return;
    }


    if (
        gameReady
    ) {
        return;
    }


    gameReady =
        true;


    startNewRound();


    if (
        !gameLoopStarted
    ) {

        gameLoopStarted =
            true;


        requestAnimationFrame(
            gameLoop
        );
    }
}


if (
    window.battleTankNetwork
) {

    window.battleTankNetwork.addEventListener(
        "match-start",
        event => {

            serverMatchState =
                event.detail;

            activeBarrierCatalog =
                buildBarrierCatalogFromServer(
                    serverMatchState.barrier_catalog
                ) || barrierTypes;

            matchStartedAt =
                performance.now();


            console.log(
                "[GAME] Estado inicial da partida recebido:",
                serverMatchState
            );


            tryStartServerMatch();
        }
    );


    window.battleTankNetwork.addEventListener(
        "air-raid",
        event => {
            handleAirRaidEvent(event.detail);
        }
    );


    window.battleTankNetwork.addEventListener(
        "match-state",
        event => {

            applyServerMatchState(
                event.detail
            );
        }
    );


    window.battleTankNetwork.addEventListener(
        "match-ended",
        event => {

            showMatchEndedOverlay(
                event.detail
            );
        }
    );
}


// ==========================================================
// INICIAR
// ==========================================================

fitGameDisplay();

loadAssets();
