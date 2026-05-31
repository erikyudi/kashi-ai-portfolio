/* ============================================================
   KASHI AI — Cinematic WebGL background
   Aurora / data-flow field. Slow, subtle, mouse-reactive.
   ============================================================ */
(function () {
  const canvas = document.getElementById('shader');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.style.display = 'none'; return; }

  const vert = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const frag = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;     // 0..1
    uniform float u_intensity;

    // hash / noise
    vec2 hash2(vec2 p){
      p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
      return -1.0 + 2.0*fract(sin(p)*43758.5453123);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(dot(hash2(i+vec2(0.0,0.0)), f-vec2(0.0,0.0)),
                     dot(hash2(i+vec2(1.0,0.0)), f-vec2(1.0,0.0)), u.x),
                 mix(dot(hash2(i+vec2(0.0,1.0)), f-vec2(0.0,1.0)),
                     dot(hash2(i+vec2(1.0,1.0)), f-vec2(1.0,1.0)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6,1.2,-1.2,1.6);
      for(int i=0;i<5;i++){ v += a*noise(p); p = m*p; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy) / u_res.y;

      float t = u_time * 0.035;

      // mouse influence
      vec2 m = (u_mouse - 0.5);
      p += m * 0.06;

      // domain-warped flowing field (aurora ribbons)
      vec2 q = vec2(fbm(p*1.6 + vec2(0.0, t*2.0)),
                    fbm(p*1.6 + vec2(5.2, -t*1.7)));
      vec2 r = vec2(fbm(p*1.8 + 1.4*q + vec2(1.7, 9.2) + t*0.6),
                    fbm(p*1.8 + 1.4*q + vec2(8.3, 2.8) - t*0.5));
      float f = fbm(p*1.4 + 2.2*r);

      // ribbon bands
      float band = sin((p.y*2.4 + f*2.6 + t*3.0)) * 0.5 + 0.5;
      band = pow(band, 2.2);

      // palette: neon purple -> magenta -> orange -> gold
      vec3 cPurple = vec3(0.482, 0.000, 1.000);
      vec3 cIndigo = vec3(0.851, 0.275, 0.937);
      vec3 cBlue   = vec3(1.000, 0.420, 0.000);
      vec3 cCyan   = vec3(1.000, 0.722, 0.000);

      float mixA = clamp(f*0.6 + 0.5, 0.0, 1.0);
      vec3 col = mix(cPurple, cBlue, mixA);
      col = mix(col, cIndigo, smoothstep(0.3,0.7,r.x*0.5+0.5));
      col = mix(col, cCyan, pow(band, 1.6) * 0.5);

      // luminance of field
      float glow = band * (0.55 + 0.45*r.y);
      glow *= smoothstep(1.15, 0.1, length(p*vec2(0.85,1.1)));  // fade edges

      // mouse-follow energy bloom
      float md = length(p - m*0.8);
      float bloom = exp(-md*md*8.0) * 0.4;
      col += cCyan * bloom;
      glow += bloom;

      col *= glow * (0.85 + 0.5*u_intensity);

      // base dark tint
      vec3 base = vec3(0.020, 0.020, 0.027);
      vec3 finalCol = base + col;

      // subtle grain
      float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453) - 0.5) * 0.025;
      finalCol += grain;

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uInt = gl.getUniformLocation(prog, 'u_intensity');

  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  // mouse with easing
  let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;
  window.addEventListener('pointermove', (e) => {
    tmx = e.clientX / window.innerWidth;
    tmy = 1.0 - e.clientY / window.innerHeight;
  });

  // intensity controlled by tweak (reads CSS var --glow on body)
  function getIntensity() {
    const v = parseFloat(getComputedStyle(document.body).getPropertyValue('--glow'));
    return isNaN(v) ? 1.0 : v;
  }

  const start = performance.now();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });

  function loop() {
    if (!running) return;
    mx += (tmx - mx) * 0.04;
    my += (tmy - my) * 0.04;
    const time = (performance.now() - start) / 1000;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uInt, getIntensity());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(loop);
  }
  loop();
})();
