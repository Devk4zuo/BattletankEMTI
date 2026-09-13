from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

if not FRONTEND_DIR.exists():
    raise RuntimeError(f"Pasta frontend não encontrada: {FRONTEND_DIR}")


app = FastAPI(
    title="Battle Tank EMTI Server",
    version="0.1.0",
)


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

    async def send_json(
        self,
        client_id: str,
        payload: dict[str, Any],
    ) -> None:
        websocket = self.active_connections.get(client_id)

        if websocket is not None:
            await websocket.send_json(payload)

    async def broadcast(
        self,
        payload: dict[str, Any],
        exclude: str | None = None,
    ) -> None:
        disconnected: list[str] = []

        for client_id, websocket in self.active_connections.items():
            if client_id == exclude:
                continue

            try:
                await websocket.send_json(payload)
            except Exception:
                disconnected.append(client_id)

        for client_id in disconnected:
            self.disconnect(client_id)


manager = ConnectionManager()


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
            "match": {
                "state": "development",
                "max_players": 20,
            },
        }
    )


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

    await manager.broadcast(
        {
            "type": "client_joined",
            "client_id": client_id,
            "connected_clients": len(manager.active_connections),
        },
        exclude=client_id,
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

            # Nesta primeira etapa o servidor apenas confirma
            # o recebimento. Na próxima migraremos movimento,
            # tiros, bots, dano, zona e condição de vitória.
            await manager.send_json(
                client_id,
                {
                    "type": "received",
                    "client_id": client_id,
                    "original_type": message_type,
                },
            )

    except WebSocketDisconnect:
        manager.disconnect(client_id)

        await manager.broadcast(
            {
                "type": "client_left",
                "client_id": client_id,
                "connected_clients": len(manager.active_connections),
            }
        )


# IMPORTANTE:
# O mount "/" deve ficar POR ÚLTIMO.
# Assim /ws, /healthz e /api/* são resolvidos antes do frontend.
app.mount(
    "/",
    StaticFiles(
        directory=str(FRONTEND_DIR),
        html=True,
    ),
    name="frontend",
)
