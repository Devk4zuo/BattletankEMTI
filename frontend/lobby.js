(() => {
    let overlay = null;

    let menuPanel = null;
    let joinPanel = null;
    let helpPanel = null;
    let waitingPanel = null;
    let programmingPanel = null;
    let countdownPanel = null;

    let statusElement = null;
    let playerCountElement = null;
    let roomCodeElement = null;
    let programmingTimerElement = null;
    let programmingStateElement = null;
    let programmingKickerElement = null;
    let programmingTitleElement = null;
    let readyButton = null;
    let openLabLink = null;
    let programmingSummaryElement = null;
    let countdownValue = null;
    let skinStatusElement = null;

    const LAB_RETURN_KEY = "battleTankLabReturn";
    const PROGRAM_ACCESS_KEY = "battleTankProgrammingAccess";
    const PLAYER_STORAGE_KEY = "battleTankPlayer";
    const VALID_SKINS = ["azul", "vermelho", "bege", "escuro"];
    let pendingReadyAfterLab = false;

    let playerName = "";
    let roomCode = "";
    let joined = false;
    let currentReady = false;
    let currentFinalized = false;
    let programmingSessionInitialized = false;

    let programmingEndsAt = null;
    let countdownEndsAt = null;

    let clockTimer = null;
    let loadoutSyncTimer = null;
    let lastLoadoutSignature = "";

    function getLocalSkin() {
        try {
            const data = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || "{}");
            return VALID_SKINS.includes(data.skin) ? data.skin : "azul";
        }
        catch (_error) {
            return "azul";
        }
    }

    function saveLocalSkin(skin) {
        const safeSkin = VALID_SKINS.includes(skin) ? skin : "azul";
        let data = {};

        try {
            data = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || "{}") || {};
        }
        catch (_error) {
            data = {};
        }

        data.skin = safeSkin;
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(data));
        updateSkinButtons();
        return safeSkin;
    }

    function resetLocalProgramLoadout() {
        const skin = getLocalSkin();
        const base = {
            skin,
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
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(base));
    }

    function updateSkinButtons() {
        const selected = getLocalSkin();
        document.querySelectorAll("[data-tank-skin]").forEach((button) => {
            button.classList.toggle("selected", button.dataset.tankSkin === selected);
            button.setAttribute("aria-pressed", button.dataset.tankSkin === selected ? "true" : "false");
        });
    }

    function skinLabel(skin) {
        return ({ azul: "Azul", vermelho: "Vermelho", bege: "Bege", escuro: "Escuro" })[skin] || "Azul";
    }

    function selectLobbySkin(skin) {
        const safeSkin = saveLocalSkin(skin);

        if (skinStatusElement) {
            skinStatusElement.textContent = `Cor selecionada: ${skinLabel(safeSkin)}. Durante a batalha ela ficará bloqueada.`;
        }

        if (joined && !waitingPanel.hidden && window.battleTankNetwork.connected) {
            window.battleTankNetwork.setTankSkin(safeSkin);
        }
    }

    function createLobby() {
        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "battleLobbyOverlay";

        overlay.innerHTML = `
            <div class="battle-shell">
                <section
                    id="battleMenuPanel"
                    class="battle-screen battle-menu-screen"
                >
                    <div class="battle-brand">
                        <div class="battle-kicker">
                            BATTLE TANK EMTI
                        </div>

                        <h1>
                            ARENA DE PROGRAMADORES
                        </h1>

                        <p>
                            Programe. Customize. Entre na arena.
                        </p>
                    </div>

                    <div class="battle-menu-actions">
                        <button
                            id="battleOpenJoin"
                            class="battle-primary-button"
                            type="button"
                        >
                            START
                        </button>

                        <button
                            id="battleOpenHelp"
                            class="battle-secondary-button"
                            type="button"
                        >
                            COMO JOGAR
                        </button>
                    </div>

                    <div class="battle-menu-note">
                        O professor cria a sessão e fornece o código da partida.
                    </div>

                    <div class="battle-creator-credit">
                        Criado por: Professor Kazuo
                    </div>
                </section>

                <section
                    id="battleJoinPanel"
                    class="battle-screen"
                    hidden
                >
                    <button
                        id="battleBackMenu"
                        class="battle-back-button"
                        type="button"
                    >
                        ← MENU
                    </button>

                    <div class="battle-kicker">
                        BATTLE TANK EMTI
                    </div>

                    <h2>
                        ENTRAR NA SESSÃO
                    </h2>

                    <p class="battle-subtitle">
                        Digite seu nome e o código exibido no telão do professor.
                    </p>

                    <div
                        id="battleLobbyStatus"
                        class="battle-status"
                    >
                        Conectando ao servidor...
                    </div>

                    <form
                        id="battleLobbyForm"
                        class="battle-form"
                    >
                        <label>
                            SEU NOME

                            <input
                                id="battlePlayerName"
                                type="text"
                                maxlength="20"
                                autocomplete="off"
                                placeholder="Ex.: Ana"
                                required
                            >
                        </label>

                        <label>
                            CÓDIGO DA SESSÃO

                            <input
                                id="battleRoomCode"
                                class="battle-room-code-input"
                                type="text"
                                inputmode="numeric"
                                maxlength="6"
                                autocomplete="off"
                                placeholder="000000"
                                required
                            >
                        </label>

                        <div class="battle-skin-picker-block">
                            <span class="battle-skin-title">COR DO TANQUE</span>
                            <div class="battle-skin-picker" aria-label="Escolha a cor do tanque">
                                <button type="button" class="battle-skin-option" data-tank-skin="azul" title="Azul">
                                    <img src="assets/tanks/tanque_azul.png" alt="Tanque azul">
                                    <span>AZUL</span>
                                </button>
                                <button type="button" class="battle-skin-option" data-tank-skin="vermelho" title="Vermelho">
                                    <img src="assets/tanks/tanque_vermelho.png" alt="Tanque vermelho">
                                    <span>VERMELHO</span>
                                </button>
                                <button type="button" class="battle-skin-option" data-tank-skin="bege" title="Bege">
                                    <img src="assets/tanks/tanque_bege.png" alt="Tanque bege">
                                    <span>BEGE</span>
                                </button>
                                <button type="button" class="battle-skin-option" data-tank-skin="escuro" title="Escuro">
                                    <img src="assets/tanks/tanque_escuro.png" alt="Tanque escuro">
                                    <span>ESCURO</span>
                                </button>
                            </div>
                            <small>A cor fica bloqueada quando a fase de programação começa.</small>
                        </div>

                        <button
                            type="submit"
                            class="battle-primary-button"
                        >
                            ENTRAR NA PARTIDA
                        </button>
                    </form>
                </section>

                <section
                    id="battleHelpPanel"
                    class="battle-screen"
                    hidden
                >
                    <button
                        id="battleBackHelp"
                        class="battle-back-button"
                        type="button"
                    >
                        ← MENU
                    </button>

                    <div class="battle-kicker">
                        COMO JOGAR
                    </div>

                    <h2>
                        CONTROLES E OBJETIVO
                    </h2>

                    <div class="battle-help-grid">
                        <div>
                            <strong>Movimento</strong>
                            <span>WASD ou setas</span>
                        </div>

                        <div>
                            <strong>Disparo</strong>
                            <span>Espaço ou clique</span>
                        </div>

                        <div>
                            <strong>Preparação</strong>
                            <span>5 minutos para programar e melhorar o tanque</span>
                        </div>

                        <div>
                            <strong>Objetivo</strong>
                            <span>Sobreviver e usar bem as funções programadas no tanque</span>
                        </div>
                    </div>
                </section>

                <section
                    id="battleWaitingPanel"
                    class="battle-screen"
                    hidden
                >
                    <div class="battle-kicker">
                        VOCÊ ESTÁ NA SESSÃO
                    </div>

                    <div
                        id="battleLobbyRoomCode"
                        class="battle-room-code"
                    >
                        ------
                    </div>

                    <h2>
                        AGUARDANDO O PROFESSOR
                    </h2>

                    <p>
                        Quando a preparação começar, você terá 5 minutos para programar seu tanque.
                    </p>

                    <div class="battle-skin-picker-block battle-skin-picker-waiting">
                        <span class="battle-skin-title">ESCOLHA A COR DO SEU TANQUE</span>
                        <div class="battle-skin-picker" aria-label="Escolha a cor do tanque no lobby">
                            <button type="button" class="battle-skin-option" data-tank-skin="azul" title="Azul">
                                <img src="assets/tanks/tanque_azul.png" alt="Tanque azul">
                                <span>AZUL</span>
                            </button>
                            <button type="button" class="battle-skin-option" data-tank-skin="vermelho" title="Vermelho">
                                <img src="assets/tanks/tanque_vermelho.png" alt="Tanque vermelho">
                                <span>VERMELHO</span>
                            </button>
                            <button type="button" class="battle-skin-option" data-tank-skin="bege" title="Bege">
                                <img src="assets/tanks/tanque_bege.png" alt="Tanque bege">
                                <span>BEGE</span>
                            </button>
                            <button type="button" class="battle-skin-option" data-tank-skin="escuro" title="Escuro">
                                <img src="assets/tanks/tanque_escuro.png" alt="Tanque escuro">
                                <span>ESCURO</span>
                            </button>
                        </div>
                        <small id="battleSkinStatus">Escolha agora. Durante a batalha a cor não pode ser alterada.</small>
                    </div>

                    <div
                        id="battleLobbyPlayers"
                        class="battle-player-counter"
                    >
                        0 / 20 jogadores
                    </div>
                </section>

                <section
                    id="battleProgrammingPanel"
                    class="battle-screen battle-programming-screen"
                    hidden
                >
                    <div id="battleProgrammingKicker" class="battle-kicker">
                        FASE DE PROGRAMAÇÃO
                    </div>

                    <h2 id="battleProgrammingTitle">
                        PREPARE SEU TANQUE
                    </h2>

                    <div
                        id="battleProgrammingTimer"
                        class="battle-programming-timer"
                    >
                        05:00
                    </div>

                    <p>
                        Escolha JavaScript ou Python, programe até 5 funções do tanque e finalize sua preparação.
                    </p>

                    <div class="battle-programming-actions">
                        <a
                            id="battleOpenLab"
                            class="battle-primary-button battle-link-button"
                            href="#"
                            target="_blank"
                        >
                            PROGRAMAR MEU TANQUE
                        </a>
                    </div>

                    <div
                        id="battleProgrammingState"
                        class="battle-loadout-state"
                    >
                        Abra a programação do tanque. Quando finalizar, não será possível voltar.
                    </div>

                    <div id="battleProgrammingSummary" class="battle-small-note">
                        A cor do tanque já está bloqueada. A linguagem escolhida também ficará bloqueada nesta partida.
                    </div>
                </section>

                <section
                    id="battleCountdownPanel"
                    class="battle-screen battle-countdown-screen"
                    hidden
                >
                    <div class="battle-kicker">
                        PREPARE-SE
                    </div>

                    <div
                        id="battleCountdownValue"
                        class="battle-countdown-value"
                    >
                        5
                    </div>

                    <h2>
                        A BATALHA VAI COMEÇAR
                    </h2>
                </section>
            </div>
        `;

        document.body.appendChild(
            overlay
        );

        menuPanel =
            document.getElementById(
                "battleMenuPanel"
            );

        joinPanel =
            document.getElementById(
                "battleJoinPanel"
            );

        helpPanel =
            document.getElementById(
                "battleHelpPanel"
            );

        waitingPanel =
            document.getElementById(
                "battleWaitingPanel"
            );

        programmingPanel =
            document.getElementById(
                "battleProgrammingPanel"
            );

        countdownPanel =
            document.getElementById(
                "battleCountdownPanel"
            );

        statusElement =
            document.getElementById(
                "battleLobbyStatus"
            );

        playerCountElement =
            document.getElementById(
                "battleLobbyPlayers"
            );

        roomCodeElement =
            document.getElementById(
                "battleLobbyRoomCode"
            );

        programmingTimerElement =
            document.getElementById(
                "battleProgrammingTimer"
            );

        programmingStateElement =
            document.getElementById(
                "battleProgrammingState"
            );

        programmingKickerElement = document.getElementById("battleProgrammingKicker");
        programmingTitleElement = document.getElementById("battleProgrammingTitle");

        readyButton = document.getElementById("battleReadyButton");
        openLabLink = document.getElementById("battleOpenLab");
        programmingSummaryElement = document.getElementById("battleProgrammingSummary");

        countdownValue =
            document.getElementById(
                "battleCountdownValue"
            );

        skinStatusElement =
            document.getElementById(
                "battleSkinStatus"
            );

        const form =
            document.getElementById(
                "battleLobbyForm"
            );

        const nameInput =
            document.getElementById(
                "battlePlayerName"
            );

        const codeInput =
            document.getElementById(
                "battleRoomCode"
            );

        document
            .getElementById(
                "battleOpenJoin"
            )
            .addEventListener(
                "click",
                () => {
                    showPanel(
                        joinPanel
                    );

                    setStatus(
                        window.battleTankNetwork.connected
                            ? "Servidor online. Digite o código da sessão."
                            : "Conectando ao servidor...",
                        window.battleTankNetwork.connected
                            ? "success"
                            : "normal"
                    );

                    setTimeout(
                        () => {
                            nameInput.focus();
                        },
                        50
                    );
                }
            );

        document
            .getElementById(
                "battleOpenHelp"
            )
            .addEventListener(
                "click",
                () => {
                    showPanel(
                        helpPanel
                    );
                }
            );

        document
            .getElementById(
                "battleBackMenu"
            )
            .addEventListener(
                "click",
                () => {
                    showPanel(
                        menuPanel
                    );
                }
            );

        document
            .getElementById(
                "battleBackHelp"
            )
            .addEventListener(
                "click",
                () => {
                    showPanel(
                        menuPanel
                    );
                }
            );

        codeInput.addEventListener(
            "input",
            () => {
                codeInput.value =
                    codeInput.value
                        .replace(
                            /\D/g,
                            ""
                        )
                        .slice(
                            0,
                            6
                        );
            }
        );

        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                playerName =
                    nameInput.value.trim();

                roomCode =
                    codeInput.value.trim();

                if (
                    !window.battleTankNetwork.connected
                ) {
                    setStatus(
                        "Servidor ainda não conectado.",
                        "error"
                    );

                    return;
                }

                if (
                    !playerName
                ) {
                    setStatus(
                        "Digite seu nome.",
                        "error"
                    );

                    return;
                }

                if (
                    !/^\d{6}$/.test(
                        roomCode
                    )
                ) {
                    setStatus(
                        "Digite os 6 números da sessão.",
                        "error"
                    );

                    return;
                }

                setStatus(
                    "Entrando na sessão...",
                    "normal"
                );

                window.battleTankNetwork.joinRoom(
                    roomCode,
                    playerName
                );
            }
        );

        document.querySelectorAll("[data-tank-skin]").forEach((button) => {
            button.addEventListener("click", () => {
                selectLobbySkin(button.dataset.tankSkin);
            });
        });

        updateSkinButtons();

    }

    function showPanel(
        target
    ) {
        const panels = [
            menuPanel,
            joinPanel,
            helpPanel,
            waitingPanel,
            programmingPanel,
            countdownPanel
        ];

        for (
            const panel
            of panels
        ) {
            if (
                panel
            ) {
                panel.hidden =
                    panel !== target;
            }
        }
    }

    function setStatus(
        message,
        type = "normal"
    ) {
        if (
            !statusElement
        ) {
            return;
        }

        statusElement.textContent =
            message;

        statusElement.dataset.type =
            type;
    }

    function formatSeconds(
        seconds
    ) {
        const safeSeconds =
            Math.max(
                0,
                Math.ceil(
                    seconds
                )
            );

        const minutes =
            Math.floor(
                safeSeconds / 60
            );

        const remaining =
            safeSeconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    }

    function showWaiting(
        detail
    ) {
        joined =
            true;

        roomCode =
            detail.room_code;

        playerName =
            detail.player_name;

        currentFinalized = Boolean(detail.programming_finalized);

        roomCodeElement.textContent =
            roomCode;

        showPanel(
            waitingPanel
        );

        updateSkinButtons();

        if (skinStatusElement) {
            skinStatusElement.textContent = `Cor selecionada: ${skinLabel(getLocalSkin())}. Você pode alterá-la enquanto estiver no lobby.`;
        }

        if (detail.room_status === "lobby") {
            currentFinalized = false;
            currentReady = false;
            programmingSessionInitialized = false;
            localStorage.removeItem(LAB_RETURN_KEY);
            localStorage.setItem(PROGRAM_ACCESS_KEY, JSON.stringify({
                roomCode,
                phase: "lobby",
                finalized: false,
                language: null,
            }));
        }

        if (
            detail.room_status ===
            "programming"
        ) {
            showProgramming(
                detail.programming_ends_at
            );
        }
    }

    function updateRoom(
        detail
    ) {
        if (
            !joined
        ) {
            return;
        }

        playerCountElement.textContent =
            `${detail.human_count} / ${detail.max_participants} jogadores`;

        const localEntry =
            detail.players.find(
                player =>
                    player.client_id ===
                    window.battleTankNetwork.clientId
            );

        if (
            localEntry
        ) {
            currentReady = Boolean(localEntry.ready);
            currentFinalized = Boolean(localEntry.finalized);
            updateReadyButton();

            if (currentFinalized && programmingSummaryElement) {
                const lang = localEntry.programming_language === "python" ? "Python" : "JavaScript";
                programmingSummaryElement.textContent = `${lang} • ${Number(localEntry.function_count || 0)} função(ões) ativa(s).`;
            }
        }

        if (
            detail.status ===
            "lobby"
        ) {
            showPanel(
                waitingPanel
            );
        }

        if (
            detail.status ===
            "programming"
        ) {
            showProgramming(
                detail.programming_ends_at
            );
        }

        if (
            detail.status ===
            "countdown"
        ) {
            showCountdown(
                detail.countdown_ends_at
            );
        }
    }

    function showProgramming(
        endsAt
    ) {
        programmingEndsAt =
            Number(
                endsAt
            );

        if (!programmingSessionInitialized && !currentFinalized) {
            resetLocalProgramLoadout();
            programmingSessionInitialized = true;
        }

        showPanel(
            programmingPanel
        );

        startProgrammingClock();

        const storedAccess = (() => {
            try { return JSON.parse(localStorage.getItem(PROGRAM_ACCESS_KEY) || "{}"); }
            catch (_error) { return {}; }
        })();
        const existingAccess = String(storedAccess.roomCode || "") === String(roomCode) ? storedAccess : {};
        const access = {
            ...existingAccess,
            roomCode,
            phase: currentFinalized ? "waiting" : "programming",
            finalized: currentFinalized,
        };
        localStorage.setItem(PROGRAM_ACCESS_KEY, JSON.stringify(access));

        if (openLabLink) {
            openLabLink.href = `lab.html?room=${encodeURIComponent(roomCode)}`;
            openLabLink.hidden = currentFinalized;
        }

        updateReadyButton();
        consumeLabReturnIntent();
    }

    function startProgrammingClock() {
        stopClock();

        const tick =
            () => {
                if (
                    !programmingEndsAt
                ) {
                    return;
                }

                const remaining =
                    programmingEndsAt -
                    Date.now() / 1000;

                programmingTimerElement.textContent =
                    formatSeconds(
                        remaining
                    );

                if (
                    remaining <= 0
                ) {
                    stopClock();
                }
            };

        tick();

        clockTimer =
            setInterval(
                tick,
                250
            );
    }

    function startLoadoutSync() {
        stopLoadoutSync();

        loadoutSyncTimer =
            setInterval(
                syncLoadoutNow,
                1500
            );
    }

    function stopLoadoutSync() {
        if (
            loadoutSyncTimer
        ) {
            clearInterval(
                loadoutSyncTimer
            );

            loadoutSyncTimer =
                null;
        }
    }

    function syncLoadoutNow() {
        if (
            !joined ||
            !window.battleTankNetwork.connected ||
            programmingPanel.hidden
        ) {
            return;
        }

        const loadout =
            window.battleTankNetwork.getLocalLoadout();

        const signature =
            JSON.stringify(
                loadout
            );

        if (
            signature ===
            lastLoadoutSignature
        ) {
            return;
        }

        lastLoadoutSignature =
            signature;

        currentReady =
            false;

        updateReadyButton();

        programmingStateElement.textContent =
            "Enviando configuração do tanque...";

        window.battleTankNetwork.updateLoadout();
    }

    function updateReadyButton() {
        if (!programmingStateElement || !programmingPanel) {
            return;
        }

        if (openLabLink) {
            openLabLink.hidden = currentFinalized;
        }

        if (currentFinalized) {
            programmingStateElement.textContent =
                "PROGRAMAÇÃO FINALIZADA ✓ • AGUARDANDO O PROFESSOR INICIAR A ARENA.";
            programmingStateElement.classList.add("is-ready");
            if (programmingKickerElement) programmingKickerElement.textContent = "TANQUE PRONTO";
            if (programmingTitleElement) programmingTitleElement.textContent = "AGUARDANDO A ARENA";
        }
        else {
            programmingStateElement.textContent =
                "PROGRAME SEU TANQUE E CLIQUE EM FINALIZAR PROGRAMAÇÃO NO LABORATÓRIO.";
            programmingStateElement.classList.remove("is-ready");
            if (programmingKickerElement) programmingKickerElement.textContent = "FASE DE PROGRAMAÇÃO";
            if (programmingTitleElement) programmingTitleElement.textContent = "PREPARE SEU TANQUE";
        }
    }

    function consumeLabReturnIntent() {
        const raw = localStorage.getItem(LAB_RETURN_KEY);

        if (!raw || !joined || programmingPanel.hidden || currentFinalized) {
            return;
        }

        let payload;
        try { payload = JSON.parse(raw); }
        catch (_error) { payload = null; }

        localStorage.removeItem(LAB_RETURN_KEY);

        if (!payload || payload.roomCode !== roomCode || !payload.finalized) {
            return;
        }

        programmingStateElement.textContent =
            "Enviando programa final ao servidor...";

        window.battleTankNetwork.finalizeProgramming(
            payload.language,
            payload.programmedFunctions || []
        );
    }

    function showCountdown(
        endsAt
    ) {
        stopLoadoutSync();
        const access = (() => { try { return JSON.parse(localStorage.getItem(PROGRAM_ACCESS_KEY) || "{}"); } catch (_e) { return {}; } })();
        localStorage.setItem(PROGRAM_ACCESS_KEY, JSON.stringify({ ...access, roomCode, phase:"countdown", finalized:true }));

        countdownEndsAt =
            Number(
                endsAt
            );

        showPanel(
            countdownPanel
        );

        stopClock();

        const tick =
            () => {
                const remaining =
                    countdownEndsAt -
                    Date.now() / 1000;

                const value =
                    Math.max(
                        1,
                        Math.ceil(
                            remaining
                        )
                    );

                countdownValue.textContent =
                    remaining <= 0
                        ? "GO!"
                        : String(
                            value
                        );

                if (
                    remaining <= 0
                ) {
                    stopClock();
                }
            };

        tick();

        clockTimer =
            setInterval(
                tick,
                100
            );
    }

    function stopClock() {
        if (
            clockTimer
        ) {
            clearInterval(
                clockTimer
            );

            clockTimer =
                null;
        }
    }

    function startMatch(
        detail
    ) {
        stopClock();
        stopLoadoutSync();

        window.battleTankSession = {
            roomCode:
                detail.room_code,
            playerName:
                playerName,
            playerId:
                window.battleTankNetwork.clientId,
            humanCount:
                detail.human_count,
            botCount:
                detail.bot_count,
            totalParticipants:
                detail.total_participants,
            participants:
                detail.participants,
            matchId:
                detail.match_id
        };

        countdownValue.textContent =
            "BATALHA!";

        showPanel(
            countdownPanel
        );

        setTimeout(
            () => {
                overlay.classList.add(
                    "battle-lobby-hidden"
                );

                setTimeout(
                    () => {
                        overlay.remove();
                    },
                    450
                );
            },
            800
        );
    }

    window.addEventListener(
        "storage",
        (event) => {
            if (event.key === PLAYER_STORAGE_KEY) {
                updateSkinButtons();
            }

            if (event.key === LAB_RETURN_KEY && event.newValue) {
                consumeLabReturnIntent();
            }
        }
    );

    window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin) {
            return;
        }

        if (event.data?.type === "battle-tank-programming-finalized") {
            consumeLabReturnIntent();
        }
    });

    window.addEventListener(
        "focus",
        () => {
            updateSkinButtons();
            consumeLabReturnIntent();
        }
    );

    window.addEventListener(
        "DOMContentLoaded",
        () => {
            createLobby();

            const network =
                window.battleTankNetwork;

            network.addEventListener(
                "server-ready",
                () => {
                    if (
                        !joinPanel.hidden
                    ) {
                        setStatus(
                            "Servidor online. Digite o código da sessão.",
                            "success"
                        );
                    }
                }
            );

            network.addEventListener(
                "room-joined",
                (event) => {
                    showWaiting(
                        event.detail
                    );
                }
            );

            network.addEventListener(
                "room-state",
                (event) => {
                    updateRoom(
                        event.detail
                    );
                }
            );

            network.addEventListener(
                "programming-started",
                (event) => {
                    showProgramming(
                        event.detail.ends_at
                    );
                }
            );

            network.addEventListener(
                "programming-finalized",
                (event) => {
                    currentFinalized = true;
                    currentReady = true;
                    updateReadyButton();

                    const lang = event.detail.language === "python" ? "Python" : "JavaScript";
                    if (programmingSummaryElement) {
                        programmingSummaryElement.textContent = `${lang} • ${Number(event.detail.function_count || 0)} função(ões) ativa(s). Tanque pronto para a batalha.`;
                    }

                    let playerData = {};
                    try { playerData = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || "{}"); } catch (_error) {}
                    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({ ...playerData, ...(event.detail.loadout || {}) }));

                    let access = {};
                    try { access = JSON.parse(localStorage.getItem(PROGRAM_ACCESS_KEY) || "{}"); } catch (_error) {}
                    localStorage.setItem(PROGRAM_ACCESS_KEY, JSON.stringify({ ...access, roomCode, phase:"waiting", finalized:true, language:event.detail.language }));
                }
            );

            network.addEventListener(
                "programming-error",
                (event) => {
                    currentFinalized = false;
                    programmingStateElement.textContent = event.detail.message || "Não foi possível finalizar a programação.";
                    let access = {};
                    try { access = JSON.parse(localStorage.getItem(PROGRAM_ACCESS_KEY) || "{}"); } catch (_error) {}
                    localStorage.setItem(PROGRAM_ACCESS_KEY, JSON.stringify({ ...access, roomCode, phase:"programming", finalized:false }));
                    updateReadyButton();
                }
            );

            network.addEventListener(
                "programming-locked",
                (event) => {
                    programmingStateElement.textContent = event.detail.message || "A programação está bloqueada.";
                }
            );

            network.addEventListener(
                "skin-saved",
                (event) => {
                    if (skinStatusElement) {
                        skinStatusElement.textContent =
                            `Cor salva no lobby: ${skinLabel(event.detail.skin)}.`;
                    }
                }
            );

            network.addEventListener(
                "skin-locked",
                (event) => {
                    if (skinStatusElement) {
                        skinStatusElement.textContent = event.detail.message;
                    }
                }
            );

            network.addEventListener(
                "loadout-locked",
                (event) => {
                    programmingStateElement.textContent =
                        event.detail.message;
                }
            );

            network.addEventListener(
                "countdown-started",
                (event) => {
                    showCountdown(
                        event.detail.ends_at
                    );
                }
            );

            network.addEventListener(
                "match-start",
                (event) => {
                    let access = {};
                    try { access = JSON.parse(localStorage.getItem(PROGRAM_ACCESS_KEY) || "{}"); } catch (_error) {}
                    localStorage.setItem(PROGRAM_ACCESS_KEY, JSON.stringify({ ...access, roomCode, phase:"running", finalized:true }));
                    startMatch(
                        event.detail
                    );
                }
            );

            network.addEventListener(
                "join-error",
                (event) => {
                    showPanel(
                        joinPanel
                    );

                    setStatus(
                        event.detail.message,
                        "error"
                    );
                }
            );

            network.addEventListener(
                "room-closed",
                (event) => {
                    joined =
                        false;

                    stopClock();
                    stopLoadoutSync();

                    showPanel(
                        joinPanel
                    );

                    setStatus(
                        event.detail.reason ||
                        "A sessão foi encerrada.",
                        "error"
                    );
                }
            );

            network.addEventListener(
                "disconnected",
                () => {
                    if (
                        joined
                    ) {
                        programmingStateElement.textContent =
                            "Conexão perdida. Tentando reconectar...";
                    }
                    else if (
                        !joinPanel.hidden
                    ) {
                        setStatus(
                            "Conexão com o servidor perdida. Tentando reconectar...",
                            "error"
                        );
                    }
                }
            );
        }
    );
})();
