/**
 * 4Way 3D - Main Application Engine & UI Orchestrator
 * Integrates Three.js 3D simulation, Web Serial hardware controller,
 * Web Audio emergency siren synthesizer, and SPA page navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D Traffic Simulation
  const sim = new TrafficSimulation3D('traffic3dCanvas');

  // 2. Initialize Web Serial & Virtual Arduino Controller
  const serial = new ArduinoSerialController();

  // 3. Audio Synthesizer (Realistic Emergency Vehicle Siren)
  const sirenSynth = new EmergencySirenAudio();

  // 4. State Tracking
  let currentMetrics = {
    corridorClearanceSpeed: 44, // km/h
    carsWaitingQueue: 5,
    preemptionLatency: 142, // ms
    co2SavedKg: 12.4
  };

  // ---------------------------------------------------------
  // OPENING WEBSITE BOOT TRANSITION CONTROLLER
  // ---------------------------------------------------------
  const introCurtain = document.getElementById('siteIntroCurtain');
  const introProgressFill = document.getElementById('introProgressFill');
  const introStepLabel = document.getElementById('introStepLabel');
  const introPercentLabel = document.getElementById('introPercentLabel');
  const introEnterBtn = document.getElementById('introEnterBtn');

  let introDismissed = false;

  function dismissIntroCurtain() {
    if (introDismissed || !introCurtain) return;
    introDismissed = true;
    introCurtain.classList.add('dismissed');
    setTimeout(() => {
      if (introCurtain.parentElement) {
        introCurtain.style.display = 'none';
      }
    }, 750);
  }

  if (introCurtain) {
    let progress = 0;
    const steps = [
      { at: 20, text: 'CALIBRATING 4-WAY INTERSECTION SENSORS...' },
      { at: 45, text: 'SYNCHRONIZING WEB SERIAL ARDUINO DRIVER...' },
      { at: 70, text: 'COMPUTING REAL-TIME 3D SPATIAL MATRICES...' },
      { at: 90, text: 'ARMING DIRECTIONAL PRIORITY GREEN INTERLOCK...' },
      { at: 100, text: 'SYSTEM READY // ENTERING WORKSPACE...' }
    ];

    const introInterval = setInterval(() => {
      if (introDismissed) {
        clearInterval(introInterval);
        return;
      }
      progress += Math.floor(Math.random() * 6) + 4;
      if (progress >= 100) {
        progress = 100;
        clearInterval(introInterval);
        if (introProgressFill) introProgressFill.style.width = '100%';
        if (introPercentLabel) introPercentLabel.textContent = '100%';
        if (introStepLabel) introStepLabel.textContent = 'SYSTEM READY // ENTERING WORKSPACE...';
        setTimeout(dismissIntroCurtain, 400);
      } else {
        if (introProgressFill) introProgressFill.style.width = `${progress}%`;
        if (introPercentLabel) introPercentLabel.textContent = `${progress}%`;
        const matched = steps.find(s => progress <= s.at);
        if (matched && introStepLabel) introStepLabel.textContent = matched.text;
      }
    }, 45);

    if (introEnterBtn) {
      introEnterBtn.addEventListener('click', dismissIntroCurtain);
    }
  }

  // ---------------------------------------------------------
  // SPA ROUTING & NAVIGATION
  // ---------------------------------------------------------
  const navLinks = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.spa-page');
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  function switchPage(targetPageId) {
    pages.forEach(p => {
      if (p.id === targetPageId) {
        p.classList.add('active-page');
      } else {
        p.classList.remove('active-page');
      }
    });

    navLinks.forEach(link => {
      if (link.getAttribute('href') === `#${targetPageId.replace('Page', '')}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile menu if open
    if (navMenu) navMenu.classList.remove('open');

    // Trigger canvas resize if switching to home
    if (targetPageId === 'homePage') {
      setTimeout(() => {
        if (sim && sim.container) {
          const w = sim.container.clientWidth;
          const h = sim.container.clientHeight;
          sim.renderer.setSize(w, h);
          sim.camera.aspect = w / h;
          sim.camera.updateProjectionMatrix();
        }
      }, 50);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Handle URL hash changes
  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const pageId = `${hash}Page`;
    if (document.getElementById(pageId)) {
      switchPage(pageId);
    } else {
      switchPage('homePage');
    }
  }

  window.addEventListener('hashchange', handleHash);
  handleHash();

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // Sticky header blur effect
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (header) {
      if (window.scrollY > 30) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  });

  // ---------------------------------------------------------
  // EMERGENCY PREEMPTION TRIGGER & SYNC
  // ---------------------------------------------------------
  const btnTrigger = document.getElementById('btnEmergencyTrigger');
  const btnClear = document.getElementById('btnResetCycle');
  const alertBanner = document.getElementById('alertBanner');
  const alertSirenIcon = document.getElementById('alertSirenIcon');
  const emergencyStatusText = document.getElementById('emergencyStatusText');

  function engageEmergency() {
    const approachDir = sim.approachDirection || 'NORTH';
    const targetCorridor = (approachDir === 'NORTH' || approachDir === 'SOUTH') ? 'NS' : 'EW';
    const corridorLabel = targetCorridor === 'EW' ? 'EAST-WEST' : 'NORTH-SOUTH';

    // Send direction-specific hardware command
    serial.sendCommand(targetCorridor === 'EW' ? 'EMERGENCY_EW' : 'EMERGENCY_NS');
    sim.triggerEmergencyPreemption(approachDir);
    sirenSynth.start();

    if (btnTrigger) {
      btnTrigger.classList.add('engaged');
      btnTrigger.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>CORRIDOR CLEARED [RESUME CYCLE]</span>
      `;
    }

    if (alertBanner) alertBanner.classList.remove('inactive');
    if (alertSirenIcon) alertSirenIcon.classList.add('active');
    if (emergencyStatusText) {
      emergencyStatusText.textContent = `AMBULANCE APPROACHING FROM ${approachDir} // ${corridorLabel} PRIORITY GREEN GRANTED`;
    }

    updateGlobalHardwareStatus(true, true);
    showToast(`🚨 Priority Corridor: ${corridorLabel} Green Interlock engaged for ${approachDir} approach!`, 'alert');
  }

  function disengageEmergency() {
    const approachDir = sim.approachDirection || 'NORTH';
    const targetCorridor = (approachDir === 'NORTH' || approachDir === 'SOUTH') ? 'N-S' : 'E-W';

    serial.sendCommand('RESUME_NORMAL');
    sim.clearEmergencyPreemption();
    sirenSynth.stop();

    if (btnTrigger) {
      btnTrigger.classList.remove('engaged');
      btnTrigger.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>DISPATCH RESCUE 101 [${approachDir} ➔ ${targetCorridor} GREEN]</span>
      `;
    }

    if (alertBanner) alertBanner.classList.add('inactive');
    if (alertSirenIcon) alertSirenIcon.classList.remove('active');
    if (emergencyStatusText) emergencyStatusText.textContent = 'MONITORING INTERSECTION // EVPS ARDUINO ACTIVE';

    updateGlobalHardwareStatus(true, false);
    showToast('Traffic Preemption Cleared: Resuming standard smart signal cycle.', 'info');
  }

  // ---------------------------------------------------------
  // APPROACH DIRECTION SELECTOR (NORTH, SOUTH, WEST, EAST)
  // ---------------------------------------------------------
  const approachButtons = document.querySelectorAll('#approachSelector .pill-btn');
  approachButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      approachButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dir = btn.dataset.approach;
      sim.setApproachDirection(dir);

      const corridor = (dir === 'NORTH' || dir === 'SOUTH') ? 'N-S' : 'E-W';
      if (btnTrigger && !sim.emergencyActive) {
        btnTrigger.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span>DISPATCH RESCUE 101 [${dir} ➔ ${corridor} GREEN]</span>
        `;
      }
      showToast(`Approach Vector: ${dir} Corridor Armed (${corridor} Green)`, 'info');
    });
  });

  if (btnTrigger) {
    btnTrigger.addEventListener('click', () => {
      if (sim.emergencyActive) {
        disengageEmergency();
      } else {
        engageEmergency();
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      disengageEmergency();
    });
  }

  // Event from 3D scene when ambulance passes intersection safely
  window.addEventListener('emergencyCorridorCleared', () => {
    showToast('Ambulance safely crossed intersection. Corridor preemption completed.', 'success');
    disengageEmergency();
  });

  // ---------------------------------------------------------
  // CAMERA VIEW SWITCHER
  // ---------------------------------------------------------
  const camButtons = document.querySelectorAll('.cam-btn');
  camButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      camButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.cam;
      sim.setCameraMode(mode);
      showToast(`Switched Camera: ${mode} View`, 'info');
    });
  });

  // ---------------------------------------------------------
  // ENVIRONMENT LIGHTING (Time of Day)
  // ---------------------------------------------------------
  const envButtons = document.querySelectorAll('.pill-btn');
  envButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      envButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const time = btn.dataset.env;
      sim.setTimeOfDay(time);
    });
  });

  // ---------------------------------------------------------
  // AUDIO TOGGLE (MUTE / UNMUTE)
  // ---------------------------------------------------------
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  if (btnAudioToggle) {
    btnAudioToggle.addEventListener('click', () => {
      const isMuted = sirenSynth.toggleMute();
      btnAudioToggle.classList.toggle('active', !isMuted);
      btnAudioToggle.innerHTML = isMuted ? `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/></svg>
      ` : `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      `;
      showToast(isMuted ? 'Emergency Siren Audio Muted' : 'Emergency Siren Audio Enabled', 'info');
    });
  }

  // ---------------------------------------------------------
  // SERIAL TELEMETRY & HARDWARE INTEGRATION
  // ---------------------------------------------------------
  const btnConnectNav = document.getElementById('btnHardwareStatusNav');
  const btnConnectDev = document.getElementById('btnConnectSerial');
  const baudSelect = document.getElementById('baudSelect');
  const terminalScreen = document.getElementById('terminalScreen');
  const terminalInput = document.getElementById('terminalInput');
  const btnSendSerial = document.getElementById('btnSendSerial');
  const btnClearLog = document.getElementById('btnClearLog');

  // Lamp elements
  const lampNsRed = document.getElementById('lampNsRed');
  const lampNsAmber = document.getElementById('lampNsAmber');
  const lampNsGreen = document.getElementById('lampNsGreen');
  const lampEwRed = document.getElementById('lampEwRed');
  const lampEwAmber = document.getElementById('lampEwAmber');
  const lampEwGreen = document.getElementById('lampEwGreen');
  const textNsState = document.getElementById('textNsState');
  const textEwState = document.getElementById('textEwState');

  // Bento metric DOM nodes
  const valResponseReduction = document.getElementById('valResponseReduction');
  const valClearanceSpeed = document.getElementById('valClearanceSpeed');
  const valLatency = document.getElementById('valLatency');
  const valQueueLength = document.getElementById('valQueueLength');

  function updateGlobalHardwareStatus(connected, emergency) {
    const dots = document.querySelectorAll('.status-dot');
    const label = document.getElementById('hardwareStatusLabel');

    dots.forEach(dot => {
      dot.classList.remove('disconnected', 'emergency');
      if (!connected) {
        dot.classList.add('disconnected');
      } else if (emergency) {
        dot.classList.add('emergency');
      }
    });

    if (label) {
      if (emergency) {
        label.textContent = 'EVPS PREEMPTION ENGAGED';
      } else if (connected) {
        label.textContent = serial.isVirtual ? 'ARDUINO SIMULATOR ONLINE' : 'USB ARDUINO CONNECTED';
      } else {
        label.textContent = 'HARDWARE OFFLINE';
      }
    }
  }

  // Handle Serial Terminal Logs
  serial.on('log', (logEntry) => {
    if (!terminalScreen) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${logEntry.type}`;
    line.textContent = `[${logEntry.timestamp}] ${logEntry.text}`;
    terminalScreen.appendChild(line);
    terminalScreen.scrollTop = terminalScreen.scrollHeight;
  });

  // Handle Telemetry from Arduino (Real or Virtual)
  serial.on('telemetry', (telemetry) => {
    // 1. Sync 3D Simulation Phase
    sim.setPhase(telemetry.state);

    // 2. Sync HUD Lamp Bulbs
    if (lampNsRed && lampNsAmber && lampNsGreen) {
      lampNsRed.classList.toggle('active', telemetry.nsLight === 'RED');
      lampNsAmber.classList.toggle('active', telemetry.nsLight === 'AMBER');
      lampNsGreen.classList.toggle('active', telemetry.nsLight === 'GREEN');
      textNsState.textContent = telemetry.nsLight;
      textNsState.className = `signal-state-badge ${telemetry.nsLight.toLowerCase()}`;
    }

    if (lampEwRed && lampEwAmber && lampEwGreen) {
      lampEwRed.classList.toggle('active', telemetry.ewLight === 'RED');
      lampEwAmber.classList.toggle('active', telemetry.ewLight === 'AMBER');
      lampEwGreen.classList.toggle('active', telemetry.ewLight === 'GREEN');
      textEwState.textContent = telemetry.ewLight;
      textEwState.className = `signal-state-badge ${telemetry.ewLight.toLowerCase()}`;
    }

    // 3. Update Bento Live Telemetry metrics
    if (telemetry.emergencyActive) {
      currentMetrics.corridorClearanceSpeed = 58;
      currentMetrics.carsWaitingQueue = Math.max(0, currentMetrics.carsWaitingQueue - 1);
      currentMetrics.preemptionLatency = 98;
    } else {
      currentMetrics.corridorClearanceSpeed = 36;
      currentMetrics.preemptionLatency = 142;
    }

    if (valClearanceSpeed) valClearanceSpeed.textContent = currentMetrics.corridorClearanceSpeed;
    if (valLatency) valLatency.textContent = currentMetrics.preemptionLatency;
  });

  // Handle Pin State Updates for Virtual Arduino visualizer
  serial.on('pinState', (pins) => {
    updateVirtualArduinoPins(pins);
  });

  function updateVirtualArduinoPins(pins) {
    const setLed = (id, active, colorClass) => {
      const el = document.getElementById(id);
      if (el) {
        el.className = `led ${active ? colorClass : ''}`;
      }
    };

    setLed('pinD13', pins.D13_NS_GREEN, 'active-green');
    setLed('pinD12', pins.D12_NS_AMBER, 'active-amber');
    setLed('pinD11', pins.D11_NS_RED, 'active-red');
    setLed('pinD10', pins.D10_EW_GREEN, 'active-green');
    setLed('pinD9', pins.D9_EW_AMBER, 'active-amber');
    setLed('pinD8', pins.D8_EW_RED, 'active-red');
    setLed('pinD2', pins.D2_SENSOR_NS, 'active-blue');
    setLed('pinD7', pins.D7_BUZZER, 'active-red');
    setLed('pinD6', pins.D6_STATUS_LED, 'active-blue');
  }

  // Web Serial Connect Trigger
  async function handleHardwareConnect() {
    if (serial.isConnected && !serial.isVirtual) {
      await serial.disconnect();
      if (btnConnectDev) {
        btnConnectDev.classList.remove('connected');
        btnConnectDev.textContent = 'Connect USB Arduino';
      }
    } else {
      const baud = baudSelect ? baudSelect.value : 115200;
      const success = await serial.connectRealPort(baud);
      if (success) {
        showToast('Arduino Hardware connected via Web Serial API!', 'success');
        if (btnConnectDev) {
          btnConnectDev.classList.add('connected');
          btnConnectDev.textContent = 'Disconnect USB Device';
        }
      }
    }
  }

  if (btnConnectNav) {
    btnConnectNav.addEventListener('click', () => {
      // Jump to Development tab or connect directly
      window.location.hash = '#development';
    });
  }

  if (btnConnectDev) {
    btnConnectDev.addEventListener('click', handleHardwareConnect);
  }

  // Send Manual Serial Command
  function sendManualCommand() {
    if (!terminalInput) return;
    const cmd = terminalInput.value.trim();
    if (cmd.length > 0) {
      serial.sendCommand(cmd);
      terminalInput.value = '';
    }
  }

  if (btnSendSerial) btnSendSerial.addEventListener('click', sendManualCommand);
  if (terminalInput) {
    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendManualCommand();
    });
  }

  if (btnClearLog && terminalScreen) {
    btnClearLog.addEventListener('click', () => {
      terminalScreen.innerHTML = '';
      serial.log('sys', 'Terminal log cleared.');
    });
  }

  // ---------------------------------------------------------
  // CODE VIEWER (COPY & DOWNLOAD .INO)
  // ---------------------------------------------------------
  const btnCopyCode = document.getElementById('btnCopyCode');
  const btnDownloadCode = document.getElementById('btnDownloadCode');
  const codeBlock = document.getElementById('arduinoCodeContent');

  if (btnCopyCode && codeBlock) {
    btnCopyCode.addEventListener('click', () => {
      navigator.clipboard.writeText(codeBlock.textContent).then(() => {
        showToast('Arduino C++ code copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy code. Please copy manually.', 'warn');
      });
    });
  }

  if (btnDownloadCode && codeBlock) {
    btnDownloadCode.addEventListener('click', () => {
      const blob = new Blob([codeBlock.textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'traffic_emergency_controller.ino';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Downloaded traffic_emergency_controller.ino', 'success');
    });
  }

  // ---------------------------------------------------------
  // FAQ ACCORDION (CONTACT PAGE)
  // ---------------------------------------------------------
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    }
  });

  // ---------------------------------------------------------
  // CONTACT FORM SUBMISSION
  // ---------------------------------------------------------
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName')?.value;
      showToast(`Thank you, ${name || 'Researcher'}! Your pilot inquiry has been logged.`, 'success');
      contactForm.reset();
    });
  }

  // ---------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ---------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    // Avoid triggering when user is typing in form or terminal
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    // Dismiss intro curtain if still active
    if (!introDismissed && introCurtain) {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        dismissIntroCurtain();
        return;
      }
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (sim.emergencyActive) {
        disengageEmergency();
      } else {
        engageEmergency();
      }
    } else if (e.key === 'c' || e.key === 'C') {
      // Cycle camera
      const modes = ['DRONE', 'DRIVER', 'CCTV', 'FREE'];
      const currentIndex = modes.indexOf(sim.activeCameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      const nextMode = modes[nextIndex];
      sim.setCameraMode(nextMode);
      camButtons.forEach(b => b.classList.toggle('active', b.dataset.cam === nextMode));
      showToast(`Camera: ${nextMode}`, 'info');
    } else if (e.key === 'm' || e.key === 'M') {
      if (btnAudioToggle) btnAudioToggle.click();
    } else if (e.key === '1') {
      const btn = document.querySelector('#approachSelector [data-approach="NORTH"]');
      if (btn) btn.click();
    } else if (e.key === '2') {
      const btn = document.querySelector('#approachSelector [data-approach="WEST"]');
      if (btn) btn.click();
    } else if (e.key === '3') {
      const btn = document.querySelector('#approachSelector [data-approach="SOUTH"]');
      if (btn) btn.click();
    } else if (e.key === '4') {
      const btn = document.querySelector('#approachSelector [data-approach="EAST"]');
      if (btn) btn.click();
    } else if (e.key === 'x' || e.key === 'X') {
      if (sim && sim.emergencyVehicle) {
        sim.emergencyVehicle.mesh.rotation.y += Math.PI;
        showToast('Ambulance Heading Flipped 180°', 'info');
      }
    }
  });

  // Initial greeting toast
  setTimeout(() => {
    showToast('4Way 3D Online • Web Serial IoT Connected', 'info');
  }, 800);
});

// -----------------------------------------------------------
// WEB AUDIO API - EMERGENCY SIREN SYNTHESIZER
// -----------------------------------------------------------
class EmergencySirenAudio {
  constructor() {
    this.ctx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.sweepInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  start() {
    if (this.isMuted || this.isPlaying) return;
    this.init();

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.oscillator = this.ctx.createOscillator();
    this.gainNode = this.ctx.createGain();

    this.oscillator.type = 'sawtooth';
    this.gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);

    // Realistic European/US Emergency Siren Yelp Frequency Sweep (650Hz to 1250Hz)
    let freq = 650;
    let direction = 1;
    this.oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);

    this.sweepInterval = setInterval(() => {
      if (!this.isPlaying || !this.oscillator) return;
      freq += direction * 45;
      if (freq >= 1200) direction = -1;
      if (freq <= 650) direction = 1;
      this.oscillator.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    }, 35);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    this.oscillator.start();
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }

    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }

    setTimeout(() => {
      if (this.oscillator) {
        try {
          this.oscillator.stop();
          this.oscillator.disconnect();
        } catch (e) {}
        this.oscillator = null;
      }
    }, 100);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isPlaying) {
      this.stop();
    }
    return this.isMuted;
  }
}

// -----------------------------------------------------------
// TOAST NOTIFICATION UTILITY
// -----------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  `;
  if (type === 'success') {
    icon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    `;
  } else if (type === 'alert') {
    icon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    `;
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInToast 0.3s ease reverse forwards';
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 4000);
}
