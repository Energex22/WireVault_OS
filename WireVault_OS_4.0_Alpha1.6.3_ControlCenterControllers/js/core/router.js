export class Router {
  constructor({ routes, store, bus, outlet }) {
    this.routes = routes;
    this.store = store;
    this.bus = bus;
    this.outlet = outlet;
  }

  open(routeName) {
    const route = this.routes[routeName] || this.routes.home;
    this.store.set('navigation.route', routeName in this.routes ? routeName : 'home');
    this.outlet.replaceChildren(route.render());
    document.querySelectorAll('[data-route]').forEach(button => {
      button.classList.toggle('active', button.dataset.route === this.store.get('navigation.route'));
    });
    this.bus.emit('route:changed', { route: this.store.get('navigation.route') });
  }
}