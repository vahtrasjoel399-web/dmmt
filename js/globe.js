(function () {
  'use strict';

  var canvas = document.getElementById('globeCanvas');
  if (!canvas || !canvas.getContext) return;

  var ctx  = canvas.getContext('2d');
  var SIZE = 460;
  var dpr  = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width  = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width  = SIZE + 'px';
  canvas.style.height = SIZE + 'px';
  ctx.scale(dpr, dpr);

  var CX   = SIZE / 2;
  var CY   = SIZE / 2;
  var R    = SIZE * 0.455;   // sphere radius
  var ZOOM = 2.4;            // zoom into the region (countries fill the sphere)

  // View latitude centre — looking from above 58°N
  var PHI0 = 58 * Math.PI / 180;
  var lon0 = 6;

  var startTime = null;

  // ─── Geographic data (simplified polygons) ──────────────────
  var MAIN = [
    { id:'norway', coords:[
        [5,58],[4,59],[4,61],[5,62],[5.5,63],[6.5,65],
        [8,67],[14,68.5],[17,70],[21,70.5],[26,71.5],
        [29,70.5],[28,69],[25,68],[22,66],[20,64],
        [18,63],[16,62],[14,61],[12,60],[11,59],
        [10.5,58],[9,57.5],[8,57.8]
    ]},
    { id:'sweden', coords:[
        [10.5,55.4],[12.5,55.4],[14,56],[16,57],[18,57.5],
        [20,58.5],[21.5,59.5],[22,60.5],[22.5,62],[22,65.5],
        [20,64],[18,63],[16,62],[14,61],[12,60],
        [11,59],[10.5,58],[10.5,56]
    ]},
    { id:'finland', coords:[
        [22,59.5],[25,59],[27,60],[29.5,61],[30.5,63.5],
        [30.5,65.5],[29,69],[27,70],[25.5,70.5],[24,68],
        [22,66],[22.5,64],[22.5,62],[22,60]
    ]},
    { id:'estonia', coords:[
        [22,58.5],[24.5,57.5],[27.5,57.5],[28.2,58.5],
        [27,59.5],[25,59.5],[23,59.2]
    ]},
    { id:'latvia', coords:[
        [21,57.5],[21.5,56.5],[22.5,56],[26,55.7],
        [28.5,56],[27.5,57.8],[25,57.5],[23,57.5]
    ]},
    { id:'lithuania', coords:[
        [21.5,56.5],[22.5,56],[26,55.7],[26.5,54.5],
        [25,54],[22,54],[21.5,55],[21,55.8]
    ]},
  ];

  var BG = [
    { id:'denmark',  coords:[[8,57.5],[8.5,56.5],[8,55.5],[9.5,55],[10.5,55.5],[10.5,57.5]] },
    { id:'germany',  coords:[[6,54],[14.5,54],[15,51],[13,50],[8,47.5],[6.5,47.5],[6,51]] },
    { id:'poland',   coords:[[14.5,54],[23.5,54],[23.5,50],[14.5,50]] },
    { id:'russia',   coords:[[27,59.5],[32,60],[32,53],[28,53.5],[27,57.5]] },
    { id:'belarus',  coords:[[24,54],[32,54],[32,51],[24,51]] },
  ];

  var CITIES = [
    { name:'Oslo',      lon:10.75, lat:59.91, hq:false, t:0.10 },
    { name:'Stockholm', lon:18.07, lat:59.33, hq:false, t:0.25 },
    { name:'Helsinki',  lon:24.94, lat:60.17, hq:false, t:0.40 },
    { name:'Tallinn',   lon:24.75, lat:59.44, hq:true,  t:0.55 },
    { name:'Riga',      lon:24.11, lat:56.95, hq:false, t:0.70 },
    { name:'Vilnius',   lon:25.28, lat:54.69, hq:false, t:0.85 },
  ];

  // ─── Orthographic projection with zoom ──────────────────────
  function project(lat, lon) {
    var phi    = lat * Math.PI / 180;
    var lambda = (lon - lon0) * Math.PI / 180;
    var cosPhi    = Math.cos(phi),    sinPhi    = Math.sin(phi);
    var cosLambda = Math.cos(lambda), sinLambda = Math.sin(lambda);
    var cosPhi0   = Math.cos(PHI0),   sinPhi0   = Math.sin(PHI0);
    var z = sinPhi * sinPhi0 + cosPhi * cosPhi0 * cosLambda;
    if (z < 0) return null;
    return {
      x: CX + cosPhi * sinLambda * R * ZOOM,
      y: CY - (sinPhi * cosPhi0 - cosPhi * sinPhi0 * cosLambda) * R * ZOOM,
      z: z
    };
  }

  // ─── Sphere background ───────────────────────────────────────
  function drawSphere() {
    var g = ctx.createRadialGradient(CX - R * 0.3, CY - R * 0.3, R * 0.05, CX, CY, R);
    g.addColorStop(0,   '#252525');
    g.addColorStop(0.5, '#151515');
    g.addColorStop(1,   '#080808');
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Edge accent glow
    var eg = ctx.createRadialGradient(CX, CY, R * 0.6, CX, CY, R);
    eg.addColorStop(0, 'rgba(255,42,42,0)');
    eg.addColorStop(1, 'rgba(255,42,42,0.06)');
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = eg;
    ctx.fill();

    // Specular highlight
    var sg = ctx.createRadialGradient(CX - R * 0.32, CY - R * 0.32, 0, CX - R * 0.1, CY - R * 0.1, R * 0.65);
    sg.addColorStop(0, 'rgba(255,255,255,0.05)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = sg;
    ctx.fill();
  }

  // ─── Latitude / longitude grid ───────────────────────────────
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 0.5;

    // Parallels every 10°
    for (var lat = -80; lat <= 80; lat += 10) {
      ctx.beginPath();
      var first = true;
      for (var lo = -180; lo <= 180; lo += 2) {
        var pt = project(lat, lo);
        if (!pt) { first = true; continue; }
        first ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
        first = false;
      }
      ctx.stroke();
    }

    // Meridians every 10°
    for (var lon = 0; lon < 360; lon += 10) {
      ctx.beginPath();
      first = true;
      for (var la = -90; la <= 90; la += 2) {
        var pt2 = project(la, lon);
        if (!pt2) { first = true; continue; }
        first ? ctx.moveTo(pt2.x, pt2.y) : ctx.lineTo(pt2.x, pt2.y);
        first = false;
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── Country polygons ────────────────────────────────────────
  function drawCountries() {
    // Background countries
    for (var i = 0; i < BG.length; i++) {
      var pts = [];
      for (var j = 0; j < BG[i].coords.length; j++) {
        var p = project(BG[i].coords[j][1], BG[i].coords[j][0]);
        if (p) pts.push(p);
      }
      if (pts.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
      ctx.fillStyle   = 'rgba(255,255,255,0.028)';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth   = 0.6;
      ctx.fill(); ctx.stroke();
    }

    // Main countries
    for (var m = 0; m < MAIN.length; m++) {
      var mpts = [];
      for (var n = 0; n < MAIN[m].coords.length; n++) {
        var mp = project(MAIN[m].coords[n][1], MAIN[m].coords[n][0]);
        if (mp) mpts.push(mp);
      }
      if (mpts.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(mpts[0].x, mpts[0].y);
      for (var o = 1; o < mpts.length; o++) ctx.lineTo(mpts[o].x, mpts[o].y);
      ctx.closePath();
      ctx.fillStyle   = 'rgba(255,255,255,0.075)';
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth   = 1;
      ctx.fill(); ctx.stroke();
    }
  }

  // ─── Connection lines ────────────────────────────────────────
  function drawLines(alpha) {
    if (alpha <= 0) return;
    var hq = project(59.44, 24.75);
    if (!hq) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255,42,42,0.55)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 5]);

    for (var i = 0; i < CITIES.length; i++) {
      var city = CITIES[i];
      if (city.hq) continue;
      var pt = project(city.lat, city.lon);
      if (!pt) continue;

      ctx.beginPath();
      ctx.moveTo(hq.x, hq.y);
      var steps = 20;
      for (var s = 1; s <= steps; s++) {
        var f  = s / steps;
        var ip = project(
          59.44 + (city.lat - 59.44) * f,
          24.75 + (city.lon - 24.75) * f
        );
        if (!ip) break;
        ctx.lineTo(ip.x, ip.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── City dots ───────────────────────────────────────────────
  function drawCities(elapsed) {
    for (var i = 0; i < CITIES.length; i++) {
      var city  = CITIES[i];
      var alpha = Math.min(1, Math.max(0, (elapsed - 1.8 - city.t) / 0.55));
      if (alpha <= 0) continue;

      var pt = project(city.lat, city.lon);
      if (!pt) continue;

      // Clip cities to sphere boundary (with a small margin for the dot itself)
      var dx = pt.x - CX, dy = pt.y - CY;
      if (Math.sqrt(dx*dx + dy*dy) > R + 8) continue;

      var r   = city.hq ? 6 : 4;
      var osc = Math.sin(elapsed * 1.8 + city.t * 10);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Pulse ring
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r + 6 + osc * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,42,42,' + (0.07 + (1 + osc) * 0.025) + ')';
      ctx.fill();

      // Glow
      var gr = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 4.5);
      gr.addColorStop(0, city.hq ? 'rgba(255,140,140,0.6)' : 'rgba(255,42,42,0.5)');
      gr.addColorStop(1, 'rgba(255,42,42,0)');
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r * 4.5, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = city.hq ? '#ff6666' : '#ff2a2a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = 0.7;
      ctx.stroke();

      // Label
      ctx.globalAlpha = alpha * 0.9;
      ctx.font = (city.hq ? '600 ' : '500 ') + (city.hq ? 12 : 10.5) + 'px Inter, sans-serif';
      ctx.fillStyle = city.hq ? '#ffffff' : 'rgba(255,255,255,0.78)';
      ctx.fillText(city.name, pt.x + r + 6, pt.y + 4);

      if (city.hq) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.font = '700 7.5px Inter, sans-serif';
        ctx.fillStyle = '#ff9090';
        ctx.fillText('HQ', pt.x + r + 6, pt.y + 16);
      }

      ctx.restore();
    }
  }

  // ─── Render loop ─────────────────────────────────────────────
  function render(ts) {
    if (!startTime) startTime = ts;
    var t = (ts - startTime) / 1000;

    // Spin in → settle on region → gentle drift
    if (t < 0.8) {
      lon0 = 6 + t * 15;
    } else if (t < 2.2) {
      var f = (t - 0.8) / 1.4;
      var e = 1 - Math.pow(1 - f, 3);
      lon0 = 18 - e * 1.5;
    } else {
      lon0 = 16.5 + Math.sin((t - 2.2) * 0.1) * 1.8;
    }

    var linesAlpha = Math.min(1, Math.max(0, (t - 1.4) / 0.8));

    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();
    drawSphere();
    drawGrid();
    drawCountries();
    drawLines(linesAlpha);
    ctx.restore();

    drawCities(t);

    requestAnimationFrame(render);
  }

  if (window.matchMedia('(min-width: 1024px)').matches) {
    requestAnimationFrame(render);
  } else {
    var mq = window.matchMedia('(min-width: 1024px)');
    var started = false;
    mq.addEventListener('change', function (e) {
      if (e.matches && !started) { started = true; requestAnimationFrame(render); }
    });
  }

}());
