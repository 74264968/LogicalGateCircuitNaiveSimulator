/* 2023-08-11 */

/*
    edges: a list of triple: [src, event, dst]
    structure:
      * the state will be stored in serveral bits, each D holds one bit.
      * we generate a function f for each bit.

  enable ----------------------+          
                    (valid)----+          
                               v         
   init --->Not-----+         And-(delay)-+
                    |          |          |
        /-----\     |          |          |
        |     |     |          |          |
        |     |     v          v          v
event ->|  Fi |-----+==>And-->Di_a----->Di_b--+  ...     Dx_a
        |     |       (output state bit)      |           |
        |     |                |              |           |
        \-----/                |              |           |
           ^                   |              |           |
           |___________________x______________|           |
                               |                          |
                               v                 ...      v 
                             /------------------------------\
                             |          state pins          |
                             \______________________________/
*/

class StableStateMachine {

  extend_network( list_or_one ) {
    if( typeof( list_or_one ) === 'object' ) {
      for( var i = 0 ; i < list_or_one.length ; i++ ) {
        this.network.push( list_or_one[i] );
      }
    } else {
      this.network.push( list_or_one );
    }
  }

  constructor( start_state, edges, event_inputs_from_lsb2msb, init_input, enable_input, name ) {
    const ENABLE_SPAN = 3;
    const A_B_SPAN = 7;

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
    this.statenames = [];
    this.statenames.push( start_state );

    for( var i = 0 ; i < edges.length ; i++ ) {
      var edge = edges[i];

      var src_state = edge[0];
      if( !this.state2index.hasOwnProperty( src_state ) ) {
        this.state2index[ src_state ] = this.next_id++;
        this.statenames.push( src_state );
      }

      var dst_state = edge[2];
      if( !this.state2index.hasOwnProperty( dst_state ) ) {
        this.state2index[ dst_state ] = this.next_id++;
        this.statenames.push( dst_state );
      }
    }

    this.valid = new OrGate( name + "_valid_trans" );
    {
      this.valid.inputs.push( init_input );
      this.network.push( this.valid );
    }

    this.adjusted_enable = new AndGate( name + "_adj_en" );
    {
      this.ed = new EdgeDetector( enable_input, ENABLE_SPAN, "_ed_en" );
      this.adjusted_enable.inputs.push( this.ed.get_output_endpoint() );
      this.extend_network( this.ed.network );
      this.adjusted_enable.inputs.push( this.valid );
      this.network.push( this.adjusted_enable );
    }

    this.funs = [];
    this.D_as = [];
    this.D_bs = [];
    this.b_enable = new Connector( this.adjusted_enable, A_B_SPAN, name + "_en_b" );
    {
      this.network.push( this.b_enable );
    }

    this.not_init = new NotGate( name + "_not_init", init_input );

    for( var i = 0 ; (1<<i) <= this.next_id ; i++ ) {
      var fi = new OrGate( name + "_" + "f" + i );
      {
        this.network.push( fi );
      }

      var and_init_fi = new AndGate( name + "_a_ninit_f" + i );
      {
        and_init_fi.inputs.push( this.not_init );
        and_init_fi.inputs.push( fi );
        this.network.push( and_init_fi );
      }

      var D_ai = new Bit( this.adjusted_enable, and_init_fi, name + "_sa" + i );
      {
        this.extend_network( D_ai.network );
      }

      var D_bi = new Bit( this.b_enable, D_ai.get_output_endpoint(), name + "_sb" + i );
      {
        this.extend_network( D_bi.network );
      }

      this.funs.push( fi );
      this.network.push( fi );
      this.D_as.push( D_ai );
      this.D_bs.push( D_bi );
    }

    this.state_bit_width = this.funs.length;
    this.not_event_inputs = [];
    for( var i = 0 ; i < event_inputs_from_lsb2msb.length ; i++ ) {
      this.not_event_inputs.push( 
        new NotGate( name + "_not_ev" + i, event_inputs_from_lsb2msb[i] ) );
    }
    this.extend_network( this.not_event_inputs );

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
          trans.inputs.push( this.D_bs[b].get_output_endpoint() );
        } else {
          trans.inputs.push( this.D_bs[b].get_n_output_endpoint() );
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
    }
    this.extend_network( this.translations );

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


    this.name2smooth = {};
    for( var i = 0 ; i < this.statenames.length; i++ ) {
      var st = this.statenames[i];
      var dec_org = new AndGate( name + "_s[" + st + "]" );
      var state_index = this.state2index[ st ];
      for( var b = 0 ; b < this.state_bit_width ; b++ ) {
        if( state_index & (1<<b) ) {
          dec_org.inputs.push( this.D_bs[b].get_output_endpoint() );
        } else {
          dec_org.inputs.push( this.D_bs[b].get_n_output_endpoint() );
        }
      }
      this.network.push( dec_org );

      var smooth = new Smooth( dec_org, dec_org.name );
      this.name2smooth[ st ] = smooth.get_output_endpoint();
      this.extend_network( smooth.network );
    }


  }

  get_output_endpoints( ) {
    return this.D_bs.map( (x) => x.get_output_endpoint() );
  }

  get_state_decoded_output_by_name( state_name ) {
    return this.name2smooth[ state_name ];
  }
}
