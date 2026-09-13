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

    const phaseBadge =
        document.getElementById(
            "phaseBadge"
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

    const readySummary =
        document.getElementById(
            "readySummary"
        );

    const startProgrammingButton =
        document.getElementById(
            "startProgrammingButton"
        );

    const programmingTimerPanel =
        document.getElementById(
            "programmingTimerPanel"
        );

    const programmingTimer =
        document.getElementById(
            "programmingTimer"
        );

    const startBattleButton =
        document.getElementById(
            "startBattleButton"
        );

    const hostMessage =
        document.getElementById(
            "hostMessage"
        );

    const countdownPanel =
        document.getElementById(
            "countdownPanel"
        );

    const countdownValue =
        document.getElementById(
            "countdownValue"
        );

    const startedPanel =
        document.getElementById(
            "startedPanel"
        );

    const startedSummary =
        document.getElementById(
            "startedSummary"
        );

    const startedDescription =
        document.getElementById(
            "startedDescription"
        );

    const endMatchButton =
        document.getElementById(
            "endMatchButton"
        );

    let clockTimer = null;
    let programmingEndsAt = null;
    let countdownEndsAt = null;

    createRoomButton.addEventListener(
        "click",
        () => {
            createRoomButton.disabled =
                true;

            network.createRoom();
        }
    );

    startProgrammingButton.addEventListener(
        "click",
        () => {
            startProgrammingButton.disabled =
                true;

            hostMessage.textContent =
                "Abrindo a fase de programação...";

            network.startProgramming();
        }
    );

    startBattleButton.addEventListener(
        "click",
        () => {
            startBattleButton.disabled =
                true;

            hostMessage.textContent =
                "Preparando contagem regressiva...";

            network.startBattle();
        }
    );

    endMatchButton.addEventListener(
        "click",
        () => {
            const confirmed =
                window.confirm(
                    "Encerrar a partida para todos os jogadores?"
                );

            if (
                !confirmed
            ) {
                return;
            }

            endMatchButton.disabled =
                true;

            endMatchButton.textContent =
                "ENCERRANDO...";

            network.endMatch();
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

            phaseBadge.textContent =
                "LOBBY";
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

            readySummary.textContent =
                `${detail.ready_count} finalizado(s)`;

            renderPlayers(
                detail.players,
                detail.status
            );

            if (
                detail.status === "lobby"
            ) {
                phaseBadge.textContent =
                    "LOBBY";

                programmingTimerPanel.hidden =
                    true;

                startProgrammingButton.hidden =
                    false;

                startProgrammingButton.disabled =
                    detail.human_count < 1;

                hostMessage.textContent =
                    detail.human_count < 1
                        ? "Aguardando pelo menos um jogador entrar."
                        : `${detail.human_count} jogador(es) conectado(s). Inicie a preparação quando a turma estiver pronta.`;
            }

            if (
                detail.status === "programming"
            ) {
                showProgramming(
                    detail.programming_ends_at
                );
            }

            if (
                detail.status === "countdown"
            ) {
                showCountdown(
                    detail.countdown_ends_at
                );
            }
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
            stopClock();

            const detail =
                event.detail;

            roomPanel.hidden =
                true;

            countdownPanel.hidden =
                true;

            startedPanel.hidden =
                false;

            startedSummary.textContent =
                `${detail.human_count} humanos + ${detail.bot_count} bots = ${detail.total_participants} participantes`;

            startedDescription.textContent =
                "Batalha em andamento. O movimento dos jogadores humanos já está sincronizado pelo servidor.";

            endMatchButton.hidden =
                false;

            endMatchButton.disabled =
                false;

            endMatchButton.textContent =
                "ENCERRAR PARTIDA";
        }
    );

    network.addEventListener(
        "match-ended",
        (event) => {
            stopClock();

            roomPanel.hidden =
                true;

            countdownPanel.hidden =
                true;

            startedPanel.hidden =
                false;

            const detail =
                event.detail;

            const winner =
                detail.winner;

            if (
                winner
            ) {
                startedSummary.textContent =
                    `VENCEDOR: ${winner.name}`;

                startedDescription.textContent =
                    `${winner.kills ?? 0} eliminação(ões).`;
            }
            else {
                startedSummary.textContent =
                    "PARTIDA ENCERRADA";

                startedDescription.textContent =
                    "A partida foi encerrada manualmente pelo professor.";
            }

            endMatchButton.hidden =
                true;
        }
    );

    network.addEventListener(
        "room-error",
        (event) => {
            hostMessage.textContent =
                event.detail.message;

            startProgrammingButton.disabled =
                false;

            startBattleButton.disabled =
                false;

            endMatchButton.disabled =
                false;

            endMatchButton.textContent =
                "ENCERRAR PARTIDA";
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

            startProgrammingButton.disabled =
                true;

            startBattleButton.disabled =
                true;

            endMatchButton.disabled =
                true;
        }
    );

    function showProgramming(
        endsAt
    ) {
        roomPanel.hidden =
            false;

        countdownPanel.hidden =
            true;

        phaseBadge.textContent =
            "PROGRAMAÇÃO";

        startProgrammingButton.hidden =
            true;

        programmingTimerPanel.hidden =
            false;

        startBattleButton.disabled =
            false;

        programmingEndsAt =
            Number(
                endsAt
            );

        hostMessage.textContent =
            "Os alunos estão programando seus tanques. Você pode iniciar a batalha antes do fim do tempo.";

        startProgrammingClock();
    }

    function startProgrammingClock() {
        stopClock();

        const tick =
            () => {
                const remaining =
                    programmingEndsAt -
                    Date.now() / 1000;

                programmingTimer.textContent =
                    formatSeconds(
                        remaining
                    );

                if (
                    remaining <= 0
                ) {
                    stopClock();

                    startBattleButton.disabled =
                        true;

                    hostMessage.textContent =
                        "Tempo encerrado. Iniciando a batalha...";
                }
            };

        tick();

        clockTimer =
            setInterval(
                tick,
                250
            );
    }

    function showCountdown(
        endsAt
    ) {
        stopClock();

        roomPanel.hidden =
            true;

        countdownPanel.hidden =
            false;

        startedPanel.hidden =
            true;

        countdownEndsAt =
            Number(
                endsAt
            );

        const tick =
            () => {
                const remaining =
                    countdownEndsAt -
                    Date.now() / 1000;

                countdownValue.textContent =
                    remaining <= 0
                        ? "GO!"
                        : String(
                            Math.max(
                                1,
                                Math.ceil(
                                    remaining
                                )
                            )
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

    function renderPlayers(
        players,
        status
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

                            <div class="player-info">
                                <div
                                    class="player-name"
                                    title="${escapeHtml(player.name)}"
                                >
                                    ${escapeHtml(player.name)}
                                </div>

                                <div class="player-meta">
                                    ${Number(player.function_count || 0)} função(ões)
                                </div>
                            </div>

                            ${
                                status === "programming"
                                    ? `
                                        <div class="player-status ${player.finalized ? "ready" : ""}">
                                            ${player.finalized ? "FINALIZADO" : "PROGRAMANDO"}
                                        </div>
                                    `
                                    : ""
                            }
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
