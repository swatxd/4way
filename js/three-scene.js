/**
 * 4Way 3D - Black & White Architectural Grid 3D Simulation
 * Dynamic Direction-Aware Traffic Preemption (North, South, East, West approaches)
 * Unobstructed High-Altitude Drone Camera with architectural clearances.
 */

class TrafficSimulation3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas with ID ${canvasId} not found.`);
      return;
    }

    this.container = this.canvas.parentElement;
    this.vehicles = [];
    this.emergencyVehicle = null;
    this.trafficLights = { ns: [], ew: [] };

    // Traffic State & Approach Direction
    this.currentPhase = 'NS_GREEN'; // NS_GREEN, NS_AMBER, ALL_RED, EW_GREEN, EW_AMBER, PREEMPTION_CLEARANCE, PREEMPTION_NS_GREEN, PREEMPTION_EW_GREEN
    this.emergencyActive = false;
    this.approachDirection = 'NORTH'; // 'NORTH', 'SOUTH', 'WEST', 'EAST'
    this.emergencyCorridor = 'NS';     // 'NS' or 'EW'
    this.timeOfDay = 'night';

    // Animation & Clock
    this.clock = new THREE.Clock();
    this.animId = null;

    // Siren strobe state
    this.sirenTimer = 0;
    this.sirenState = false;

    // Camera view modes: 'DRONE', 'DRIVER', 'CCTV', 'FREE'
    this.activeCameraMode = 'DRONE';

    this.init();
  }

  init() {
    // 1. Scene & Deep Black Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);
    this.scene.fog = new THREE.FogExp2(0x050505, 0.007);

    // 2. Unobstructed High-Altitude Drone Camera (elevated and aligned with road corridor)
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    // Positioned high at (0, 76, 54) looking straight down into the intersection center
    this.camera.position.set(0, 76, 54);

    // 3. Renderer with ACES ToneMapping & sRGB
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2.05;
      this.controls.minDistance = 10;
      this.controls.maxDistance = 180;
      this.controls.target.set(0, 0, 0);
    }

    // 5. Build Environment
    this.setupLighting();
    this.buildIntersectionGround();
    this.buildArchitecturalCity();
    this.buildTrafficSignalGantries();
    this.spawnTrafficFleet();
    this.spawnEmergencyAmbulance();

    // 6. Responsive Resize Observer
    this.setupResizeObserver();

    // 7. Cursor Activity Tracking for Drone Idle Panning
    this.isCursorInside = false;
    this.lastInteractionTime = performance.now();
    this.dronePanAngle = 0;

    const onUserActive = () => {
      this.lastInteractionTime = performance.now();
      this.isCursorInside = true;
    };

    this.canvas.addEventListener('mousemove', onUserActive);
    this.canvas.addEventListener('mousedown', onUserActive);
    this.canvas.addEventListener('touchstart', onUserActive, { passive: true });
    this.canvas.addEventListener('wheel', onUserActive, { passive: true });

    this.canvas.addEventListener('mouseenter', () => {
      this.isCursorInside = true;
      this.lastInteractionTime = performance.now();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isCursorInside = false;
    });

    window.addEventListener('blur', () => {
      this.isCursorInside = false;
    });

    // 8. Start Render Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  setupResizeObserver() {
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
          }
        }
      });
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', () => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      });
    }
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    this.dirLight.position.set(30, 80, 40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.scene.add(this.dirLight);

    const junctionLight = new THREE.PointLight(0xffffff, 0.6, 50);
    junctionLight.position.set(0, 18, 0);
    this.scene.add(junctionLight);
  }

  buildIntersectionGround() {
    const group = new THREE.Group();

    // Architectural Ground Grid
    const groundGeo = new THREE.PlaneGeometry(180, 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    group.add(ground);

    // Visible Blueprint Grid Lines Overlay
    const gridHelper = new THREE.GridHelper(180, 45, 0x444444, 0x1c1c1c);
    gridHelper.position.y = 0.01;
    group.add(gridHelper);

    // Roads (Width = 16 units)
    const roadWidth = 16;
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.7,
      metalness: 0.2
    });

    // NS Road
    const nsRoadGeo = new THREE.PlaneGeometry(roadWidth, 180);
    const nsRoad = new THREE.Mesh(nsRoadGeo, roadMat);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.position.y = 0.02;
    nsRoad.receiveShadow = true;
    group.add(nsRoad);

    // EW Road
    const ewRoadGeo = new THREE.PlaneGeometry(180, roadWidth);
    const ewRoad = new THREE.Mesh(ewRoadGeo, roadMat);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.position.y = 0.02;
    ewRoad.receiveShadow = true;
    group.add(ewRoad);

    this.buildRoadMarkings(group, roadWidth);
    this.buildSidewalks(group);

    this.scene.add(group);
  }

  buildRoadMarkings(parent, roadWidth) {
    const markGroup = new THREE.Group();
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // Double Yellow Centerline
    const yLineGeo = new THREE.PlaneGeometry(0.2, 74);
    const pos = [
      [-0.25, 47], [0.25, 47],
      [-0.25, -47], [0.25, -47]
    ];
    pos.forEach(([x, z]) => {
      const m = new THREE.Mesh(yLineGeo, yellowMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.03, z);
      markGroup.add(m);
    });

    const ewYGeo = new THREE.PlaneGeometry(74, 0.2);
    const ewPos = [
      [47, -0.25], [47, 0.25],
      [-47, -0.25], [-47, 0.25]
    ];
    ewPos.forEach(([x, z]) => {
      const m = new THREE.Mesh(ewYGeo, yellowMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.03, z);
      markGroup.add(m);
    });

    // Dashed White Lane Dividers
    const dashNS = new THREE.PlaneGeometry(0.25, 2.4);
    for (let z = 12; z <= 82; z += 5.5) {
      [4, -4].forEach(x => {
        const d1 = new THREE.Mesh(dashNS, whiteMat);
        d1.rotation.x = -Math.PI / 2;
        d1.position.set(x, 0.03, z);
        markGroup.add(d1);

        const d2 = d1.clone();
        d2.position.set(x, 0.03, -z);
        markGroup.add(d2);
      });
    }

    const dashEW = new THREE.PlaneGeometry(2.4, 0.25);
    for (let x = 12; x <= 82; x += 5.5) {
      [4, -4].forEach(z => {
        const d1 = new THREE.Mesh(dashEW, whiteMat);
        d1.rotation.x = -Math.PI / 2;
        d1.position.set(x, 0.03, z);
        markGroup.add(d1);

        const d2 = d1.clone();
        d2.position.set(-x, 0.03, z);
        markGroup.add(d2);
      });
    }

    // Zebra Crosswalks
    const zebraNS = new THREE.PlaneGeometry(0.7, 3.2);
    for (let x = -7; x <= 7; x += 1.4) {
      const s1 = new THREE.Mesh(zebraNS, whiteMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(x, 0.035, -9.8);
      markGroup.add(s1);

      const s2 = s1.clone();
      s2.position.set(x, 0.035, 9.8);
      markGroup.add(s2);
    }

    const zebraEW = new THREE.PlaneGeometry(3.2, 0.7);
    for (let z = -7; z <= 7; z += 1.4) {
      const s1 = new THREE.Mesh(zebraEW, whiteMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(9.8, 0.035, z);
      markGroup.add(s1);

      const s2 = s1.clone();
      s2.position.set(-9.8, 0.035, z);
      markGroup.add(s2);
    }

    // Stop Lines
    const stopNS = new THREE.PlaneGeometry(7.6, 0.5);
    const sn = new THREE.Mesh(stopNS, whiteMat);
    sn.rotation.x = -Math.PI / 2;
    sn.position.set(4, 0.036, -12);
    markGroup.add(sn);

    const ss = sn.clone();
    ss.position.set(-4, 0.036, 12);
    markGroup.add(ss);

    const stopEW = new THREE.PlaneGeometry(0.5, 7.6);
    const se = new THREE.Mesh(stopEW, whiteMat);
    se.rotation.x = -Math.PI / 2;
    se.position.set(12, 0.036, 4);
    markGroup.add(se);

    const sw = se.clone();
    sw.position.set(-12, 0.036, -4);
    markGroup.add(sw);

    parent.add(markGroup);
  }

  buildSidewalks(parent) {
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x161616,
      roughness: 0.9,
      metalness: 0.1
    });

    const size = 70;
    const offset = 8 + size / 2;
    const height = 0.25;
    const slabGeo = new THREE.BoxGeometry(size, height, size);

    [
      [offset, -offset],
      [-offset, -offset],
      [offset, offset],
      [-offset, offset]
    ].forEach(([x, z]) => {
      const slab = new THREE.Mesh(slabGeo, curbMat);
      slab.position.set(x, height / 2, z);
      slab.receiveShadow = true;
      parent.add(slab);
    });
  }

  buildArchitecturalCity() {
    const cityGroup = new THREE.Group();

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.5,
      metalness: 0.7
    });

    const wireMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22
    });

    // Pushed-back buildings with low-profile pavilions near intersection to guarantee 100% drone line of sight!
    const buildingCoords = [
      // NE Quadrant (low pavilion in front, tower in back)
      { x: 30, z: -30, w: 16, h: 18, d: 16 }, // Low profile
      { x: 54, z: -30, w: 20, h: 50, d: 20 },
      { x: 32, z: -56, w: 20, h: 55, d: 20 },

      // NW Quadrant
      { x: -30, z: -30, w: 16, h: 18, d: 16 },
      { x: -54, z: -30, w: 20, h: 52, d: 20 },
      { x: -32, z: -56, w: 20, h: 55, d: 20 },

      // SE Quadrant (Camera side: keeping lower profile near corner so drone at (0, 76, 54) has zero blockage)
      { x: 32, z: 32, w: 16, h: 16, d: 16 }, // Low profile
      { x: 56, z: 32, w: 20, h: 48, d: 20 },
      { x: 32, z: 58, w: 20, h: 45, d: 20 },

      // SW Quadrant
      { x: -32, z: 32, w: 16, h: 16, d: 16 },
      { x: -56, z: 32, w: 20, h: 48, d: 20 },
      { x: -32, z: 58, w: 20, h: 45, d: 20 }
    ];

    buildingCoords.forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geo, buildingMat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      cityGroup.add(mesh);

      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(edges, wireMat);
      line.position.copy(mesh.position);
      cityGroup.add(line);
    });

    this.addStreetLight(cityGroup, -9.5, -9.5);
    this.addStreetLight(cityGroup, 9.5, -9.5);
    this.addStreetLight(cityGroup, -9.5, 9.5);
    this.addStreetLight(cityGroup, 9.5, 9.5);

    this.scene.add(cityGroup);
  }

  addStreetLight(parent, x, z) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 7, 8), poleMat);
    pole.position.set(x, 3.5, z);
    parent.add(pole);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), poleMat);
    head.position.set(x, 7, z);
    parent.add(head);

    const lampLight = new THREE.PointLight(0xffffff, 0.5, 20);
    lampLight.position.set(x, 6.8, z);
    parent.add(lampLight);
  }

  buildTrafficSignalGantries() {
    this.createSignalPost('ns', 9, -11, Math.PI);
    this.createSignalPost('ns', -9, 11, 0);
    this.createSignalPost('ew', -11, -9, Math.PI / 2);
    this.createSignalPost('ew', 11, 9, -Math.PI / 2);
    this.updateTrafficLightsVisuals();
  }

  createSignalPost(corridor, x, z, rotationY) {
    const gantry = new THREE.Group();
    gantry.position.set(x, 0, z);
    gantry.rotation.y = rotationY;

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.2
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 7, 12), metalMat);
    mast.position.y = 3.5;
    gantry.add(mast);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 0.25), metalMat);
    arm.position.set(-2, 6.5, 0);
    gantry.add(arm);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.6), metalMat);
    box.position.set(-3.5, 5.4, 0);
    gantry.add(box);

    const visorGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 8, 1, false, 0, Math.PI);
    for (let i = 0; i < 3; i++) {
      const visor = new THREE.Mesh(visorGeo, metalMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(-3.5, 6.1 - i * 0.7, 0.32);
      gantry.add(visor);
    }

    const lensGeo = new THREE.SphereGeometry(0.2, 16, 16);

    const redLens = new THREE.Mesh(lensGeo, new THREE.MeshStandardMaterial({ color: 0x220505, roughness: 0.2 }));
    redLens.position.set(-3.5, 6.1, 0.3);
    gantry.add(redLens);

    const amberLens = new THREE.Mesh(lensGeo, new THREE.MeshStandardMaterial({ color: 0x221a05, roughness: 0.2 }));
    amberLens.position.set(-3.5, 5.4, 0.3);
    gantry.add(amberLens);

    const greenLens = new THREE.Mesh(lensGeo, new THREE.MeshStandardMaterial({ color: 0x052211, roughness: 0.2 }));
    greenLens.position.set(-3.5, 4.7, 0.3);
    gantry.add(greenLens);

    const pointLight = new THREE.PointLight(0x000000, 0, 16);
    pointLight.position.set(-3.5, 5.4, 1.2);
    gantry.add(pointLight);

    const signalData = {
      group: gantry,
      red: redLens,
      amber: amberLens,
      green: greenLens,
      pointLight: pointLight
    };

    if (corridor === 'ns') {
      this.trafficLights.ns.push(signalData);
    } else {
      this.trafficLights.ew.push(signalData);
    }

    this.scene.add(gantry);
  }

  // --- TRAFFIC LIGHT VISUALS ---
  updateTrafficLightsVisuals() {
    let nsColor = 'RED';
    let ewColor = 'RED';

    if (this.currentPhase === 'NS_GREEN' || this.currentPhase === 'PREEMPTION_NS_GREEN') {
      nsColor = 'GREEN';
      ewColor = 'RED';
    } else if (this.currentPhase === 'EW_GREEN' || this.currentPhase === 'PREEMPTION_EW_GREEN') {
      nsColor = 'RED';
      ewColor = 'GREEN';
    } else if (this.currentPhase === 'NS_AMBER') {
      nsColor = 'AMBER';
      ewColor = 'RED';
    } else if (this.currentPhase === 'EW_AMBER') {
      nsColor = 'RED';
      ewColor = 'AMBER';
    } else if (this.currentPhase === 'ALL_RED' || this.currentPhase === 'PREEMPTION_CLEARANCE') {
      nsColor = 'RED';
      ewColor = 'RED';
    }

    this.trafficLights.ns.forEach(sig => this.applyLampColors(sig, nsColor));
    this.trafficLights.ew.forEach(sig => this.applyLampColors(sig, ewColor));
  }

  applyLampColors(sig, activeState) {
    sig.red.material.color.setHex(0x1a0505);
    sig.red.material.emissive.setHex(0x000000);
    sig.amber.material.color.setHex(0x1a1205);
    sig.amber.material.emissive.setHex(0x000000);
    sig.green.material.color.setHex(0x051a0b);
    sig.green.material.emissive.setHex(0x000000);

    if (activeState === 'RED') {
      sig.red.material.color.setHex(0xff3333);
      sig.red.material.emissive.setHex(0xff2222);
      sig.pointLight.color.setHex(0xff2222);
      sig.pointLight.intensity = 1.8;
    } else if (activeState === 'AMBER') {
      sig.amber.material.color.setHex(0xffbb00);
      sig.amber.material.emissive.setHex(0xffaa00);
      sig.pointLight.color.setHex(0xffaa00);
      sig.pointLight.intensity = 1.6;
    } else if (activeState === 'GREEN') {
      sig.green.material.color.setHex(0x00ff88);
      sig.green.material.emissive.setHex(0x00ff88);
      sig.pointLight.color.setHex(0x00ff88);
      sig.pointLight.intensity = 2.0;
    }
  }

  // --- VEHICLES & AI ---
  spawnTrafficFleet() {
    const colors = [0xffffff, 0x1c1c1c, 0x555555, 0x2e2e2e, 0x888888, 0x0f0f0f];

    // North-South civilian cars
    this.vehicles.push(this.createCarMesh(colors[0], -4, -14, 'NS_SOUTH', 0.15));
    this.vehicles.push(this.createCarMesh(colors[1], -4, -24, 'NS_SOUTH', 0.15));

    this.vehicles.push(this.createCarMesh(colors[3], 4, 15, 'NS_NORTH', 0.16));
    this.vehicles.push(this.createCarMesh(colors[4], 4, 26, 'NS_NORTH', 0.16));

    // East-West civilian cars
    this.vehicles.push(this.createCarMesh(colors[5], 16, -4, 'EW_WEST', 0.18));
    this.vehicles.push(this.createCarMesh(colors[0], 27, -4, 'EW_WEST', 0.18));

    this.vehicles.push(this.createCarMesh(colors[1], -16, 4, 'EW_EAST', 0.17));
    this.vehicles.push(this.createCarMesh(colors[2], -28, 4, 'EW_EAST', 0.17));
  }

  createCarMesh(colorHex, startX, startZ, direction, maxSpeed) {
    const car = new THREE.Group();
    car.position.set(startX, 0.4, startZ);

    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.8, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    car.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glassMat);
    roof.position.set(0, 0.95, -0.2);
    car.add(roof);

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    [
      [-1.0, 0.35, 1.3], [1.0, 0.35, 1.3],
      [-1.0, 0.35, -1.3], [1.0, 0.35, -1.3]
    ].forEach(p => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(...p);
      car.add(w);
    });

    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1);
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-0.7, 0.45, 2.1);
    const hl2 = hl1.clone();
    hl2.position.set(0.7, 0.45, 2.1);
    car.add(hl1);
    car.add(hl2);

    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000 });
    const tl1 = new THREE.Mesh(hlGeo, tlMat);
    tl1.position.set(-0.7, 0.45, -2.1);
    const tl2 = tl1.clone();
    tl2.position.set(0.7, 0.45, -2.1);
    car.add(tl1);
    car.add(tl2);

    if (direction === 'NS_SOUTH') car.rotation.y = 0;
    else if (direction === 'NS_NORTH') car.rotation.y = Math.PI;
    else if (direction === 'EW_WEST') car.rotation.y = -Math.PI / 2;
    else if (direction === 'EW_EAST') car.rotation.y = Math.PI / 2;

    this.scene.add(car);

    return {
      mesh: car,
      direction: direction,
      speed: 0,
      targetSpeed: maxSpeed,
      maxSpeed: maxSpeed,
      isEmergency: false,
      startX: startX,
      startZ: startZ
    };
  }

  // --- EMERGENCY AMBULANCE SPAWNER ---
  spawnEmergencyAmbulance() {
    const amb = new THREE.Group();
    amb.position.set(-4, 0.4, -38);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.4 });
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Front Cab (facing +Z local)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.0), bodyMat);
    cab.position.set(0, 0.7, 1.4);
    amb.add(cab);

    // Front Windshield (tilted forward at front of cab)
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.1), glassMat);
    wind.position.set(0, 0.88, 2.41);
    amb.add(wind);

    // Front Grill & Black Radiator Mask
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const grill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.08), grillMat);
    grill.position.set(0, 0.48, 2.42);
    amb.add(grill);

    // Front Bumper
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.25, 0.2), bumperMat);
    bumper.position.set(0, 0.22, 2.42);
    amb.add(bumper);

    // Front Dual Headlights (Glow White)
    const hlGeo = new THREE.BoxGeometry(0.35, 0.22, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(-0.75, 0.58, 2.42);
    const hlR = hlL.clone();
    hlR.position.set(0.75, 0.58, 2.42);
    amb.add(hlL);
    amb.add(hlR);

    // Rear Patient Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.7, 3.8), bodyMat);
    box.position.set(0, 0.95, -1.2);
    amb.add(box);

    // Side Tactical Monochromatic Stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.37, 0.28, 3.82), stripeMat);
    stripe.position.set(0, 0.85, -1.2);
    amb.add(stripe);

    // Red Crosses on BOTH Left and Right Sides
    const crossV = new THREE.BoxGeometry(0.2, 0.6, 0.06);
    const crossH = new THREE.BoxGeometry(0.6, 0.2, 0.06);

    // Right Side Cross
    const crossR1 = new THREE.Mesh(crossV, crossMat);
    const crossR2 = new THREE.Mesh(crossH, crossMat);
    crossR1.position.set(1.19, 1.15, -1.2);
    crossR2.position.copy(crossR1.position);
    amb.add(crossR1);
    amb.add(crossR2);

    // Left Side Cross
    const crossL1 = new THREE.Mesh(crossV, crossMat);
    const crossL2 = new THREE.Mesh(crossH, crossMat);
    crossL1.position.set(-1.19, 1.15, -1.2);
    crossL2.position.copy(crossL1.position);
    amb.add(crossL1);
    amb.add(crossL2);

    // Rear Taillights (Dual Red)
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000 });
    const tlL = new THREE.Mesh(hlGeo, tlMat);
    tlL.position.set(-0.9, 0.58, -3.12);
    const tlR = tlL.clone();
    tlR.position.set(0.9, 0.58, -3.12);
    amb.add(tlL);
    amb.add(tlR);

    // Rear Emergency Door Windows
    const rearWinGeo = new THREE.BoxGeometry(0.6, 0.6, 0.05);
    const rwL = new THREE.Mesh(rearWinGeo, glassMat);
    rwL.position.set(-0.55, 1.2, -3.12);
    const rwR = rwL.clone();
    rwR.position.set(0.55, 1.2, -3.12);
    amb.add(rwL);
    amb.add(rwR);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16);
    [
      [-1.15, 0.38, 1.4], [1.15, 0.38, 1.4],
      [-1.15, 0.38, -1.8], [1.15, 0.38, -1.8]
    ].forEach(p => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(...p);
      amb.add(w);
    });

    // Rooftop Emergency Lightbar (positioned over cab roof)
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    lightbar.position.set(0, 1.9, 1.2);
    amb.add(lightbar);

    const redStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.35), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    redStrobe.position.set(-0.45, 1.9, 1.2);
    amb.add(redStrobe);

    const blueStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    blueStrobe.position.set(0.45, 1.9, 1.2);
    amb.add(blueStrobe);

    const redSirenLight = new THREE.PointLight(0xff2222, 0, 30);
    redSirenLight.position.set(-1.0, 2.5, 1.2);
    amb.add(redSirenLight);

    const blueSirenLight = new THREE.PointLight(0xffffff, 0, 30);
    blueSirenLight.position.set(1.0, 2.5, 1.2);
    amb.add(blueSirenLight);

    this.scene.add(amb);

    this.emergencyVehicle = {
      mesh: amb,
      direction: 'NS_SOUTH',
      speed: 0,
      maxSpeed: 0.36,
      targetSpeed: 0,
      isEmergency: true,
      strobeRed: redStrobe,
      strobeBlue: blueStrobe,
      lightRed: redSirenLight,
      lightBlue: blueSirenLight,
      startX: -4,
      startZ: -38
    };

    this.vehicles.push(this.emergencyVehicle);
    this.setApproachDirection('NORTH');
  }

  // --- DYNAMIC APPROACH DIRECTION CHANGER ---
  // Repositions the ambulance to approach from NORTH, SOUTH, WEST, or EAST
  setApproachDirection(direction) {
    this.approachDirection = direction.toUpperCase();
    this.emergencyCorridor = (this.approachDirection === 'NORTH' || this.approachDirection === 'SOUTH') ? 'NS' : 'EW';

    if (!this.emergencyVehicle) return;

    const amb = this.emergencyVehicle;
    amb.speed = 0;

    if (this.approachDirection === 'NORTH') {
      amb.direction = 'NS_SOUTH';
      amb.mesh.position.set(-4, 0.4, -40);
      amb.mesh.rotation.y = 0; // Moves towards +Z (South), cab faces South (+Z)
    } else if (this.approachDirection === 'SOUTH') {
      amb.direction = 'NS_NORTH';
      amb.mesh.position.set(4, 0.4, 40);
      amb.mesh.rotation.y = Math.PI; // Moves towards -Z (North), cab faces North (-Z)
    } else if (this.approachDirection === 'WEST') {
      amb.direction = 'EW_EAST';
      amb.mesh.position.set(-40, 0.4, 4);
      amb.mesh.rotation.y = Math.PI / 2; // Moves towards +X (East), cab faces East (+X) [CORRECTED 180° FLIP]
    } else if (this.approachDirection === 'EAST') {
      amb.direction = 'EW_WEST';
      amb.mesh.position.set(40, 0.4, -4);
      amb.mesh.rotation.y = -Math.PI / 2; // Moves towards -X (West), cab faces West (-X) [CORRECTED 180° FLIP]
    }

    // If preemption is currently active, immediately force Priority Green to this corridor!
    if (this.emergencyActive) {
      this.currentPhase = (this.emergencyCorridor === 'NS') ? 'PREEMPTION_NS_GREEN' : 'PREEMPTION_EW_GREEN';
      this.updateTrafficLightsVisuals();
    }
  }

  // --- EMERGENCY PREEMPTION TRIGGER ---
  // Changes the signal to GREEN for whichever side the emergency vehicle is coming from!
  triggerEmergencyPreemption(direction = null) {
    if (direction) {
      this.setApproachDirection(direction);
    }

    this.emergencyActive = true;
    const targetCorridor = this.emergencyCorridor; // 'NS' or 'EW'

    // Reset ambulance position if already past junction so user can watch it speed through
    const amb = this.emergencyVehicle;
    if (amb) {
      if (this.approachDirection === 'NORTH' && amb.mesh.position.z > 0) amb.mesh.position.z = -38;
      else if (this.approachDirection === 'SOUTH' && amb.mesh.position.z < 0) amb.mesh.position.z = 38;
      else if (this.approachDirection === 'WEST' && amb.mesh.position.x > 0) amb.mesh.position.x = -38;
      else if (this.approachDirection === 'EAST' && amb.mesh.position.x < 0) amb.mesh.position.x = 38;
      amb.speed = amb.maxSpeed; // Instantly drive forward!
    }

    // IMMEDIATELY FORCE SIGNAL TO GREEN FOR THE APPROACHING SIDE!
    // No clearance delay keeping the light red: ambulance and its corridor vehicles pass immediately!
    this.currentPhase = (targetCorridor === 'NS') ? 'PREEMPTION_NS_GREEN' : 'PREEMPTION_EW_GREEN';
    this.updateTrafficLightsVisuals();
  }

  clearEmergencyPreemption() {
    this.emergencyActive = false;
    this.currentPhase = 'NS_GREEN';
    this.updateTrafficLightsVisuals();
  }

  setPhase(phaseName) {
    this.currentPhase = phaseName;
    this.updateTrafficLightsVisuals();
  }

  // --- SIMULATION PHYSICS & AI ---
  updateSimulation(delta) {
    // 1. Strobe flash
    this.sirenTimer += delta;
    if (this.emergencyActive) {
      if (this.sirenTimer > 0.12) {
        this.sirenTimer = 0;
        this.sirenState = !this.sirenState;

        if (this.emergencyVehicle) {
          if (this.sirenState) {
            this.emergencyVehicle.lightRed.intensity = 4.0;
            this.emergencyVehicle.lightBlue.intensity = 0;
            this.emergencyVehicle.strobeRed.material.color.setHex(0xff3333);
            this.emergencyVehicle.strobeBlue.material.color.setHex(0x333333);
          } else {
            this.emergencyVehicle.lightRed.intensity = 0;
            this.emergencyVehicle.lightBlue.intensity = 4.0;
            this.emergencyVehicle.strobeRed.material.color.setHex(0x333333);
            this.emergencyVehicle.strobeBlue.material.color.setHex(0xffffff);
          }
        }
      }
    } else {
      if (this.emergencyVehicle) {
        this.emergencyVehicle.lightRed.intensity = 0;
        this.emergencyVehicle.lightBlue.intensity = 0;
        this.emergencyVehicle.strobeRed.material.color.setHex(0x333333);
        this.emergencyVehicle.strobeBlue.material.color.setHex(0x333333);
      }
    }

    // 2. Active green determination
    const nsCanGo = (this.currentPhase === 'NS_GREEN' || this.currentPhase === 'PREEMPTION_NS_GREEN');
    const ewCanGo = (this.currentPhase === 'EW_GREEN' || this.currentPhase === 'PREEMPTION_EW_GREEN');

    // 3. Move vehicles (Emergency vehicle and its corridor always pass through green light)
    this.vehicles.forEach(v => {
      let isClearAhead = true;
      let atStopLine = false;

      // Stop line check for civilian cars
      if (!v.isEmergency) {
        if (v.direction === 'NS_SOUTH') {
          if (!nsCanGo && v.mesh.position.z >= -18 && v.mesh.position.z < -10) atStopLine = true;
        } else if (v.direction === 'NS_NORTH') {
          if (!nsCanGo && v.mesh.position.z <= 18 && v.mesh.position.z > 10) atStopLine = true;
        } else if (v.direction === 'EW_WEST') {
          if (!ewCanGo && v.mesh.position.x <= 18 && v.mesh.position.x > 10) atStopLine = true;
        } else if (v.direction === 'EW_EAST') {
          if (!ewCanGo && v.mesh.position.x >= -18 && v.mesh.position.x < -10) atStopLine = true;
        }
      } else {
        // EMERGENCY VEHICLE NEVER STOPS AT ANY STOP LINE!
        atStopLine = false;
      }

      // Separation check between civilian vehicles
      this.vehicles.forEach(other => {
        if (other === v) return;
        if (other.direction === v.direction) {
          const dist = this.getVehicleDistance(v, other);
          if (dist > 0 && dist < 6.0) {
            if (!v.isEmergency) isClearAhead = false;
          }
        }
      });

      // Priority Corridor: Civilian vehicles in the emergency corridor pass through green light and clear the road!
      if (this.emergencyActive) {
        const isEmergencyCorridor = (
          (this.emergencyCorridor === 'NS' && (v.direction === 'NS_SOUTH' || v.direction === 'NS_NORTH')) ||
          (this.emergencyCorridor === 'EW' && (v.direction === 'EW_WEST' || v.direction === 'EW_EAST'))
        );

        if (isEmergencyCorridor) {
          atStopLine = false; // Green signal! Pass through the junction!
          isClearAhead = true;

          // Civilian vehicles in the corridor pull to shoulder while proceeding through green light
          if (!v.isEmergency) {
            v.targetSpeed = v.maxSpeed;
            if (v.direction === 'NS_SOUTH') v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, -6.0, 0.05);
            else if (v.direction === 'NS_NORTH') v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, 6.0, 0.05);
            else if (v.direction === 'EW_EAST') v.mesh.position.z = THREE.MathUtils.lerp(v.mesh.position.z, 6.0, 0.05);
            else if (v.direction === 'EW_WEST') v.mesh.position.z = THREE.MathUtils.lerp(v.mesh.position.z, -6.0, 0.05);
          }
        }
      }

      // Determine speed
      if (atStopLine || !isClearAhead) {
        v.speed = THREE.MathUtils.lerp(v.speed, 0, 0.12);
      } else {
        const target = (v.isEmergency && this.emergencyActive) ? v.maxSpeed : v.targetSpeed;
        v.speed = THREE.MathUtils.lerp(v.speed, target, 0.08);
      }

      // Step position along roadway
      if (v.direction === 'NS_SOUTH') {
        v.mesh.position.z += v.speed;
        if (v.mesh.position.z > 80) {
          v.mesh.position.z = -80;
          if (v.isEmergency && this.emergencyActive) window.dispatchEvent(new CustomEvent('emergencyCorridorCleared'));
        }
      } else if (v.direction === 'NS_NORTH') {
        v.mesh.position.z -= v.speed;
        if (v.mesh.position.z < -80) {
          v.mesh.position.z = 80;
          if (v.isEmergency && this.emergencyActive) window.dispatchEvent(new CustomEvent('emergencyCorridorCleared'));
        }
      } else if (v.direction === 'EW_WEST') {
        v.mesh.position.x -= v.speed;
        if (v.mesh.position.x < -80) {
          v.mesh.position.x = 80;
          if (v.isEmergency && this.emergencyActive) window.dispatchEvent(new CustomEvent('emergencyCorridorCleared'));
        }
      } else if (v.direction === 'EW_EAST') {
        v.mesh.position.x += v.speed;
        if (v.mesh.position.x > 80) {
          v.mesh.position.x = -80;
          if (v.isEmergency && this.emergencyActive) window.dispatchEvent(new CustomEvent('emergencyCorridorCleared'));
        }
      }
    });

    // 4. Direction-Aware Driver POV Camera Tracking
    if (this.activeCameraMode === 'DRIVER' && this.emergencyVehicle) {
      const p = this.emergencyVehicle.mesh.position;
      const dir = this.emergencyVehicle.direction;

      if (dir === 'NS_SOUTH') {
        this.camera.position.set(p.x, p.y + 2.2, p.z - 0.5);
        this.camera.lookAt(p.x, p.y + 1.8, p.z + 25);
      } else if (dir === 'NS_NORTH') {
        this.camera.position.set(p.x, p.y + 2.2, p.z + 0.5);
        this.camera.lookAt(p.x, p.y + 1.8, p.z - 25);
      } else if (dir === 'EW_EAST') {
        this.camera.position.set(p.x - 0.5, p.y + 2.2, p.z);
        this.camera.lookAt(p.x + 25, p.y + 1.8, p.z);
      } else if (dir === 'EW_WEST') {
        this.camera.position.set(p.x + 0.5, p.y + 2.2, p.z);
        this.camera.lookAt(p.x - 25, p.y + 1.8, p.z);
      }
    }

    // 5. Unobstructed Drone Camera Pan around city focusing on junction when cursor is inactive or outside
    if (this.activeCameraMode === 'DRONE') {
      const now = performance.now();
      const isInactive = (!this.isCursorInside) || (now - this.lastInteractionTime > 2000);

      if (isInactive) {
        this.dronePanAngle += delta * 0.12; // Gentle cinematic orbit

        // Subtle panoramic drift keeping clear of building envelopes, focusing strictly on junction center (0,0,0)
        const targetX = Math.sin(this.dronePanAngle) * 26;
        const targetZ = 58 + Math.cos(this.dronePanAngle) * 16;
        const targetY = 76 + Math.sin(this.dronePanAngle * 0.6) * 4;

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, 0.03);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.03);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.03);

        if (this.controls) {
          this.controls.target.set(0, 0, 0);
        }
        this.camera.lookAt(0, 0, 0);
      }
    }
  }

  getVehicleDistance(v1, v2) {
    if (v1.direction === 'NS_SOUTH') return v2.mesh.position.z - v1.mesh.position.z;
    if (v1.direction === 'NS_NORTH') return v1.mesh.position.z - v2.mesh.position.z;
    if (v1.direction === 'EW_WEST') return v1.mesh.position.x - v2.mesh.position.x;
    if (v1.direction === 'EW_EAST') return v2.mesh.position.x - v1.mesh.position.x;
    return 999;
  }

  // --- CAMERA MODES WITH UNOBSTRUCTED DRONE VIEW ---
  setCameraMode(mode) {
    this.activeCameraMode = mode;

    if (mode === 'DRONE') {
      if (this.controls) this.controls.enabled = true;
      // High elevation (y: 76, z: 54) centered over the open road corridor with zero building obstruction!
      gsapAnimateCamera(this.camera, { x: 0, y: 76, z: 54 }, { x: 0, y: 0, z: 0 });
    } else if (mode === 'DRIVER') {
      if (this.controls) this.controls.enabled = false;
      // Real-time tracking in updateSimulation
    } else if (mode === 'CCTV') {
      if (this.controls) this.controls.enabled = false;
      gsapAnimateCamera(this.camera, { x: -14, y: 16, z: -14 }, { x: 0, y: 0, z: 0 });
    } else if (mode === 'FREE') {
      if (this.controls) this.controls.enabled = true;
    }
  }

  setTimeOfDay(mode) {
    this.timeOfDay = mode;
    if (mode === 'night') {
      this.scene.background.setHex(0x050505);
      this.scene.fog.color.setHex(0x050505);
      this.ambientLight.intensity = 0.65;
      this.dirLight.intensity = 1.2;
    } else if (mode === 'dusk') {
      this.scene.background.setHex(0x1a1a1a);
      this.scene.fog.color.setHex(0x1a1a1a);
      this.ambientLight.intensity = 0.9;
      this.dirLight.intensity = 1.6;
    } else if (mode === 'day') {
      this.scene.background.setHex(0xd4d4d4);
      this.scene.fog.color.setHex(0xd4d4d4);
      this.ambientLight.intensity = 1.4;
      this.dirLight.intensity = 2.0;
    }
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    if (this.controls && this.activeCameraMode !== 'DRIVER') {
      this.controls.update();
    }

    this.updateSimulation(delta);
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.renderer.dispose();
  }
}

function gsapAnimateCamera(camera, targetPos, lookTarget) {
  const startPos = camera.position.clone();
  let progress = 0;
  const duration = 1000;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    progress = Math.min(elapsed / duration, 1);
    const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    camera.position.x = startPos.x + (targetPos.x - startPos.x) * t;
    camera.position.y = startPos.y + (targetPos.y - startPos.y) * t;
    camera.position.z = startPos.z + (targetPos.z - startPos.z) * t;
    camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);

    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
