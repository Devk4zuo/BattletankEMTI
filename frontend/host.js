(() => {
    const network =
        window.battleTankNetwork;

    const serverBadge =
        document.getElementById(
            "serverBadge"
        );

    const createPanel =
        document.getElementById(
            "createPanel"
        );

    const createRoomButton =
        document.getElementById(
            "createRoomButton"
        );

    const roomPanel =
        document.getElementById(
            "roomPanel"
        );

    const roomCode =
        document.getElementById(
            "roomCode"
        );

    const playerCount =
        document.getElementById(
            "playerCount"
        );

    const playerList =
        document.getElementById(
            "playerList"
        );

    const humanCount =
        document.getElementById(
            "humanCount"
        );

    const botCount =
        document.getElementById(
            "botCount"
        );

    const startRoomButton =
        document.getElementById(
            "startRoomButton"
        );

    const hostMessage =
        document.getElementById(
            "hostMessage"
        );

    const startedPanel =
        document.getElementById(
            "startedPanel"
        );

    const startedSummary =
        document.getElementById(
            "startedSummary"
        );

    createRoomButton.addEventListener(
        "click",
        () => {
            createRoomButton.disabled =
                true;

            network.createRoom();
        }
    );

    startRoomButton.addEventListener(
        "click",
        () => {
            startRoomButton.disabled =
                true;

            hostMessage.textContent =
                "Liberando a arena...";

            network.startRoom();
        }
    );

    network.addEventListener(
        "server-ready",
        () => {
            serverBadge.textContent =
                "SERVIDOR ONLINE";

            serverBadge.classList.add(
                "online"
            );

            createRoomButton.disabled =
                false;
        }
    );

    network.addEventListener(
        "room-created",
        (event) => {
            createPanel.hidden =
                true;

            roomPanel.hidden =
                false;

            roomCode.textContent =
                event.detail.room_code;
        }
    );

    network.addEventListener(
        "room-state",
        (event) => {
            const detail =
                event.detail;

            if (
                network.role !== "host"
            ) {
                return;
            }

            playerCount.textContent =
                `${detail.human_count} / ${detail.max_participants}`;

            humanCount.textContent =
                detail.human_count;

            botCount.textContent =
                detail.bot_count_if_started;

            renderPlayers(
                detail.players
            );

            if (
                detail.status === "lobby"
            ) {
                startRoomButton.disabled =
                    detail.human_count < 1;

                hostMessage.textContent =
                    detail.human_count < 1
                        ? "Aguardando pelo menos um jogador entrar."
                        : `${detail.human_count} jogador(es) pronto(s). Se iniciar agora, entram ${detail.bot_count_if_started} bot(s).`;
            }
        }
    );

    network.addEventListener(
        "match-start",
        (event) => {
            const detail =
                event.detail;

            roomPanel.hidden =
                true;

            startedPanel.hidden =
                false;

            startedSummary.textContent =
                `${detail.human_count} humanos + ${detail.bot_count} bots = ${detail.total_participants} participantes`;
        }
    );

    network.addEventListener(
        "room-error",
        (event) => {
            hostMessage.textContent =
                event.detail.message;

            startRoomButton.disabled =
                false;
        }
    );

    network.addEventListener(
        "disconnected",
        () => {
            serverBadge.textContent =
                "SERVIDOR DESCONECTADO";

            serverBadge.classList.remove(
                "online"
            );

            createRoomButton.disabled =
                true;

            startRoomButton.disabled =
                true;
        }
    );

    function renderPlayers(
        players
    ) {
        if (
            !players.length
        ) {
            playerList.innerHTML = `
                <div class="empty-state">
                    Aguardando jogadores...
                </div>
            `;

            return;
        }

        playerList.innerHTML =
            players
                .map(
                    (
                        player,
                        index
                    ) => `
                        <div class="player-chip">
                            <div class="player-number">
                                ${index + 1}
                            </div>

                            <div
                                class="player-name"
                                title="${escapeHtml(player.name)}"
                            >
                                ${escapeHtml(player.name)}
                            </div>
                        </div>
                    `
                )
                .join("");
    }

    function escapeHtml(
        value
    ) {
        return String(
            value
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }
})();
