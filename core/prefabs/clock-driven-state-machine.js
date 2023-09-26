class ClockDrivenStateMachine {
  constructor( clock, reset, start_state, edges, events, prefix ) {
    this.network = [];
    this.funs = [];
    this.Das = [];
    this.Dbs = [];
    this.outputs = {};

    var not_clock = new NotGate( prefix + "_nclk", clock );
    this.network = this.network.concat( [not_clock] );
    var eda = new EdgeDetector( clock, 4, prefix + "_ed_01" );
    this.network = this.network.concat( eda.network );
    var edb = new EdgeDetector( not_clock, 4, prefix + "_ed_10" );
    this.network = this.network.concat( edb.network );
    this.ena = eda.get_output_endpoint();
    this.enb = edb.get_output_endpoint();

    var not_reset = new NotGate( prefix + "_nrst", reset );
    this.network = this.network.concat( [not_reset] );

    var boot_state = new Bit( this.ena, reset, "_booter" );
    this.boot_state = boot_state.get_output_endpoint();
    this.network = this.network.concat( boot_state.network );

    this._process_state_code( start_state, edges );
    for( var i = 0 ; i < this.next_id ; i++ ) {
      var fun = new AndGate( prefix + "_f" + i );
      this.funs.push( fun );
      fun.inputs.push( not_reset );
      var transits = new OrGate( prefix + "_inner_f" + i );
      fun.inputs.push( transits );

      var Da = new Bit( this.ena, this.funs[i], prefix + "_" + this.statecode2name[i] );
      var Db = new Bit( this.enb, Da.get_output_endpoint(), prefix + "_Db" + i );
      this.Das.push( Da );
      this.Dbs.push( Db );

      this.network = this.network.concat( [fun, transits] );
      this.network = this.network.concat( Da.network );
      this.network = this.network.concat( Db.network );
    }

    var not_events = [];
    for( var i = 0 ; i < events.length ; i++ ) {
      var n_ev = new NotGate( prefix + "_ne" + i, events[i] );
      not_events.push( n_ev );
    }
    this.network = this.network.concat( not_events );

    this.funs[0].inputs[1].inputs.push( boot_state.get_output_endpoint() );
    for( var i = 0 ; i < edges.length ; i++ ) {
      var src_state = edges[i][0];
      var ev = edges[i][1];
      var dst_state = edges[i][2];

      var src_state_index = this.statename2code[ src_state ];
      var dst_state_index = this.statename2code[ dst_state ];

      var transit = new AndGate( prefix + "_t" + i );
      transit.inputs.push( this.Dbs[ src_state_index ].get_output_endpoint() );
      for( var j = 0 ; j < ev.length ; j++ ) {
        if( ev[j] == '1' ) {
          transit.inputs.push( events[j] );
        } else if( ev[j] == '0' ) {
          transit.inputs.push( not_events[j] );
        }
      }
      this.funs[ dst_state_index ].inputs[1].inputs.push( transit );

      this.network.push( transit );
    }

    
  }

  _process_state_code( start_state, edges ) {
    this.next_id = 0;
    this.statename2code = {};
    this.statecode2name = {};
    this.statename2code[start_state] = this.next_id++;
    this.statecode2name[ this.statename2code[start_state] ] = start_state;
    for( var i = 0 ; i < edges.length ; i++ ) {
      var s = edges[i][0];
      if( !this.statename2code.hasOwnProperty( s ) ) {
        this.statename2code[s] = this.next_id++;
        this.statecode2name[ this.statename2code[s] ] = s;
      }

      s = edges[i][2];
      if( !this.statename2code.hasOwnProperty( s ) ) {
        this.statename2code[s] = this.next_id++;
        this.statecode2name[ this.statename2code[s] ] = s;
      }
    }
  }

  get_output_endpoint_of_is_state( state_name ) {
    return this.Das[ this.statename2code[state_name] ].get_output_endpoint();
  }

  /*
  get_output_endpoint_of_as_event( state_name ) {
    return this.Dbs[ this.statename2code[state_name] ].get_output_endpoint();
  }
  */

}
