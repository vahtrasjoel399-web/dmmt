(function () {
  'use strict';

  var canvas = document.getElementById('globeCanvas');
  if (!canvas || !canvas.getContext) return;

  var ctx  = canvas.getContext('2d');
  var SIZE = 600;
  var dpr  = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width  = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width  = SIZE + 'px';
  canvas.style.height = SIZE + 'px';
  ctx.scale(dpr, dpr);

  var CX   = SIZE / 2;
  var CY   = SIZE / 2;
  var R    = SIZE * 0.44;
  var ZOOM = 2.4;
  var PHI0 = 58 * Math.PI / 180;
  var lon0 = 6;
  var startTime = null;

  // ─── Geographic data ─────────────────────────────────────────
  var MAIN = [
    { id:'norway',    coords:[[5,58],[4,59],[4,61],[5,62],[5.5,63],[6.5,65],[8,67],[14,68.5],[17,70],[21,70.5],[26,71.5],[29,70.5],[28,69],[25,68],[22,66],[20,64],[18,63],[16,62],[14,61],[12,60],[11,59],[10.5,58],[9,57.5],[8,57.8]] },
    { id:'sweden',    coords:[[10.5,55.4],[12.5,55.4],[14,56],[16,57],[18,57.5],[20,58.5],[21.5,59.5],[22,60.5],[22.5,62],[22,65.5],[20,64],[18,63],[16,62],[14,61],[12,60],[11,59],[10.5,58],[10.5,56]] },
    { id:'finland',   coords:[[22,59.5],[25,59],[27,60],[29.5,61],[30.5,63.5],[30.5,65.5],[29,69],[27,70],[25.5,70.5],[24,68],[22,66],[22.5,64],[22.5,62],[22,60]] },
    { id:'estonia',   coords:[[22,58.5],[24.5,57.5],[27.5,57.5],[28.2,58.5],[27,59.5],[25,59.5],[23,59.2]] },
    { id:'latvia',    coords:[[21,57.5],[21.5,56.5],[22.5,56],[26,55.7],[28.5,56],[27.5,57.8],[25,57.5],[23,57.5]] },
    { id:'lithuania', coords:[[21.5,56.5],[22.5,56],[26,55.7],[26.5,54.5],[25,54],[22,54],[21.5,55],[21,55.8]] },
  ];

  var BG = [
    { id:'denmark', coords:[[8,57.5],[8.5,56.5],[8,55.5],[9.5,55],[10.5,55.5],[10.5,57.5]] },
    { id:'germany', coords:[[6,54],[14.5,54],[15,51],[13,50],[8,47.5],[6.5,47.5],[6,51]] },
    { id:'poland',  coords:[[14.5,54],[23.5,54],[23.5,50],[14.5,50]] },
    { id:'russia',  coords:[[27,59.5],[32,60],[32,53],[28,53.5],[27,57.5]] },
    { id:'belarus', coords:[[24,54],[32,54],[32,51],[24,51]] },
  ];

  var CITIES = [
    { name:'Oslo',      lon:10.75, lat:59.91, hq:false, t:0.10 },
    { name:'Stockholm', lon:18.07, lat:59.33, hq:false, t:0.25 },
    { name:'Helsinki',  lon:24.94, lat:60.17, hq:false, t:0.40 },
    { name:'Tallinn',   lon:24.75, lat:59.44, hq:true,  t:0.55 },
    { name:'Riga',      lon:24.11, lat:56.95, hq:false, t:0.70 },
    { name:'Vilnius',   lon:25.28, lat:54.69, hq:false, t:0.85 },
  ];

  // ─── Orthographic projection ──────────────────────────────────
  function project(lat, lon) {
    var phi       = lat * Math.PI / 180;
    var lambda    = (lon - lon0) * Math.PI / 180;
    var cosPhi    = Math.cos(phi),    sinPhi    = Math.sin(phi);
    var cosLambda = Math.cos(lambda), sinLambda = Math.sin(lambda);
    var cosPhi0   = Math.cos(PHI0),   sinPhi0   = Math.sin(PHI0);
    var z = sinPhi * sinPhi0 + cosPhi * cosPhi0 * cosLambda;
    if (z < 0) return null;
    return {
      x: CX + cosPhi * sinLambda * R * ZOOM,
      y: CY - (sinPhi * cosPhi0 - cosPhi * sinPhi0 * cosLambda) * R * ZOOM,
    };
  }

  // ─── Sphere ───────────────────────────────────────────────────
  function drawSphere() {
    // Barely-there fill — just enough to read as a volume
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.016)';
    ctx.fill();

    // Crisp single-pixel border
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();
  }

  // ─── Lat/lon grid ─────────────────────────────────────────────
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.028)';
    ctx.lineWidth   = 0.3;

    for (var lat = -80; lat <= 80; lat += 20) {
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

    for (var lon = 0; lon < 360; lon += 20) {
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

  // ─── Country polygons ─────────────────────────────────────────
  function drawCountries() {
    var i, j, k, p, pts;

    for (i = 0; i < BG.length; i++) {
      pts = [];
      for (j = 0; j < BG[i].coords.length; j++) {
        p = project(BG[i].coords[j][1], BG[i].coords[j][0]);
        if (p) pts.push(p);
      }
      if (pts.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.055)';
      ctx.lineWidth   = 0.35;
      ctx.stroke();
    }

    for (i = 0; i < MAIN.length; i++) {
      pts = [];
      for (j = 0; j < MAIN[i].coords.length; j++) {
        p = project(MAIN[i].coords[j][1], MAIN[i].coords[j][0]);
        if (p) pts.push(p);
      }
      if (pts.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
      ctx.fillStyle   = 'rgba(255,255,255,0.024)';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth   = 0.65;
      ctx.fill();
      ctx.stroke();
    }
  }

  // ─── Connection lines from HQ ─────────────────────────────────
  function linesPath(hq) {
    for (var i = 0; i < CITIES.length; i++) {
      var city = CITIES[i];
      if (city.hq) continue;
      var pt = project(city.lat, city.lon);
      if (!pt) continue;
      ctx.beginPath();
      ctx.moveTo(hq.x, hq.y);
      for (var s = 1; s <= 20; s++) {
        var f  = s / 20;
        var ip = project(59.44 + (city.lat - 59.44) * f, 24.75 + (city.lon - 24.75) * f);
        if (!ip) break;
        ctx.lineTo(ip.x, ip.y);
      }
      ctx.stroke();
    }
  }

  function drawLines(alpha) {
    if (alpha <= 0) return;
    var hq = project(59.44, 24.75);
    if (!hq) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash([3, 9]);

    // Soft glow pass
    ctx.strokeStyle = 'rgba(255,42,42,0.08)';
    ctx.lineWidth   = 5;
    linesPath(hq);

    // Sharp line
    ctx.strokeStyle = 'rgba(255,42,42,0.52)';
    ctx.lineWidth   = 0.75;
    linesPath(hq);

    ctx.restore();
  }

  // ─── City nodes ───────────────────────────────────────────────
  function drawCities(elapsed) {
    for (var i = 0; i < CITIES.length; i++) {
      var city  = CITIES[i];
      var alpha = Math.min(1, Math.max(0, (elapsed - 1.8 - city.t) / 0.55));
      if (alpha <= 0) continue;

      var pt = project(city.lat, city.lon);
      if (!pt) continue;

      var dx = pt.x - CX, dy = pt.y - CY;
      if (Math.sqrt(dx * dx + dy * dy) > R + 8) continue;

      var r   = city.hq ? 4 : 2.5;
      var osc = Math.sin(elapsed * 1.3 + city.t * 8) * 0.5 + 0.5; // 0..1

      ctx.save();
      ctx.globalAlpha = alpha;

      // Expanding pulse ring
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r + 6 + osc * 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,42,42,' + (0.14 - osc * 0.1) + ')';
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      // Static inner ring
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = city.hq ? 'rgba(255,42,42,0.28)' : 'rgba(255,42,42,0.18)';
      ctx.lineWidth   = 0.5;
      ctx.stroke();

      // Core dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle   = city.hq ? '#c83232' : '#8a1f1f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth   = 0.5;
      ctx.stroke();

      // Label
      ctx.globalAlpha = alpha * (city.hq ? 0.9 : 0.55);
      ctx.font        = (city.hq ? '600 ' : '500 ') + (city.hq ? 10 : 8.5) + 'px Inter, sans-serif';
      ctx.fillStyle   = city.hq ? '#f0f0f0' : 'rgba(255,255,255,0.65)';
      ctx.fillText(city.name, pt.x + r + 5, pt.y + 3.5);

      ctx.restore();
    }
  }

  // ─── Render loop ──────────────────────────────────────────────
  function render(ts) {
    if (!startTime) startTime = ts;
    var t = (ts - startTime) / 1000;

    if (t < 0.8) {
      lon0 = 6 + t * 15;
    } else if (t < 2.2) {
      var f = (t - 0.8) / 1.4;
      var e = 1 - Math.pow(1 - f, 3);
      lon0 = 18 - e * 1.5;
    } else {
      lon0 = 16.5 + Math.sin((t - 2.2) * 0.09) * 1.5;
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
