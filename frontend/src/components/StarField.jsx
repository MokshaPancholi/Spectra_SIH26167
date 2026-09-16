import { useEffect, useRef } from 'react';


export default function StarField({ count = 180, shootingFreq = 4000, style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let width, height;
    let stars = [];
    let shootingStar = null;

    const resize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      buildStars();
    };

    const rand = (min, max) => Math.random() * (max - min) + min;

    const buildStars = () => {
      stars = Array.from({ length: count }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(0.3, 1.6),
        baseAlpha: rand(0.25, 0.9),
        alpha: 0,
        speed: rand(0.003, 0.012),
        phase: rand(0, Math.PI * 2),
        color: Math.random() > 0.85
          ? `hsl(${rand(180, 220)}, 70%, 85%)`
          : '#ffffff',
      }));
    };

    const spawnShootingStar = () => {
      const fromX = rand(0.1 * width, 0.9 * width);
      const fromY = rand(0, 0.4 * height);
      const angle = rand(20, 40) * (Math.PI / 180);
      const length = rand(100, 220);
      shootingStar = {
        x: fromX, y: fromY,
        dx: Math.cos(angle), dy: Math.sin(angle),
        length,
        progress: 0,
        speed: rand(6, 11),
        alpha: 1,
      };
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        s.alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
      }
      if (shootingStar) {
        const ss = shootingStar;
        ss.progress += ss.speed;
        const tailX = ss.x + ss.dx * ss.progress;
        const tailY = ss.y + ss.dy * ss.progress;
        ss.alpha = Math.max(0, 1 - ss.progress / ss.length);

        const grad = ctx.createLinearGradient(
          ss.x + ss.dx * Math.max(0, ss.progress - ss.length * 0.6),
          ss.y + ss.dy * Math.max(0, ss.progress - ss.length * 0.6),
          tailX, tailY
        );
        grad.addColorStop(0, 'rgba(180,240,255,0)');
        grad.addColorStop(1, `rgba(180,240,255,${ss.alpha})`);

        ctx.globalAlpha = ss.alpha;
        ctx.beginPath();
        ctx.moveTo(ss.x + ss.dx * Math.max(0, ss.progress - ss.length * 0.6), ss.y + ss.dy * Math.max(0, ss.progress - ss.length * 0.6));
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (ss.progress >= ss.length + 30) shootingStar = null;
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    const shootTimer = setInterval(spawnShootingStar, shootingFreq);
    resize();
    animId = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(shootTimer);
      ro.disconnect();
    };
  }, [count, shootingFreq]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  );
}
