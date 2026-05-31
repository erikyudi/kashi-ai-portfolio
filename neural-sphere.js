/* ============================================================
   KASHI AI — Neural Sphere (Three.js)
   Floating, slowly-rotating sphere of connected glowing nodes
   with luminous links, data pulses and soft mouse reaction.
   ============================================================ */
(function () {
  const canvas = document.getElementById('neural');
  const stage = document.getElementById('sphere-stage');
  if (!canvas || !stage || !window.THREE) {
    if (stage) stage.classList.add('sphere-fallback');
    return;
  }
  const THREE = window.THREE;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4.3;

  const root = new THREE.Group();       // floats + holds the rotating sphere
  scene.add(root);
  const group = new THREE.Group();       // rotates
  root.add(group);

  // ---- Brand palette ----
  const cPurple = new THREE.Color(0x7B00FF);
  const cIndigo = new THREE.Color(0xA855F7);
  const cBlue = new THREE.Color(0xFF6B00);
  const cCyan = new THREE.Color(0xD946EF);
  function colorFor(y, R) {
    const t = (y / R + 1) / 2; // 0 bottom .. 1 top
    const c = new THREE.Color();
    if (t > 0.5) c.copy(cIndigo).lerp(cPurple, (t - 0.5) * 2);
    else c.copy(cCyan).lerp(cBlue, t * 2);
    return c;
  }

  // ---- Soft radial glow sprite ----
  function glowTexture(inner) {
    const s = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(inner || 0.25, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }
  const dotTex = glowTexture(0.2);
  const softTex = glowTexture(0.0);

  // ---- Nodes on a Fibonacci sphere ----
  const N = 150, R = 1.55;
  const nodes = [];
  const inc = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * inc;
    nodes.push(new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).multiplyScalar(R));
  }

  // points
  const pg = new THREE.BufferGeometry();
  const posArr = new Float32Array(N * 3), colArr = new Float32Array(N * 3);
  nodes.forEach((v, i) => {
    posArr.set([v.x, v.y, v.z], i * 3);
    const c = colorFor(v.y, R);
    colArr.set([c.r, c.g, c.b], i * 3);
  });
  pg.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  const pmat = new THREE.PointsMaterial({
    size: 0.14, map: dotTex, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.95
  });
  group.add(new THREE.Points(pg, pmat));

  // ---- Connections (each node to nearest neighbours) ----
  const edges = [];
  const seen = new Set();
  const maxDist = R * 0.58;
  for (let i = 0; i < N; i++) {
    const near = [];
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < maxDist) near.push([d, j]);
    }
    near.sort((a, b) => a[0] - b[0]);
    const k = Math.min(3, near.length);
    for (let n = 0; n < k; n++) {
      const j = near[n][1];
      const key = i < j ? i + '_' + j : j + '_' + i;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }
  const lp = new Float32Array(edges.length * 6);
  const lc = new Float32Array(edges.length * 6);
  edges.forEach((e, idx) => {
    const a = nodes[e[0]], b = nodes[e[1]];
    lp.set([a.x, a.y, a.z, b.x, b.y, b.z], idx * 6);
    const ca = colorFor(a.y, R), cb = colorFor(b.y, R);
    lc.set([ca.r, ca.g, ca.b, cb.r, cb.g, cb.b], idx * 6);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const lmat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  group.add(new THREE.LineSegments(lg, lmat));

  // ---- Faint inner wireframe shell for depth ----
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(R * 0.93, 1),
    new THREE.MeshBasicMaterial({ color: 0x3a1060, wireframe: true, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  group.add(shell);

  // ---- Central core glow ----
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softTex, color: 0x7B00FF, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  core.scale.set(2.4, 2.4, 1);
  group.add(core);

  // ---- Data pulses travelling along edges ----
  const PULSES = 18;
  const pulseGeo = new THREE.BufferGeometry();
  const pulsePos = new Float32Array(PULSES * 3);
  const pulseCol = new Float32Array(PULSES * 3);
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseCol, 3));
  const pulseMat = new THREE.PointsMaterial({
    size: 0.2, map: dotTex, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 1
  });
  const pulsePoints = new THREE.Points(pulseGeo, pulseMat);
  group.add(pulsePoints);
  const pulses = [];
  function seedPulse(p) {
    p.edge = edges[(Math.random() * edges.length) | 0];
    p.t = Math.random();
    p.speed = 0.15 + Math.random() * 0.35;
  }
  for (let i = 0; i < PULSES; i++) { const p = {}; seedPulse(p); pulses.push(p); }

  // ---- Resize ----
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  // ---- Mouse (soft) ----
  let tmx = 0, tmy = 0, mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    tmx = (e.clientX / window.innerWidth) * 2 - 1;
    tmy = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  const clock = new THREE.Clock();
  function loop() {
    if (!running) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta ? 0.016 : 0.016, 0.05);

    mx += (tmx - mx) * 0.045;
    my += (tmy - my) * 0.045;

    if (!reduce) {
      group.rotation.y += 0.0016;
      group.rotation.x = Math.sin(t * 0.18) * 0.12 + my * 0.35;
      group.rotation.y += 0; // base spin already applied
      root.rotation.y = mx * 0.4;
      root.position.y = Math.sin(t * 0.6) * 0.06;        // float
      core.material.opacity = 0.42 + Math.sin(t * 1.4) * 0.08;
    }

    // update pulses
    for (let i = 0; i < PULSES; i++) {
      const p = pulses[i];
      p.t += p.speed * dt;
      if (p.t >= 1) { seedPulse(p); p.t = 0; }
      const a = nodes[p.edge[0]], b = nodes[p.edge[1]];
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;
      const z = a.z + (b.z - a.z) * p.t;
      pulsePos.set([x, y, z], i * 3);
      pulseCol.set([0.6, 0.95, 1.0], i * 3); // bright cyan
    }
    pulseGeo.attributes.position.needsUpdate = true;
    pulseGeo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
