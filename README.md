# 4Way 3D — Automatic Emergency Vehicle Traffic Priority System (EVPS)

> A modern, cyber-glassmorphic 3D web platform & IoT hardware controller that automatically switches traffic lights from Red to Green when an emergency vehicle is stuck in traffic.

Built using **Three.js**, **Web Serial API**, **Web Audio API**, and **UI/UX Pro Max** design intelligence with clean Vanilla CSS & JavaScript.

---

## 🌟 Key Features

1. **Interactive 3D Traffic Intersection (Home Page)**:
   - **Real-time WebGL 3D Simulation**: Complete 4-way metropolitan junction featuring asphalt textures, lane dividers, double yellow markings, pedestrian crosswalks, curbs, and cybernetic skyscrapers.
   - **4 Synchronized Traffic Light Gantries**: High-mast poles with Red, Amber, and Green signal heads, powered by dynamic Three.js `PointLight` emitters and lens flares.
   - **Autonomous Vehicular Flow & AI**: Civilian sedans, hatchbacks, and SUVs obey traffic signals, brake at stop lines, and pull over when an emergency vehicle approaches.
   - **Rescue 101 Ambulance Simulation**:
     - Realistic ambulance model with medical decals, headlights, and dual alternating roof strobes (Red & Blue high-intensity beacons).
     - **Emergency Preemption Routine**: Triggers Amber cushion, 1.8-second All-Red safety clearance buffer, and grants an uninterrupted North-South Priority Green wave!
   - **Multi-Angle Camera Toolbar**:
     - 🚁 **Drone 3D**: Panoramic aerial isometric overview of the intersection.
     - 🚑 **Driver POV**: First-person dashboard camera behind the steering wheel of Rescue 101.
     - 📹 **CCTV Cam**: Overhead corner surveillance security camera perspective.
     - 🌐 **Free Orbit**: Unrestricted mouse orbit, pan, and zoom.
   - **Interactive Web Audio Siren**: Dual-tone emergency siren synthesizer generated via mathematical oscillators in browser (with instant Mute/Unmute toggle).
   - **Time of Day Modes**: Cyber Night, Sunset Dusk, and Crisp Daylight lighting presets.

2. **Hardware Engineering & Web Serial Hub (Development Page)**:
   - **Direct USB Web Serial API**: One-click connection to real physical **Arduino Uno, Nano, Mega, or ESP32** microcontrollers without any third-party drivers or software!
   - **Bidirectional Serial Protocol**:
     - Sends commands: `EMERGENCY_NS`, `EMERGENCY_EW`, `RESUME_NORMAL`, `PING`, `SET_CYCLE:10000`.
     - Receives real-time JSON telemetry: `{"telemetry":{"state":"EMERGENCY_CORRIDOR_NS","nsLight":"GREEN","ewLight":"RED",...}}`.
   - **Virtual Arduino Uno Board Simulator**: When no hardware is connected, a cycle-accurate software emulator runs the firmware state machine with animated GPIO status LEDs (`D13`, `D12`, `D11`, `D10`, `D9`, `D8`, `D2`, `D7`, `D6`).
   - **Wiring Diagram & Pinout**: High-resolution interactive circuit schematic showing connections between Arduino, 4-Channel Relay Module, RF Transceiver, Siren Sensor, and Traffic Lights.
   - **Bill of Materials (BOM)**: Complete parts list with specs and quantities.
   - **Production-Ready Arduino Firmware (`.ino`)**: Syntax-highlighted code viewer with one-click "Copy Code" and "Download .ino" buttons.

3. **Engineering Architecture & Mission (About Page)**:
   - **The Golden Hour Dilemma**: Data and statistics on ambulance traffic delays.
   - **Problem vs. Solution**: Comparison between manual gridlock and autonomous wireless preemption.
   - **System Topology**: End-to-end flow diagram from Vehicle OBU (On-Board Unit) to Roadside Unit (RSU) and Relay Interlocks.
   - **Technology Comparison Table**: Benchmarking Legacy Timed Cycles vs. Inductive Loops vs. Optical Infrared vs. 4Way IoT.

4. **Pilot Deployment & Support (Contact Page)**:
   - Interactive Pilot Project Application form for municipal traffic authorities, EMS departments, and university researchers.
   - Frequently Asked Questions (FAQ) interactive accordion addressing AES-128 encryption, priority queuing, and retrofit compatibility.

---

## 🛠️ Arduino Hardware Pinout

| Arduino Pin | Hardware Component | Function / Description |
|:---|:---|:---|
| **Pin 13** | North-South Green LED / Relay CH1 | Grants passage to North-South traffic / Emergency Corridor |
| **Pin 12** | North-South Amber LED | 2.5s transition cushion |
| **Pin 11** | North-South Red LED / Relay CH2 | Halts North-South civilian traffic |
| **Pin 10** | East-West Green LED / Relay CH3 | Grants passage to East-West traffic |
| **Pin 9** | East-West Amber LED | 2.5s transition cushion |
| **Pin 8** | East-West Red LED / Relay CH4 | Halts East-West traffic |
| **Pin 2** | RF Receiver / Siren Sensor (LM393) | Active-LOW digital interrupt input for EV detection |
| **Pin 7** | Piezo Buzzer | Audible pedestrian preemption warning tone |
| **Pin 6** | Status Indicator LED | Illuminates when preemption is actively engaged |
| **USB** | Web Serial Port (115200 bps) | Bidirectional communication with 4Way 3D Dashboard |

---

## 🚀 Quick Start Guide

### 1. Run the Web Dashboard Locally
Using Python (built into Windows/Linux/macOS):
```bash
python -m http.server 8080
```
Open your browser and navigate to:
```
http://localhost:8080/
```

### 2. Connect Your Physical Arduino (Optional)
1. Flash `arduino/traffic_emergency_controller.ino` to your Arduino Uno / Nano / ESP32 using the Arduino IDE.
2. Wire the LEDs or Relay module according to the pin table above.
3. Plug the Arduino into your computer's USB port.
4. In the 4Way web app, navigate to the **Development** page (or click the green status badge in the header).
5. Select **115200 Baud** and click **Connect USB Arduino**.
6. Select your Arduino's COM port in the browser popup prompt.
7. Trigger an emergency from either the web app or physical button/sensor on Pin 2 to watch both the 3D scene and real hardware respond in real-time!

---

## ⌨️ Keyboard Shortcuts
- **`Spacebar`**: Toggle Emergency Preemption (Dispatch / Clear Rescue 101)
- **`C`**: Cycle camera view (Drone 3D ➔ Driver POV ➔ CCTV ➔ Free Orbit)
- **`M`**: Mute / Unmute Emergency Siren Audio
- **`S`**: Trigger Hardware Connect / Serial Console

---

## 📂 Project Structure

```
c:\z_project\
├── index.html                            # Master SPA layout (Home, About, Development, Contact)
├── css\
│   └── styles.css                        # Glassmorphism cyber design system, layout, & responsive tokens
├── js\
│   ├── three-scene.js                    # WebGL 3D traffic simulation & AI vehicle engine
│   ├── serial-controller.js              # Web Serial API manager & Virtual Arduino Uno emulator
│   └── app.js                            # UI state orchestration, Web Audio synth, & event bindings
├── arduino\
│   └── traffic_emergency_controller.ino  # Production Arduino C++ microcontroller firmware
└── README.md                             # Documentation & hardware wiring guide
```

---

## 📄 License
Released under the **MIT Open Source License**. Developed for modern smart city initiatives and emergency response enhancement.
