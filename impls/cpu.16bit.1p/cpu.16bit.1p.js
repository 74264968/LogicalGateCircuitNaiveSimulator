class Cpu16Bit1P {

  constructor( clock, reset, start, name, memory ) {
    this.ADDR_WIDTH = 16;
    this.BYTE_WIDTH = 8;
    this.INSTRUCTION_WIDTH = 32;
    this.MEM_READ_WIDTH = this.INSTRUCTION_WIDTH;
    this.clock = clock;
    this.reset = reset;
    this.start = start;
    this.name = name;

    START_RECORDING_COMPONENT();
    this.falling_edge = new EdgeDetector( new NotGate( this.name + ".nclk", clock ), 4, this.name + "_falling_edge" ).get_output_endpoint();

    this.conn_cmd_cycle = NewComponentArray( 3, Connector, 2,
      null, 1, this.name + ".conn_cmd_cycle" );
    this.conn_addressing_mode = NewComponentArray( 2, Connector, 2, null, 1, this.name + ".conn_addressing_mode" );
    this.conn_cmd = NewComponentArray( 11, Connector, 2, null, 1, this.name + ".conn_cmd" );
    this.conn_i_operand = NewComponentArray( 16, Connector, 2, null, 1, this.name + ".conn_i_operand" );


    this.build_state_machine( );
    this.setup_IP();
    this.setup_memory_pins( );
    this.setup_instruction( );
    this.setup_registers( );
    this.setup_operand();

    this.network = GET_RECORDING_SOFAR();
  }

  connect_memory( mem ) {
    mem.get_enable_endpoint().connect_to( this.ms_memory_enable.get_output_endpoints()[0] );
    mem.get_init_endpoint().connect_to( this.memory_init );
    Connect( mem.get_input_endpoints(), this.ms_memory_input.get_output_endpoints(), true );
    Connect( mem.get_addr_endpoints(), this.ms_memory_addr.get_output_endpoints(), true );
    Connect( this.conn_memory_output, mem.get_output_endpoints(), true );
  }

  /*
  bind_read_address( address, inputs ) {
    this.memory_reading_bus.append( address, inputs );
  }
  */

  setup_operand() {
    //TODO
  }

  setup_registers( ) {
    //TODO
  }

  setup_instruction( ) {
    this.conn_instruction_enable = new Connector( null, 1, this.name + ".conn_inst_enable" );
    this.instruction_input = NewComponentArray( this.INSTRUCTION_WIDTH, Connector, 2, null, 1, this.name + ".inst_input");
    this.instruction = NewComponentArray( this.INSTRUCTION_WIDTH, Bit, 2, this.conn_instruction_enable, this.instruction_input, this.name + ".inst" );


    this.instruction_enable = new AndGate( this.name + ".inst_enable" ); 
    {
      this.instruction_enable.inputs.push( this.falling_edge );
      this.instruction_enable.inputs.push( new OrGate( ) );
      this.instruction_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.INIT ) );
      this.instruction_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.FETCH ) );
      this.conn_instruction_enable.connect_to( this.instruction_enable );
    }

    Connect( this.instruction_input, this.conn_memory_output );
    Connect( this.conn_cmd_cycle, this.instruction.map( (x) => x.get_output_endpoint() ) );

  }

  setup_memory_pins( ) {
    var MEM_ADDR_VALID_N_SRCS = [
      [this.state_machine.get_output_endpoint_of_is_state( this.FETCH ), this.IP.map( (x) => x.get_output_endpoint() ) ],
    ];

    this.ms_memory_enable = new MultiSource( [], [], 1, this.name + "_mem_en" ); 

    this.memory_init = this.reset;

    this.ms_memory_addr = new MultiSource( MEM_ADDR_VALID_N_SRCS.map( (x)=>x[0] ), MEM_ADDR_VALID_N_SRCS.map( (x)=>x[1] ), this.ADDR_WIDTH, this.name + "_mem_addr" );

    this.ms_memory_input = new MultiSource( [], [], this.BYTE_WIDTH, this.name + "_mem_in" );
    this.conn_memory_output = NewComponentArray( this.MEM_READ_WIDTH, Connector, 2, null, 1, this.name + "_mem_val" );
  }

  setup_IP( ) {
    this.conn_IP_enable = new Connector( null, 1, this.name + ".conn_ip_enable" );
    this.conn_IP_input = NewComponentArray( this.ADDR_WIDTH, Connector, 2, null, 1, this.name + ".ip_input" );
    this.IP = NewComponentArray( this.ADDR_WIDTH, Bit, 2, this.conn_IP_enable, this.conn_IP_input, this.name + ".ip" );
    this.simple_next_ip = new Adder( this.IP.map( (x)=>x.get_output_endpoint() ), [SIG_ZERO, SIG_ZERO, SIG_ONE], this.name + ".ip_add_4" ).get_output_endpoints();

    //TODO: change this according to jump commands

    var is_simple_next_ip = this.state_machine.get_output_endpoint_of_is_state( this.STORE );
    var ms = new MultiSource( [is_simple_next_ip], [this.simple_next_ip], this.ADDR_WIDTH, this.name + ".select_ip" );
    this.select_next_ip = ms.get_output_endpoints();
    Connect( this.conn_IP_input, this.select_next_ip, true );

    this.ip_enable = new AndGate( this.name + ".ip_enable" );
    {
      this.ip_enable.inputs.push( this.falling_edge );
      this.ip_enable.inputs.push( new OrGate( ) );
      this.ip_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.INIT ) );
      this.ip_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.STORE ) );
      this.conn_IP_enable.connect_to( this.ip_enable );
    }
  }


  build_state_machine( ) {
    var clock = this.clock;
    var cycle_endpoints_lsb2msb = this.conn_cmd_cycle;
    this.INIT = "INIT";
    this.FETCH = "FETCH";
    this.DECODE = "DECODE";
    this.EXECS = [];
    for( var i = 0 ; i < (1<<cycle_endpoints_lsb2msb.length) ; i++ ) {
      this.EXECS.push( "EXEC_" + i );
    }
    this.STORE = "STORE";
    const events = [ this.start, ...cycle_endpoints_lsb2msb ];
    const edges = [ 
      [this.INIT, '1', this.FETCH],
      [this.FETCH, '', this.DECODE],
      [this.EXECS[0], '', this.STORE],
      [this.STORE, '', this.FETCH],
    ];

    for( var i = 0 ; i < (1<<cycle_endpoints_lsb2msb.length) ; i++ ) {
      var mask = '';
      for( var b = 0 ; b < cycle_endpoints_lsb2msb.length ; b++ ) {
        if( (i & (1<<b)) ) mask += '1';
        else mask += '0';
      }

      var decode2exec= [this.DECODE, 'x' + mask, this.EXECS[i]];
      edges.push( decode2exec);
      if( i > 0 ) {
        var exec2exec = [this.EXECS[i], '', this.EXECS[i-1]];
        edges.push( exec2exec );
      }
    }

    this.state_machine = new ClockDrivenStateMachine( this.clock, this.reset, this.INIT, edges, events, this.name + ".sm" );

  }


}
