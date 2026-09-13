(() => {
    let overlay = null;
    let statusElement = null;
    let formElement = null;
    let waitingElement = null;
    let waitingTextElement = null;
    let playersElement = null;
    let roomCodeElement = null;

    let joined = false;
    let playerName = "";
    let roomCode = "";

    function createLobby() {
        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "battleLobbyOverlay";

        overlay.innerHTML = `
            <div class="battle-lobby-card">
                <div class="battle-lobby-kicker">
                    BATTLE TANK EMTI
                </div>

                <h1>
                    ENTRAR NA BATALHA
                </h1>

                <p class="battle-lobby-subtitle">
                    Digite seu nome e o código de 6 números exibido no telão.
                </p>

                <div
                    id="battleLobbyStatus"
                    class="battle-lobby-status"
                >
                    Conectando ao servidor...
                </div>

                <form
                    id="battleLobbyForm"
                    class="battle-lobby-form"
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

                <div
                    id="battleLobbyWaiting"
                    class="battle-lobby-waiting"
                    hidden
                >
                    <div class="battle-room-label">
                        SESSÃO
                    </div>

                    <div
                        id="battleLobbyRoomCode"
                        class="battle-room-code"
                    >
                        ------
                    </div>

                    <div
                        id="battleLobbyWaitingText"
                        class="battle-waiting-text"
                    >
                        Aguardando o professor iniciar...
                    </div>

                    <div
                        id="battleLobbyPlayers"
                        class="battle-player-counter"
                    >
                        0 / 20 jogadores
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(
            overlay
        );

        statusElement =
            document.getElementById(
                "battleLobbyStatus"
            );

        formElement =
            document.getElementById(
                "battleLobbyForm"
            );

        waitingElement =
            document.getElementById(
                "battleLobbyWaiting"
            );

        waitingTextElement =
            document.getElementById(
                "battleLobbyWaitingText"
            );

        playersElement =
            document.getElementById(
                "battleLobbyPlayers"
            );

        roomCodeElement =
            document.getElementById(
                "battleLobbyRoomCode"
            );

        const codeInput =
            document.getElementById(
                "battleRoomCode"
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

        formElement.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                const nameInput =
                    document.getElementById(
                        "battlePlayerName"
                    );

                playerName =
                    nameInput.value
                        .trim();

                roomCode =
                    codeInput.value
                        .trim();

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
    }

    function setStatus(
        message,
        type
    ) {
        if (
            !statusElement
        ) {
            return;
        }

        statusElement.textContent =
            message;

        statusElement.dataset.type =
            type || "normal";
    }

    function showWaiting(
        detail
    ) {
        joined =
            true;

        formElement.hidden =
            true;

        waitingElement.hidden =
            false;

        roomCodeElement.textContent =
            detail.room_code;

        setStatus(
            `Você entrou como ${detail.player_name}.`,
            "success"
        );
    }

    function updateRoom(
        detail
    ) {
        if (
            !joined
        ) {
            return;
        }

        playersElement.textContent =
            `${detail.human_count} / ${detail.max_participants} jogadores`;

        if (
            detail.status === "lobby"
        ) {
            waitingTextElement.textContent =
                "Aguardando o professor iniciar...";
        }
    }

    function startMatch(
        detail
    ) {
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
                detail.participants
        };

        waitingTextElement.textContent =
            "PARTIDA INICIADA!";

        setStatus(
            `${detail.human_count} humanos + ${detail.bot_count} bots = ${detail.total_participants} participantes`,
            "success"
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
                    400
                );
            },
            1000
        );
    }

    window.addEventListener(
        "DOMContentLoaded",
        () => {
            createLobby();

            const network =
                window.battleTankNetwork;

            network.addEventListener(
                "server-ready",
                () => {
                    setStatus(
                        "Servidor online. Digite o código da sessão.",
                        "success"
                    );
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

                    formElement.hidden =
                        false;

                    waitingElement.hidden =
                        true;

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
                    setStatus(
                        "Conexão com o servidor perdida. Tentando reconectar...",
                        "error"
                    );
                }
            );
        }
    );
})();
