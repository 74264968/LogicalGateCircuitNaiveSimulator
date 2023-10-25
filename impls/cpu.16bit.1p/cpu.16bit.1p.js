class Cpu16Bit1P {

  constructor( clock, reset, start, name ) {

    this.ADDR_WIDTH = 16;
    this.BYTE_WIDTH = 8;
    this.INSTRUCTION_WIDTH = 32;
    this.MEM_READ_WIDTH = this.INSTRUCTION_WIDTH;
    this.OPERAND_WIDTH = 16;
    this.CMD_CYCLE_SPAN = [0,0+3];
    this.ADDRESS_MODE_SPAN = [3,3+2];
    this.CMD_SPAN = [5,5+11];
    this.INSTRUCTION_OPR_SPAN = [16, 16+16];

    this.clock = clock;
    this.reset = reset;
    this.start = start;
    this.name = name;

    START_RECORDING_COMPONENT();
    //0. trivials
    {
      this.falling_edge = new EdgeDetector( new NotGate( this.name + ".nclk", clock ), 4, this.name + "_falling_edge" ).get_output_endpoint();
      this.memory_init = this.reset;
    }

    //1. network crossings
    {
      // memory wrapping
      this.ms_memory_addr = new MultiSource( [], [], this.ADDR_WIDTH, this.name + ".ms_mem_addr" );
      this.ms_memory_input = new MultiSource( [], [], this.BYTE_WIDTH, this.name + ".ms_mem_input");
      this.ms_memory_en = new MultiSource( [], [], 1, this.name + ".ms_mem_en" );
      this.conn_memory_output = NewComponentArray( this.MEM_READ_WIDTH, Connector, 2,
                                                   null,
                                                   1,
                                                   ".conn_mem_output" );

      // ip
      [this.ms_ip, this.ip, this.n_ip, this.ms_ip_en] = CreateNetCrossing( this.ADDR_WIDTH, this.name + ".ip" ); 

      // instruction
      [this.ms_inst, this.inst, this.n_inst, this.ms_inst_en] = CreateNetCrossing( this.INSTRUCTION_WIDTH, this.name + ".inst" );
      this.alias_cmd_cycle = this.inst.slice( this.CMD_CYCLE_SPAN[0], this.CMD_CYCLE_SPAN[1] );
      this.alias_addressing_mode = this.inst.slice( this.ADDRESS_MODE_SPAN[0], this.ADDRESS_MODE_SPAN[1] );
      this.alias_n_addressing_mode = this.n_inst.slice( this.ADDRESS_MODE_SPAN[0], this.ADDRESS_MODE_SPAN[1] );
      this.alias_cmd = this.inst.slice( this.CMD_SPAN[0], this.CMD_SPAN[1] );
      this.alias_n_cmd = this.n_inst.slice( this.CMD_SPAN[0], this.CMD_SPAN[1] );
      this.alias_inst_opr = this.inst.slice( this.INSTRUCTION_OPR_SPAN[0], this.INSTRUCTION_OPR_SPAN[1] );

      // operand
      [this.ms_opr, this.opr, this.n_opr, this.ms_opr_en] = CreateNetCrossing( this.OPERAND_WIDTH, this.name + ".opr" );

      // intermediate resuslt
      [this.ms_ires, this.ires, this.n_ires, this.ms_ires_en] = CreateNetCrossing( this.OPERAND_WIDTH, this.name + ".ires" );

      // registers
      [this.ms_ax, this.ax, this.n_ax, this.ms_ax_en] = CreateNetCrossing( this.OPERAND_WIDTH, this.name + ".ax" );
      [this.ms_bx, this.bx, this.n_bx, this.ms_bx_en] = CreateNetCrossing( this.OPERAND_WIDTH, this.name + ".bx" );
    }


    //2. driver of cpu
    this.build_state_machine( );

    //3. flags for network activation / data transfer / routing
    this.init_flags();

    //4. setup connections
    this.setup_memory_pins();
    this.setup_ip();
    this.setup_instruction();
    this.setup_operand();
    this.setup_intermediate_result();
    this.setup_registers();



    //this.conn_cmd_cycle = NewComponentArray( 3, Connector, 2,
    //  null, 1, this.name + ".conn_cmd_cycle" );
    //this.conn_addressing_mode = NewComponentArray( 2, Connector, 2, null, 1, this.name + ".conn_addressing_mode" );
    //this.n_conn_addressing_mode = NewComponentArray( this.conn_addressing_mode.length, NotGate, 0, this.name + ".n_conn_addressing_mode", this.conn_addressing_mode );
    //this.conn_cmd = NewComponentArray( 11, Connector, 2, null, 1, this.name + ".conn_cmd" );
    //this.n_conn_cmd = NewComponentArray( this.conn_cmd.length, NotGate, 0, this.name + ".n_conn_cmd", this.conn_cmd );
    //this.conn_i_operand = NewComponentArray( this.OPERAND_WIDTH, Connector, 2, null, 1, this.name + ".conn_i_operand" );
    //this.conn_intermediate_result = NewComponentArray( this.OPERAND_WIDTH, Connector, 2, null, 1, this.name + ".conn_inter_res" );
    //this.conn_ax = NewComponentArray( this.OPERAND_WIDTH, Connector, 2, null, 1, this.name + ".conn_ax" );
    //this.conn_bx = NewComponentArray( this.OPERAND_WIDTH, Connector, 2, null, 1, this.name + ".conn_bx" );


    //this.build_state_machine( );
    //this.setup_cpu_controls( );
    //this.setup_IP();
    //this.setup_memory_pins( );
    //this.setup_instruction( );
    //this.setup_intermediate_result( );
    //this.setup_registers( );
    //this.setup_operand();

    this.network = GET_RECORDING_SOFAR();
    END_RECORDING_COMPONENT();
  }

  connect_memory( mem ) {
    mem.get_enable_endpoint().connect_to( this.ms_memory_en.get_output_endpoints()[0] );
    mem.get_init_endpoint().connect_to( this.memory_init );
    Connect( mem.get_input_endpoints(), this.ms_memory_input.get_output_endpoints(), true );
    Connect( mem.get_addr_endpoints(), this.ms_memory_addr.get_output_endpoints(), true );
    Connect( this.conn_memory_output, mem.get_output_endpoints(), true );
  }

  init_flags( ) {
    this.alias_is_init = this.state_machine.get_output_endpoint_of_is_state( this.INIT );
    this.alias_is_fetch = this.state_machine.get_output_endpoint_of_is_state( this.FETCH );
    this.alias_is_decode = this.state_machine.get_output_endpoint_of_is_state( this.DECODE );
    this.alias_is_exec = this.state_machine.get_output_endpoint_of_is_state( this.EXECS[0] );
    this.alias_is_store = this.state_machine.get_output_endpoint_of_is_state( this.STORE );

    this.alias_go_ahead = SIG_ONE; //TODO: change this to make JMP works


    this.imm = CreateByMask( this.alias_addressing_mode, this.alias_n_addressing_mode, '00', this.name + ".a/imm" );
    this.index_imm = CreateByMask( this.alias_addressing_mode, this.alias_n_addressing_mode, '01', this.name + ".a/index_imm" );
    this.index_ax = CreateByMask( this.alias_addressing_mode, this.alias_n_addressing_mode, '10', this.name + ".a/index_ax" );
    this.index_bx = CreateByMask( this.alias_addressing_mode, this.alias_n_addressing_mode, '11', this.name + ".a/index_bx" );

    this.load_to_ax = CreateByMask( this.alias_cmd, this.alias_n_cmd, '00000', this.name + ".dd/to_ax" );
    this.load_to_bx = CreateByMask( this.alias_cmd, this.alias_n_cmd, '00001', this.name + ".dd/to_bx" );
    this.load_from_ax = CreateByMask( this.alias_cmd, this.alias_n_cmd, '00010', this.name + ".dd/from_ax" );
    this.load_from_bx = CreateByMask( this.alias_cmd, this.alias_n_cmd, '00011', this.name + ".dd/from_bx" );

    this.cmd_is_system = CreateByMask( this.alias_cmd, this.alias_n_cmd, '000', this.name + ".cmd/sys" );

  }

  setup_memory_pins() {
    this.ms_memory_addr.append( this.alias_is_fetch, this.ip );

    this.ms_memory_addr_when_decode = new MultiSource( [], [], this.ADDR_WIDTH, this.name + ".addr/decode" );
    {
      this.ms_memory_addr_when_decode.append( this.index_imm, this.alias_inst_opr );
      this.ms_memory_addr_when_decode.append( this.index_ax, this.ax );
      this.ms_memory_addr_when_decode.append( this.index_bx, this.bx );
    }
    this.ms_memory_addr.append( this.alias_is_decode, this.ms_memory_addr_when_decode.get_output_endpoints() );
  }

  setup_ip() {
    this.ms_ip.append( this.alias_is_init, [] );
    this.ms_ip_en.append( this.alias_is_init, [this.falling_edge] );

    this.ms_new_ip = new MultiSource( [], [], this.ADDR_WIDTH, this.name + ".new_ip" );
    {
      this.simple_next_ip = new Adder( this.ip, [SIG_ZERO, SIG_ZERO, SIG_ONE], this.name + ".ip+4" ).get_output_endpoints();

      this.ms_new_ip.append( this.alias_go_ahead, this.simple_next_ip );
      //TODO
    }

    this.ms_ip.append( this.alias_is_store, this.ms_new_ip.get_output_endpoints() );
    this.ms_ip_en.append( this.alias_is_store, [this.falling_edge] );

  }

  setup_instruction() {
    this.ms_inst.append( this.alias_is_init, [] );
    this.ms_inst_en.append( this.alias_is_init, [this.falling_edge] );

    this.ms_inst.append( this.alias_is_fetch, this.conn_memory_output );
    this.ms_inst_en.append( this.alias_is_fetch, [this.falling_edge] );
  }

  setup_operand() {
    this.ms_opr.append( this.alias_is_init, [] );
    this.ms_opr_en.append( this.alias_is_init, [this.falling_edge] );

    this.ms_opr_when_decode = new MultiSource( [], [], this.OPERAND_WIDTH, this.name + ".ms_opr/decode" );
    {
      this.ms_opr_when_decode.append( this.imm, this.alias_inst_opr );
      this.ms_opr_when_decode.append( this.index_imm, this.conn_memory_output );
      this.ms_opr_when_decode.append( this.index_ax, this.conn_memory_output );
      this.ms_opr_when_decode.append( this.index_bx, this.conn_memory_output );
    }

    this.ms_opr.append( this.alias_is_decode, this.ms_opr_when_decode.get_output_endpoints() ); 
    this.ms_opr_en.append( this.alias_is_decode, [this.falling_edge] );
  }

  setup_intermediate_result( ) {
    this.ms_ires.append( this.alias_is_init, [] );
    this.ms_ires_en.append( this.alias_is_init, [this.falling_edge] );

    this.ms_ires_when_exec = new MultiSource( [], [], this.OPERAND_WIDTH, this.name + ".ms_ires/exec" );
    {
      this.ms_ires_when_exec.append( this.cmd_is_system, this.opr );
    }
    this.ms_ires.append( this.alias_is_exec, this.ms_ires_when_exec.get_output_endpoints() );
    this.ms_ires_en.append( this.alias_is_exec, [this.falling_edge] );

  }

  setup_registers( ) {
    //AX
    this.ms_ax.append( this.alias_is_init, [] );
    this.ms_ax_en.append( this.alias_is_init, [this.falling_edge] );

    this.ms_ax.append( this.alias_is_store, this.ires );
    this.ms_ax_en.append( CreateAnd( this.name + '.to_ax', this.alias_is_store, this.load_to_ax ), [this.falling_edge] );

    //BX
    this.ms_bx.append( this.alias_is_init, [] );
    this.ms_bx_en.append( this.alias_is_init, [this.falling_edge] );

    this.ms_bx.append( this.alias_is_store, this.ires );
    this.ms_bx_en.append( CreateAnd( this.name + '.to_bx', this.alias_is_store, this.load_to_bx ), [this.falling_edge] );
  }

//  setup_intermediate_result( ) {
//    this.ms_intermediate_result = new MultiSource( [], [], this.OPERAND_WIDTH, this.name + ".ms_res" );
//    this.intermediate_result = NewComponentArray( this.OPERAND_WIDTH, Bit, 2, this.ax_enable, this.conn_intermediate_result, this.name + ".ires" );
//
//    Connect( this.conn_intermediate_result, this.ms_intermediate_result.get_output_endpoints(), true );
//  }
//
//  setup_cpu_controls( ) {
//    this.addressing_mode = {};
//    this.addressing_mode['imm'] = CreateByMask( this.conn_addressing_mode, this.n_conn_addressing_mode, '00', this.name + '.am.imm' );
//    this.addressing_mode['index'] = CreateByMask( this.conn_addressing_mode, this.n_conn_addressing_mode, '01', this.name + '.am.index' );
//    this.addressing_mode['index_ax'] = CreateByMask( this.conn_addressing_mode, this.n_conn_addressing_mode, '10', this.name + '.am.index_ax' );
//    this.addressing_mode['index_bx'] = CreateByMask( this.conn_addressing_mode, this.n_conn_addressing_mode, '11', this.name + '.am.index_bx' );
//
//    var cmd = this.conn_cmd;
//    var ncmd = this.n_conn_cmd;
//    this.dm = CreateByMask( cmd, ncmd, '00', this.name + '.dm' );
//    this.dst_ax = CreateByMask( cmd, ncmd, '000xxxxxx01', this.name + '.dst_ax' );
//    this.dst_bx = CreateByMask( cmd, ncmd, '000xxxxxx10', this.name + '.dst_bx' );
//  }
//
//  /*
//  bind_read_address( address, inputs ) {
//    this.memory_reading_bus.append( address, inputs );
//  }
//  */
//
//  setup_operand() {
//    this.decode_written_sig = new AndGate( this.name + ".operand_enable" );
//    {
//      this.decode_written_sig.inputs.push( this.falling_edge );
//      this.decode_written_sig.inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.DECODE ) );
//    }
//    this.operand = NewComponentArray( this.OPERAND_WIDTH, Bit, 2, this.decode_written_sig, this.conn_memory_output.slice(0,16), this.name + ".operand" );
//  }
//
//  setup_registers( ) {
//
//    this.ax_enable = CreateAnd( this.name + ".ax_en", this.falling_edge, this.state_machine.get_output_endpoint_of_is_state( this.STORE ), this.dst_ax );
//    this.AX = NewComponentArray( this.OPERAND_WIDTH, Bit, 2, this.ax_enable, this.conn_intermediate_result, this.name + ".AX" );
//    Connect( this.conn_ax, this.AX.map( (x) => x.get_output_endpoint() ) );
//
//    this.bx_enable = CreateAnd( this.name + ".bx_en", this.falling_edge, this.state_machine.get_output_endpoint_of_is_state( this.STORE ), this.dst_bx );
//    this.BX = NewComponentArray( this.OPERAND_WIDTH, Bit, 2, this.bx_enable, this.conn_intermediate_result.get_output_endpoints(), this.name + ".BX" );
//    Connect( this.conn_bx, this.BX.map( (x) => x.get_output_endpoint() ) );
//  }
//
////  setup_instruction( ) {
////    this.conn_instruction_enable = new Connector( null, 1, this.name + ".conn_inst_enable" );
////    this.instruction_input = NewComponentArray( this.INSTRUCTION_WIDTH, Connector, 2, null, 1, this.name + ".inst_input");
////    this.instruction = NewComponentArray( this.INSTRUCTION_WIDTH, Bit, 2, this.conn_instruction_enable, this.instruction_input, this.name + ".inst" );
////
////
////    this.instruction_enable = new AndGate( this.name + ".inst_enable" ); 
////    {
////      this.instruction_enable.inputs.push( this.falling_edge );
////      this.instruction_enable.inputs.push( new OrGate( ) );
////      this.instruction_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.INIT ) );
////      this.instruction_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.FETCH ) );
////      this.conn_instruction_enable.connect_to( this.instruction_enable );
////    }
////
////    Connect( this.instruction_input, this.conn_memory_output );
////    Connect( this.conn_cmd_cycle, this.instruction.slice(0,3).map( (x) => x.get_output_endpoint() ) );
////    Connect( this.conn_addressing_mode, this.instruction.slice(3,3+2).map( (x) => x.get_output_endpoint() ) );
////    Connect( this.conn_cmd, this.instruction.slice(5,5+11).map( (x) => x.get_output_endpoint() ) );
////    Connect( this.conn_i_operand, this.instruction.slice(16).map( (x) => x.get_output_endpoint() ) );
////
////  }
////
////  setup_memory_pins( ) {
////    var MEM_ADDR_VALID_N_SRCS_WHEN_DECODE = [
////      [this.addressing_mode['index'], this.conn_i_operand],
////      [this.addressing_mode['index_ax'], this.conn_ax],
////      [this.addressing_mode['index_bx'], this.conn_bx],
////    ];
////    this.ms_memory_addr_source_when_decode = new MultiSource( 
////      MEM_ADDR_VALID_N_SRCS_WHEN_DECODE.map( (x) => x[0] ), 
////      MEM_ADDR_VALID_N_SRCS_WHEN_DECODE.map( (x) => x[1] ), 
////      this.ADDR_WIDTH, this.name + ".mem_addr.decode" );
////
////    var MEM_ADDR_VALID_N_SRCS = [
////      [this.state_machine.get_output_endpoint_of_is_state( this.FETCH ), this.IP.map( (x) => x.get_output_endpoint() ) ],
////      [this.state_machine.get_output_endpoint_of_is_state( this.DECODE ), this.ms_memory_addr_source_when_decode.get_output_endpoints() ],
////    ];
////////
////
////    this.ms_memory_enable = new MultiSource( [], [], 1, this.name + ".mem_en" ); 
////
////    this.memory_init = this.reset;
////
////    this.ms_memory_addr = new MultiSource( MEM_ADDR_VALID_N_SRCS.map( (x)=>x[0] ), MEM_ADDR_VALID_N_SRCS.map( (x)=>x[1] ), this.ADDR_WIDTH, this.name + ".mem_addr" );
////
////    this.ms_memory_input = new MultiSource( [], [], this.BYTE_WIDTH, this.name + ".mem_in" );
////    this.conn_memory_output = NewComponentArray( this.MEM_READ_WIDTH, Connector, 2, null, 1, this.name + "_mem_val" );
////  }
////
//  setup_IP( ) {
//    this.conn_IP_enable = new Connector( null, 1, this.name + ".conn_ip_enable" );
//    this.conn_IP_input = NewComponentArray( this.ADDR_WIDTH, Connector, 2, null, 1, this.name + ".ip_input" );
//    this.IP = NewComponentArray( this.ADDR_WIDTH, Bit, 2, this.conn_IP_enable, this.conn_IP_input, this.name + ".ip" );
//    this.simple_next_ip = new Adder( this.IP.map( (x)=>x.get_output_endpoint() ), [SIG_ZERO, SIG_ZERO, SIG_ONE], this.name + ".ip_add_4" ).get_output_endpoints();
//
//    //TODO: change this according to jump commands
//
//    var is_simple_next_ip = this.state_machine.get_output_endpoint_of_is_state( this.STORE );
//    var ms = new MultiSource( [is_simple_next_ip], [this.simple_next_ip], this.ADDR_WIDTH, this.name + ".select_ip" );
//    this.select_next_ip = ms.get_output_endpoints();
//    Connect( this.conn_IP_input, this.select_next_ip, true );
//
//    this.ip_enable = new AndGate( this.name + ".ip_enable" );
//    {
//      this.ip_enable.inputs.push( this.falling_edge );
//      this.ip_enable.inputs.push( new OrGate( ) );
//      this.ip_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.INIT ) );
//      this.ip_enable.inputs[1].inputs.push( this.state_machine.get_output_endpoint_of_is_state( this.STORE ) );
//      this.conn_IP_enable.connect_to( this.ip_enable );
//    }
//  }
//

  build_state_machine( ) {
    var clock = this.clock;
    var cycle_endpoints_lsb2msb = this.alias_cmd_cycle;
    this.INIT = "INIT";
    this.FETCH = "FETCH";
    this.DECODE = "DECODE";
    this.EXECS = [];
    for( var i = 0 ; i < (1<<cycle_endpoints_lsb2msb.length) ; i++ ) {
      this.EXECS.push( "EXEC_" + i );
    }
    this.STORE = "STORE";
    this.END = "END";
    this.is_stop = CreateByMask( this.alias_cmd, this.alias_n_cmd, '11111111111', this.name + ".stop" );
    const events = [ this.start, this.is_stop, ...cycle_endpoints_lsb2msb ];
    const edges = [ 
      [this.INIT, '10', this.FETCH],
      [this.FETCH, '', this.DECODE],
      [this.EXECS[0], '', this.STORE],
      [this.STORE, 'x0', this.FETCH],
      [this.STORE, 'x1', this.END],
      [this.END, '', this.END],
    ];

    for( var i = 0 ; i < (1<<cycle_endpoints_lsb2msb.length) ; i++ ) {
      var mask = '';
      for( var b = 0 ; b < cycle_endpoints_lsb2msb.length ; b++ ) {
        if( (i & (1<<b)) ) mask += '1';
        else mask += '0';
      }

      var decode2exec= [this.DECODE, 'xx' + mask, this.EXECS[i]];
      edges.push( decode2exec);
      if( i > 0 ) {
        var exec2exec = [this.EXECS[i], '', this.EXECS[i-1]];
        edges.push( exec2exec );
      }
    }

    this.state_machine = new ClockDrivenStateMachine( this.clock, this.reset, this.INIT, edges, events, this.name + ".sm" );

  }


}
