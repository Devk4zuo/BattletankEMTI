// ==========================================================
// BATTLE TANK EMTI - MÚSICA AUTOMÁTICA V3
// Criado por: Professor André Kazuo Takaki
// ==========================================================

(() => {
    "use strict";

    const STORAGE_KEY = "battleTankMusicEnabled";
    const MASTER_VOLUME = 0.20;

    const TRACKS = [
        { src: "/assets/audio/music/som1.mp3", gain: 1.00 },
        { src: "/assets/audio/music/som2.mp3", gain: 0.72 },
        { src: "/assets/audio/music/som3.mp3", gain: 1.35 },
        { src: "/assets/audio/music/som4.mp3", gain: 0.78 }
    ];

    let enabled = localStorage.getItem(STORAGE_KEY) !== "false";
    let currentTrack = 0;
    let userUnlockedAudio = false;

    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = false;
    audio.src = TRACKS[currentTrack].src;
    audio.volume = Math.min(1, MASTER_VOLUME * TRACKS[currentTrack].gain);

    function applyVolume() {
        const gain = TRACKS[currentTrack].gain || 1;
        audio.volume = enabled
            ? Math.min(1, MASTER_VOLUME * gain)
            : 0;
    }

    function tryPlay() {
        if (!enabled) return;

        const p = audio.play();

        if (p && typeof p.then === "function") {
            p.then(() => {
                console.log(
                    "[BATTLE TANK MUSIC] Tocando:",
                    TRACKS[currentTrack].src
                );
            }).catch(err => {
                console.log(
                    "[BATTLE TANK MUSIC] Autoplay bloqueado; aguardando START/clique.",
                    err
                );
            });
        }
    }

    function nextTrack() {
        if (!enabled) return;

        currentTrack = (currentTrack + 1) % TRACKS.length;
        audio.src = TRACKS[currentTrack].src;
        applyVolume();
        tryPlay();
    }

    function unlockFromUserGesture() {
        if (!enabled) return;

        userUnlockedAudio = true;
        tryPlay();
    }

    function setEnabled(value) {
        enabled = Boolean(value);
        localStorage.setItem(STORAGE_KEY, String(enabled));

        if (!enabled) {
            audio.pause();
            return;
        }

        applyVolume();
        tryPlay();
    }

    function toggle() {
        setEnabled(!enabled);
    }

    audio.addEventListener("ended", nextTrack);

    audio.addEventListener("error", () => {
        console.warn(
            "[BATTLE TANK MUSIC] Não foi possível carregar:",
            TRACKS[currentTrack].src
        );

        currentTrack = (currentTrack + 1) % TRACKS.length;
        audio.src = TRACKS[currentTrack].src;
        applyVolume();

        if (userUnlockedAudio) {
            tryPlay();
        }
    });

    // Captura o primeiro clique antes dos demais scripts.
    // Assim clicar em START já libera o áudio.
    window.addEventListener(
        "pointerdown",
        unlockFromUserGesture,
        { capture: true, passive: true }
    );

    window.addEventListener(
        "keydown",
        unlockFromUserGesture,
        { capture: true }
    );

    // M = música on/off
    window.addEventListener(
        "keydown",
        event => {
            if (
                event.key &&
                event.key.toLowerCase() === "m" &&
                !event.repeat
            ) {
                toggle();
            }
        },
        { capture: true }
    );

    // Tenta tocar ao carregar. Se o navegador bloquear,
    // o primeiro clique real inicia a música.
    tryPlay();

    document.addEventListener("visibilitychange", () => {
        if (
            document.visibilityState === "visible" &&
            enabled &&
            userUnlockedAudio &&
            audio.paused
        ) {
            tryPlay();
        }
    });

    window.battleTankMusic = {
        play: tryPlay,
        next: nextTrack,
        toggle,
        setEnabled,
        isEnabled: () => enabled,
        current: () => TRACKS[currentTrack].src,
        element: audio
    };
})();
