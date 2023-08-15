/* 2023-07-19 */

class StateMachine {
  /*
    edges: a list of triple: [src, event, dst]

    structure:

      * the state will be stored in serveral bits, each D holds one bit.
      * we generate a function f for each bit.
      * (1) makes the state always starts from 0...0 (use activate signal).
      * (2), (3) slient the activate signal before first enable.

                      (1. inbit_i)       (2. aad)
                  +-------And<======+<-----And<----------- activate
                  |                 ^       ^              
                  |                 |     (delay)   +---+
                  v  ____        (delay)    |       v   | (3. dee)
      (cur_state) L>|    | data     |       +-------Or--+
      event  ------>| fi |------>Di-+               ^
                    |____|   *   ^                  |
                             *   |                  |
                             *   +---------And<-----+------- enable
                       (next_state)         ^
                                            |
                                         (valid) = is an valid translation


  */

  extend_network( list_or_one ) {
    if( typeof( list_or_one ) === 'object' ) {
      for( var i = 0 ; i < list_or_one.length ; i++ ) {
        this.network.push( list_or_one[i] );
      }
    } else {
      this.network.push( list_or_one );
    }
  }

  constructor( start_state, edges, event_inputs_from_lsb2msb, activate_input, enable_input, name ) {
    console.warn( 'StateMachine is deprecated, use StableStateMachine instead' );
    const ENABLE_SPAN = 3;
    const FIRST_ENABLE_ACTVICE_SAFE_MARGIN = 7;
    //0. check the input
    for( var i = 0 ; i < edges.length ; i++ ) {
      var edge = edges[i];
      var event = edge[1];
      if( typeof event === "string" ) {
        if( event.split('').filter( (x) => x != '0' && x != '1' ).length > 0 ) {
          throw `event ${event} from ${edge} is not a valid form, which should be a string of 0 or 1s or an integer.`;
        }
        if( event.length != event_inputs_from_lsb2msb.length ) {
          throw `event ${event} from ${edge} is not a valid value, which's length should be equal to event_inputs_from_lsb2msb.length.`;
        }
      } else if( typeof event === "number" ) {
        if( event < 0 || event >=  (1<<event_inputs_from_lsb2msb.length) ) {
          throw `event ${event} from ${edge} is not a valid value, which should be less than 1<<(event_inputs_from_lsb2msb.length).`;
        }
      } else {
        throw `event ${event} from ${edge} is not a valid form, which should be a string of 0 or 1s or an integer.`
      }
    }

    this.network = [];

    // allocate index for each state
    this.state2index = {};
    this.next_id = 0
    this.state2index[start_state] = this.next_id++;

    for( var i = 0 ; i < edges.length ; i++ ) {
      var edge = edges[i];

      var src_state = edge[0];
      if( !this.state2index.hasOwnProperty( src_state ) ) {
        this.state2index[ src_state ] = this.next_id++;
      }

      var dst_state = edge[2];
      if( !this.state2index.hasOwnProperty( dst_state ) ) {
        this.state2index[ dst_state ] = this.next_id++;
      }
    }

    // prepare framework 
    var detect_ever_enable = new OrGate( name + "_dee" );
    {
      detect_ever_enable.inputs.push( enable_input );
      detect_ever_enable.inputs.push( detect_ever_enable );
      this.network.push( detect_ever_enable );
    }
    var active_and_dee = new AndGate( name + "_aad" );
    {
      active_and_dee.inputs.push( activate_input );
      var delay = new Connector( detect_ever_enable, FIRST_ENABLE_ACTVICE_SAFE_MARGIN, name + "_easm" );
      active_and_dee.inputs.push( delay );
      this.safe_margin = delay;
      this.network.push( delay );
      this.network.push( active_and_dee );
    }

    this.valid = new OrGate( name + "_valid_trans" );
    {
      this.network.push( this.valid );
    }

    this.adjusted_enable = new AndGate( name + "_adj_en" );
    {
      //use edge detect to improve
      this.ed = new EdgeDetector( enable_input, ENABLE_SPAN, "_ed_en" );
      this.adjusted_enable.inputs.push( this.ed.get_output_endpoint() );
      for( var i = 0 ; i < this.ed.network.length ; i++ ) {
        this.network.push( this.ed.network[i] );
      }

      //this.adjusted_enable.inputs.push( enable_input );

      this.adjusted_enable.inputs.push( this.valid );

      this.network.push( this.adjusted_enable );
    }

    this.funs = [];
    this.Ds = [];
    this.inbits = [];
    this.not_inbits = [];
    for( var i = 0 ; (1<<i) <= this.next_id ; i++ ) {
      var fi = new OrGate( name + "_" + "f" + i );
      {
        this.network.push( fi );
      }
      var Di = new Bit( this.adjusted_enable, fi, name + "_sb" + i );
      {
        this.extend_network( Di.network );
      }
      var inbit_i = new AndGate( name + "_in_sb" + i );
      {
        var delay = new Connector( Di.get_output_endpoint(), ENABLE_SPAN + 1, name + "_d2_sb" + i ); 
        inbit_i.inputs.push( delay );// /*Di.get_output_endpoint()*/ );
        inbit_i.inputs.push( active_and_dee );
        this.network.push( delay );
        this.network.push( inbit_i );
      }
      var not_inbit_i = new NotGate( name + "_not_in_sb" + i, inbit_i );
      {
        this.network.push( not_inbit_i );
      }
      this.funs.push( fi );
      this.Ds.push( Di );
      this.inbits.push( inbit_i );
      this.not_inbits.push( not_inbit_i );
    }

    this.state_bit_width = this.funs.length;
    this.not_event_inputs = [];
    for( var i = 0 ; i < event_inputs_from_lsb2msb.length ; i++ ) {
      var not_event_i = new NotGate( name + "_not_ev" + i, event_inputs_from_lsb2msb[i] );
      this.not_event_inputs.push( not_event_i );
      this.network.push( not_event_i );
    }

    // build each fun for each bit
    // each fun can be written in form: (x & !y & ...) || (x & y & ...) || ... || ..

    // build the small part for each translation (src_state, event)
    this.translations = [];
    for( var i = 0 ; i < edges.length ; i++ ) {
      var edge = edges[i];
      var trans = new AndGate( name + "_t_" + edge[0] + " " + edge[1] + "("+edge[0]+":"+edge[1]+")" );
      var state_index = this.state2index[edge[0]];
      var event = edge[1];
      var numeric_event = event;
      if( typeof numeric_event === "string" ) {
        // lsb to msb, reverse it
        numeric_event = parseInt( numeric_event.split('').reverse().join(''), 2 );
      }
      // state
      for( var b = 0 ; b < this.state_bit_width; b++ ) {
        if( state_index & (1<<b) ) {
          trans.inputs.push( this.inbits[b] );
        } else {
          trans.inputs.push( this.not_inbits[b] );
        }
      }

      // event
      for( var b = 0 ; b < event_inputs_from_lsb2msb.length ; b++ ) {
        if( numeric_event & (1<<b) ) {
          trans.inputs.push( event_inputs_from_lsb2msb[b] );
        } else {
          trans.inputs.push( this.not_event_inputs[b] );
        }
      }

      this.translations.push( trans );
      this.valid.inputs.push( trans );
      this.network.push( trans );
    }

    // build the big one
    for( var b = 0 ; b < this.funs.length ; b++ ) {
      for( var i = 0 ; i < edges.length ; i++ ) {
        var edge = edges[i];
        var dst_state_iondex = this.state2index[edge[2]];
        if( dst_state_iondex & (1<<b) ) {
          this.funs[b].inputs.push( this.translations[i] );
        }
      }
    }

  }

  get_output_endpoints( ) {
    return this.inbits;//this.Ds.map( (x) => x.get_output_endpoint() );
  }


}
