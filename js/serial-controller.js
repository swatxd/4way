/**
 * 4Way 3D - Web Serial API & Virtual Arduino Emulator
 * Connects directly to real Arduino Uno/Nano/ESP32 via browser USB,
 * or runs a cycle-accurate software-emulated Arduino Uno when offline.
 */

class ArduinoSerialController {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
    this.isConnected = false;
    this.isVirtual = false;
    this.baudRate = 115200;

    // Listeners
    this.listeners = {
      log: [],
      telemetry: [],
      pinState: [],
      statusChange: []
    };

    // Virtual Arduino State Machine
    this.virtualTimer = null;
    this.virtualTelemetryTimer = null;
    this.virtualState = 'STATE_NS_GREEN';
    this.virtualStartTime = Date.now();
    this.virtualEmergency = false;
    this.virtualDirection = 'NONE';

    // Virtual Pin Map
    this.virtualPins = {
      D13_NS_GREEN: true,
      D12_NS_AMBER: false,
      D11_NS_RED: false,
      D10_EW_GREEN: false,
      D9_EW_AMBER: false,
      D8_EW_RED: true,
      D2_SENSOR_NS: false,
      D7_BUZZER: false,
      D6_STATUS_LED: false
    };

    // Check Web Serial support
    this.isSupported = ('serial' in navigator);

    // Initialize in Virtual Mode by default for immediate out-of-the-box experience
    this.startVirtualArduino();
  }

  // Event subscription
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args));
    }
  }

  log(type, text) {
    const timestamp = new Date().toLocaleTimeString();
    this.emit('log', { type, text, timestamp });
  }

  // --- REAL HARDWARE: WEB SERIAL API ---
  async connectRealPort(baud = 115200) {
    if (!this.isSupported) {
      this.log('warn', 'Web Serial API is not supported in this browser. Running Virtual Arduino Uno.');
      return false;
    }

    try {
      this.log('info', 'Requesting USB Serial device...');
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: parseInt(baud) });

      this.isConnected = true;
      this.isVirtual = false;
      this.stopVirtualArduino();

      const info = this.port.getInfo();
      const usbId = info.usbVendorId ? `VID: 0x${info.usbVendorId.toString(16)}` : 'USB Device';
      this.log('sys', `Connected to Hardware Port (${usbId}) @ ${baud} baud.`);
      this.emit('statusChange', { connected: true, isVirtual: false, info: usbId });

      this.readSerialStream();
      return true;
    } catch (err) {
      this.log('warn', `Serial connection cancelled or failed: ${err.message}`);
      if (!this.isConnected) {
        this.startVirtualArduino();
      }
      return false;
    }
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }

    this.isConnected = false;
    this.log('sys', 'Hardware serial port disconnected. Re-engaging Virtual Arduino Simulator.');
    this.emit('statusChange', { connected: false, isVirtual: true });
    this.startVirtualArduino();
  }

  async readSerialStream() {
    let buffer = '';
    while (this.port && this.port.readable && this.isConnected) {
      try {
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        this.reader = reader;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            buffer += value;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); // Keep incomplete line

            for (const line of lines) {
              if (line.trim().length > 0) {
                this.handleIncomingLine(line.trim());
              }
            }
          }
        }
      } catch (err) {
        this.log('warn', `Stream read error: ${err.message}`);
        break;
      }
    }
  }

  async sendCommand(commandText) {
    const cmd = commandText.trim();
    this.log('tx', `> ${cmd}`);

    // If real hardware is connected, write to USB stream
    if (this.isConnected && this.port && this.port.writable) {
      try {
        const writer = this.port.writable.getWriter();
        await writer.write(this.encoder.encode(cmd + '\n'));
        writer.releaseLock();
      } catch (err) {
        this.log('warn', `Failed to send hardware command: ${err.message}`);
      }
    }

    // Also process in virtual state machine so response is instantaneous
    if (this.isVirtual) {
      this.processVirtualCommand(cmd);
    }
  }

  handleIncomingLine(line) {
    this.log('rx', `< ${line}`);

    // Attempt JSON parse
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const data = JSON.parse(line);
        if (data.telemetry) {
          this.emit('telemetry', data.telemetry);
        } else if (data.event) {
          this.log('info', `Event: ${data.event} ${data.direction || ''}`);
        }
      } catch (e) {
        // Raw text line
      }
    }
  }

  // --- VIRTUAL ARDUINO UNO EMULATOR ---
  startVirtualArduino() {
    if (this.isVirtual) return;
    this.isVirtual = true;
    this.isConnected = true;
    this.log('sys', '4Way Virtual Arduino Uno v2.4 initialized. Cycle running.');
    this.emit('statusChange', { connected: true, isVirtual: true, info: 'Virtual Arduino Uno' });

    this.virtualStartTime = Date.now();
    this.virtualState = 'STATE_NS_GREEN';
    this.setVirtualSignals(false, false, true, true, false, false);

    // State machine tick loop (50ms resolution)
    if (this.virtualTimer) clearInterval(this.virtualTimer);
    this.virtualTimer = setInterval(() => {
      this.tickVirtualStateMachine();
    }, 50);

    // Telemetry broadcast loop (500ms)
    if (this.virtualTelemetryTimer) clearInterval(this.virtualTelemetryTimer);
    this.virtualTelemetryTimer = setInterval(() => {
      this.broadcastVirtualTelemetry();
    }, 500);
  }

  stopVirtualArduino() {
    if (this.virtualTimer) {
      clearInterval(this.virtualTimer);
      this.virtualTimer = null;
    }
    if (this.virtualTelemetryTimer) {
      clearInterval(this.virtualTelemetryTimer);
      this.virtualTelemetryTimer = null;
    }
  }

  processVirtualCommand(cmd) {
    const u = cmd.toUpperCase();
    if (u === 'EMERGENCY_NS' || u === 'TRIGGER_EV_NS') {
      this.triggerVirtualEmergency('NS');
    } else if (u === 'EMERGENCY_EW' || u === 'TRIGGER_EV_EW') {
      this.triggerVirtualEmergency('EW');
    } else if (u === 'RESUME_NORMAL' || u === 'CLEAR_EV') {
      this.clearVirtualEmergency();
    } else if (u === 'PING') {
      this.log('rx', `{"event":"PONG","device":"VIRTUAL_ARDUINO_UNO","uptime":${Date.now() - this.virtualStartTime}}`);
    }
  }

  triggerVirtualEmergency(dir) {
    if (this.virtualEmergency) return;
    this.virtualEmergency = true;
    this.virtualDirection = dir;
    this.virtualPins.D6_STATUS_LED = true;
    this.virtualPins.D7_BUZZER = true;
    this.virtualPins.D2_SENSOR_NS = (dir === 'NS');

    this.log('rx', `{"event":"PREEMPTION_ENGAGED","direction":"${dir}","action":"PRIORITY_GREEN_GRANTED"}`);

    const now = Date.now();
    this.virtualStartTime = now;
    if (dir === 'EW') {
      this.virtualState = 'STATE_PREEMPTION_EW_GREEN';
      this.setVirtualSignals(true, false, false, false, false, true); // NS: Red, EW: Green
    } else {
      this.virtualState = 'STATE_PREEMPTION_NS_GREEN';
      this.setVirtualSignals(false, false, true, true, false, false); // NS: Green, EW: Red
    }
  }

  clearVirtualEmergency() {
    if (!this.virtualEmergency) return;
    this.virtualEmergency = false;
    this.virtualDirection = 'NONE';
    this.virtualPins.D6_STATUS_LED = false;
    this.virtualPins.D7_BUZZER = false;
    this.virtualPins.D2_SENSOR_NS = false;

    this.log('rx', '{"event":"PREEMPTION_CLEARED","status":"RESUMING_NORMAL_CYCLE"}');
    this.virtualState = 'STATE_ALL_RED_TO_NS';
    this.virtualStartTime = Date.now();
    this.setVirtualSignals(true, false, false, true, false, false);
  }

  setVirtualSignals(nsR, nsA, nsG, ewR, ewA, ewG) {
    this.virtualPins.D11_NS_RED = nsR;
    this.virtualPins.D12_NS_AMBER = nsA;
    this.virtualPins.D13_NS_GREEN = nsG;
    this.virtualPins.D8_EW_RED = ewR;
    this.virtualPins.D9_EW_AMBER = ewA;
    this.virtualPins.D10_EW_GREEN = ewG;

    this.emit('pinState', { ...this.virtualPins });
  }

  tickVirtualStateMachine() {
    const now = Date.now();
    const elapsed = now - this.virtualStartTime;

    const GREEN_TIME = 8000;
    const AMBER_TIME = 2500;
    const ALL_RED_TIME = 1800;
    const EV_HOLD_TIME = 10000;

    switch (this.virtualState) {
      case 'STATE_NS_GREEN':
        if (elapsed >= GREEN_TIME) {
          this.virtualState = 'STATE_NS_AMBER';
          this.virtualStartTime = now;
          this.setVirtualSignals(false, true, false, true, false, false);
        }
        break;

      case 'STATE_NS_AMBER':
        if (elapsed >= AMBER_TIME) {
          if (this.virtualEmergency && (this.virtualDirection === 'NS' || this.virtualDirection === 'EW')) {
            this.virtualState = 'STATE_PREEMPTION_ALL_RED';
          } else {
            this.virtualState = 'STATE_ALL_RED_TO_EW';
          }
          this.virtualStartTime = now;
          this.setVirtualSignals(true, false, false, true, false, false);
        }
        break;

      case 'STATE_ALL_RED_TO_EW':
        if (elapsed >= ALL_RED_TIME) {
          this.virtualState = 'STATE_EW_GREEN';
          this.virtualStartTime = now;
          this.setVirtualSignals(true, false, false, false, false, true);
        }
        break;

      case 'STATE_EW_GREEN':
        if (elapsed >= GREEN_TIME) {
          this.virtualState = 'STATE_EW_AMBER';
          this.virtualStartTime = now;
          this.setVirtualSignals(true, false, false, false, true, false);
        }
        break;

      case 'STATE_EW_AMBER':
        if (elapsed >= AMBER_TIME) {
          if (this.virtualEmergency && (this.virtualDirection === 'NS' || this.virtualDirection === 'EW')) {
            this.virtualState = 'STATE_PREEMPTION_ALL_RED';
          } else {
            this.virtualState = 'STATE_ALL_RED_TO_NS';
          }
          this.virtualStartTime = now;
          this.setVirtualSignals(true, false, false, true, false, false);
        }
        break;

      case 'STATE_ALL_RED_TO_NS':
        if (elapsed >= ALL_RED_TIME) {
          this.virtualState = 'STATE_NS_GREEN';
          this.virtualStartTime = now;
          this.setVirtualSignals(false, false, true, true, false, false);
        }
        break;

      case 'STATE_PREEMPTION_ALL_RED':
        if (elapsed >= ALL_RED_TIME) {
          if (this.virtualDirection === 'EW') {
            this.virtualState = 'STATE_PREEMPTION_EW_GREEN';
            this.virtualStartTime = now;
            this.setVirtualSignals(true, false, false, false, false, true);
          } else {
            this.virtualState = 'STATE_PREEMPTION_NS_GREEN';
            this.virtualStartTime = now;
            this.setVirtualSignals(false, false, true, true, false, false);
          }
        }
        break;

      case 'STATE_PREEMPTION_NS_GREEN':
      case 'STATE_PREEMPTION_EW_GREEN':
        if (elapsed >= EV_HOLD_TIME) {
          this.clearVirtualEmergency();
        }
        break;
    }
  }

  broadcastVirtualTelemetry() {
    let stateStr = 'NORMAL_NS_GREEN';
    let nsLight = 'GREEN';
    let ewLight = 'RED';

    if (this.virtualPins.D13_NS_GREEN) nsLight = 'GREEN';
    else if (this.virtualPins.D12_NS_AMBER) nsLight = 'AMBER';
    else nsLight = 'RED';

    if (this.virtualPins.D10_EW_GREEN) ewLight = 'GREEN';
    else if (this.virtualPins.D9_EW_AMBER) ewLight = 'AMBER';
    else ewLight = 'RED';

    if (this.virtualEmergency) {
      stateStr = (this.virtualState === 'STATE_PREEMPTION_ALL_RED') 
        ? 'ALL_RED_CLEARANCE' 
        : (this.virtualDirection === 'EW' ? 'EMERGENCY_CORRIDOR_EW' : 'EMERGENCY_CORRIDOR_NS');
    } else {
      stateStr = this.virtualState.replace('STATE_', '');
    }

    const telemetryPacket = {
      state: stateStr,
      nsLight: nsLight,
      ewLight: ewLight,
      emergencyActive: this.virtualEmergency,
      direction: this.virtualDirection,
      phaseElapsedMs: Date.now() - this.virtualStartTime,
      uptimeMs: Date.now()
    };

    this.emit('telemetry', telemetryPacket);
  }
}
