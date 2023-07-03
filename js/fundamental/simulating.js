class Simulator {

  constructor( network_as_component_list, init_tick ) {
    this.network = network_as_component_list;
    this.current_tick = init_tick;
  }

  update( next_tick ) {
    while( this.current_tick < next_tick ) {
      for( var i = 0 ; i < this.network.length ; i++ ) {
        this.network[i].peek( this.current_tick );
      }
      this.current_tick++;
    }
  }

}

class MainLoop {
  constructor( simulator, tick_each_frame, frame_in_ms ) {
    this.simulator = simulator;
    this.tick_each_frame = tick_each_frame;
    this.frame_in_ms = frame_in_ms;
    this.next_tick = 0;
    this.monitors = [];
    this.running = false;
  }

  start() {
    this.running = true;
  }

  pause() {
    this.running = false;
  }

  resume() {
    this.running = true;
  }

  register_monitor( monitor ) {
    this.monitors.push( monitor );
  }

  update() {
    if( this.running ) {
      this.next_tick += this.tick_each_frame;
      this.simulator.update( this.next_tick );
      for( var i = 0 ; i < this.monitors.length ; i++ ) {
        this.monitors[i].update( this.next_tick );
      }
    }
  }

}
