/*
  4Way 3D - Automatic Emergency Vehicle Traffic Priority System (EVPS)
  Firmware: traffic_emergency_controller.ino
  Baud: 115200 bps
*/

const int PIN_NS_RED    = 11;
const int PIN_NS_ORANGE  = 12;
const int PIN_NS_GREEN  = 13;
const int PIN_EW_RED    = 8;
const int PIN_EW_ORANGE  = 9;
const int PIN_EW_GREEN  = 10;
const int PIN_EV_SENSOR = 2; // Active-LOW RF or Pushbutton trigger

unsigned long normalGreen = 8000;
unsigned long ORANGETime   = 2500;
unsigned long allRedTime  = 1800;
unsigned long evHoldTime  = 10000;

enum State { NS_G, NS_A, ALL_RED_EW, EW_G, EW_A, ALL_RED_NS, PREEMPTION_ALL_RED, PREEMPTION_NS_G };
State currentState = NS_G;
unsigned long stateStart = 0;
bool emergencyActive = false;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_NS_RED, OUTPUT); pinMode(PIN_NS_ORANGE, OUTPUT); pinMode(PIN_NS_GREEN, OUTPUT);
  pinMode(PIN_EW_RED, OUTPUT); pinMode(PIN_EW_ORANGE, OUTPUT); pinMode(PIN_EW_GREEN, OUTPUT);
  pinMode(PIN_EV_SENSOR, INPUT_PULLUP);
  setSignals(LOW, LOW, HIGH, HIGH, LOW, LOW);
  stateStart = millis();
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "EMERGENCY_NS") triggerEmergency();
    if (cmd == "RESUME_NORMAL") clearEmergency();
  }

  if (digitalRead(PIN_EV_SENSOR) == LOW && !emergencyActive) {
    triggerEmergency();
  }

  updateStateMachine();
}

void triggerEmergency() {
  emergencyActive = true;
  currentState = PREEMPTION_ALL_RED;
  stateStart = millis();
  setSignals(HIGH, LOW, LOW, HIGH, LOW, LOW); // All-Red buffer
  Serial.println(F("{\"event\":\"PREEMPTION_ENGAGED\"}"));
}

void clearEmergency() {
  emergencyActive = false;
  currentState = ALL_RED_NS;
  stateStart = millis();
  setSignals(HIGH, LOW, LOW, HIGH, LOW, LOW);
  Serial.println(F("{\"event\":\"PREEMPTION_CLEARED\"}"));
}

void setSignals(bool nr, bool na, bool ng, bool er, bool ea, bool eg) {
  digitalWrite(PIN_NS_RED, nr); digitalWrite(PIN_NS_ORANGE, na); digitalWrite(PIN_NS_GREEN, ng);
  digitalWrite(PIN_EW_RED, er); digitalWrite(PIN_EW_ORANGE, ea); digitalWrite(PIN_EW_GREEN, eg);
}

void updateStateMachine() {
  unsigned long elapsed = millis() - stateStart;
  if (currentState == PREEMPTION_ALL_RED && elapsed >= allRedTime) {
    currentState = PREEMPTION_NS_G;
    stateStart = millis();
    setSignals(LOW, LOW, HIGH, HIGH, LOW, LOW);
  } else if (currentState == PREEMPTION_NS_G && elapsed >= evHoldTime) {
    clearEmergency();
  }
}
