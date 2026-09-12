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


const VIEW_WIDTH =
    canvas.width;

const VIEW_HEIGHT =
    canvas.height;


// ==========================================================
// TAMANHO REAL DO MUNDO
// ==========================================================

const WORLD_WIDTH = 6144;
const WORLD_HEIGHT = 3456;


// ==========================================================
// CONFIGURAÇÃO DA PARTIDA
// ==========================================================

const MAX_PLAYERS = 20;

let roundNumber = 0;

let gameReady = false;

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

const assets = {

    terrains: {

        mapa1: null,

        mapa2: null
    },


    barriers: {

        barrier1: null,

        barrier2: null,

        barrier3: null,

        barrier4: null,

        barrier5: null,

        barrier6: null,

        barrier7: null
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

            barrier1,
            barrier2,
            barrier3,
            barrier4,
            barrier5,
            barrier6,
            barrier7,

            tankBlue,
            tankRed,
            tankBeige,
            tankDark

        ] = await Promise.all([


            // TERRENOS

            loadImage(
                "assets/terrain/mapa1.png"
            ),

            loadImage(
                "assets/terrain/mapa2.png"
            ),


            // BARREIRAS

            loadImage(
                "assets/obstacles/barreira1.png"
            ),

            loadImage(
                "assets/obstacles/barreira2.png"
            ),

            loadImage(
                "assets/obstacles/barreira3.png"
            ),

            loadImage(
                "assets/obstacles/barreira4.png"
            ),

            loadImage(
                "assets/obstacles/barreira5.png"
            ),

            loadImage(
                "assets/obstacles/barreira6.png"
            ),

            loadImage(
                "assets/obstacles/barreira7.png"
            ),


            // TANQUES

            loadImage(
                "assets/tanks/tanque_azul.png"
            ),

            loadImage(
                "assets/tanks/tanque_vermelho.png"
            ),

            loadImage(
                "assets/tanks/tanque_bege.png"
            ),

            loadImage(
                "assets/tanks/tanque_escuro.png"
            )
        ]);


        assets.terrains.mapa1 =
            mapa1;

        assets.terrains.mapa2 =
            mapa2;


        assets.barriers.barrier1 =
            barrier1;

        assets.barriers.barrier2 =
            barrier2;

        assets.barriers.barrier3 =
            barrier3;

        assets.barriers.barrier4 =
            barrier4;

        assets.barriers.barrier5 =
            barrier5;

        assets.barriers.barrier6 =
            barrier6;

        assets.barriers.barrier7 =
            barrier7;


        assets.tanks.azul =
            tankBlue;

        assets.tanks.vermelho =
            tankRed;

        assets.tanks.bege =
            tankBeige;

        assets.tanks.escuro =
            tankDark;


        gameReady =
            true;


        startNewRound();


        console.log(
            "Todos os assets foram carregados."
        );


        requestAnimationFrame(
            gameLoop
        );

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


function updateCamera() {

    camera.x =
        localPlayer.x -
        VIEW_WIDTH / 2;


    camera.y =
        localPlayer.y -
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
// COMADI
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


    const randomizedSpawns =
        shuffleArray(
            spawnPoints
        );


    // ------------------------------------------------------
    // JOGADOR LOCAL
    // ------------------------------------------------------

    localPlayer = {

        id:
            "player_local",

        name:
            "COMADI",

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
            "azul",

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


    // ------------------------------------------------------
    // BOTS
    // ------------------------------------------------------

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


            // IA BÁSICA

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
        "Participantes:",
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


    // ÁRVORE

    barrier3: {

        image:
            "barrier3",

        width:
            300,

        height:
            300,

        hitbox: {

            x:
                0.39,

            y:
                0.40,

            width:
                0.22,

            height:
                0.25
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


    // RIO

    barrier6: {

        image:
            "barrier6",

        width:
            520,

        height:
            260,

        hitbox: {

            x:
                0.05,

            y:
                0.33,

            width:
                0.90,

            height:
                0.35
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
    }
};


const barrierTypeNames = [

    "barrier1",

    "barrier2",

    "barrier3",

    "barrier4",

    "barrier5",

    "barrier6",

    "barrier7"
];


let barriers = [];


// ==========================================================
// PEGAR HITBOX DA BARREIRA
// ==========================================================

function getBarrierHitbox(
    barrier
) {

    const config =
        barrierTypes[
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
        65;


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


    // skins

    if (event.key === "1") {
        localPlayer.skin = "azul";
        showGameMessage("TANQUE AZUL");
    }

    if (event.key === "2") {
        localPlayer.skin = "vermelho";
        showGameMessage("TANQUE VERMELHO");
    }

    if (event.key === "3") {
        localPlayer.skin = "bege";
        showGameMessage("TANQUE BEGE");
    }

    if (event.key === "4") {
        localPlayer.skin = "escuro";
        showGameMessage("TANQUE ESCURO");
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

        startNewRound();
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

function updateLocalPlayer() {

    if (
        !localPlayer ||
        !localPlayer.alive
    ) {
        return;
    }


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


    if (
        moveX === 0 &&
        moveY === 0
    ) {
        return;
    }


    const length =
        Math.hypot(
            moveX,
            moveY
        );


    moveX /= length;
    moveY /= length;


    // A imagem original do tanque aponta para cima.
    localPlayer.angle =
        Math.atan2(
            moveY,
            moveX
        )
        +
        Math.PI / 2;


    const stepX =
        moveX *
        localPlayer.speed;


    const stepY =
        moveY *
        localPlayer.speed;


    // Movimento por eixo permite deslizar ao longo de paredes
    // sem atravessar barreiras ou outros tanques.
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


    const shotAngle =
        localPlayer.angle -
        Math.PI / 2;


    fireProjectile(
        localPlayer,
        shotAngle
    );
}


// ==========================================================
// ATUALIZAR TIROS
// ==========================================================

function updateBullets() {

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
            0.04;


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


    chooseTerrain();


    generateWorldObstacles();


    createParticipants();


    bullets.length =
        0;


    particles.length =
        0;


    score =
        0;


    // inicializar destinos dos bots

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


    showGameMessage(

        `RODADA ${roundNumber} - 20 PARTICIPANTES`
    );
}


// ==========================================================
// TERRENO
// ==========================================================
//
// mapa1 / mapa2 são usados como textura repetida.
// Quando tivermos o mapa gigante definitivo,
// podemos trocar este sistema.
// ==========================================================

function drawTerrain() {

    const image =
        assets.terrains[
            currentTerrainName
        ];


    const tileWidth =
        1672;


    const tileHeight =
        941;


    const startX =

        Math.floor(

            camera.x /
            tileWidth

        )

        *

        tileWidth;


    const startY =

        Math.floor(

            camera.y /
            tileHeight

        )

        *

        tileHeight;


    for (

        let worldY =
            startY;

        worldY <
        camera.y +
        VIEW_HEIGHT +
        tileHeight;

        worldY +=
        tileHeight

    ) {

        for (

            let worldX =
                startX;

            worldX <
            camera.x +
            VIEW_WIDTH +
            tileWidth;

            worldX +=
            tileWidth

        ) {

            ctx.drawImage(

                image,

                worldToScreenX(
                    worldX
                ),

                worldToScreenY(
                    worldY
                ),

                tileWidth,

                tileHeight
            );
        }
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
            barrierTypes[
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
        100;


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

function drawParticles() {

    for (
        const particle
        of particles
    ) {

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
            score;
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


    drawBullets();


    drawParticipants();


    drawParticles();


    drawVignette();


    drawMatchInfo();


    drawMiniMap();


    drawCrosshair();


    drawDebugHitboxes();
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


    updateBots();


    updateBullets();


    updateParticles();


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


    update();


    draw();


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
// INICIAR
// ==========================================================

loadAssets();
