import {getApiUrl} from "./endpoints.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { createVoiceController } from "./voice.js";
import { SPELLS, createGame, cast, tick, damage } from "./game.js";
import "./style.css";
import { getSpellPower } from "./power.js";
import { createMultiplayerClient } from "./multiplayer-client.js";

const $ = (s) => document.querySelector(s);
$("#app").innerHTML =
  `<header class="topbar"><div class="brand"><span class="brand-symbol">◈</span><div><strong>echo arena</strong><small>Rap. Cast. Conquer.</small></div></div><div class="top-right"><span class="pill">✦ &nbsp; Powered by Sarvam AI</span><button class="sound" aria-label="Unmute sound" title="Toggle sound">♪</button></div></header><section class="intro-line"><div><div class="eyebrow">A MULTILINGUAL RAP BATTLE</div><h1>Drop bars. Cast magic.</h1></div><p>Your words bring the heat.</p></section><section class="arena"><div class="hud"><div class="health-panel"><div class="health-label"><span>YOUR VITALITY</span><span id="health">100 / 100</span></div><div class="health-track"><i id="health-bar" style="width:100%"></i></div></div><div class="wave-panel"><div><small>WAVE</small><strong id="wave">01 / 03</strong></div><div><small>SCORE</small><strong id="score">0000</strong></div></div></div><span class="scene-label">THE WHISPERING GARDEN &nbsp; / &nbsp; ARENA 01</span><button id="reconnect" class="reconnect" hidden>Reconnect microphone ↗</button><div class="transcript"><i class="voice-dot"></i><span id="transcript">Your adventure is waiting</span></div><div class="toast"></div><div class="overlay"><div class="start-card"><div class="rune">✦</div><h2>A verse.<br>A world of magic.</h2><p>Hold your ground in a living 3D arena.<br>Move with <b>W A S D</b>. Rap a short line to cast your spells.<br>Survive three waves to become the echo champion.</p><button class="primary" id="start">Enter the arena &nbsp; ↗</button><div class="error" id="start-error"></div><small>Auto-detects English + 22 Indian languages.<br>Rap 4+ words about an element. Pause to cast.</small></div></div></section><section class="command-row">${Object.entries(
    SPELLS,
  )
    .map(
      ([key, s]) =>
        `<div class="spell" data-spell="${key}"><span class="spell-icon" style="--spell:${s.color}">${s.icon}</span><div><strong>${s.label}</strong><small>${{ fireball: "Topic: fire & heat", lightning: "Topic: storm & voltage", shield: "Topic: armor & protection", dash: "Topic: speed & escape", heal: "Topic: life & recovery" }[key]}</small></div><span class="spell-score">AI —/100</span><span class="timer">Ready</span></div>`,
    )
    .join(
      "",
    )}</section><footer class="footer"><span><span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span> &nbsp; · &nbsp; YOUR BARS cast the magic</span><span>OPEN ASSETS. LIMITLESS IMAGINATION. &nbsp; ✦</span></footer>`;
$("#start").insertAdjacentHTML(
  "beforebegin",
  `<div class="mode-tabs" role="tablist" aria-label="Game mode"><button id="solo-tab" class="selected" role="tab" aria-selected="true">Solo adventure</button><button id="pvp-tab" role="tab" aria-selected="false">Online duel</button></div><div id="pvp-lobby" hidden><p class="duel-description">A real opponent. Your own lyrical magic.<br>Create a private room or enter a friend's code.</p><button class="primary" id="create-room">Create a duel room ↗</button><div class="join-row"><input id="room-input" aria-label="Room code" placeholder="ROOM CODE" maxlength="8" autocomplete="off"><button id="join-room">Join room</button></div></div>`,
);
$(".arena").insertAdjacentHTML(
  "beforeend",
  `<div class="duel-bar" hidden><span>PRIVATE DUEL <b id="room-code"></b></span><span id="rival-health">Waiting for opponent</span><button id="leave-room">Leave ↗</button></div>`,
);
const rapExamples = {
  fireball: "I bring the heat, feel flames at your feet",
  lightning: "Thunder in my veins, lightning breaks your chains",
  shield: "Your attacks fall flat, my armor sends them back",
  dash: "I race through the night, gone before your sight",
  heal: "From pain I rise, new life lights my eyes",
};
$(".command-row").insertAdjacentHTML(
  "beforebegin",
  `<section class="rap-readout" aria-live="polite"><div><b id="rap-grade">MIC CHECK</b><span id="rap-feedback">Rap about a spell’s topic. Sarvam scores your bars; better bars hit harder.</span></div><div class="flow-meter" aria-label="Sarvam rap score"><i id="rap-flow"></i></div><button id="lyric-help">Lyric book ↗</button></section>`,
);
$(".top-right").insertAdjacentHTML(
  "afterbegin",
  '<span class="language-badge" title="Automatic language detection and English translation">23 languages · Auto</span>',
);
$("#app").insertAdjacentHTML(
  "beforeend",
  `<dialog class="lyric-dialog"><form method="dialog"><button class="close-guide" aria-label="Close lyric book">×</button></form><div class="eyebrow">THE SPELL CYPHER</div><h2>Find your flow.</h2><p>Rap a short line with at least four words. Its imagery chooses your spell. Try these bars, or make up your own in a supported language.</p><div class="lyric-examples">${Object.entries(
    rapExamples,
  )
    .map(
      ([key, line]) =>
        `<div><strong>${SPELLS[key].label}</strong><p>“${line}”</p></div>`,
    )
    .join(
      "",
    )}</div><p><b>Automatic language detection:</b> English, Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia, Assamese, Urdu, Nepali, Konkani, Kashmiri, Sindhi, Sanskrit, Santali, Manipuri, Bodo, Maithili and Dogri.</p><small>Sarvam translates your bar to English for spell matching. Other world languages are outside this speech engine’s supported coverage. Sarvam AI scores topic relevance, creativity, wordplay and coherence from translated lyrics. Better bars produce bigger, stronger spells; weak bars cast smaller, weaker magic. Translation can change wordplay. Audio rhythm and accent are not scored. Cooldowns stay fixed.</small></dialog>`,
);
$("#lyric-help").onclick = () => $(".lyric-dialog").showModal();
let lyricVisibleUntil = 0;
const arena = $(".arena");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor("#b9d4c6");
renderer.outputColorSpace = THREE.SRGBColorSpace;
arena.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#b9d4c6", 25, 65);
const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
camera.position.set(15, 19, 22);
camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight("#fffce5", "#6c9586", 2.4));
const sun = new THREE.DirectionalLight("#fff3cd", 3.1);
sun.position.set(-9, 18, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -18,
  right: 18,
  top: 18,
  bottom: -18,
});
sun.shadow.bias = -0.001;
scene.add(sun);
function mesh(geometry, color, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
mesh(new THREE.CylinderGeometry(12, 11.5, 0.9, 12), "#809a72", 0, -0.65, 0);
mesh(new THREE.CylinderGeometry(11.8, 11.8, 0.18, 12), "#d4d6b3", 0, -0.11, 0);
mesh(new THREE.CylinderGeometry(9.9, 9.9, 0.08, 12), "#c1caa2", 0, 0.02, 0);
const ring = mesh(
  new THREE.TorusGeometry(7.8, 0.035, 6, 80),
  "#e8ebc9",
  0,
  0.08,
  0,
);
ring.rotation.x = Math.PI / 2;
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6;
  const x = Math.cos(a) * 10.5,
    z = Math.sin(a) * 10.5;
  mesh(
    new THREE.BoxGeometry(0.9, 0.22, 1.4),
    i % 2 ? "#b2bb98" : "#bfc7a7",
    x,
    0.12,
    z,
  ).rotation.y = -a;
}
for (let i = 0; i < 26; i++) {
  const a = i * 2.399,
    r = 13 + Math.random() * 8;
  mesh(
    new THREE.DodecahedronGeometry(1 + Math.random()),
    "#a1bca0",
    Math.cos(a) * r,
    -1,
    Math.sin(a) * r,
  );
}
// All visible scenery and the player are supplemented with licensed Kenney models.
let characterTemplate = null,
  characterClips = [],
  playerMixer = null,
  playerActions = {},
  playerMotion = "idle";
function makeAnimations(model) {
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const name of ["idle", "walk", "sprint"]) {
    const clip = THREE.AnimationClip.findByName(characterClips, name);
    if (clip) actions[name] = mixer.clipAction(clip);
  }
  return { mixer, actions };
}
function releaseEnemy(enemy) {
  if (enemy.mixer) {
    enemy.mixer.stopAllAction();
    enemy.mixer.uncacheRoot(enemy.model);
  }
}
const loader = new GLTFLoader();
function loadModel(path, onLoad) {
  loader.load(
    path,
    (g) => {
      g.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      onLoad(g.scene, g.animations);
    },
    undefined,
    () => {
      toast("A garden model could not load. Refresh to restore all assets.");
    },
  );
}
const player = new THREE.Group();
scene.add(player);
player.position.set(0, 0, 1);
const fallback = new THREE.Group();
player.add(fallback);
mesh(new THREE.ConeGeometry(0.45, 1, 8), "#385e69", 0, 0.9, 0, fallback);
mesh(new THREE.SphereGeometry(0.26, 10, 8), "#f5cb9e", 0, 1.5, 0, fallback);
mesh(new THREE.ConeGeometry(0.42, 0.65, 8), "#456d7d", 0, 1.94, 0, fallback);
mesh(
  new THREE.CylinderGeometry(0.045, 0.045, 1.6, 6),
  "#78523d",
  0.5,
  0.9,
  0,
  fallback,
);
mesh(new THREE.IcosahedronGeometry(0.16), "#b7eea3", 0.5, 1.75, 0, fallback);
loadModel("/assets/models/character-soldier.glb", (m, clips) => {
  const b = new THREE.Box3().setFromObject(m);
  const size = b.getSize(new THREE.Vector3());
  characterClips = clips;
  characterTemplate = cloneSkeleton(m);
  m.scale.setScalar(1.8 / size.y);
  m.position.y = -b.min.y * (1.8 / size.y);
  player.add(m);
  const animated = makeAnimations(m);
  playerMixer = animated.mixer;
  playerActions = animated.actions;
  playerActions.idle?.play();
  fallback.visible = false;
});
const playerRing = mesh(
  new THREE.TorusGeometry(0.63, 0.055, 6, 40),
  "#f7f7d9",
  0,
  0.09,
  0,
  player,
);
playerRing.rotation.x = Math.PI / 2;
const shield = mesh(
  new THREE.SphereGeometry(0.95, 24, 16),
  "#8ee7e0",
  0,
  1,
  0,
  player,
);
shield.material.transparent = true;
shield.material.opacity = 0.22;
shield.material.wireframe = true;
shield.visible = false;
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4,
    x = Math.sin(a) * 10,
    z = Math.cos(a) * 10;
  const tree = new THREE.Group();
  scene.add(tree);
  tree.position.set(x, 0, z);
  mesh(
    new THREE.CylinderGeometry(0.17, 0.23, 1.5, 6),
    "#8b7150",
    0,
    0.7,
    0,
    tree,
  );
  mesh(
    new THREE.ConeGeometry(1.2, 2.3, 7),
    i % 2 ? "#779b75" : "#6a8f6a",
    0,
    2,
    0,
    tree,
  );
  mesh(new THREE.ConeGeometry(0.9, 1.6, 7), "#8aab7a", 0, 2.9, 0, tree);
}
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  loadModel("/assets/models/column.glb", (m) => {
    m.position.set(Math.sin(a) * 9.2, 0, Math.cos(a) * 9.2);
    m.scale.setScalar(1.3);
    scene.add(m);
  });
}
loadModel("/assets/models/statue.glb", (m) => {
  m.position.set(0, 0, -9);
  m.scale.setScalar(1.4);
  scene.add(m);
});
let game = createGame(),
  started = false,
  enemies = [],
  effects = [],
  spawnedWave = 0,
  nextWaveAt = 0,
  toastUntil = 0,
  muted = true,
  audioContext,
  music;
const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  )
    return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
function toast(message) {
  $(".toast").textContent = message;
  $(".toast").classList.add("show");
  toastUntil = performance.now() + 2200;
}
function tone(freq = 300) {
  if (muted) return;
  try {
    audioContext ??= new AudioContext();
    const o = audioContext.createOscillator(),
      g = audioContext.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, audioContext.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      freq / 2,
      audioContext.currentTime + 0.2,
    );
    g.gain.setValueAtTime(0.08, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.24);
    o.connect(g).connect(audioContext.destination);
    o.start();
    o.stop(audioContext.currentTime + 0.25);
  } catch {}
}
$(".sound").onclick = () => {
  muted = !muted;
  $(".sound").style.opacity = muted ? ".45" : "1";
  $(".sound").setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
  if (music) music.muted = muted;
  tone(550);
};
$(".sound").style.opacity = ".45";
music = new Audio("/assets/audio/music.ogg");
music.loop = true;
music.volume = 0.18;
music.muted = muted;
function playSound(name) {
  if (muted) return;
  const a = new Audio(`/assets/audio/${name}.ogg`);
  a.volume = 0.3;
  a.play().catch(() => {});
}
function burst(position, color, count = 16, powerScale = 1) {
  for (let i = 0; i < count; i++) {
    const p = mesh(
      new THREE.IcosahedronGeometry((0.07 + Math.random() * 0.08) * powerScale),
      color,
      position.x,
      position.y + 0.6,
      position.z,
    );
    effects.push({
      mesh: p,
      life: 0.7,
      max: 0.7,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5,
        (Math.random() - 0.5) * 6,
      ),
    });
  }
}
function wave() {
  game.wave = spawnedWave + 1;
  spawnedWave++;
  const count = 3 + game.wave * 2;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const body = new THREE.Group();
    body.position.set(Math.sin(a) * 8.5, 0, Math.cos(a) * 8.5);
    scene.add(body);
    const color = game.wave === 3 ? "#c181a1" : i % 2 ? "#d59b64" : "#9cac68";
    const blob = mesh(
      new THREE.SphereGeometry(0.48, 12, 8),
      color,
      0,
      0.55,
      0,
      body,
    );
    blob.scale.y = 1.15;
    mesh(new THREE.ConeGeometry(0.16, 0.35, 5), color, -0.25, 1.1, 0, body);
    mesh(new THREE.ConeGeometry(0.16, 0.35, 5), color, 0.25, 1.1, 0, body);
    for (const x of [-0.18, 0.18]) {
      mesh(
        new THREE.SphereGeometry(0.095, 8, 6),
        "#fff6db",
        x,
        0.66,
        0.4,
        body,
      );
      mesh(
        new THREE.SphereGeometry(0.045, 8, 6),
        "#263d38",
        x,
        0.66,
        0.475,
        body,
      );
    }
    const r = mesh(
      new THREE.TorusGeometry(0.56, 0.035, 5, 24),
      "#b76c53",
      0,
      0.07,
      0,
      body,
    );
    r.rotation.x = Math.PI / 2;
    let animated = null,
      enemyModel = null;
    if (characterTemplate) {
      const model = cloneSkeleton(characterTemplate);
      const box = new THREE.Box3().setFromObject(model);
      const height = box.getSize(new THREE.Vector3()).y;
      model.scale.setScalar(1.25 / height);
      model.position.y = -box.min.y * (1.25 / height);
      model.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.color.multiply(new THREE.Color(color));
        }
      });
      for (const child of [...body.children]) {
        if (child !== r) child.visible = false;
      }
      body.add(model);
      enemyModel = model;
      animated = makeAnimations(model);
      (animated.actions.walk || animated.actions.idle)?.play();
    }
    enemies.push({
      body,
      model: enemyModel,
      mixer: animated?.mixer,
      hp: game.wave === 3 ? 85 : 60,
      attack: 0,
      phase: Math.random() * 6,
      ring: r,
      telegraph: 0,
    });
  }
  toast(`Wave ${game.wave} · ${count} garden gremlins incoming`);
}
function perform(command, score) {
  const result = cast(game, command, score);
  if (!result.ok) {
    toast(result.reason);
    return;
  }
  const power = result.power;
  toast(
    `${SPELLS[command].label} · ${score}/100 · ${power.multiplier.toFixed(2)}× power`,
  );
  playSound(command === "shield" ? "shield" : "cast");
  tone(command === "lightning" ? 750 : command === "heal" ? 420 : 230);
  const target = enemies.reduce(
    (best, e) =>
      !best ||
      e.body.position.distanceTo(player.position) <
        best.body.position.distanceTo(player.position)
        ? e
        : best,
    null,
  );
  if (command === "fireball" && target) {
    const p = mesh(
      new THREE.IcosahedronGeometry(0.24 * power.scale),
      "#ff9b3d",
      player.position.x,
      1,
      player.position.z,
    );
    effects.push({
      mesh: p,
      life: 0.28,
      max: 0.28,
      target: target.body.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
      start: p.position.clone(),
    });
    target.hp -= power.damage;
    burst(target.body.position, "#ffb85b", 8, power.scale);
  }
  if (command === "lightning") {
    for (const enemy of enemies) {
      if (enemy.body.position.distanceTo(player.position) < 7) {
        enemy.hp -= power.damage;
        const bolt = mesh(
          new THREE.CylinderGeometry(
            0.09 * power.scale,
            0.16 * power.scale,
            5 * power.scale,
            5,
          ),
          "#f7e897",
          enemy.body.position.x,
          3,
          enemy.body.position.z,
        );
        effects.push({ mesh: bolt, life: 0.24, max: 0.24 });
        burst(enemy.body.position, "#fff6ad", 12, power.scale);
      }
    }
  }
  if (command === "dash") {
    const direction = new THREE.Vector3(
      Math.sin(player.rotation.y),
      0,
      Math.cos(player.rotation.y),
    );
    player.position.addScaledVector(direction, power.dashDistance);
    player.position.clampLength(0, 8.7);
    burst(player.position, "#f4edb0", 20, power.scale);
  }
  if (command === "heal") burst(player.position, "#a7ef9b", 22, power.scale);
  if (command === "shield") {
    shield.scale.setScalar(power.scale);
    burst(player.position, "#b8fff0", 15, power.scale);
  }
}
const voice = createVoiceController({
  getPlayerId: () => (mode === "pvp" ? duelId : ""),
  onTranscript: (text, data) => {
    $("#transcript").textContent = `“${text}”`;
    const result = data?.assessment;
    if (!result) {
      toast("Sarvam scoring unavailable. Try your bar again.");
      return;
    }
    lyricVisibleUntil = performance.now() + 7000;
    $("#rap-grade").textContent = `SARVAM ${result.score}/100`;
    $("#rap-feedback").textContent = result.feedback;
    $("#rap-flow").style.width = `${result.score}%`;
    $(".rap-readout").classList.toggle("accepted", result.accepted);
    if (!started) return;
    if (result.accepted) {
      const power = getSpellPower(result.command, result.score);
      const card = $(`[data-spell="${result.command}"]`);
      if (card)
        card.querySelector(".spell-score").textContent =
          `${result.score}/100 · ${power.multiplier.toFixed(2)}×`;
      if (mode === "pvp") multiplayer.cast(result.command, data.castToken);
      else perform(result.command, result.score);
    } else toast(result.feedback);
  },
  onStatus: (status) => {
    const active = ["listening", "hearing"].includes(status);
    $(".voice-dot").classList.toggle("active", active);
    if (
      performance.now() > lyricVisibleUntil ||
      status === "hearing" ||
      status === "transcribing"
    )
      $("#transcript").textContent =
        status === "listening"
          ? "Listening · drop your next bar"
          : status === "hearing"
            ? "Recording your verse…"
            : status === "transcribing"
              ? "Sarvam is translating & judging your bar…"
              : String(status);
  },
  onError: (error) => {
    const message =
      typeof error === "string"
        ? error
        : error?.message ||
          "Microphone unavailable. Check browser permissions.";
    $("#start-error").textContent = message;
    if (started || duel) {
      $("#reconnect").hidden = false;
      $("#transcript").textContent =
        "Microphone interrupted · reconnect to cast";
    }
    toast(message);
  },
});
$("#start").onclick = async () => {
  if (mode === "pvp") {
    leaveDuel();
    return;
  }
  const button = $("#start");
  button.disabled = true;
  button.textContent = "Connecting your microphone…";
  $("#start-error").textContent = "";
  try {
    const health = await fetch(getApiUrl("/api/health")).then((r) => r.json());
    if (!health.configured)
      throw Error(
        "Add your Sarvam API key to the server .env, then restart the server.",
      );
    if ((await voice.start()) !== true) return;
    $("#reconnect").hidden = true;
    for (const e of enemies) {
      releaseEnemy(e);
      scene.remove(e.body);
    }
    enemies = [];
    game = createGame();
    spawnedWave = 0;
    nextWaveAt = 0;
    player.position.set(0, 0, 1);
    started = true;
    $(".overlay").classList.add("hidden");
    wave();
    music?.play().catch(() => {});
    $("#transcript").textContent = "Listening · drop your next bar";
    $(".voice-dot").classList.add("active");
  } catch (error) {
    $("#start-error").textContent =
      error.message || "Allow microphone access in your browser to play.";
  } finally {
    button.disabled = false;
    button.textContent = "Enter the arena ↗";
  }
};
$("#reconnect").onclick = async () => {
  if ((await voice.start()) === true) {
    $("#reconnect").hidden = true;
    toast("Microphone connected");
  }
};
function end() {
  if (game.status === "victory") playSound("victory");
  started = false;
  voice.stop();
  $(".overlay").classList.remove("hidden");
  $(".start-card h2").innerHTML =
    game.status === "victory"
      ? "Your voice.<br>A victory."
      : "A brave echo.<br>Try once more.";
  $(".start-card p").innerHTML =
    `${game.status === "victory" ? "All three waves conquered. The garden is yours." : "The garden gremlins got the upper hand."}<br>Final score: <b>${game.score}</b> · Wave ${game.wave} of 3`;
  $("#start").textContent = "Play again ↗";
  $(".voice-dot").classList.remove("active");
  tone(game.status === "victory" ? 800 : 170);
}

let mode = "solo",
  duel = null,
  duelId = null,
  remote = null,
  lastMoveAt = 0,
  joining = false;
function clearSolo() {
  for (const enemy of enemies) {
    releaseEnemy(enemy);
    scene.remove(enemy.body);
  }
  enemies = [];
  shield.visible = false;
  keys.clear();
}
function setMode(next) {
  if (duel || joining) return;
  mode = next;
  $("#solo-tab").classList.toggle("selected", next === "solo");
  $("#pvp-tab").classList.toggle("selected", next === "pvp");
  $("#solo-tab").setAttribute("aria-selected", next === "solo");
  $("#pvp-tab").setAttribute("aria-selected", next === "pvp");
  $("#pvp-lobby").hidden = next !== "pvp";
  $("#start").hidden = next === "pvp";
  $(".start-card h2").innerHTML =
    next === "pvp"
      ? "Two MCs.<br>One champion."
      : "A verse.<br>A world of magic.";
  $(".start-card p").hidden = next === "pvp";
  if (next === "solo") {
    $(".start-card p").innerHTML =
      "Hold your ground in a living 3D arena.<br>Move with <b>W A S D</b>. Rap a short line to cast your spells.<br>Survive three waves to become the echo champion.";
    $("#start").textContent = "Enter the arena ↗";
  }
  $("#start-error").textContent = "";
}
$("#solo-tab").onclick = () => setMode("solo");
$("#pvp-tab").onclick = () => setMode("pvp");
function removeRemote() {
  if (remote) {
    remote.mixer?.stopAllAction();
    remote.mixer?.uncacheRoot(remote.model);
    scene.remove(remote.body);
    remote = null;
  }
}
function makeRemote() {
  if (remote || !characterTemplate) return;
  const body = new THREE.Group(),
    model = cloneSkeleton(characterTemplate);
  const box = new THREE.Box3().setFromObject(model),
    height = box.getSize(new THREE.Vector3()).y;
  model.scale.setScalar(1.8 / height);
  model.position.y = (-box.min.y * 1.8) / height;
  model.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.color.multiply(new THREE.Color("#e9a5bd"));
    }
  });
  body.add(model);
  scene.add(body);
  const animated = makeAnimations(model);
  animated.actions.idle?.play();
  const halo = mesh(
    new THREE.TorusGeometry(0.68, 0.05, 6, 40),
    "#eeb0c2",
    0,
    0.09,
    0,
    body,
  );
  halo.rotation.x = Math.PI / 2;
  const bubble = mesh(
    new THREE.SphereGeometry(0.95, 20, 14),
    "#eab5f3",
    0,
    1,
    0,
    body,
  );
  bubble.material.transparent = true;
  bubble.material.opacity = 0.23;
  bubble.material.wireframe = true;
  bubble.visible = false;
  remote = {
    body,
    model,
    ...animated,
    bubble,
    motion: "idle",
    target: new THREE.Vector3(),
    rotation: 0,
    ready: false,
  };
}
function leaveDuel(message = "") {
  multiplayer.leave();
  voice.stop();
  started = false;
  duel = null;
  duelId = null;
  clearSolo();
  removeRemote();
  $("#reconnect").hidden = true;
  $(".duel-bar").hidden = true;
  $(".overlay").classList.remove("hidden");
  $("#solo-tab").hidden = false;
  $("#pvp-tab").hidden = false;
  $("#pvp-lobby").hidden = false;
  $("#start").hidden = true;
  $("#start-error").textContent = message;
  $(".start-card h2").innerHTML = "Two MCs.<br>One champion.";
  $(".start-card p").hidden = true;
  $("#transcript").textContent = "Create a room or join your friend";
  setMode("pvp");
  $("#start-error").textContent = message;
}
const multiplayer = createMultiplayerClient({
  onState: (state, id) => {
    const previousPhase = duel?.phase;
    duel = state;
    duelId = id;
    const own = state.players.find((p) => p.id === id),
      other = state.players.find((p) => p.id !== id);
    if (own) {
      game.time = state.time;
      game.health = own.health;
      game.cooldowns = own.cooldowns;
      game.shieldUntil = own.shieldUntil;
      player.position.set(own.x, 0, own.z);
      player.rotation.y = own.rotation;
      shield.visible = state.time < own.shieldUntil;
    }
    $("#room-code").textContent = state.roomCode;
    $("#rival-health").textContent = other
      ? `OPPONENT  ${other.health} / 100`
      : "Waiting for opponent · share your code";
    $(".duel-bar").hidden = false;
    if (other) {
      makeRemote();
      if (remote) {
        remote.target.set(other.x, 0, other.z);
        remote.rotation = other.rotation;
        remote.bubble.visible = state.time < other.shieldUntil;
        if (!remote.ready) {
          remote.body.position.copy(remote.target);
          remote.ready = true;
        }
      }
    } else removeRemote();
    if (state.phase === "waiting") {
      started = false;
      $(".overlay").classList.add("hidden");
      $("#transcript").textContent =
        `Room ${state.roomCode} · waiting for a challenger`;
    }
    if (state.phase === "playing") {
      started = true;
      $(".overlay").classList.add("hidden");
      if (previousPhase !== "playing")
        toast("Cypher started · drop your bars!");
    }
    if (state.phase === "finished" && previousPhase !== "finished") {
      started = false;
      voice.stop();
      $(".overlay").classList.remove("hidden");
      $(".start-card h2").innerHTML =
        state.winnerId === id
          ? "Your voice.<br>A victory."
          : "A worthy duel.<br>Another round?";
      $(".start-card p").hidden = false;
      $(".start-card p").textContent =
        state.winnerId === id
          ? "You won the duel. Your opponent fell or left the arena."
          : "Your opponent won this duel. Create a new room to challenge them again.";
      $("#pvp-lobby").hidden = true;
      $("#start").hidden = false;
      $("#start").textContent = "Back to duel lobby ↗";
      if (state.winnerId === id) playSound("victory");
    }
  },
  onCast: (event) => {
    const point = new THREE.Vector3(event.x, 0, event.z),
      target = new THREE.Vector3(
        event.targetX ?? event.x,
        0,
        event.targetZ ?? event.z,
      );
    const power = getSpellPower(event.command, event.score);
    playSound(event.command === "shield" ? "shield" : "cast");
    if (event.command === "fireball") {
      const p = mesh(
        new THREE.IcosahedronGeometry(0.24 * power.scale),
        "#ff9b3d",
        point.x,
        1,
        point.z,
      );
      effects.push({
        mesh: p,
        life: 0.28,
        max: 0.28,
        start: p.position.clone(),
        target: target.clone().setY(0.8),
      });
      burst(target, "#ffb85b", 8, power.scale);
    } else if (event.command === "lightning") {
      const bolt = mesh(
        new THREE.CylinderGeometry(
          0.09 * power.scale,
          0.16 * power.scale,
          5 * power.scale,
          5,
        ),
        "#f7e897",
        target.x,
        3,
        target.z,
      );
      effects.push({ mesh: bolt, life: 0.24, max: 0.24 });
      burst(target, "#fff6ad", 12, power.scale);
    } else
      burst(point, SPELLS[event.command]?.color || "#ffffff", 20, power.scale);
    if (event.command === "shield") {
      if (event.playerId === duelId) shield.scale.setScalar(power.scale);
      else remote?.bubble.scale.setScalar(power.scale);
    }
    toast(
      `${event.playerId === duelId ? "You" : "Opponent"} cast ${SPELLS[event.command]?.label || "magic"} · ${event.score}/100 · ${power.multiplier.toFixed(2)}×`,
    );
  },
  onError: (message) => {
    if (String(message).startsWith("Room expired")) {
      leaveDuel(message);
      return;
    }
    toast(message);
    $("#start-error").textContent = message;
    if (!duel) {
      voice.stop();
      multiplayer.leave();
      joining = false;
    }
  },
  onClose: () =>
    leaveDuel("Connection lost. Create or join a room to reconnect."),
});
async function enterDuel(create) {
  if (joining) return;
  const code = $("#room-input").value.trim().toUpperCase();
  if (!create && !/^[A-Z0-9]{4,8}$/.test(code)) {
    $("#start-error").textContent =
      "Enter the room code shared by your opponent.";
    return;
  }
  joining = true;
  $("#create-room").disabled = true;
  $("#join-room").disabled = true;
  $("#start-error").textContent = "Connecting microphone and arena…";
  try {
    if ((await voice.start()) !== true) return;
    clearSolo();
    game = createGame();
    await multiplayer.connect();
    if (create) multiplayer.create();
    else multiplayer.join(code);
    $("#start-error").textContent = "";
    music?.play().catch(() => {});
  } catch (error) {
    voice.stop();
    multiplayer.leave();
    $("#start-error").textContent = error.message;
  } finally {
    joining = false;
    $("#create-room").disabled = false;
    $("#join-room").disabled = false;
  }
}
$("#create-room").onclick = () => enterDuel(true);
$("#join-room").onclick = () => enterDuel(false);
$("#room-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") enterDuel(false);
});
$("#leave-room").onclick = () => leaveDuel();
function updateDuel(dt, now) {
  if (started) {
    const direction = new THREE.Vector3(
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
      0,
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0),
    );
    if (direction.length())
      direction
        .normalize()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 5);
    if (now - lastMoveAt >= 50) {
      multiplayer.move(direction.x, direction.z);
      lastMoveAt = now;
    }
    const motion = direction.length() ? "walk" : "idle";
    if (motion !== playerMotion) {
      playerActions[playerMotion]?.fadeOut(0.15);
      playerActions[motion]?.reset().fadeIn(0.15).play();
      playerMotion = motion;
    }
  }
  if (remote) {
    const moving = remote.body.position.distanceTo(remote.target) > 0.015;
    remote.body.position.lerp(remote.target, 1 - Math.exp(-dt * 18));
    remote.body.rotation.y = remote.rotation;
    remote.mixer.update(dt);
    const motion = moving ? "walk" : "idle";
    if (motion !== remote.motion) {
      remote.actions[remote.motion]?.fadeOut(0.15);
      remote.actions[motion]?.reset().fadeIn(0.15).play();
      remote.motion = motion;
    }
  }
}

function resize() {
  const w = arena.clientWidth,
    h = arena.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.position.set(
    w / h < 1.2 ? 19 : 15,
    w / h < 1.2 ? 25 : 19,
    w / h < 1.2 ? 29 : 22,
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(arena);
resize();
let previous = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  playerMixer?.update(dt);
  for (const enemy of enemies) enemy.mixer?.update(dt);
  if (mode === "pvp" && duel) updateDuel(dt, now);
  if (started && mode === "solo") {
    tick(game, dt);
    const move = new THREE.Vector3(
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
      0,
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0),
    );
    const motion = move.length() ? "walk" : "idle";
    if (motion !== playerMotion) {
      playerActions[playerMotion]?.fadeOut(0.15);
      playerActions[motion]?.reset().fadeIn(0.15).play();
      playerMotion = motion;
    }
    if (move.length()) {
      move.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 5);
      player.position.addScaledVector(move, dt * 4.5);
      player.position.clampLength(0, 8.7);
      player.rotation.y = Math.atan2(move.x, move.z);
      player.position.y = Math.sin(now * 0.018) * 0.055;
    } else player.position.y = 0;
    shield.visible = game.time < game.shieldUntil;
    shield.rotation.y += dt;
    for (const enemy of [...enemies]) {
      if (enemy.hp <= 0) {
        releaseEnemy(enemy);
        burst(enemy.body.position, "#e1e7a9", 12);
        scene.remove(enemy.body);
        enemies.splice(enemies.indexOf(enemy), 1);
        game.score += 100;
        continue;
      }
      const delta = player.position.clone().sub(enemy.body.position);
      delta.y = 0;
      const distance = delta.length();
      enemy.body.rotation.y = Math.atan2(delta.x, delta.z);
      enemy.body.position.y = Math.sin(now * 0.005 + enemy.phase) * 0.065;
      if (distance > 1.15) {
        enemy.body.position.addScaledVector(
          delta.normalize(),
          dt * (0.7 + game.wave * 0.17),
        );
        enemy.telegraph = 0;
        enemy.ring.material.color.set("#b76c53");
      } else {
        enemy.telegraph += dt;
        enemy.ring.material.color.set(
          enemy.telegraph > 0.55 ? "#ff5137" : "#e7aa4c",
        );
        enemy.ring.scale.setScalar(1 + enemy.telegraph * 0.5);
        if (enemy.telegraph > 1) {
          damage(game, 10 + game.wave * 2);
          burst(
            player.position,
            game.time < game.shieldUntil ? "#b8fff0" : "#edb69b",
            5,
          );
          enemy.telegraph = 0;
          enemy.ring.scale.setScalar(1);
        }
      }
    }
    if (enemies.length === 0) {
      if (spawnedWave === 3) {
        game.status = "victory";
      } else if (!nextWaveAt) {
        nextWaveAt = game.time + 3;
        toast("Wave cleared · catch your breath");
      } else if (game.time > nextWaveAt) {
        nextWaveAt = 0;
        wave();
      }
    }
    if (game.status !== "playing") end();
  }
  for (const effect of [...effects]) {
    effect.life -= dt;
    if (effect.target)
      effect.mesh.position.lerpVectors(
        effect.start,
        effect.target,
        1 - effect.life / effect.max,
      );
    if (effect.v) {
      effect.mesh.position.addScaledVector(effect.v, dt);
      effect.v.y -= dt * 8;
      effect.mesh.scale.setScalar(Math.max(0.01, effect.life / effect.max));
    }
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      effects.splice(effects.indexOf(effect), 1);
    }
  }
  $("#health").textContent = `${game.health} / 100`;
  $("#health-bar").style.width = `${game.health}%`;
  $("#wave").textContent = mode === "pvp" ? "PVP" : `0${game.wave} / 03`;
  $("#score").textContent =
    mode === "pvp"
      ? duel?.phase === "playing"
        ? "LIVE"
        : "ROOM"
      : String(game.score).padStart(4, "0");
  for (const command of Object.keys(SPELLS)) {
    const remaining = Math.max(0, game.cooldowns[command] - game.time),
      el = $(`[data-spell="${command}"]`);
    el.classList.toggle("cooling", remaining > 0);
    el.querySelector(".timer").textContent =
      remaining > 0 ? `${remaining.toFixed(1)}s` : "Ready";
  }
  if (now > toastUntil) $(".toast").classList.remove("show");
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
