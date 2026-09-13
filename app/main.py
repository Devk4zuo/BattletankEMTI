from __future__ import annotations

import random
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

if not FRONTEND_DIR.exists():
    raise RuntimeError(f"Pasta frontend não encontrada: {FRONTEND_DIR}")

app = FastAPI(
    title="Battle Tank EMTI Server",
    version="0.2.0",
)

MAX_PARTICIPANTS = 20


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        client_id = uuid.uuid4().hex[:12]
        self.active_connections[client_id] = websocket
        return client_id

    def disconnect(self, client_id: str) -> None:
        self.active_connections.pop(client_id, None)

    async def send_json(self, client_id: str, payload: dict[str, Any]) -> None:
        websocket = self.active_connections.get(client_id)
        if websocket is None:
            return

        try:
            await websocket.send_json(payload)
        except Exception:
            self.disconnect(client_id)

    async def broadcast_to_clients(
        self,
        client_ids: list[str],
        payload: dict[str, Any],
    ) -> None:
        for client_id in list(client_ids):
            await self.send_json(client_id, payload)


manager = ConnectionManager()

# Salas em memória.
# Para o uso em sala de aula/LAN isso é suficiente nesta primeira versão.
rooms: dict[str, dict[str, Any]] = {}

# Informa em qual sala cada conexão está.
client_rooms: dict[str, str] = {}
client_roles: dict[str, str] = {}


def generate_room_code() -> str:
    for _ in range(1000):
        code = f"{random.randint(0, 999999):06d}"
        if code not in rooms:
            return code

    raise RuntimeError("Não foi possível gerar um código de sala.")


def sanitize_player_name(value: Any) -> str:
    name = str(value or "").strip()
    name = " ".join(name.split())

    if not name:
        return ""

    return name[:20]


def get_room_client_ids(room: dict[str, Any]) -> list[str]:
    ids: list[str] = []

    host_id = room.get("host_id")
    if host_id:
        ids.append(host_id)

    for player in room["players"]:
        player_id = player["client_id"]
        if player_id not in ids:
            ids.append(player_id)

    return ids


def room_public_state(room: dict[str, Any]) -> dict[str, Any]:
    humans = [
        {
            "client_id": player["client_id"],
            "name": player["name"],
            "joined_order": player["joined_order"],
        }
        for player in room["players"]
    ]

    human_count = len(humans)

    return {
        "type": "room_state",
        "room_code": room["code"],
        "status": room["status"],
        "max_participants": MAX_PARTICIPANTS,
        "human_count": human_count,
        "bot_count_if_started": max(0, MAX_PARTICIPANTS - human_count),
        "players": humans,
    }


async def broadcast_room_state(room_code: str) -> None:
    room = rooms.get(room_code)
    if room is None:
        return

    await manager.broadcast_to_clients(
        get_room_client_ids(room),
        room_public_state(room),
    )


async def close_room(room_code: str, reason: str) -> None:
    room = rooms.get(room_code)
    if room is None:
        return

    client_ids = get_room_client_ids(room)

    await manager.broadcast_to_clients(
        client_ids,
        {
            "type": "room_closed",
            "room_code": room_code,
            "reason": reason,
        },
    )

    for client_id in client_ids:
        client_rooms.pop(client_id, None)
        client_roles.pop(client_id, None)

    rooms.pop(room_code, None)


async def remove_client_from_room(client_id: str) -> None:
    room_code = client_rooms.pop(client_id, None)
    role = client_roles.pop(client_id, None)

    if not room_code:
        return

    room = rooms.get(room_code)
    if room is None:
        return

    if role == "host" and room.get("host_id") == client_id:
        await close_room(
            room_code,
            "O professor encerrou a sessão.",
        )
        return

    before = len(room["players"])
    room["players"] = [
        player
        for player in room["players"]
        if player["client_id"] != client_id
    ]

    if len(room["players"]) != before:
        await broadcast_room_state(room_code)


@app.get("/healthz")
async def healthz() -> JSONResponse:
    return JSONResponse(
        {
            "ok": True,
            "game": "Battle Tank EMTI",
            "server": "online",
        }
    )


@app.get("/api/status")
async def api_status() -> JSONResponse:
    return JSONResponse(
        {
            "game": "Battle Tank EMTI",
            "server": "online",
            "connected_clients": len(manager.active_connections),
            "rooms": len(rooms),
            "max_participants_per_room": MAX_PARTICIPANTS,
        }
    )


@app.get("/host")
async def host_page() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "host.html")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    client_id = await manager.connect(websocket)

    await manager.send_json(
        client_id,
        {
            "type": "server_ready",
            "client_id": client_id,
            "message": "Conectado ao servidor Battle Tank EMTI.",
        },
    )

    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")

            if message_type == "ping":
                await manager.send_json(
                    client_id,
                    {
                        "type": "pong",
                        "client_id": client_id,
                    },
                )
                continue

            if message_type == "create_room":
                # Se esta conexão já estava vinculada a algo, sai primeiro.
                await remove_client_from_room(client_id)

                room_code = generate_room_code()

                rooms[room_code] = {
                    "code": room_code,
                    "host_id": client_id,
                    "status": "lobby",
                    "players": [],
                    "join_counter": 0,
                }

                client_rooms[client_id] = room_code
                client_roles[client_id] = "host"

                await manager.send_json(
                    client_id,
                    {
                        "type": "room_created",
                        "room_code": room_code,
                        "max_participants": MAX_PARTICIPANTS,
                    },
                )

                await broadcast_room_state(room_code)
                continue

            if message_type == "join_room":
                room_code = str(message.get("room_code") or "").strip()
                player_name = sanitize_player_name(
                    message.get("player_name")
                )

                if not player_name:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "join_error",
                            "message": "Digite seu nome.",
                        },
                    )
                    continue

                if len(room_code) != 6 or not room_code.isdigit():
                    await manager.send_json(
                        client_id,
                        {
                            "type": "join_error",
                            "message": "O código deve ter 6 números.",
                        },
                    )
                    continue

                room = rooms.get(room_code)

                if room is None:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "join_error",
                            "message": "Sessão não encontrada.",
                        },
                    )
                    continue

                if room["status"] != "lobby":
                    await manager.send_json(
                        client_id,
                        {
                            "type": "join_error",
                            "message": "Esta partida já começou.",
                        },
                    )
                    continue

                existing_player = next(
                    (
                        player
                        for player in room["players"]
                        if player["client_id"] == client_id
                    ),
                    None,
                )

                if existing_player is None and len(room["players"]) >= MAX_PARTICIPANTS:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "join_error",
                            "message": "A sessão está cheia.",
                        },
                    )
                    continue

                old_room_code = client_rooms.get(client_id)
                if old_room_code and old_room_code != room_code:
                    await remove_client_from_room(client_id)

                room = rooms.get(room_code)
                if room is None:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "join_error",
                            "message": "A sessão foi encerrada.",
                        },
                    )
                    continue

                existing_player = next(
                    (
                        player
                        for player in room["players"]
                        if player["client_id"] == client_id
                    ),
                    None,
                )

                if existing_player is None:
                    room["join_counter"] += 1
                    room["players"].append(
                        {
                            "client_id": client_id,
                            "name": player_name,
                            "joined_order": room["join_counter"],
                        }
                    )
                else:
                    existing_player["name"] = player_name

                client_rooms[client_id] = room_code
                client_roles[client_id] = "player"

                await manager.send_json(
                    client_id,
                    {
                        "type": "room_joined",
                        "room_code": room_code,
                        "player_name": player_name,
                        "player_id": client_id,
                    },
                )

                await broadcast_room_state(room_code)
                continue

            if message_type == "start_room":
                room_code = client_rooms.get(client_id)
                room = rooms.get(room_code or "")

                if (
                    room is None
                    or room.get("host_id") != client_id
                    or client_roles.get(client_id) != "host"
                ):
                    await manager.send_json(
                        client_id,
                        {
                            "type": "room_error",
                            "message": "Somente o professor pode iniciar a partida.",
                        },
                    )
                    continue

                if room["status"] != "lobby":
                    continue

                if len(room["players"]) < 1:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "room_error",
                            "message": "Aguarde pelo menos um jogador entrar.",
                        },
                    )
                    continue

                room["status"] = "running"

                humans = [
                    {
                        "id": player["client_id"],
                        "name": player["name"],
                        "type": "human",
                    }
                    for player in room["players"]
                ]

                bot_count = MAX_PARTICIPANTS - len(humans)
                bots = [
                    {
                        "id": f"bot_{index:02d}",
                        "name": f"BOT {index:02d}",
                        "type": "bot",
                    }
                    for index in range(1, bot_count + 1)
                ]

                participants = humans + bots

                await manager.broadcast_to_clients(
                    get_room_client_ids(room),
                    {
                        "type": "match_start",
                        "room_code": room_code,
                        "human_count": len(humans),
                        "bot_count": bot_count,
                        "total_participants": len(participants),
                        "participants": participants,
                    },
                )

                await broadcast_room_state(room_code)
                continue

            if message_type == "leave_room":
                await remove_client_from_room(client_id)

                await manager.send_json(
                    client_id,
                    {
                        "type": "room_left",
                    },
                )
                continue

            await manager.send_json(
                client_id,
                {
                    "type": "received",
                    "client_id": client_id,
                    "original_type": message_type,
                },
            )

    except WebSocketDisconnect:
        await remove_client_from_room(client_id)
        manager.disconnect(client_id)

    except Exception as exc:
        print(f"[WS] Erro do cliente {client_id}: {exc}")
        await remove_client_from_room(client_id)
        manager.disconnect(client_id)


# IMPORTANTE:
# O mount está por último para não interceptar /healthz, /api/status,
# /host e /ws.
app.mount(
    "/",
    StaticFiles(
        directory=str(FRONTEND_DIR),
        html=True,
    ),
    name="frontend",
)
