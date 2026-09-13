from __future__ import annotations

import asyncio
import math
import random
import time
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
    version="1.0.0",
)

MAX_PARTICIPANTS = 20
PROGRAMMING_DURATION_SECONDS = 5 * 60
COUNTDOWN_DURATION_SECONDS = 5

WORLD_WIDTH = 6144
WORLD_HEIGHT = 3456

TERRAINS = ["mapa1", "mapa2"]
TANK_SKINS = ["azul", "vermelho", "bege", "escuro"]

MAX_PROGRAM_FUNCTIONS = 5
PROGRAMMING_LANGUAGES = {"javascript", "python"}

# Funções permitidas no laboratório. O servidor não executa o código do aluno;
# ele recebe somente os IDs das funções que o laboratório validou e deriva
# o loadout oficial com limites próprios.
PROGRAM_FUNCTION_EFFECTS: dict[str, dict[str, float]] = {
    "motor2": {"speed": 0.40},
    "turbo": {"speed": 0.55},
    "tracao": {"speed": 0.25},
    "peso": {"speed": 0.30},
    "eficiencia": {"speed": 0.20},
    "proteger_motor": {"speed": 0.15},
    "bullet2": {"bulletSpeed": 4.0},
    "propulsao": {"bulletSpeed": 2.0},
    "municao_leve": {"bulletSpeed": 1.5},
    "pressao": {"bulletSpeed": 1.0},
    "cannon2": {"fireRate": -80.0},
    "recarga_rapida": {"fireRate": -45.0},
    "gatilho": {"fireRate": -30.0},
    "sincronismo": {"fireRate": -20.0},
    "tiro_duplo": {"bulletCount": 2.0},
    "tiro_triplo": {"bulletCount": 3.0},
    "dano": {"bulletDamage": 10.0},
    "penetracao": {"bulletDamage": 7.0},
    "impacto": {"bulletDamage": 5.0},
    "explosiva": {"bulletDamage": 4.0, "bulletRadius": 1.0},
    "calibre": {"bulletRadius": 2.0},
    "alcance": {"bulletLifetime": 2.0},
    "precisao": {"bulletSpread": 3.0},
    "estabilizador": {"bulletSpread": 2.0},
    "blindagem": {"maxLife": 25.0},
    "blindagem2": {"maxLife": 15.0},
    "escudo": {"damageReduction": 0.15},
    "amortecimento": {"damageReduction": 0.10},
    "regeneracao": {"regen": 1.0},
    "emergencia": {"maxLife": 10.0, "regen": 0.5},
}

SPAWN_POINTS = [
    {"x": 450, "y": 450},
    {"x": 1500, "y": 450},
    {"x": 2600, "y": 450},
    {"x": 3700, "y": 450},
    {"x": 4800, "y": 450},
    {"x": 800, "y": 1150},
    {"x": 2000, "y": 1150},
    {"x": 3100, "y": 1150},
    {"x": 4200, "y": 1150},
    {"x": 5450, "y": 1150},
    {"x": 650, "y": 2200},
    {"x": 1800, "y": 2200},
    {"x": 2900, "y": 2200},
    {"x": 4100, "y": 2200},
    {"x": 5350, "y": 2200},
    {"x": 450, "y": 3000},
    {"x": 1600, "y": 3000},
    {"x": 2900, "y": 3000},
    {"x": 4300, "y": 3000},
    {"x": 5600, "y": 3000},
]

BARRIER_SIZES = {
    "barrier1": (330, 330),
    "barrier2": (310, 310),
    "barrier4": (430, 430),
    "barrier5": (360, 360),
    "barrier7": (320, 320),
    "barrier8": (340, 340),
    "barrier9": (420, 240),
    "barrier10": (330, 330),
}

BARRIER_POOL = [
    "barrier1", "barrier1",
    "barrier2", "barrier2",
    "barrier4",
    "barrier5",
    "barrier7",
    "barrier8", "barrier8",
    "barrier9", "barrier9",
    "barrier10",
]

# Árvores são cobertura visual, não barreiras físicas.
# O tanque e os bots podem atravessar e permanecer sob a copa.
TREE_SIZES = {
    "tree1": (300, 300),
    "tree2": (520, 260),
}

TREE_POOL = [
    "tree1",
    "tree1",
    "tree2",
]


# ============================================================
# MOVIMENTO MULTIPLAYER - AUTORIDADE DO SERVIDOR
# ============================================================

MATCH_TICK_HZ = 30
MATCH_SNAPSHOT_HZ = 15
INPUT_TIMEOUT_SECONDS = 0.35
SPEED_TO_PIXELS_PER_SECOND = 60.0

HUMAN_COLLISION_RADIUS = 29.0
BOT_COLLISION_RADIUS = 29.0
TANK_TO_TANK_PADDING = 10.0
BOT_STRAFE_BIAS = 0.72
BOT_STUCK_FLIP_SECONDS = 0.65

# ============================================================
# COMBATE MULTIPLAYER - AUTORIDADE DO SERVIDOR
# ============================================================

BULLET_RADIUS = 4.0
BULLET_DAMAGE = 25
BULLET_SPEED_TO_PIXELS_PER_SECOND = 60.0
BULLET_MAX_LIFETIME_SECONDS = 5.0

BARRIER_HITBOXES = {
    "barrier1": (0.08, 0.38, 0.84, 0.28),
    "barrier2": (0.08, 0.40, 0.84, 0.23),
    "barrier4": (0.12, 0.25, 0.76, 0.52),
    "barrier5": (0.18, 0.18, 0.64, 0.64),
    "barrier7": (0.20, 0.20, 0.60, 0.60),
    "barrier8": (0.12, 0.22, 0.76, 0.58),
    "barrier9": (0.06, 0.34, 0.88, 0.34),
    "barrier10": (0.16, 0.16, 0.68, 0.68),
}


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

rooms: dict[str, dict[str, Any]] = {}
client_rooms: dict[str, str] = {}
client_roles: dict[str, str] = {}


def clamp(value: Any, minimum: float, maximum: float, default: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default

    return max(minimum, min(maximum, number))


def base_loadout(skin: str = "azul") -> dict[str, Any]:
    safe_skin = str(skin or "azul").strip().lower()
    if safe_skin not in TANK_SKINS:
        safe_skin = "azul"

    return {
        "skin": safe_skin,
        "speed": 4.5,
        "bulletSpeed": 13.0,
        "fireRate": 260,
        "bulletCount": 1,
        "bulletDamage": 25,
        "bulletRadius": 4.0,
        "bulletLifetime": 5.0,
        "bulletSpread": 6.0,
        "maxLife": 100,
        "damageReduction": 0.0,
        "regen": 0.0,
        "programmedFunctions": [],
        "programmingLanguage": None,
        "upgrades": {},
    }


def sanitize_programmed_functions(value: Any) -> list[str]:
    raw = value if isinstance(value, list) else []
    result: list[str] = []

    for item in raw:
        function_id = str(item or "").strip()
        if function_id not in PROGRAM_FUNCTION_EFFECTS:
            continue
        if function_id in result:
            continue
        result.append(function_id)
        if len(result) >= MAX_PROGRAM_FUNCTIONS:
            break

    return result


def derive_loadout_from_functions(
    skin: str,
    function_ids: list[str],
    language: str | None,
) -> dict[str, Any]:
    loadout = base_loadout(skin)
    selected = sanitize_programmed_functions(function_ids)
    explicit_spread: float | None = None

    for function_id in selected:
        effect = PROGRAM_FUNCTION_EFFECTS.get(function_id, {})
        loadout["upgrades"][function_id] = True

        if "speed" in effect:
            loadout["speed"] += float(effect["speed"])
        if "bulletSpeed" in effect:
            loadout["bulletSpeed"] += float(effect["bulletSpeed"])
        if "fireRate" in effect:
            loadout["fireRate"] += float(effect["fireRate"])
        if "bulletCount" in effect:
            loadout["bulletCount"] = max(
                int(loadout["bulletCount"]),
                int(effect["bulletCount"]),
            )
        if "bulletDamage" in effect:
            loadout["bulletDamage"] += int(effect["bulletDamage"])
        if "bulletRadius" in effect:
            loadout["bulletRadius"] += float(effect["bulletRadius"])
        if "bulletLifetime" in effect:
            loadout["bulletLifetime"] += float(effect["bulletLifetime"])
        if "bulletSpread" in effect:
            value = float(effect["bulletSpread"])
            explicit_spread = value if explicit_spread is None else min(explicit_spread, value)
        if "maxLife" in effect:
            loadout["maxLife"] += int(effect["maxLife"])
        if "damageReduction" in effect:
            loadout["damageReduction"] += float(effect["damageReduction"])
        if "regen" in effect:
            loadout["regen"] += float(effect["regen"])

    loadout["speed"] = round(clamp(loadout["speed"], 3.5, 6.5, 4.5), 2)
    loadout["bulletSpeed"] = round(clamp(loadout["bulletSpeed"], 9.0, 20.0, 13.0), 2)
    loadout["fireRate"] = int(clamp(loadout["fireRate"], 120, 500, 260))
    loadout["bulletCount"] = int(clamp(loadout["bulletCount"], 1, 3, 1))
    loadout["bulletDamage"] = int(clamp(loadout["bulletDamage"], 15, 55, 25))
    loadout["bulletRadius"] = round(clamp(loadout["bulletRadius"], 3.0, 8.0, 4.0), 2)
    loadout["bulletLifetime"] = round(clamp(loadout["bulletLifetime"], 3.0, 8.0, 5.0), 2)
    loadout["bulletSpread"] = round(
        clamp(explicit_spread if explicit_spread is not None else 6.0, 1.5, 10.0, 6.0),
        2,
    )
    loadout["maxLife"] = int(clamp(loadout["maxLife"], 80, 160, 100))
    loadout["damageReduction"] = round(clamp(loadout["damageReduction"], 0.0, 0.35, 0.0), 3)
    loadout["regen"] = round(clamp(loadout["regen"], 0.0, 2.0, 0.0), 2)
    loadout["programmedFunctions"] = selected
    loadout["programmingLanguage"] = language if language in PROGRAMMING_LANGUAGES else None
    return loadout


def sanitize_loadout(value: Any) -> dict[str, Any]:
    data = value if isinstance(value, dict) else {}
    skin = str(data.get("skin") or "azul").strip().lower()
    language = str(data.get("programmingLanguage") or "").strip().lower()
    if language not in PROGRAMMING_LANGUAGES:
        language = None
    functions = sanitize_programmed_functions(data.get("programmedFunctions"))
    return derive_loadout_from_functions(skin, functions, language)

def upgrade_count(loadout: dict[str, Any]) -> int:
    upgrades = loadout.get("upgrades", {})
    return sum(1 for value in upgrades.values() if value)


def generate_room_code() -> str:
    for _ in range(1000):
        code = f"{random.randint(0, 999999):06d}"
        if code not in rooms:
            return code

    raise RuntimeError("Não foi possível gerar um código de sala.")


def sanitize_player_name(value: Any) -> str:
    name = str(value or "").strip()
    name = " ".join(name.split())
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
            "ready": bool(player.get("ready", False)),
            "finalized": bool(player.get("programming_finalized", False)),
            "programming_language": player.get("programming_language"),
            "function_count": len(player.get("programmed_functions", [])),
            "upgrade_count": upgrade_count(player.get("loadout", {})),
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
        "ready_count": sum(1 for player in humans if player["ready"]),
        "bot_count_if_started": max(0, MAX_PARTICIPANTS - human_count),
        "players": humans,
        "programming_ends_at": room.get("programming_ends_at"),
        "countdown_ends_at": room.get("countdown_ends_at"),
        "server_now": time.time(),
        "match_id": room.get("match", {}).get("match_id") if room.get("match") else None,
    }


def rectangles_overlap(
    a: dict[str, float],
    b: dict[str, float],
    padding: float = 0,
) -> bool:
    return not (
        a["x"] + a["width"] + padding < b["x"]
        or b["x"] + b["width"] + padding < a["x"]
        or a["y"] + a["height"] + padding < b["y"]
        or b["y"] + b["height"] + padding < a["y"]
    )


def is_near_spawn(candidate: dict[str, float]) -> bool:
    center_x = candidate["x"] + candidate["width"] / 2
    center_y = candidate["y"] + candidate["height"] / 2

    for spawn in SPAWN_POINTS:
        distance = math.hypot(
            center_x - spawn["x"],
            center_y - spawn["y"],
        )
        if distance < 340:
            return True

    return False


def generate_obstacles(
    rng: random.Random,
    desired_quantity: int = 52,
) -> list[dict[str, Any]]:
    obstacles: list[dict[str, Any]] = []
    attempts = 0
    maximum_attempts = 5000
    margin = 80

    while len(obstacles) < desired_quantity and attempts < maximum_attempts:
        attempts += 1

        type_name = rng.choice(BARRIER_POOL)
        width, height = BARRIER_SIZES[type_name]

        candidate = {
            "type": type_name,
            "x": round(
                margin + rng.random() * (WORLD_WIDTH - width - margin * 2),
                2,
            ),
            "y": round(
                margin + rng.random() * (WORLD_HEIGHT - height - margin * 2),
                2,
            ),
            "width": width,
            "height": height,
        }

        if is_near_spawn(candidate):
            continue

        if any(
            rectangles_overlap(candidate, existing, 40)
            for existing in obstacles
        ):
            continue

        obstacles.append(candidate)

    return obstacles


def generate_trees(
    rng: random.Random,
    obstacles: list[dict[str, Any]],
    desired_quantity: int = 13,
) -> list[dict[str, Any]]:
    """
    Gera árvores como cobertura visual.

    Elas NÃO entram em `obstacles`, portanto:
    - não bloqueiam humanos;
    - não bloqueiam bots;
    - podem ser usadas para emboscadas.
    """
    trees: list[dict[str, Any]] = []
    attempts = 0
    maximum_attempts = 3000
    margin = 70

    while len(trees) < desired_quantity and attempts < maximum_attempts:
        attempts += 1

        type_name = rng.choice(TREE_POOL)
        width, height = TREE_SIZES[type_name]

        candidate = {
            "type": type_name,
            "x": round(
                margin + rng.random() * (WORLD_WIDTH - width - margin * 2),
                2,
            ),
            "y": round(
                margin + rng.random() * (WORLD_HEIGHT - height - margin * 2),
                2,
            ),
            "width": width,
            "height": height,
        }

        if is_near_spawn(candidate):
            continue

        if any(
            rectangles_overlap(candidate, obstacle, 20)
            for obstacle in obstacles
        ):
            continue

        if any(
            rectangles_overlap(candidate, existing, -25)
            for existing in trees
        ):
            continue

        trees.append(candidate)

    return trees


def build_match(room: dict[str, Any]) -> dict[str, Any]:
    seed = random.SystemRandom().randint(1, 2_147_483_647)
    rng = random.Random(seed)

    spawns = [dict(point) for point in SPAWN_POINTS]
    rng.shuffle(spawns)

    humans: list[dict[str, Any]] = []

    for index, player in enumerate(room["players"]):
        loadout = sanitize_loadout(player.get("loadout"))

        humans.append(
            {
                "id": player["client_id"],
                "name": player["name"],
                "type": "human",
                "spawn": spawns[index],
                "x": float(spawns[index]["x"]),
                "y": float(spawns[index]["y"]),
                "angle": 0.0,
                "alive": True,
                "skin": loadout["skin"],
                "speed": loadout["speed"],
                "bulletSpeed": loadout["bulletSpeed"],
                "fireRate": loadout["fireRate"],
                "bulletCount": loadout["bulletCount"],
                "bulletDamage": loadout["bulletDamage"],
                "bulletRadius": loadout["bulletRadius"],
                "bulletLifetime": loadout["bulletLifetime"],
                "bulletSpread": loadout["bulletSpread"],
                "maxLife": loadout["maxLife"],
                "damageReduction": loadout["damageReduction"],
                "regen": loadout["regen"],
                "programmedFunctions": loadout["programmedFunctions"],
                "programmingLanguage": loadout["programmingLanguage"],
                "upgrades": loadout["upgrades"],
                "life": float(loadout["maxLife"]),
                "kills": 0,
                "lastShotAt": -999.0,
            }
        )

    bot_count = MAX_PARTICIPANTS - len(humans)
    bots: list[dict[str, Any]] = []

    for offset in range(bot_count):
        participant_index = len(humans) + offset
        bot_number = offset + 1

        bots.append(
            {
                "id": f"bot_{bot_number:02d}",
                "name": f"BOT {bot_number:02d}",
                "type": "bot",
                "spawn": spawns[participant_index],
                "x": float(spawns[participant_index]["x"]),
                "y": float(spawns[participant_index]["y"]),
                "angle": 0.0,
                "alive": True,
                "skin": rng.choice(TANK_SKINS),
                "speed": round(3.2 + rng.random() * 0.8, 3),
                "bulletSpeed": round(10.5 + rng.random() * 2.5, 3),
                "fireRate": int(700 + rng.random() * 450),
                "bulletCount": 1,
                "bulletDamage": BULLET_DAMAGE,
                "bulletRadius": BULLET_RADIUS,
                "bulletLifetime": BULLET_MAX_LIFETIME_SECONDS,
                "bulletSpread": 6.0,
                "maxLife": 100,
                "damageReduction": 0.0,
                "regen": 0.0,
                "life": 100.0,
                "kills": 0,
                "lastShotAt": -999.0,
                "ai": {
                    "detectionRange": round(1050 + rng.random() * 350, 2),
                    "attackRange": 900,
                    "preferredDistance": round(320 + rng.random() * 120, 2),
                    "aimError": round(0.025 + rng.random() * 0.045, 4),
                    "evadeDirection": -1 if rng.random() < 0.5 else 1,
                    "targetId": None,
                    "stuckSince": None,
                },
            }
        )

    participants = humans + bots
    terrain = rng.choice(TERRAINS)
    obstacles = generate_obstacles(rng)
    trees = generate_trees(
        rng,
        obstacles,
    )

    return {
        "match_id": uuid.uuid4().hex[:10],
        "seed": seed,
        "terrain": terrain,
        "world": {
            "width": WORLD_WIDTH,
            "height": WORLD_HEIGHT,
        },
        "participants": participants,
        "obstacles": obstacles,
        "trees": trees,
        "bullets": [],
        "bullet_counter": 0,
    }



def get_match_participant(
    match: dict[str, Any],
    participant_id: str,
) -> dict[str, Any] | None:
    return next(
        (
            participant
            for participant in match.get("participants", [])
            if participant.get("id") == participant_id
        ),
        None,
    )


def circle_rectangle_collision(
    circle_x: float,
    circle_y: float,
    radius: float,
    rectangle: dict[str, float],
) -> bool:
    closest_x = max(
        rectangle["x"],
        min(circle_x, rectangle["x"] + rectangle["width"]),
    )
    closest_y = max(
        rectangle["y"],
        min(circle_y, rectangle["y"] + rectangle["height"]),
    )

    dx = circle_x - closest_x
    dy = circle_y - closest_y

    return (dx * dx + dy * dy) < (radius * radius)


def get_server_barrier_hitbox(
    barrier: dict[str, Any],
) -> dict[str, float]:
    fx, fy, fw, fh = BARRIER_HITBOXES.get(
        str(barrier.get("type")),
        (0.0, 0.0, 1.0, 1.0),
    )

    width = float(barrier.get("width", 0))
    height = float(barrier.get("height", 0))

    return {
        "x": float(barrier.get("x", 0)) + width * fx,
        "y": float(barrier.get("y", 0)) + height * fy,
        "width": width * fw,
        "height": height * fh,
    }


def participant_collision_radius(
    participant: dict[str, Any],
) -> float:
    if participant.get("type") == "bot":
        return BOT_COLLISION_RADIUS

    return HUMAN_COLLISION_RADIUS


def can_server_participant_move_to(
    room: dict[str, Any],
    participant: dict[str, Any],
    x: float,
    y: float,
) -> bool:
    match = room.get("match")
    if not match:
        return False

    radius = participant_collision_radius(participant)

    if (
        x - radius < 0
        or y - radius < 0
        or x + radius > WORLD_WIDTH
        or y + radius > WORLD_HEIGHT
    ):
        return False

    for barrier in match.get("obstacles", []):
        if circle_rectangle_collision(
            x,
            y,
            radius,
            get_server_barrier_hitbox(barrier),
        ):
            return False

    # Humanos e bots agora compartilham a mesma autoridade física.
    for other in match.get("participants", []):
        if (
            other is participant
            or not other.get("alive", True)
        ):
            continue

        minimum_distance = (
            radius
            + participant_collision_radius(other)
            + TANK_TO_TANK_PADDING
        )

        distance = math.hypot(
            x - float(other.get("x", 0)),
            y - float(other.get("y", 0)),
        )

        if distance < minimum_distance:
            return False

    return True


# Compatibilidade com o código da etapa anterior.
def can_server_human_move_to(
    room: dict[str, Any],
    participant: dict[str, Any],
    x: float,
    y: float,
) -> bool:
    return can_server_participant_move_to(
        room,
        participant,
        x,
        y,
    )


def sanitize_player_input(message: dict[str, Any]) -> dict[str, Any]:
    move_x = clamp(message.get("move_x"), -1.0, 1.0, 0.0)
    move_y = clamp(message.get("move_y"), -1.0, 1.0, 0.0)

    length = math.hypot(move_x, move_y)
    if length > 1.0:
        move_x /= length
        move_y /= length

    try:
        sequence = int(message.get("sequence", 0))
    except (TypeError, ValueError):
        sequence = 0

    return {
        "move_x": move_x,
        "move_y": move_y,
        "sequence": sequence,
        "received_at": time.monotonic(),
    }


def get_server_barrier_hitbox(
    barrier: dict[str, Any],
) -> dict[str, float]:
    ratio = BARRIER_HITBOXES.get(
        barrier.get("type"),
        (0.0, 0.0, 1.0, 1.0),
    )

    x_ratio, y_ratio, width_ratio, height_ratio = ratio

    return {
        "x": float(barrier.get("x", 0)) + float(barrier.get("width", 0)) * x_ratio,
        "y": float(barrier.get("y", 0)) + float(barrier.get("height", 0)) * y_ratio,
        "width": float(barrier.get("width", 0)) * width_ratio,
        "height": float(barrier.get("height", 0)) * height_ratio,
    }


def segment_intersects_rect(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    rect: dict[str, float],
) -> bool:
    """
    Teste de segmento x retângulo usando slabs.
    """
    dx = x2 - x1
    dy = y2 - y1

    t_min = 0.0
    t_max = 1.0

    axes = (
        (x1, dx, rect["x"], rect["x"] + rect["width"]),
        (y1, dy, rect["y"], rect["y"] + rect["height"]),
    )

    for start, delta, minimum, maximum in axes:
        if abs(delta) < 1e-9:
            if start < minimum or start > maximum:
                return False
            continue

        t1 = (minimum - start) / delta
        t2 = (maximum - start) / delta

        if t1 > t2:
            t1, t2 = t2, t1

        t_min = max(t_min, t1)
        t_max = min(t_max, t2)

        if t_min > t_max:
            return False

    return True


def server_has_line_of_sight(
    match: dict[str, Any],
    shooter: dict[str, Any],
    target: dict[str, Any],
) -> bool:
    for barrier in match.get("obstacles", []):
        if segment_intersects_rect(
            float(shooter.get("x", 0)),
            float(shooter.get("y", 0)),
            float(target.get("x", 0)),
            float(target.get("y", 0)),
            get_server_barrier_hitbox(barrier),
        ):
            return False

    return True


def spawn_server_bullet(
    room: dict[str, Any],
    shooter: dict[str, Any],
    shot_angle: float,
    now: float,
) -> bool:
    """Cria um ou mais projéteis oficiais do servidor."""
    if not shooter.get("alive", True):
        return False

    fire_rate_seconds = max(
        0.08,
        float(shooter.get("fireRate", 260)) / 1000.0,
    )

    last_shot = float(shooter.get("lastShotAt", -999.0))
    if now - last_shot < fire_rate_seconds:
        return False

    match = room.get("match")
    if not match:
        return False

    shooter["lastShotAt"] = now

    bullet_count = int(clamp(shooter.get("bulletCount"), 1, 3, 1))
    spread_degrees = float(clamp(shooter.get("bulletSpread"), 1.5, 10.0, 6.0))
    spread_radians = math.radians(spread_degrees)

    if bullet_count <= 1:
        angle_offsets = [0.0]
    elif bullet_count == 2:
        angle_offsets = [-spread_radians / 2.0, spread_radians / 2.0]
    else:
        angle_offsets = [-spread_radians, 0.0, spread_radians]

    barrel_length = 46.0

    for angle_offset in angle_offsets:
        bullet_angle = float(shot_angle) + angle_offset
        start_x = float(shooter.get("x", 0)) + math.cos(bullet_angle) * barrel_length
        start_y = float(shooter.get("y", 0)) + math.sin(bullet_angle) * barrel_length

        match["bullet_counter"] = int(match.get("bullet_counter", 0)) + 1
        bullet_id = f"{match.get('match_id', 'match')}_{match['bullet_counter']}"

        match.setdefault("bullets", []).append(
            {
                "id": bullet_id,
                "owner_id": shooter.get("id"),
                "x": start_x,
                "y": start_y,
                "angle": bullet_angle,
                "speed": float(shooter.get("bulletSpeed", 13.0))
                * BULLET_SPEED_TO_PIXELS_PER_SECOND,
                "radius": float(clamp(shooter.get("bulletRadius"), 3.0, 8.0, BULLET_RADIUS)),
                "damage": int(clamp(shooter.get("bulletDamage"), 15, 55, BULLET_DAMAGE)),
                "lifetime": float(clamp(shooter.get("bulletLifetime"), 3.0, 8.0, BULLET_MAX_LIFETIME_SECONDS)),
                "created_at": now,
            }
        )

    return True

def bullet_hits_barrier(
    match: dict[str, Any],
    bullet: dict[str, Any],
) -> bool:
    x = float(bullet.get("x", 0))
    y = float(bullet.get("y", 0))
    radius = float(bullet.get("radius", BULLET_RADIUS))

    for barrier in match.get("obstacles", []):
        box = get_server_barrier_hitbox(barrier)

        if (
            x >= box["x"] - radius
            and x <= box["x"] + box["width"] + radius
            and y >= box["y"] - radius
            and y <= box["y"] + box["height"] + radius
        ):
            return True

    return False


def update_server_bullets(
    room: dict[str, Any],
    dt: float,
    now: float,
) -> None:
    match = room.get("match")
    if not match:
        return

    bullets = match.setdefault("bullets", [])
    participants = match.get("participants", [])

    for index in range(len(bullets) - 1, -1, -1):
        bullet = bullets[index]

        angle = float(bullet.get("angle", 0))
        speed = float(bullet.get("speed", 0))

        bullet["x"] = float(bullet.get("x", 0)) + math.cos(angle) * speed * dt
        bullet["y"] = float(bullet.get("y", 0)) + math.sin(angle) * speed * dt

        x = float(bullet["x"])
        y = float(bullet["y"])

        if (
            x < 0
            or x > WORLD_WIDTH
            or y < 0
            or y > WORLD_HEIGHT
            or now - float(bullet.get("created_at", now)) > float(bullet.get("lifetime", BULLET_MAX_LIFETIME_SECONDS))
        ):
            bullets.pop(index)
            continue

        if bullet_hits_barrier(match, bullet):
            bullets.pop(index)
            continue

        owner_id = bullet.get("owner_id")
        hit_participant: dict[str, Any] | None = None

        for participant in participants:
            if (
                participant.get("id") == owner_id
                or not participant.get("alive", True)
            ):
                continue

            distance = math.hypot(
                float(participant.get("x", 0)) - x,
                float(participant.get("y", 0)) - y,
            )

            if distance <= participant_collision_radius(participant) + float(bullet.get("radius", BULLET_RADIUS)):
                hit_participant = participant
                break

        if hit_participant is None:
            continue

        raw_damage = float(bullet.get("damage", BULLET_DAMAGE))
        reduction = float(clamp(hit_participant.get("damageReduction"), 0.0, 0.35, 0.0))
        effective_damage = max(1.0, raw_damage * (1.0 - reduction))
        hit_participant["life"] = max(
            0.0,
            float(hit_participant.get("life", hit_participant.get("maxLife", 100)))
            - effective_damage,
        )

        if hit_participant["life"] <= 0:
            hit_participant["alive"] = False

            shooter = get_match_participant(
                match,
                str(owner_id or ""),
            )

            if shooter is not None:
                shooter["kills"] = int(shooter.get("kills", 0)) + 1

        bullets.pop(index)


def alive_participants(
    match: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        participant
        for participant in match.get("participants", [])
        if participant.get("alive", True)
    ]


def find_nearest_alive_target(
    match: dict[str, Any],
    bot: dict[str, Any],
) -> tuple[dict[str, Any] | None, float]:
    closest: dict[str, Any] | None = None
    closest_distance = float("inf")

    bot_x = float(bot.get("x", 0))
    bot_y = float(bot.get("y", 0))

    for candidate in match.get("participants", []):
        if (
            candidate is bot
            or not candidate.get("alive", True)
        ):
            continue

        distance = math.hypot(
            float(candidate.get("x", 0)) - bot_x,
            float(candidate.get("y", 0)) - bot_y,
        )

        if distance < closest_distance:
            closest = candidate
            closest_distance = distance

    return closest, closest_distance


def normalized_vector(
    x: float,
    y: float,
) -> tuple[float, float]:
    length = math.hypot(x, y)

    if length < 0.000001:
        return 0.0, 0.0

    return x / length, y / length


def try_server_bot_step(
    room: dict[str, Any],
    bot: dict[str, Any],
    direction_x: float,
    direction_y: float,
    dt: float,
) -> bool:
    direction_x, direction_y = normalized_vector(
        direction_x,
        direction_y,
    )

    if abs(direction_x) < 0.0001 and abs(direction_y) < 0.0001:
        return False

    pixels_per_second = (
        float(bot.get("speed", 3.6))
        * SPEED_TO_PIXELS_PER_SECOND
    )

    step_x = direction_x * pixels_per_second * dt
    step_y = direction_y * pixels_per_second * dt

    moved = False

    # Eixos separados ajudam o bot a deslizar ao redor de barreiras.
    if (
        abs(step_x) > 0
        and can_server_participant_move_to(
            room,
            bot,
            float(bot.get("x", 0)) + step_x,
            float(bot.get("y", 0)),
        )
    ):
        bot["x"] = float(bot.get("x", 0)) + step_x
        moved = True

    if (
        abs(step_y) > 0
        and can_server_participant_move_to(
            room,
            bot,
            float(bot.get("x", 0)),
            float(bot.get("y", 0)) + step_y,
        )
    ):
        bot["y"] = float(bot.get("y", 0)) + step_y
        moved = True

    return moved


def update_server_bot(
    room: dict[str, Any],
    bot: dict[str, Any],
    dt: float,
    now: float,
) -> None:
    match = room.get("match")

    if (
        not match
        or bot.get("type") != "bot"
        or not bot.get("alive", True)
    ):
        return

    target, distance = find_nearest_alive_target(
        match,
        bot,
    )

    if target is None:
        return

    ai = bot.setdefault("ai", {})
    ai["targetId"] = target.get("id")

    dx = float(target.get("x", 0)) - float(bot.get("x", 0))
    dy = float(target.get("y", 0)) - float(bot.get("y", 0))

    target_angle = math.atan2(dy, dx)

    bot["angle"] = target_angle + math.pi / 2

    attack_range = float(
        ai.get("attackRange", 900.0)
    )

    if (
        distance <= attack_range
        and server_has_line_of_sight(
            match,
            bot,
            target,
        )
    ):
        aim_error = float(
            ai.get("aimError", 0.04)
        )

        randomized_angle = (
            target_angle
            + random.uniform(
                -aim_error,
                aim_error,
            )
        )

        spawn_server_bullet(
            room,
            bot,
            randomized_angle,
            now,
        )

    preferred_distance = float(
        ai.get("preferredDistance", 370.0)
    )

    evade_direction = -1 if float(ai.get("evadeDirection", 1)) < 0 else 1

    # Longe: perseguição direta.
    if distance > preferred_distance + 90:
        desired_x = dx
        desired_y = dy

    # Perto demais: recua sem perder o alvo da frente.
    elif distance < preferred_distance - 110:
        desired_x = -dx
        desired_y = -dy

    # Em distância de combate: circula o alvo.
    else:
        desired_x = -dy * evade_direction * BOT_STRAFE_BIAS
        desired_y = dx * evade_direction * BOT_STRAFE_BIAS

    moved = try_server_bot_step(
        room,
        bot,
        desired_x,
        desired_y,
        dt,
    )

    if moved:
        ai["stuckSince"] = None
        return

    # Obstáculo/tanque à frente: tenta contornar perpendicularmente.
    side_x = -dy * evade_direction
    side_y = dx * evade_direction

    escaped = try_server_bot_step(
        room,
        bot,
        side_x,
        side_y,
        dt,
    )

    if escaped:
        if ai.get("stuckSince") is None:
            ai["stuckSince"] = now
        return

    stuck_since = ai.get("stuckSince")

    if stuck_since is None:
        ai["stuckSince"] = now
        return

    if now - float(stuck_since) >= BOT_STUCK_FLIP_SECONDS:
        ai["evadeDirection"] = -evade_direction
        ai["stuckSince"] = now


def match_state_payload(room: dict[str, Any]) -> dict[str, Any]:
    match = room.get("match") or {}

    players = [
        {
            "id": participant["id"],
            "type": participant.get("type"),
            "name": participant.get("name"),
            "x": round(float(participant.get("x", 0)), 2),
            "y": round(float(participant.get("y", 0)), 2),
            "angle": round(float(participant.get("angle", 0)), 5),
            "alive": bool(participant.get("alive", True)),
            "life": int(round(float(participant.get("life", 100)))),
            "maxLife": int(participant.get("maxLife", 100)),
            "kills": int(participant.get("kills", 0)),
        }
        for participant in match.get("participants", [])
    ]

    bullets = [
        {
            "id": bullet.get("id"),
            "owner_id": bullet.get("owner_id"),
            "x": round(float(bullet.get("x", 0)), 2),
            "y": round(float(bullet.get("y", 0)), 2),
            "angle": round(float(bullet.get("angle", 0)), 5),
            "speed": round(float(bullet.get("speed", 0)), 2),
            "radius": float(bullet.get("radius", BULLET_RADIUS)),
        }
        for bullet in match.get("bullets", [])
    ]

    return {
        "type": "match_state",
        "room_code": room["code"],
        "match_id": match.get("match_id"),
        "server_now": time.time(),
        "players": players,
        "bullets": bullets,
    }


async def broadcast_match_state(room_code: str) -> None:
    room = rooms.get(room_code)
    if room is None or room.get("status") != "running":
        return

    await manager.broadcast_to_clients(
        get_room_client_ids(room),
        match_state_payload(room),
    )


async def match_loop(
    room_code: str,
    expected_match_id: str,
) -> None:
    tick_seconds = 1.0 / MATCH_TICK_HZ
    snapshot_seconds = 1.0 / MATCH_SNAPSHOT_HZ

    last_tick = time.monotonic()
    last_snapshot = last_tick

    while True:
        room = rooms.get(room_code)

        if (
            room is None
            or room.get("status") != "running"
            or not room.get("match")
            or room["match"].get("match_id") != expected_match_id
        ):
            return

        now = time.monotonic()
        dt = min(max(now - last_tick, 0.0), 0.1)
        last_tick = now

        match = room["match"]
        inputs = room.setdefault("player_inputs", {})

        for participant in match.get("participants", []):
            if (
                participant.get("type") != "human"
                or not participant.get("alive", True)
            ):
                continue

            input_state = inputs.get(participant["id"])
            if not input_state:
                continue

            if now - float(input_state.get("received_at", 0)) > INPUT_TIMEOUT_SECONDS:
                continue

            move_x = float(input_state.get("move_x", 0))
            move_y = float(input_state.get("move_y", 0))

            if abs(move_x) < 0.0001 and abs(move_y) < 0.0001:
                continue

            participant["angle"] = (
                math.atan2(move_y, move_x)
                + math.pi / 2
            )

            pixels_per_second = (
                float(participant.get("speed", 4.5))
                * SPEED_TO_PIXELS_PER_SECOND
            )

            step_x = move_x * pixels_per_second * dt
            step_y = move_y * pixels_per_second * dt

            if (
                abs(step_x) > 0
                and can_server_human_move_to(
                    room,
                    participant,
                    float(participant.get("x", 0)) + step_x,
                    float(participant.get("y", 0)),
                )
            ):
                participant["x"] = float(participant.get("x", 0)) + step_x

            if (
                abs(step_y) > 0
                and can_server_human_move_to(
                    room,
                    participant,
                    float(participant.get("x", 0)),
                    float(participant.get("y", 0)) + step_y,
                )
            ):
                participant["y"] = float(participant.get("y", 0)) + step_y

        # IA dos bots agora também é calculada pelo servidor.
        for participant in match.get("participants", []):
            if (
                participant.get("type") == "bot"
                and participant.get("alive", True)
            ):
                update_server_bot(
                    room,
                    participant,
                    dt,
                    now,
                )

        # Tiros, dano, vida e eliminações são oficiais do servidor.
        update_server_bullets(
            room,
            dt,
            now,
        )

        # Regeneração programada pelo aluno, limitada pelo máximo de vida.
        for participant in match.get("participants", []):
            if not participant.get("alive", True):
                continue
            regen = float(clamp(participant.get("regen"), 0.0, 2.0, 0.0))
            if regen <= 0:
                continue
            max_life = float(participant.get("maxLife", 100))
            current_life = float(participant.get("life", max_life))
            participant["life"] = min(max_life, current_life + regen * dt)

        survivors = alive_participants(match)

        if len(survivors) <= 1:
            await broadcast_match_state(room_code)

            await finish_match(
                room_code,
                reason="last_survivor",
                winner=survivors[0] if survivors else None,
            )
            return

        if now - last_snapshot >= snapshot_seconds:
            last_snapshot = now
            await broadcast_match_state(room_code)

        elapsed = time.monotonic() - now
        await asyncio.sleep(max(0.0, tick_seconds - elapsed))


async def finish_match(
    room_code: str,
    *,
    reason: str,
    winner: dict[str, Any] | None = None,
) -> None:
    room = rooms.get(room_code)

    if room is None or room.get("status") != "running":
        return

    room["status"] = "finished"
    room["finished_at"] = time.time()
    room["player_inputs"] = {}

    payload: dict[str, Any] = {
        "type": "match_ended",
        "room_code": room_code,
        "reason": reason,
        "server_now": time.time(),
    }

    if winner:
        payload["winner"] = {
            "id": winner.get("id"),
            "name": winner.get("name"),
            "type": winner.get("type"),
            "kills": int(winner.get("kills", 0)),
        }

    await manager.broadcast_to_clients(
        get_room_client_ids(room),
        payload,
    )

    await broadcast_room_state(room_code)


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


async def start_programming_phase(room_code: str) -> None:
    room = rooms.get(room_code)
    if room is None or room["status"] != "lobby":
        return

    room["status"] = "programming"
    room["programming_ends_at"] = time.time() + PROGRAMMING_DURATION_SECONDS
    room["countdown_ends_at"] = None

    for player in room["players"]:
        current_skin = sanitize_loadout(player.get("loadout"))["skin"]
        player["loadout"] = base_loadout(current_skin)
        player["ready"] = False
        player["programming_finalized"] = False
        player["programming_language"] = None
        player["programmed_functions"] = []

    await manager.broadcast_to_clients(
        get_room_client_ids(room),
        {
            "type": "programming_started",
            "room_code": room_code,
            "duration_seconds": PROGRAMMING_DURATION_SECONDS,
            "ends_at": room["programming_ends_at"],
            "server_now": time.time(),
        },
    )

    await broadcast_room_state(room_code)

    asyncio.create_task(
        programming_deadline(
            room_code,
            room["programming_ends_at"],
        )
    )


async def programming_deadline(
    room_code: str,
    expected_ends_at: float,
) -> None:
    await asyncio.sleep(
        max(
            0.0,
            expected_ends_at - time.time(),
        )
    )

    room = rooms.get(room_code)

    if (
        room is None
        or room["status"] != "programming"
        or room.get("programming_ends_at") != expected_ends_at
    ):
        return

    await start_countdown(
        room_code,
        reason="time_finished",
    )


async def start_countdown(
    room_code: str,
    reason: str,
) -> None:
    room = rooms.get(room_code)

    if room is None or room["status"] != "programming":
        return

    room["status"] = "countdown"
    room["countdown_ends_at"] = time.time() + COUNTDOWN_DURATION_SECONDS

    await manager.broadcast_to_clients(
        get_room_client_ids(room),
        {
            "type": "countdown_started",
            "room_code": room_code,
            "duration_seconds": COUNTDOWN_DURATION_SECONDS,
            "ends_at": room["countdown_ends_at"],
            "server_now": time.time(),
            "reason": reason,
        },
    )

    await broadcast_room_state(room_code)

    asyncio.create_task(
        countdown_deadline(
            room_code,
            room["countdown_ends_at"],
        )
    )


async def countdown_deadline(
    room_code: str,
    expected_ends_at: float,
) -> None:
    await asyncio.sleep(
        max(
            0.0,
            expected_ends_at - time.time(),
        )
    )

    room = rooms.get(room_code)

    if (
        room is None
        or room["status"] != "countdown"
        or room.get("countdown_ends_at") != expected_ends_at
    ):
        return

    await start_match(room_code)


async def start_match(room_code: str) -> None:
    room = rooms.get(room_code)

    if room is None or room["status"] != "countdown":
        return

    room["match"] = build_match(room)
    room["status"] = "running"
    room["player_inputs"] = {}

    match = room["match"]
    human_count = len(room["players"])
    bot_count = MAX_PARTICIPANTS - human_count

    await manager.broadcast_to_clients(
        get_room_client_ids(room),
        {
            "type": "match_start",
            "room_code": room_code,
            "human_count": human_count,
            "bot_count": bot_count,
            "total_participants": len(match["participants"]),
            **match,
        },
    )

    await broadcast_room_state(room_code)

    asyncio.create_task(
        match_loop(
            room_code,
            match["match_id"],
        )
    )


def find_player(
    room: dict[str, Any],
    client_id: str,
) -> dict[str, Any] | None:
    return next(
        (
            player
            for player in room["players"]
            if player["client_id"] == client_id
        ),
        None,
    )


@app.get("/healthz")
async def healthz() -> JSONResponse:
    return JSONResponse(
        {
            "ok": True,
            "game": "Battle Tank EMTI",
            "server": "online",
            "version": "0.9.0",
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
            "programming_duration_seconds": PROGRAMMING_DURATION_SECONDS,
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
                await remove_client_from_room(client_id)

                room_code = generate_room_code()

                rooms[room_code] = {
                    "code": room_code,
                    "host_id": client_id,
                    "status": "lobby",
                    "players": [],
                    "join_counter": 0,
                    "programming_ends_at": None,
                    "countdown_ends_at": None,
                    "match": None,
                    "player_inputs": {},
                    "finished_at": None,
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
                player_name = sanitize_player_name(message.get("player_name"))
                requested_skin = sanitize_loadout(message.get("loadout"))["skin"]
                loadout = base_loadout(requested_skin)

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

                if room["status"] not in {"lobby", "programming"}:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "join_error",
                            "message": "A entrada desta partida já foi encerrada.",
                        },
                    )
                    continue

                existing_player = find_player(room, client_id)

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

                existing_player = find_player(room, client_id)

                if existing_player is None:
                    room["join_counter"] += 1
                    room["players"].append(
                        {
                            "client_id": client_id,
                            "name": player_name,
                            "joined_order": room["join_counter"],
                            "loadout": loadout,
                            "ready": False,
                            "programming_finalized": False,
                            "programming_language": None,
                            "programmed_functions": [],
                        }
                    )
                else:
                    existing_player["name"] = player_name
                    if room["status"] == "lobby":
                        existing_player["loadout"] = loadout
                        existing_player["ready"] = False
                        existing_player["programming_finalized"] = False
                        existing_player["programming_language"] = None
                        existing_player["programmed_functions"] = []

                client_rooms[client_id] = room_code
                client_roles[client_id] = "player"

                await manager.send_json(
                    client_id,
                    {
                        "type": "room_joined",
                        "room_code": room_code,
                        "player_name": player_name,
                        "player_id": client_id,
                        "room_status": room["status"],
                        "programming_ends_at": room.get("programming_ends_at"),
                        "server_now": time.time(),
                        "validated_loadout": (find_player(room, client_id) or {}).get("loadout", loadout),
                        "programming_finalized": bool((find_player(room, client_id) or {}).get("programming_finalized", False)),
                        "programming_language": (find_player(room, client_id) or {}).get("programming_language"),
                    },
                )

                await broadcast_room_state(room_code)
                continue

            if message_type == "start_programming":
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
                            "message": "Somente o professor pode iniciar a preparação.",
                        },
                    )
                    continue

                if room["status"] != "lobby":
                    await manager.send_json(
                        client_id,
                        {
                            "type": "room_error",
                            "message": "A preparação já foi iniciada.",
                        },
                    )
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

                await start_programming_phase(room_code)
                continue

            if message_type == "update_skin":
                room_code = client_rooms.get(client_id)
                room = rooms.get(room_code or "")

                if (
                    room is None
                    or client_roles.get(client_id) != "player"
                ):
                    continue

                if room["status"] != "lobby":
                    await manager.send_json(
                        client_id,
                        {
                            "type": "skin_locked",
                            "message": "A cor do tanque só pode ser alterada no lobby, antes da programação.",
                        },
                    )
                    continue

                player = find_player(room, client_id)
                if player is None:
                    continue

                requested_skin = str(message.get("skin") or "").strip().lower()
                if requested_skin not in TANK_SKINS:
                    requested_skin = "azul"

                current_loadout = sanitize_loadout(player.get("loadout"))
                current_loadout["skin"] = requested_skin
                player["loadout"] = current_loadout

                await manager.send_json(
                    client_id,
                    {
                        "type": "skin_saved",
                        "skin": requested_skin,
                    },
                )

                await broadcast_room_state(room_code)
                continue

            if message_type == "update_loadout":
                room_code = client_rooms.get(client_id)
                room = rooms.get(room_code or "")

                if (
                    room is None
                    or client_roles.get(client_id) != "player"
                ):
                    continue

                if room["status"] != "programming":
                    await manager.send_json(
                        client_id,
                        {
                            "type": "loadout_locked",
                            "message": "A configuração do tanque está bloqueada nesta fase.",
                        },
                    )
                    continue

                player = find_player(room, client_id)
                if player is None:
                    continue

                if player.get("programming_finalized", False):
                    await manager.send_json(
                        client_id,
                        {
                            "type": "loadout_locked",
                            "message": "A programação já foi finalizada para esta partida.",
                        },
                    )
                    continue

                current_loadout = sanitize_loadout(player.get("loadout"))
                updated_loadout = sanitize_loadout(message.get("loadout"))

                # A cor é escolhida no lobby e fica bloqueada durante programação/batalha.
                updated_loadout["skin"] = current_loadout["skin"]
                player["loadout"] = updated_loadout

                if player.get("ready"):
                    player["ready"] = False

                await manager.send_json(
                    client_id,
                    {
                        "type": "loadout_saved",
                        "loadout": player["loadout"],
                        "upgrade_count": upgrade_count(player["loadout"]),
                    },
                )

                await broadcast_room_state(room_code)
                continue

            if message_type == "finalize_programming":
                room_code = client_rooms.get(client_id)
                room = rooms.get(room_code or "")

                if (
                    room is None
                    or client_roles.get(client_id) != "player"
                    or room["status"] != "programming"
                ):
                    await manager.send_json(
                        client_id,
                        {
                            "type": "programming_locked",
                            "message": "A fase de programação não está disponível.",
                        },
                    )
                    continue

                player = find_player(room, client_id)
                if player is None:
                    continue

                if player.get("programming_finalized", False):
                    await manager.send_json(
                        client_id,
                        {
                            "type": "programming_finalized",
                            "room_code": room_code,
                            "language": player.get("programming_language"),
                            "function_count": len(player.get("programmed_functions", [])),
                            "functions": player.get("programmed_functions", []),
                            "loadout": player.get("loadout", {}),
                        },
                    )
                    continue

                language = str(message.get("language") or "").strip().lower()
                if language not in PROGRAMMING_LANGUAGES:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "programming_error",
                            "message": "Escolha JavaScript ou Python antes de finalizar.",
                        },
                    )
                    continue

                raw_functions = message.get("functions")
                if not isinstance(raw_functions, list):
                    raw_functions = []

                unique_valid = []
                invalid_found = False
                for raw_id in raw_functions:
                    function_id = str(raw_id or "").strip()
                    if function_id not in PROGRAM_FUNCTION_EFFECTS:
                        invalid_found = True
                        continue
                    if function_id not in unique_valid:
                        unique_valid.append(function_id)

                if invalid_found or len(unique_valid) > MAX_PROGRAM_FUNCTIONS:
                    await manager.send_json(
                        client_id,
                        {
                            "type": "programming_error",
                            "message": f"Use no máximo {MAX_PROGRAM_FUNCTIONS} funções permitidas.",
                        },
                    )
                    continue

                current_skin = sanitize_loadout(player.get("loadout"))["skin"]
                official_loadout = derive_loadout_from_functions(
                    current_skin,
                    unique_valid,
                    language,
                )

                player["loadout"] = official_loadout
                player["programming_language"] = language
                player["programmed_functions"] = list(unique_valid)
                player["programming_finalized"] = True
                player["ready"] = True

                await manager.send_json(
                    client_id,
                    {
                        "type": "programming_finalized",
                        "room_code": room_code,
                        "language": language,
                        "function_count": len(unique_valid),
                        "functions": unique_valid,
                        "loadout": official_loadout,
                    },
                )

                await broadcast_room_state(room_code)
                continue

            if message_type == "set_ready":
                room_code = client_rooms.get(client_id)
                room = rooms.get(room_code or "")

                if (
                    room is None
                    or client_roles.get(client_id) != "player"
                    or room["status"] != "programming"
                ):
                    continue

                player = find_player(room, client_id)
                if player is None:
                    continue

                if player.get("programming_finalized", False):
                    player["ready"] = True
                    await broadcast_room_state(room_code)
                    continue

                player["ready"] = bool(message.get("ready", True))

                await broadcast_room_state(room_code)
                continue

            if message_type in {"start_battle", "start_room"}:
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
                            "message": "Somente o professor pode iniciar a batalha.",
                        },
                    )
                    continue

                if room["status"] != "programming":
                    await manager.send_json(
                        client_id,
                        {
                            "type": "room_error",
                            "message": "Primeiro inicie a fase de programação.",
                        },
                    )
                    continue

                await start_countdown(
                    room_code,
                    reason="teacher",
                )
                continue

            if message_type == "player_input":
                room_code = client_rooms.get(client_id)
                room = rooms.get(room_code or "")

                if (
                    room is None
                    or room.get("status") != "running"
                    or client_roles.get(client_id) != "player"
                    or not room.get("match")
                ):
                    continue

                participant = get_match_participant(
                    room["match"],
                    client_id,
                )

                if (
                    participant is None
                    or participant.get("type") != "human"
                    or not participant.get("alive", True)
                ):
                    continue

                room.setdefault(
                    "player_inputs",
                    {},
                )[client_id] = sanitize_player_input(message)

                continue

            if message_type == "player_shoot":
                room_code = client_rooms.get(client_id)
                room = rooms.get(room_code or "")

                if (
                    room is None
                    or room.get("status") != "running"
                    or client_roles.get(client_id) != "player"
                    or not room.get("match")
                ):
                    continue

                participant = get_match_participant(
                    room["match"],
                    client_id,
                )

                if (
                    participant is None
                    or participant.get("type") != "human"
                    or not participant.get("alive", True)
                ):
                    continue

                # O servidor usa a orientação oficial do tanque.
                shot_angle = (
                    float(participant.get("angle", 0))
                    - math.pi / 2
                )

                spawn_server_bullet(
                    room,
                    participant,
                    shot_angle,
                    time.monotonic(),
                )
                continue

            if message_type == "end_match":
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
                            "message": "Somente o professor pode encerrar a partida.",
                        },
                    )
                    continue

                if room.get("status") != "running":
                    await manager.send_json(
                        client_id,
                        {
                            "type": "room_error",
                            "message": "Não há uma batalha em andamento para encerrar.",
                        },
                    )
                    continue

                await finish_match(
                    room_code,
                    reason="teacher",
                )
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


app.mount(
    "/",
    StaticFiles(
        directory=str(FRONTEND_DIR),
        html=True,
    ),
    name="frontend",
)
