class BattleTankNetwork extends EventTarget {
    constructor() {
        super();

        this.socket = null;
        this.clientId = null;
        this.connected = false;

        this.roomCode = null;
        this.role = null;

        this.reconnectTimer = null;
        this.pingTimer = null;
    }

    getWebSocketUrl() {
        const protocol =
            window.location.protocol === "https:"
                ? "wss:"
                : "ws:";

        return `${protocol}//${window.location.host}/ws`;
    }

    connect() {
        if (
            this.socket &&
            (
                this.socket.readyState === WebSocket.OPEN ||
                this.socket.readyState === WebSocket.CONNECTING
            )
        ) {
            return;
        }

        const url =
            this.getWebSocketUrl();

        console.log(
            "[NETWORK] Conectando:",
            url
        );

        this.socket =
            new WebSocket(url);

        this.socket.addEventListener(
            "open",
            () => {
                this.connected = true;

                console.log(
                    "[NETWORK] WebSocket conectado."
                );

                this.startPing();

                this.dispatchEvent(
                    new CustomEvent(
                        "connected"
                    )
                );
            }
        );

        this.socket.addEventListener(
            "message",
            (event) => {
                let data;

                try {
                    data =
                        JSON.parse(
                            event.data
                        );
                }
                catch {
                    console.error(
                        "[NETWORK] Mensagem inválida:",
                        event.data
                    );

                    return;
                }

                this.handleMessage(
                    data
                );
            }
        );

        this.socket.addEventListener(
            "close",
            () => {
                console.warn(
                    "[NETWORK] Servidor desconectado."
                );

                this.connected = false;
                this.clientId = null;

                this.stopPing();

                this.dispatchEvent(
                    new CustomEvent(
                        "disconnected"
                    )
                );

                this.scheduleReconnect();
            }
        );

        this.socket.addEventListener(
            "error",
            (error) => {
                console.error(
                    "[NETWORK] Erro WebSocket:",
                    error
                );
            }
        );
    }

    handleMessage(data) {
        if (
            data.type !==
            "pong"
        ) {
            console.log(
                "[SERVER]",
                data
            );
        }

        const eventMap = {
            server_ready:
                "server-ready",
            room_created:
                "room-created",
            room_joined:
                "room-joined",
            room_state:
                "room-state",
            programming_started:
                "programming-started",
            loadout_saved:
                "loadout-saved",
            loadout_locked:
                "loadout-locked",
            programming_finalized:
                "programming-finalized",
            programming_error:
                "programming-error",
            programming_locked:
                "programming-locked",
            skin_saved:
                "skin-saved",
            skin_locked:
                "skin-locked",
            countdown_started:
                "countdown-started",
            match_start:
                "match-start",
            match_state:
                "match-state",
            match_ended:
                "match-ended",
            join_error:
                "join-error",
            room_error:
                "room-error",
            room_closed:
                "room-closed",
            room_left:
                "room-left"
        };

        if (
            data.type ===
            "server_ready"
        ) {
            this.clientId =
                data.client_id;

            console.log(
                "================================="
            );
            console.log(
                "BATTLE TANK EMTI SERVER ONLINE"
            );
            console.log(
                "CLIENT ID:",
                this.clientId
            );
            console.log(
                "================================="
            );
        }

        if (
            data.type ===
            "room_created"
        ) {
            this.roomCode =
                data.room_code;

            this.role =
                "host";
        }

        if (
            data.type ===
            "room_joined"
        ) {
            this.roomCode =
                data.room_code;

            this.role =
                "player";
        }

        if (
            data.type ===
            "room_closed" ||
            data.type ===
            "room_left"
        ) {
            this.roomCode =
                null;

            this.role =
                null;
        }

        if (
            data.type ===
            "pong"
        ) {
            return;
        }

        const eventName =
            eventMap[
                data.type
            ];

        if (
            eventName
        ) {
            this.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail:
                            data
                    }
                )
            );

            return;
        }

        this.dispatchEvent(
            new CustomEvent(
                "message",
                {
                    detail:
                        data
                }
            )
        );
    }

    send(data) {
        if (
            !this.socket ||
            this.socket.readyState !== WebSocket.OPEN
        ) {
            console.warn(
                "[NETWORK] Não conectado."
            );

            return false;
        }

        this.socket.send(
            JSON.stringify(
                data
            )
        );

        return true;
    }

    createRoom() {
        return this.send(
            {
                type:
                    "create_room"
            }
        );
    }

    getLocalLoadout() {
        const defaults = {
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
            upgrades: {}
        };

        try {
            const saved =
                localStorage.getItem(
                    "battleTankPlayer"
                );

            if (
                !saved
            ) {
                return defaults;
            }

            const data =
                JSON.parse(saved);

            return {
                ...defaults,
                ...data,
                upgrades: {
                    ...defaults.upgrades,
                    ...(data.upgrades || {})
                }
            };
        }
        catch (error) {
            console.warn(
                "[NETWORK] Não foi possível ler o loadout local:",
                error
            );

            return defaults;
        }
    }

    joinRoom(
        roomCode,
        playerName
    ) {
        return this.send(
            {
                type:
                    "join_room",
                room_code:
                    roomCode,
                player_name:
                    playerName,
                loadout:
                    this.getLocalLoadout()
            }
        );
    }

    startProgramming() {
        return this.send(
            {
                type:
                    "start_programming"
            }
        );
    }

    updateLoadout() {
        return this.send(
            {
                type:
                    "update_loadout",
                loadout:
                    this.getLocalLoadout()
            }
        );
    }

    setTankSkin(
        skin
    ) {
        return this.send(
            {
                type:
                    "update_skin",
                skin:
                    String(skin || "azul")
            }
        );
    }

    setReady(
        ready = true
    ) {
        return this.send(
            {
                type:
                    "set_ready",
                ready:
                    Boolean(ready)
            }
        );
    }

    finalizeProgramming(language, functions = []) {
        return this.send(
            {
                type: "finalize_programming",
                language: String(language || "").toLowerCase(),
                functions: Array.isArray(functions) ? functions : []
            }
        );
    }

    startBattle() {
        return this.send(
            {
                type:
                    "start_battle"
            }
        );
    }

    startRoom() {
        return this.startBattle();
    }

    sendPlayerInput(
        moveX,
        moveY,
        sequence = 0
    ) {
        return this.send(
            {
                type:
                    "player_input",
                move_x:
                    Number(moveX) || 0,
                move_y:
                    Number(moveY) || 0,
                sequence:
                    Number(sequence) || 0
            }
        );
    }

    sendPlayerShoot() {
        return this.send(
            {
                type:
                    "player_shoot"
            }
        );
    }

    endMatch() {
        return this.send(
            {
                type:
                    "end_match"
            }
        );
    }

    leaveRoom() {
        return this.send(
            {
                type:
                    "leave_room"
            }
        );
    }

    startPing() {
        this.stopPing();

        this.pingTimer =
            setInterval(
                () => {
                    this.send(
                        {
                            type:
                                "ping"
                        }
                    );
                },
                10000
            );
    }

    stopPing() {
        if (
            this.pingTimer
        ) {
            clearInterval(
                this.pingTimer
            );

            this.pingTimer =
                null;
        }
    }

    scheduleReconnect() {
        if (
            this.reconnectTimer
        ) {
            return;
        }

        console.log(
            "[NETWORK] Tentando reconectar em 3 segundos..."
        );

        this.reconnectTimer =
            setTimeout(
                () => {
                    this.reconnectTimer =
                        null;

                    this.connect();
                },
                3000
            );
    }
}

window.battleTankNetwork =
    new BattleTankNetwork();

window.addEventListener(
    "DOMContentLoaded",
    () => {
        window.battleTankNetwork.connect();
    }
);
