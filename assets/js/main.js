(function () {
  const root = document.documentElement;
  const body = document.body;
  const savedTheme = localStorage.getItem("theme");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!motionPreference.matches) {
    body.classList.add("is-page-entering");
  }

  const createAmbientPixelField = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    canvas.className = "ambient-pixel-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let rippleTimer = 0;
    let rippleStartedAt = 0;
    let rippleProgress = null;
    let fieldVisible = window.scrollY < window.innerHeight;
    let palette = {};

    const updatePalette = () => {
      const styles = getComputedStyle(root);
      palette = {
        accent: styles.getPropertyValue("--accent").trim(),
        warm: styles.getPropertyValue("--accent-warm").trim(),
        waveOpacity: root.dataset.theme === "dark" ? 0.72 : 0.58,
        glowOpacity: root.dataset.theme === "dark" ? 0.34 : 0.22,
      };
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = Math.min(window.innerHeight, 880);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (progress = null) => {
      context.clearRect(0, 0, width, height);

      if (progress === null) {
        return;
      }

      const mobile = width <= 760;
      const spacing = mobile ? 14 : 12;
      const pixelSize = mobile ? 3 : 4;
      const startX = spacing * 0.5;
      const startY = spacing * 0.5;
      const rows = Math.ceil(height / spacing);
      const columns = Math.ceil(width / spacing);
      const centerX = width * 0.5;
      const centerY = Math.min(height * 0.44, 390);
      const maxRadius = Math.hypot(Math.max(centerX, width - centerX), Math.max(centerY, height - centerY)) + 60;
      const radius = maxRadius * progress;
      const envelope = Math.min(1, progress / 0.1, (1 - progress) / 0.2);
      const primaryThickness = mobile ? 24 : 28;
      const echoRadius = radius - spacing * 3.5;

      if (radius > 1) {
        context.save();
        context.globalCompositeOperation = "screen";
        context.strokeStyle = palette.accent;
        context.shadowColor = palette.accent;
        context.shadowBlur = mobile ? 30 : 42;
        context.lineWidth = mobile ? 7 : 9;
        context.globalAlpha = envelope * palette.glowOpacity * 0.42;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();

        context.shadowBlur = mobile ? 16 : 22;
        context.lineWidth = 2;
        context.globalAlpha = envelope * palette.glowOpacity;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = startX + column * spacing;
          const y = startY + row * spacing;
          const variation = ((row * 29 + column * 47) % 11) / 10;
          const distance = Math.hypot(x - centerX, y - centerY);
          const primary = Math.max(0, 1 - Math.abs(distance - radius) / primaryThickness) ** 2;
          const echo = echoRadius > 0
            ? Math.max(0, 1 - Math.abs(distance - echoRadius) / (primaryThickness * 0.75)) ** 2 * 0.32
            : 0;
          const waveStrength = Math.min(1, primary + echo) * envelope;

          if (waveStrength < 0.004) {
            continue;
          }

          const warmPixel = (row * 31 + column * 17) % 251 === 0;
          const size = Math.round(pixelSize + waveStrength * 2.6);
          context.fillStyle = warmPixel ? palette.warm : palette.accent;
          context.globalAlpha = waveStrength * palette.waveOpacity * (0.72 + variation * 0.28);
          context.fillRect(Math.round(x - size * 0.5), Math.round(y - size * 0.5), size, size);
        }
      }

      const originStrength = Math.max(0, 1 - progress / 0.24) * envelope;
      context.save();
      context.fillStyle = palette.warm;
      context.shadowColor = palette.warm;
      context.shadowBlur = mobile ? 18 : 26;
      context.globalAlpha = originStrength * 0.86;
      context.fillRect(Math.round(centerX - 3), Math.round(centerY - 3), 6, 6);
      context.restore();

      context.globalAlpha = 1;
    };

    const canAnimate = () => fieldVisible && !document.hidden && !reducedMotion.matches;

    const stopRipple = () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(rippleTimer);
      animationFrame = 0;
      rippleTimer = 0;
      rippleStartedAt = 0;
      rippleProgress = null;
      draw();
    };

    const scheduleRipple = (delay = 8000 + Math.random() * 5000) => {
      clearTimeout(rippleTimer);
      rippleTimer = 0;
      if (!canAnimate()) {
        return;
      }

      rippleTimer = window.setTimeout(() => {
        rippleTimer = 0;
        rippleStartedAt = performance.now();
        animationFrame = requestAnimationFrame(animateRipple);
      }, delay);
    };

    const animateRipple = (timestamp) => {
      if (!canAnimate()) {
        stopRipple();
        return;
      }

      const duration = width <= 760 ? 2100 : 2500;
      rippleProgress = Math.min(1, (timestamp - rippleStartedAt) / duration);
      draw(rippleProgress);

      if (rippleProgress < 1) {
        animationFrame = requestAnimationFrame(animateRipple);
      } else {
        animationFrame = 0;
        rippleStartedAt = 0;
        rippleProgress = null;
        draw();
        scheduleRipple();
      }
    };

    window.addEventListener("resize", () => {
      resize();
      draw(rippleProgress);
    });
    reducedMotion.addEventListener("change", () => {
      stopRipple();
      if (!reducedMotion.matches) {
        scheduleRipple(1600);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopRipple();
      } else if (fieldVisible) {
        scheduleRipple(1200);
      }
    });
    new MutationObserver(() => {
      updatePalette();
      draw(rippleProgress);
    }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    updatePalette();
    draw();

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      fieldVisible = entry.isIntersecting && entry.intersectionRatio >= 0.12;
      if (fieldVisible) {
        scheduleRipple(1600);
      } else {
        stopRipple();
      }
    }, { threshold: [0, 0.12] });
    visibilityObserver.observe(canvas);
  };

  const createAmbientParticleField = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    canvas.className = "ambient-particle-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastFrame = 0;
    let particles = [];
    let clickPulses = [];
    let connectionStates = new Map();
    let palette = {};

    const updatePalette = () => {
      const styles = getComputedStyle(root);
      const themeProgress = Math.max(0, Math.min(1, (parseFloat(styles.getPropertyValue("--theme-progress")) || 0) / 100));
      palette = {
        accent: styles.getPropertyValue("--accent").trim(),
        warm: styles.getPropertyValue("--accent-warm").trim(),
        particleOpacity: 0.27 + themeProgress * 0.19,
        lineOpacity: 0.23 + themeProgress * 0.11,
      };
    };

    const createParticle = (mobile) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (mobile ? 5 : 6) + Math.random() * (mobile ? 7 : 10);
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: velocityX,
        vy: velocityY,
        baseVx: velocityX,
        baseVy: velocityY,
        size: 1.4 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        connectable: Math.random() < 0.86,
        warm: Math.random() < 0.08,
      };
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.4);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const mobile = width <= 760;
      const density = mobile ? 12000 : 14000;
      const minimum = mobile ? 26 : 48;
      const maximum = mobile ? 42 : 110;
      const baseCount = Math.max(minimum, Math.min(maximum, Math.round((width * height) / density)));
      const count = Math.round(baseCount * 1.5);
      particles = Array.from({ length: count }, () => createParticle(mobile));
      connectionStates = new Map();
    };

    const update = (elapsed, timestamp) => {
      const seconds = elapsed / 1000;
      const mobile = width <= 760;
      clickPulses = clickPulses.filter((pulse) => timestamp - pulse.startedAt < pulse.duration);

      particles.forEach((particle) => {
        clickPulses.forEach((pulse) => {
          const age = timestamp - pulse.startedAt;
          const radius = 10 + (age / 1000) * pulse.speed;
          const deltaX = particle.x - pulse.x;
          const deltaY = particle.y - pulse.y;
          const distance = Math.hypot(deltaX, deltaY);
          const band = mobile ? 48 : 72;
          const waveDistance = distance - radius;
          const influence = Math.exp(-(waveDistance * waveDistance) / (2 * band * band));

          if (distance > 0.01 && influence > 0.002) {
            const force = influence * pulse.strength * (mobile ? 105 : 145);
            particle.vx += (deltaX / distance) * force * seconds;
            particle.vy += (deltaY / distance) * force * seconds;
          }
        });

        const recovery = 1 - Math.exp(-seconds * 0.72);
        particle.vx += (particle.baseVx - particle.vx) * recovery;
        particle.vy += (particle.baseVy - particle.vy) * recovery;

        const currentSpeed = Math.hypot(particle.vx, particle.vy);
        const maximumSpeed = mobile ? 32 : 42;
        if (currentSpeed > maximumSpeed) {
          const speedScale = maximumSpeed / currentSpeed;
          particle.vx *= speedScale;
          particle.vy *= speedScale;
        }

        const driftX = Math.sin(timestamp * 0.00028 + particle.phase) * 1.4;
        const driftY = Math.cos(timestamp * 0.00023 + particle.phase * 1.3) * 1.2;
        particle.x += (particle.vx + driftX) * seconds;
        particle.y += (particle.vy + driftY) * seconds;

        if (particle.x <= 0 || particle.x >= width) {
          particle.x = Math.max(0, Math.min(width, particle.x));
          particle.vx *= -1;
          particle.baseVx *= -1;
        }
        if (particle.y <= 0 || particle.y >= height) {
          particle.y = Math.max(0, Math.min(height, particle.y));
          particle.vy *= -1;
          particle.baseVy *= -1;
        }
      });
    };

    const drawConnections = (elapsed, timestamp) => {
      const mobile = width <= 760;
      const maximumDistance = mobile ? 120 : 170;
      const connectionLimit = mobile ? 4 : 5;
      const candidates = [];
      const connectionCounts = new Uint8Array(particles.length);
      context.lineWidth = mobile ? 1.6 : 2.2;
      context.lineCap = "round";
      context.strokeStyle = palette.accent;
      const pulseEnergy = Math.min(1.2, clickPulses.reduce((total, pulse) => {
        const progress = Math.min(1, (timestamp - pulse.startedAt) / pulse.duration);
        return total + (1 - progress) * pulse.strength * 0.34;
      }, 0));

      connectionStates.forEach((state) => {
        state.targetOpacity = 0;
      });

      for (let firstIndex = 0; firstIndex < particles.length; firstIndex += 1) {
        const first = particles[firstIndex];
        if (!first.connectable) {
          continue;
        }

        for (let secondIndex = firstIndex + 1; secondIndex < particles.length; secondIndex += 1) {
          const second = particles[secondIndex];
          if (!second.connectable) {
            continue;
          }

          const deltaX = first.x - second.x;
          const deltaY = first.y - second.y;
          const distance = Math.hypot(deltaX, deltaY);
          if (distance >= maximumDistance) {
            continue;
          }

          const strength = (1 - distance / maximumDistance) ** 1.1;
          candidates.push({ firstIndex, secondIndex, distance, strength });
        }
      }

      candidates.sort((first, second) => first.distance - second.distance);
      candidates.forEach((candidate) => {
        const { firstIndex, secondIndex, strength } = candidate;
        if (connectionCounts[firstIndex] >= connectionLimit
          || connectionCounts[secondIndex] >= connectionLimit) {
          return;
        }

        const key = `${firstIndex}:${secondIndex}`;
        let state = connectionStates.get(key);
        if (!state) {
          state = { firstIndex, secondIndex, opacity: 0, targetOpacity: 0 };
          connectionStates.set(key, state);
        }
        state.targetOpacity = strength * palette.lineOpacity * (1 + pulseEnergy * 0.72);
        connectionCounts[firstIndex] += 1;
        connectionCounts[secondIndex] += 1;
      });

      connectionStates.forEach((state, key) => {
        if (reducedMotion.matches) {
          state.opacity = state.targetOpacity;
        } else {
          const duration = state.targetOpacity > state.opacity ? 150 : 235;
          const factor = 1 - Math.exp(-elapsed / duration);
          state.opacity += (state.targetOpacity - state.opacity) * factor;
        }

        if (state.targetOpacity === 0 && state.opacity < 0.002) {
          connectionStates.delete(key);
          return;
        }

        const first = particles[state.firstIndex];
        const second = particles[state.secondIndex];
        context.globalAlpha = state.opacity;
        context.beginPath();
        context.moveTo(first.x, first.y);
        context.lineTo(second.x, second.y);
        context.stroke();
      });
    };

    const drawParticles = (timestamp) => {
      particles.forEach((particle) => {
        let pulseGlow = 0;
        clickPulses.forEach((pulse) => {
          const progress = Math.min(1, (timestamp - pulse.startedAt) / pulse.duration);
          const radius = 10 + progress * pulse.speed * (pulse.duration / 1000);
          const distance = Math.hypot(particle.x - pulse.x, particle.y - pulse.y);
          const glow = Math.max(0, 1 - Math.abs(distance - radius) / 68) * (1 - progress);
          pulseGlow = Math.max(pulseGlow, glow * pulse.strength);
        });

        context.fillStyle = particle.warm ? palette.warm : palette.accent;
        context.globalAlpha = Math.min(0.92, palette.particleOpacity * (particle.connectable ? 1 : 0.72) + pulseGlow * 0.34);
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size + Math.min(2.4, pulseGlow * 1.6), 0, Math.PI * 2);
        context.fill();
      });
    };

    const draw = (elapsed = 1000 / 30, timestamp = performance.now()) => {
      if (root.classList.contains("is-theme-switching")) {
        updatePalette();
      }
      context.clearRect(0, 0, width, height);
      drawConnections(elapsed, timestamp);
      drawParticles(timestamp);
      context.globalAlpha = 1;
    };

    const animate = (timestamp) => {
      if (document.hidden || reducedMotion.matches) {
        animationFrame = 0;
        return;
      }

      if (!lastFrame) {
        lastFrame = timestamp;
      }
      const elapsed = timestamp - lastFrame;
      if (elapsed >= 1000 / 30) {
        const frameElapsed = Math.min(elapsed, 66);
        update(frameElapsed, timestamp);
        draw(frameElapsed, timestamp);
        lastFrame = timestamp;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    const start = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastFrame = 0;
      draw();
      if (!document.hidden && !reducedMotion.matches) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    window.addEventListener("resize", () => {
      resize();
      start();
    });
    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);
    window.addEventListener("ambient-pulse", (event) => {
      if (reducedMotion.matches) {
        return;
      }

      const detail = event.detail || {};
      const combo = Math.max(1, Math.min(6, Number(detail.combo) || 1));
      const strength = Math.max(0.8, Math.min(2.2, Number(detail.strength) || 1));
      const pulseX = Number(detail.x);
      const pulseY = Number(detail.y);
      clickPulses.push({
        x: Math.max(0, Math.min(width, Number.isFinite(pulseX) ? pulseX : width * 0.5)),
        y: Math.max(0, Math.min(height, Number.isFinite(pulseY) ? pulseY : height * 0.5)),
        startedAt: performance.now(),
        duration: 900 + combo * 55,
        maximumRadius: (width <= 760 ? 230 : 340) + combo * 18,
        speed: (width <= 760 ? 330 : 480) + combo * 24,
        strength,
        combo,
      });
      clickPulses = clickPulses.slice(-8);
    });
    new MutationObserver(() => {
      updatePalette();
      draw();
    }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    updatePalette();
    start();
  };

  if (savedTheme) {
    root.dataset.theme = savedTheme;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.dataset.theme = "dark";
  }
  root.classList.add("theme-ready");

  createAmbientParticleField();

  const playPageEntrance = () => {
    if (motionPreference.matches) {
      body.classList.remove("is-page-entering");
      return;
    }

    body.classList.add("is-page-entering");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => body.classList.remove("is-page-entering"));
    });
  };

  playPageEntrance();

  let requestedTheme = root.dataset.theme === "dark" ? "dark" : "light";
  let lastThemeClickAt = 0;
  let themeClickCombo = 0;

  const emitThemePulse = (x, y) => {
    const now = performance.now();
    themeClickCombo = now - lastThemeClickAt < 360
      ? Math.min(6, themeClickCombo + 1)
      : 1;
    lastThemeClickAt = now;

    window.dispatchEvent(new CustomEvent("ambient-pulse", {
      detail: {
        x,
        y,
        combo: themeClickCombo,
        strength: 1 + (themeClickCombo - 1) * 0.2,
      },
    }));

    return themeClickCombo;
  };

  const createThemeTransitionField = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;
    let incomingWave = null;
    let retreatingWaves = [];

    const wavePalettes = {
      light: {
        primary: "#19766e",
        secondary: "#b66a2c",
        mask: "#f7f4ed",
        maskOpacity: 0.3,
      },
      dark: {
        primary: "#7cd5c8",
        secondary: "#f0b66d",
        mask: "#101213",
        maskOpacity: 0.24,
      },
    };

    canvas.className = "theme-transition-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;
    const easeInOutCubic = (progress) => (progress < 0.5
      ? 4 * progress ** 3
      : 1 - ((-2 * progress + 2) ** 3) / 2);

    const incomingState = (wave, timestamp) => {
      const progress = clamp01((timestamp - wave.startedAt) / wave.duration);
      return {
        progress,
        radius: wave.maximumRadius * easeOutCubic(progress),
        opacity: Math.min(1, progress / 0.045, (1 - progress) / 0.16),
      };
    };

    const retreatingState = (wave, timestamp) => {
      const progress = clamp01((timestamp - wave.startedAt) / wave.duration);
      const meetingFade = wave.meetingAt
        ? 1 - clamp01((timestamp - wave.meetingAt) / 130)
        : 1;
      return {
        progress,
        radius: wave.startRadius * (1 - easeInOutCubic(progress)),
        opacity: (1 - progress) ** 0.7 * meetingFade,
      };
    };

    const drawWave = (wave, radius, opacity, retreating = false) => {
      if (radius < 0.5 || opacity <= 0.002) {
        return;
      }

      const coreOpacity = opacity * (retreating ? 0.58 : 0.82);
      context.save();
      context.lineCap = "round";

      context.fillStyle = wave.color.mask;
      context.globalAlpha = opacity * wave.color.maskOpacity * (retreating ? 0.68 : 1);
      context.beginPath();
      context.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = wave.color.primary;
      context.globalAlpha = coreOpacity * 0.1;
      context.lineWidth = retreating ? 14 : 18;
      context.beginPath();
      context.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      context.stroke();

      context.globalAlpha = coreOpacity * 0.24;
      context.lineWidth = retreating ? 5 : 7;
      context.beginPath();
      context.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      context.stroke();

      context.strokeStyle = wave.color.secondary;
      context.globalAlpha = coreOpacity * 0.34;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(wave.x, wave.y, Math.max(0.5, radius - (retreating ? 5 : 8)), 0, Math.PI * 2);
      context.stroke();

      context.strokeStyle = wave.color.primary;
      context.globalAlpha = coreOpacity;
      context.lineWidth = retreating ? 1.25 : 1.6;
      context.beginPath();
      context.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    };

    const render = (timestamp) => {
      animationFrame = 0;
      context.clearRect(0, 0, width, height);

      const activeIncoming = incomingWave && timestamp - incomingWave.startedAt < incomingWave.duration
        ? incomingWave
        : null;
      const currentIncoming = activeIncoming ? incomingState(activeIncoming, timestamp) : null;

      retreatingWaves = retreatingWaves.filter((wave) => {
        const state = retreatingState(wave, timestamp);
        if (state.progress >= 1 || state.opacity <= 0.002) {
          return false;
        }

        if (activeIncoming && currentIncoming && !wave.meetingAt) {
          const centerDistance = Math.hypot(wave.x - activeIncoming.x, wave.y - activeIncoming.y);
          const boundariesTouch = Math.abs(state.radius - currentIncoming.radius) <= centerDistance + 18
            && centerDistance <= state.radius + currentIncoming.radius + 18;
          if (boundariesTouch) {
            wave.meetingAt = timestamp;
          }
        }

        drawWave(wave, state.radius, state.opacity, true);
        return true;
      });

      if (activeIncoming && currentIncoming) {
        drawWave(activeIncoming, currentIncoming.radius, currentIncoming.opacity);
      } else {
        incomingWave = null;
      }

      if (!incomingWave && retreatingWaves.length === 0) {
        canvas.classList.remove("is-active");
        root.classList.remove("is-theme-switching");
        return;
      }

      animationFrame = requestAnimationFrame(render);
    };

    const add = (transition) => {
      const now = performance.now();
      if (incomingWave) {
        const state = incomingState(incomingWave, now);
        if (state.progress < 1 && state.radius > 1) {
          retreatingWaves.forEach((wave) => {
            if (!wave.meetingAt) {
              wave.meetingAt = now;
            }
          });
          retreatingWaves.push({
            x: incomingWave.x,
            y: incomingWave.y,
            startRadius: state.radius,
            startedAt: now,
            duration: Math.max(260, Math.min(560, 220 + state.radius * 0.24)),
            color: incomingWave.color,
            meetingAt: 0,
          });
          retreatingWaves = retreatingWaves.slice(-3);
        }
      }

      const duration = Math.max(660, Math.min(900, transition.radius * 0.52));
      incomingWave = {
        x: transition.x,
        y: transition.y,
        maximumRadius: transition.radius,
        startedAt: now,
        duration,
        color: wavePalettes[transition.nextTheme],
      };

      root.classList.add("is-theme-switching");
      canvas.classList.add("is-active");
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      render(now);
      return duration;
    };

    const finishImmediately = () => {
      incomingWave = null;
      retreatingWaves = [];
      context.clearRect(0, 0, width, height);
      canvas.classList.remove("is-active");
      root.classList.remove("is-theme-switching");
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    motionPreference.addEventListener("change", () => {
      if (motionPreference.matches) {
        finishImmediately();
      }
    });

    return { add };
  };

  const themeTransitionField = createThemeTransitionField();
  let themeTransitionSequence = 0;

  const commitTheme = (theme) => {
    root.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  };

  const switchTheme = (originX, originY) => {
    requestedTheme = requestedTheme === "dark" ? "light" : "dark";
    const nextTheme = requestedTheme;
    const x = Number.isFinite(originX) ? originX : window.innerWidth * 0.5;
    const y = Number.isFinite(originY) ? originY : window.innerHeight * 0.5;
    emitThemePulse(x, y);

    if (motionPreference.matches) {
      commitTheme(nextTheme);
      return;
    }

    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const duration = Math.max(660, Math.min(900, radius * 0.52));

    if (typeof document.startViewTransition === "function") {
      const sequence = ++themeTransitionSequence;

      root.style.setProperty("--theme-origin-x", `${x}px`);
      root.style.setProperty("--theme-origin-y", `${y}px`);
      root.style.setProperty("--theme-reveal-radius", `${radius}px`);
      root.style.setProperty("--theme-reveal-duration", `${duration}ms`);
      root.classList.add("is-theme-switching");

      const transition = document.startViewTransition(() => commitTheme(nextTheme));
      const finishTransition = () => {
        if (sequence === themeTransitionSequence) {
          root.classList.remove("is-theme-switching");
        }
      };
      transition.finished.then(finishTransition, finishTransition);
      return;
    }

    commitTheme(nextTheme);
    themeTransitionField.add({ x, y, radius, nextTheme });
  };

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const bounds = button.getBoundingClientRect();
      const originX = event.detail === 0 ? bounds.left + bounds.width * 0.5 : event.clientX;
      const originY = event.detail === 0 ? bounds.top + bounds.height * 0.5 : event.clientY;
      switchTheme(originX, originY);
    });
  });

  if (body.hasAttribute("data-theme-surface-toggle")) {
    const isThemeSurfaceTarget = (target) => target instanceof Element
      && (target.matches("body, main, .hero, .section")
        || (target === root && root.classList.contains("is-theme-switching")));

    document.addEventListener("mousedown", (event) => {
      if (event.button === 0 && event.detail > 1 && isThemeSurfaceTarget(event.target)) {
        event.preventDefault();
      }
    });

    document.addEventListener("dblclick", (event) => {
      if (isThemeSurfaceTarget(event.target)) {
        event.preventDefault();
      }
    });

    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (!isThemeSurfaceTarget(event.target)) {
        return;
      }

      switchTheme(event.clientX, event.clientY);
    });
  }

  const setLanguage = (lang) => {
    const normalized = lang === "en" ? "en" : "zh";
    root.dataset.lang = normalized;
    root.lang = normalized === "en" ? "en" : "zh-CN";
    localStorage.setItem("lang", normalized);

    document.querySelectorAll("[data-zh][data-en]").forEach((element) => {
      element.textContent = normalized === "en" ? element.dataset.en : element.dataset.zh;
    });

    document.querySelectorAll("[data-title-zh][data-title-en]").forEach((element) => {
      element.setAttribute("title", normalized === "en" ? element.dataset.titleEn : element.dataset.titleZh);
    });

    document.querySelectorAll("[data-label-zh][data-label-en]").forEach((element) => {
      element.setAttribute("aria-label", normalized === "en" ? element.dataset.labelEn : element.dataset.labelZh);
    });

    document.querySelectorAll("[data-content-zh][data-content-en]").forEach((element) => {
      element.setAttribute("content", normalized === "en" ? element.dataset.contentEn : element.dataset.contentZh);
    });

    document.querySelectorAll("[data-alt-zh][data-alt-en]").forEach((element) => {
      element.setAttribute("alt", normalized === "en" ? element.dataset.altEn : element.dataset.altZh);
    });
  };

  setLanguage(localStorage.getItem("lang") || root.dataset.lang || "en");

  document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(root.dataset.lang === "en" ? "zh" : "en");
    });
  });

  let navigationTimer = 0;

  const shouldAnimateNavigation = (link, event) => {
    if (event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || link.hasAttribute("download")
      || link.target === "_blank") {
      return false;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      return false;
    }

    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.href === location.href) {
      return false;
    }

    const fileName = destination.pathname.split("/").pop();
    return !fileName || fileName.endsWith(".html");
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    const link = target instanceof Element ? target.closest("a[href]") : null;
    if (!link || !shouldAnimateNavigation(link, event) || motionPreference.matches) {
      return;
    }

    event.preventDefault();
    if (navigationTimer) {
      return;
    }

    body.classList.add("is-page-leaving");
    navigationTimer = window.setTimeout(() => {
      location.assign(link.href);
    }, 220);
  });

  window.addEventListener("pageshow", (event) => {
    clearTimeout(navigationTimer);
    navigationTimer = 0;
    body.classList.remove("is-page-leaving");
    if (event.persisted) {
      playPageEntrance();
    }
  });

  const currentPath = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach((link) => {
    const linkPath = link.getAttribute("href").split("/").pop();
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });

  const progress = document.querySelector("[data-reading-progress]");
  if (progress) {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  const filterButtons = document.querySelectorAll("[data-filter]");
  const posts = document.querySelectorAll("[data-post-list] .post-row");
  if (filterButtons.length && posts.length) {
    const applyFilter = (tag) => {
      posts.forEach((post) => {
        const tags = (post.dataset.tags || "").split("|").map((item) => item.trim()).filter(Boolean);
        const visible = tag === "all" || tags.includes(tag);
        post.hidden = !visible;
        post.style.display = visible ? "" : "none";
      });
      filterButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.filter === tag);
      });
    };

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.filter));
    });

    const initialTag = new URLSearchParams(location.search).get("tag");
    if (initialTag) {
      applyFilter(initialTag);
    }
  }
})();
