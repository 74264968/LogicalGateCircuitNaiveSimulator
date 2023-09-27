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


    this._process_state_code( start_state, edges );
    this._create_funs_and_double_D( prefix, reset );
    this._make_not_events( prefix, events );
    this._make_is_states( prefix );
    console.log( prefix, this.bit_width );

    for( var i = 0 ; i < edges.length ; i++ ) {
      var src_state = edges[i][0];
      var ev = edges[i][1];
      var dst_state = edges[i][2];
      var src_code = this.statename2code[ src_state ];
      var dst_code = this.statename2code[ dst_state ];

      for( var b = 0 ; b < this.bit_width ; b++ ) {
        if( ((1<<b) & dst_code) == 0 ) continue;
        var transit = new AndGate( prefix + "_t" + i );
        transit.inputs.push( this.is_last_states[src_code] );
        for( var j = 0 ; j < ev.length ; j++ ) {
          if( ev[j] == '1' ) {
            transit.inputs.push( events[j] );
          } else if( ev[j] == '0' ) {
            transit.inputs.push( this.not_events[j] );
          }
        }
        this.funs[ b ].inputs[1].inputs.push( transit );
        this.network.push( transit );
      }
    }

    
  }

  _process_state_code( start_state, edges ) {
    this.next_id = 0;
    this.statename2code = {};
    this.statecode2name = {};
    this.states = [];
    this.statename2code[start_state] = this.next_id++;
    this.statecode2name[ this.statename2code[start_state] ] = start_state;
    this.states.push( start_state );
    for( var i = 0 ; i < edges.length ; i++ ) {
      var s = edges[i][0];
      if( !this.statename2code.hasOwnProperty( s ) ) {
        this.statename2code[s] = this.next_id++;
        this.statecode2name[ this.statename2code[s] ] = s;
        this.states.push( s );
      }

      s = edges[i][2];
      if( !this.statename2code.hasOwnProperty( s ) ) {
        this.statename2code[s] = this.next_id++;
        this.statecode2name[ this.statename2code[s] ] = s;
        this.states.push( s );
      }
    }
  }

  _create_funs_and_double_D( prefix, reset ) {
    var not_reset = new NotGate( prefix + "_nrst", reset );
    this.network = this.network.concat( [not_reset] );

    this.bit_width = 0;
    while( (1<<this.bit_width) < this.next_id ) this.bit_width++;
    for( var i = 0 ; i < this.bit_width ; i++ ) {
      var fun = new AndGate( prefix + "_f" + i );
      this.funs.push( fun );
      fun.inputs.push( not_reset );
      var transits = new OrGate( prefix + "_inner_f" + i );
      fun.inputs.push( transits );

      var Da = new Bit( this.ena, this.funs[i], prefix + "_Da" + i );
      var Db = new Bit( this.enb, Da.get_output_endpoint(), prefix + "_Db" + i );
      this.Das.push( Da );
      this.Dbs.push( Db );

      this.network = this.network.concat( [fun, transits] );
      this.network = this.network.concat( Da.network );
      this.network = this.network.concat( Db.network );
    }
  }

  _make_not_events( prefix, events ) {
    this.not_events = [];
    for( var i = 0 ; i < events.length ; i++ ) {
      var n_ev = new NotGate( prefix + "_ne" + i, events[i] );
      this.not_events.push( n_ev );
    }
    this.network = this.network.concat( this.not_events );

  }

  _make_is_states( prefix ) {
    this.is_states = {};
    this.is_last_states = {};
    for( var i = 0 ; i < this.states.length ; i++ ) {
      var is_state = new AndGate( prefix + "_is_" + this.states[i] );
      var is_last_state = new AndGate( prefix + "_is_l_" + this.states[i] );
      var code = this.statename2code[ this.states[i] ];
      for( var b = 0 ; b < this.bit_width ; b++ ) {
        if( code & (1<<b) ) { 
          is_state.inputs.push( this.Das[b].get_output_endpoint() );
          is_last_state.inputs.push( this.Dbs[b].get_output_endpoint() );
        } else {
          is_state.inputs.push( this.Das[b].get_n_output_endpoint() );
          is_last_state.inputs.push( this.Dbs[b].get_n_output_endpoint() );
        }
        this.network.push( is_state );
        this.network.push( is_last_state );
      }
      this.is_states[ code ] = is_state;
      this.is_last_states[ code ] = is_last_state;
    }
  }

  get_output_endpoint_of_is_state( state_name ) {
    return this.is_states[ this.statename2code[ state_name ] ];
  }

  get_output_endpoint_as_event_of_state( state_name ) {
    return this.is_last_states[ this.statename2code[ state_name ] ];
  }

}
