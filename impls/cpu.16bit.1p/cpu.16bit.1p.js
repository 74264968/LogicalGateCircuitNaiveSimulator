class Cpu16Bit1P {

  constructor( clock, reset, start, name ) {
    this.ADDR_WIDTH = 16;
    this.BYTE_WIDTH = 8;
    this.MEM_READ_WIDTH = 32;
    this.clock = clock;
    this.reset = reset;
    this.start = start;
    this.name = name;

    START_RECORDING_COMPONENT();
    this.memory_reading_decoder = new Decoder( this.ADDR_WIDTH, this.name + ".mem_read_dec", 8 );
    this.memory_reading_bus = new Bus( this.memory_reading_decoder, 32, this.name + ".mem_read_bus" );
    //TODO: this.build_state_machine( this.clock, 
    this.network = GET_RECORDING_SOFAR();
  }

  build_state_machine( clock, cycle_endpoints_lsb2msb ) {
    const INIT = "INIT";
    const FETCH = "FETCH";
    const DECODE = "DECODE";
    const EXECS = [];
    for( var i = 0 ; i < (1<<cycle_endpoints_lsb2msb.length) ; i++ ) {
      EXECS.push( "EXEC_" + i );
    }
    const STORE = "STORE";
    const events = [ this.start, ...cycle_endpoints_lsb2msb ];
    const edges = [ 
      [INIT, '1', FETCH],
      [FETCH, '', DECODE],
      [EXECS[0], '', STORE],
      [STORE, '', FETCH],
    ];

    for( var i = 0 ; i < (1<<cycle_endpoints_lsb2msb.length) ; i++ ) {
      var mask = '';
      for( var b = 0 ; b < cycle_endpoints_lsb2msb.length ; b++ ) {
        if( (i & (1<<b)) ) mask += '1';
        else mask += '0';
      }

      var decode2exec= [DECODE, 'x' + mask, EXECS[i]];
      edges.push( decode2exec);
      if( i > 0 ) {
        var exec2exec = [EXECS[i], '', EXECS[i-1]];
        edges.push( exec2exec );
      }
    }

    this.state_machine = new ClockDrivenStateMachine( this.clock, this.reset, INIT, edges, events, this.name + ".sm" );
  }

  mount_storage( address_start, capacity, byte_grouped_endpoints ) {

  }

  get_state_machine( ) {
  }


}
