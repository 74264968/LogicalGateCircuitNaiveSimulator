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
                  |                 |       |       +---+
                  v  ____           |       |       v   | (3. dee)
      (cur_state) L>|    | data     |       +-------Or--+
      event  ------>| fi |------>Di-+----           ^
                    |____|   *   ^    (out)         |
                             *   |                  |
                             *   +---------And<-----+------- enable
                       (next_state)         ^
                                            |
                                         (valid) = is an valid translation


  */
  constructor( start_state, edges, event_inputs_from_lsb2msb, activate_input, enable_input, name ) {
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

    // allocate id for each state
    this.state2id = {};
    this.next_id = 0
    this.state2index[start_state] = this.next_id++;

    for( var i = 0 ; i < edges.length ; i++ ) {
      var edge = edges[i];

      var src_state = edge[0];
      if( !this.state2index.hasOwnProperty( src_state ) {
        this.state2index[ src_state ] = this.next_id++;
      }

      var dst_state = edge[2];
      if( !this.state2index.hasOwnProperty( dst_state ) {
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
      active_and_dee.inputs.push( detect_ever_enable );
      this.network.push( active_and_dee );
    }


    this.funs = [];
    this.Ds = [];
    this.inbits = [];
    for( var i = 0 ; (1<<i) <= this.next_id ; i++ ) {
      var fi = new OrGate( name + "_" + "f" + i );
      {
        this.network.push( fi );
      }
      var Di = new Bit( enable_input, fi, name + "_sb" + i );
      {
        this.network.push( Di.network );
      }
      var inbit_i = new AndGate( name + "_in_sb" + i );
      {
        inbit_i.inputs.push( Di.get_output_endpoint() );
        inbit_i.inputs.push( active_and_dee );
        this.network.push( inbit_i );
      }
      this.funs.push( fi );
      this.Ds.push( Di );
      this.inbits.push( inbit_i );
    }

    // build each fun for each bit
    // each fun can be written in form: (x & !y & ...) || (x & y & ...) || ... || ..
    // build the small part for each translation (src_state, event)

    this.translations = [];
    for( var i = 0 ; i < edges.length ; i++ ) {
      var edge = edges[i];
      var trans = new AndGate( name + "_t_" + edge[0] + ":" + edge[1] );
      // TODO: state, edge
    }

    // build the 
    for( var b = 0 ; b < this.funs.length ; b++ ) {
      for( var i = 0 ; i < edges.length ; i++ ) {
        var edge = edges[i];
        // TODO
      }
    }

  }


}
