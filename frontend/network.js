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

        const url = this.getWebSocketUrl();

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
        // Não polui mais o console com um "pong" a cada 10 segundos.
        if (data.type !== "pong") {
            console.log(
                "[SERVER]",
                data
            );
        }

        switch (
            data.type
        ) {
            case "server_ready":
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

                this.dispatchEvent(
                    new CustomEvent(
                        "server-ready",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "room_created":
                this.roomCode =
                    data.room_code;

                this.role =
                    "host";

                this.dispatchEvent(
                    new CustomEvent(
                        "room-created",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "room_joined":
                this.roomCode =
                    data.room_code;

                this.role =
                    "player";

                this.dispatchEvent(
                    new CustomEvent(
                        "room-joined",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "room_state":
                this.dispatchEvent(
                    new CustomEvent(
                        "room-state",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "match_start":
                this.dispatchEvent(
                    new CustomEvent(
                        "match-start",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "join_error":
                this.dispatchEvent(
                    new CustomEvent(
                        "join-error",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "room_error":
                this.dispatchEvent(
                    new CustomEvent(
                        "room-error",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "room_closed":
                this.roomCode =
                    null;

                this.role =
                    null;

                this.dispatchEvent(
                    new CustomEvent(
                        "room-closed",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "room_left":
                this.roomCode =
                    null;

                this.role =
                    null;

                this.dispatchEvent(
                    new CustomEvent(
                        "room-left",
                        {
                            detail:
                                data
                        }
                    )
                );

                break;

            case "pong":
                break;

            default:
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
                    playerName
            }
        );
    }

    startRoom() {
        return this.send(
            {
                type:
                    "start_room"
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
