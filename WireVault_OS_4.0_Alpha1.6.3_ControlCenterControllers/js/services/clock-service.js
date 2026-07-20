export class ClockService {
  constructor(bus) {
    this.bus = bus;
    this.timer = null;
  }

  start() {
    const tick = () => this.bus.emit('clock:tick', new Date());
    tick();
    this.timer = setInterval(tick, 1000);
  }

  stop() {
    clearInterval(this.timer);
  }
}