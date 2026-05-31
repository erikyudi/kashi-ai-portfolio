/* ============================================================
   KASHI AI — Anomalous Matter Hero
   A slowly-morphing icosahedron of living wireframe, displaced
   by 3D simplex noise and lit by a soft point light that tracks
   the cursor. Muted violet→periwinkle palette to stay premium
   and restrained against the dark background.
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
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3.55;

  const root = new THREE.Group();   // floats
  scene.add(root);

  // ---- Muted, professional palette (no neon) ----
  const baseColor = new THREE.Color(0x6E63B0); // soft muted violet
  const rimColor  = new THREE.Color(0x8FB4E8); // restrained periwinkle blue
  const lightWorld = new THREE.Vector3(0, 0, 4);

  const uniforms = {
    time:        { value: 0 },
    amp:         { value: 0.22 },
    baseColor:   { value: baseColor },
    rimColor:    { value: rimColor },
    lightPos:    { value: lightWorld.clone() },
    glow:        { value: 1.0 },
    pointer:     { value: new THREE.Vector3(0.0, 0.0, 1.3) }, // world pos of cursor on the sphere plane
    pull:        { value: 0.0 },                              // magnetic stretch strength (0..1)
  };

  const vertexShader = `
    uniform float time;
    uniform float amp;
    uniform vec3 pointer;
    uniform float pull;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying float vDisp;

    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main(){
      vNormal = normalize(normalMatrix * normal);
      float n = snoise(position * 1.6 + vec3(0.0, 0.0, time * 0.5));
      float n2 = snoise(position * 3.2 + vec3(time * 0.3, 0.0, 0.0)) * 0.4;
      float displacement = (n + n2) * amp;
      vDisp = displacement;
      vec3 newPosition = position + normal * displacement;

      // ---- magnetic pull toward the cursor ----
      // bring the vertex into world space, stretch the side facing the
      // pointer toward it (teardrop), so the sphere reads as "grabbed".
      vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);
      vec3 wpos = worldPos.xyz;
      vec3 wnormal = normalize(mat3(modelMatrix) * normal);
      vec3 toM = pointer - wpos;
      vec3 dirM = normalize(toM);
      float facing = max(dot(wnormal, dirM), 0.0);
      float falloff = facing * facing;                 // only the near hemisphere stretches
      wpos += dirM * falloff * pull * 0.7;
      vWorldPos = wpos;
      gl_Position = projectionMatrix * viewMatrix * vec4(wpos, 1.0);
    }`;

  const fragmentShader = `
    uniform vec3 baseColor;
    uniform vec3 rimColor;
    uniform vec3 lightPos;
    uniform float glow;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying float vDisp;

    void main(){
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(lightPos - vWorldPos);
      float diffuse = max(dot(normal, lightDir), 0.0);

      float fresnel = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
      fresnel = pow(fresnel, 1.8);

      // displacement tints toward the periwinkle rim on the raised crests
      vec3 col = mix(baseColor, rimColor, clamp(vDisp * 2.2 + 0.45, 0.0, 1.0));
      vec3 lit = col * (0.30 + diffuse * 0.55) + rimColor * fresnel * 0.6 * glow;

      gl_FragColor = vec4(lit, 0.92);
    }`;

  const geometry = new THREE.IcosahedronGeometry(1.15, 24);
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader,
    wireframe: true, transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  root.add(mesh);

  // faint solid inner shell for depth (very low opacity)
  const shellMat = new THREE.ShaderMaterial({
    uniforms, vertexShader,
    fragmentShader: fragmentShader.replace('0.92);', '0.05);'),
    transparent: true, depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.13, 24), shellMat);
  root.add(shell);

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

  // ---- Cursor-tracked light (soft) ----
  let tlx = 0, tly = 0, lx = 0, ly = 0;
  // ---- Cursor in stage-local space (for the magnetic pull) ----
  let tpx = 0, tpy = 0, inside = false;
  window.addEventListener('pointermove', (e) => {
    tlx = (e.clientX / window.innerWidth) * 2 - 1;
    tly = -(e.clientY / window.innerHeight) * 2 + 1;
    const r = stage.getBoundingClientRect();
    tpx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    tpy = -(e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    inside = true;
  });
  window.addEventListener('pointerleave', () => { inside = false; });

  // glow slider hook (shares --glow with the rest of the site)
  function readGlow() {
    const v = parseFloat(getComputedStyle(document.body).getPropertyValue('--glow'));
    if (!isNaN(v)) uniforms.glow.value = v;
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  const clock = new THREE.Clock();
  // smoothed pointer + pull state
  let mpx = 0, mpy = 0, pull = 0, ox = 0, oy = 0;
  function loop() {
    if (!running) return;
    const t = clock.getElapsedTime();

    lx += (tlx - lx) * 0.05;
    ly += (tly - ly) * 0.05;
    uniforms.time.value = reduce ? 0.0 : t * 0.18;
    uniforms.lightPos.value.set(lx * 3.2, ly * 3.2, 3.2);
    readGlow();

    // ---- magnetic pull toward the cursor ----
    mpx += (tpx - mpx) * 0.12;
    mpy += (tpy - mpy) * 0.12;
    // strongest near the sphere, fading out as the cursor moves away
    const rad = Math.hypot(tpx, tpy);
    const near = inside ? Math.max(0, 1 - rad / 1.5) : 0;
    pull += (near - pull) * 0.09;
    if (!reduce) {
      uniforms.pointer.value.set(mpx * 1.6, mpy * 1.6, 1.3);
      uniforms.pull.value = pull;
    }

    if (!reduce) {
      // whole sphere drifts toward the cursor like it's being tugged
      const ax = mpx * 0.45 * near, ay = mpy * 0.45 * near;
      ox += (ax - ox) * 0.08;
      oy += (ay - oy) * 0.08;

      mesh.rotation.y += 0.0014;
      mesh.rotation.x = Math.sin(t * 0.15) * 0.18;
      shell.rotation.copy(mesh.rotation);
      root.position.x = ox;
      root.position.y = Math.sin(t * 0.6) * 0.05 + oy; // gentle float + tug
      root.rotation.y = lx * 0.25;                     // subtle parallax to cursor
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
