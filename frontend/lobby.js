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
    let readyButton = null;
    let countdownValue = null;

    let playerName = "";
    let roomCode = "";
    let joined = false;
    let currentReady = false;

    let programmingEndsAt = null;
    let countdownEndsAt = null;

    let clockTimer = null;
    let loadoutSyncTimer = null;
    let lastLoadoutSignature = "";

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

                        <a
                            class="battle-secondary-button"
                            href="lab.html"
                            target="_blank"
                            rel="noopener"
                        >
                            LABORATÓRIO LIVRE
                        </a>

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
                        Criado por: Professor André Kazuo Takaki
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
                                placeholder="Ex.: André"
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
                            <span>Sobreviver e usar bem os upgrades conquistados programando</span>
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
                    <div class="battle-kicker">
                        FASE DE PROGRAMAÇÃO
                    </div>

                    <h2>
                        PREPARE SEU TANQUE
                    </h2>

                    <div
                        id="battleProgrammingTimer"
                        class="battle-programming-timer"
                    >
                        05:00
                    </div>

                    <p>
                        Resolva desafios no laboratório para desbloquear melhorias antes da batalha.
                    </p>

                    <div class="battle-programming-actions">
                        <a
                            id="battleOpenLab"
                            class="battle-primary-button battle-link-button"
                            href="lab.html"
                            target="_blank"
                            rel="noopener"
                        >
                            ABRIR LABORATÓRIO
                        </a>

                        <button
                            id="battleReadyButton"
                            class="battle-secondary-button"
                            type="button"
                        >
                            ESTOU PRONTO
                        </button>
                    </div>

                    <div
                        id="battleProgrammingState"
                        class="battle-loadout-state"
                    >
                        Configuração do tanque sincronizada.
                    </div>

                    <div class="battle-small-note">
                        Você pode deixar o laboratório aberto em outra aba. Ao voltar para esta tela,
                        os upgrades serão enviados ao servidor.
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

        readyButton =
            document.getElementById(
                "battleReadyButton"
            );

        countdownValue =
            document.getElementById(
                "battleCountdownValue"
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

        readyButton.addEventListener(
            "click",
            () => {
                currentReady =
                    !currentReady;

                window.battleTankNetwork.setReady(
                    currentReady
                );

                updateReadyButton();
            }
        );
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

        roomCodeElement.textContent =
            roomCode;

        showPanel(
            waitingPanel
        );

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
            currentReady =
                Boolean(
                    localEntry.ready
                );

            updateReadyButton();
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

        showPanel(
            programmingPanel
        );

        startProgrammingClock();

        startLoadoutSync();

        syncLoadoutNow();
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
        if (
            !readyButton
        ) {
            return;
        }

        readyButton.textContent =
            currentReady
                ? "PRONTO ✓"
                : "ESTOU PRONTO";

        readyButton.classList.toggle(
            "is-ready",
            currentReady
        );
    }

    function showCountdown(
        endsAt
    ) {
        stopLoadoutSync();

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
            if (
                event.key ===
                "battleTankPlayer"
            ) {
                syncLoadoutNow();
            }
        }
    );

    window.addEventListener(
        "focus",
        () => {
            syncLoadoutNow();
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
                "loadout-saved",
                (event) => {
                    programmingStateElement.textContent =
                        `${event.detail.upgrade_count} upgrade(s) confirmado(s) pelo servidor.`;
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
