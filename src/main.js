const noble = require('noble');
const doasync = require('doasync');

const YOSWIT_SERVICE = 'fff0';
const CONTROL_CHARACTERISTIC = 'fff2';
const STATUS_CHARACTERISTIC = 'fff3';

class YoswitSwitchDevice {
  constructor(peripheral) {
    this.peripheral = peripheral;
  }

  async connect() {
    await doasync(this.peripheral).connect();
    const [service] = await doasync(this.peripheral).discoverSomeServicesAndCharacteristics(
      [YOSWIT_SERVICE],
      [CONTROL_CHARACTERISTIC, STATUS_CHARACTERISTIC],
    );
    this.controlChar = service.characteristics.find((c) => c.uuid === CONTROL_CHARACTERISTIC);
    this.statusChar = service.characteristics.find((c) => c.uuid === STATUS_CHARACTERISTIC);
  }

  async readStatus() {
    const buf = await doasync(this.statusChar).read();
    return new Uint8Array(buf)[0] & 0x2 ? 1 : 0;
  }

  async setValue(value) {
    await doasync(this.controlChar).write(new Buffer([value ? 0x2 : 0]), false);
  }

  async toggle() {
    const status = await this.readStatus();
    console.log('Toggle', status);
    await this.setValue(!status);
  }
}

async function onDiscovered(peripheral) {
  const smartSwitch = new YoswitSwitchDevice(peripheral);
  console.log('Switch found.');
  await smartSwitch.connect();
  console.log('Switch connected!');
  console.log('Current status: ', await smartSwitch.readStatus());
  setInterval(() => smartSwitch.toggle(), 5000);
}

noble.on('discover', (p) => onDiscovered(p).catch(console.error));

noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('scanning...');
    noble.startScanning([YOSWIT_SERVICE], false);
  } else {
    noble.stopScanning();
  }
});
