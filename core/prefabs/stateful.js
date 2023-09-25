/*
  2023-07-07
  instead of simulating the network (we should not do this since it is cheating), the classes in this file build the network, to make life easier
*/
class Bit {
  /*
    based on SRLatch
  */
  constructor( enable_input, new_value_input, prefix ) {
    this.val = new NOrGate( prefix + "_val" );
    this.nval = new NOrGate( prefix + "_nval" );

    var and_active_new_value = new AndGate( prefix + "_inner_&_a_v" );
    {
      and_active_new_value.inputs.push( enable_input );
      and_active_new_value.inputs.push( new_value_input );
    }
    var n_new_value = new NotGate( prefix + "_inner_nv", new_value_input );
    var and_active_n_new_value = new AndGate( prefix + "_inner_&_a_nv" );
    {
      and_active_n_new_value.inputs.push( enable_input );
      and_active_n_new_value.inputs.push( n_new_value );
    }

    this.val.inputs.push( and_active_n_new_value );
    this.val.inputs.push( this.nval );

    this.nval.inputs.push( and_active_new_value );
    this.nval.inputs.push( this.val );

    this.network = [this.val, this.nval, and_active_new_value, n_new_value, and_active_n_new_value ];

  }

  get_output_endpoint( ) {
    return this.val;
  }

  get_n_output_endpoint( ) {
    return this.nval;
  }

}

class Octet {
  constructor( enable_input, new_value_inputs, prefix ) {
    if( new_value_inputs.length != 8 ) throw "An Octet should be 8 bit width";
    this.bits = [];
    this.network = [];
    for( var i = 0 ; i < new_value_inputs.length ; i++ ) {
      var bit = new Bit( enable_input, new_value_inputs[i], prefix + "_b" + i );
      this.bits.push( bit );
      this.network = this.network.concat( bit.network );
    }
    this.vals = this.bits.map( (x) => x.get_output_endpoint() );
  }

  get_output_endpoints( ) {
    return this.vals;
  }
}

/*
  N = input_width / k
  r = input_width % k
  split to Nx k->2^k + 1x r->2^r decoders 
  and combine the decoders output to final decoder
*/
class Decoder {
  constructor( input_width, prefix, k ) {
    if( !k ) k = 4;
    var pow_k = 1<<k;
    this.inputs = [];
    this.not_inputs = [];
    for( var i = 0 ; i < input_width ; i++ )
    {
      var comp = new Connector( null, 0, prefix + "_" + "pin_" + i );
      var not_comp = new NotGate( prefix + "_" + "npin_" + i, comp );
      this.inputs.push( comp );
      this.not_inputs.push( not_comp );
    }

    var addr_count = (1<<input_width);
    this.sub_decoders = [];
    for( var d = 0 ; d < input_width ; d+= k ) {
      var sub_decoder_outs = [];
      for( var j = 0 ; j < pow_k && j < (1<<(input_width - d)); j++ ) {
        var out = new AndGate( prefix + "_sub_" + (d/k) + "_" + j );
        for( var b = 0 ; b < k ; b++ ) {
          var mask = 1<<b;
          var which = d+b;
          if( which >= input_width ) break;
          var what = (j&mask) ? this.inputs[which] : this.not_inputs[which];
          out.inputs.push( what );
        }
        sub_decoder_outs.push( out );
      }
      this.sub_decoders.push( sub_decoder_outs );
    }
    //console.log( this.sub_decoders );

    this.outputs = [];

    for( var addr = 0 ; addr < addr_count ; addr++ ) {
      var tmp = addr;
      var out = new AndGate( prefix + "_out_" + addr );
      for( var d = 0 ; d*k < input_width ; d++ ) {
        var remain = tmp % pow_k;
        out.inputs.push( this.sub_decoders[d][remain] );
        tmp >>= k;
      }
      this.outputs.push( out );
    }

    this.network = [];
    this.network = this.network.concat( this.outputs );
    this.network = this.network.concat( this.inputs );
    this.network = this.network.concat( this.not_inputs );
    this.network = this.network.concat( this.sub_decoders.flatMap( (x) => x ) );
  }

  get_input_endpoint_at( pos_start_from_lsb ) {
    return this.inputs[ pos_start_from_lsb ];
  }

  get_output_endpoint_at( addr ) {
    return this.outputs[addr];
  }
}

class Storage {
  constructor( enable_input, addr_decoder, addr_start, capacity, prefix, init_input ) {
    this.addr_start = addr_start;
    this.capacity = capacity;

    this.network = [];

    this.new_value_inputs = [];
    for( var i = 0 ; i < 8 ; i++ ) {
      var c = new Connector( null, 0, prefix + "_v" + i );
      this.new_value_inputs.push( c );
    }
    this.network = this.network.concat( this.new_value_inputs );

    this.octets = [];
    for( var i = addr_start ; i < addr_start + capacity ; i++ ) {
      var octet_enable = new AndGate( prefix + "_ot" + i + "_enable" );
      {
        octet_enable.inputs.push( enable_input );
        if( init_input ) {
          var init_or_addr = new OrGate( prefix + "_init_o_addr" + i );
          {
            init_or_addr.inputs.push( init_input );
            init_or_addr.inputs.push( addr_decoder.get_output_endpoint_at( i ) );
          }
          octet_enable.inputs.push( init_or_addr );
        }
        else {
          octet_enable.inputs.push( addr_decoder.get_output_endpoint_at( i ) );
        }
      }
      var octet = new Octet( octet_enable, this.new_value_inputs, prefix + "_ot" + i );
      this.octets.push( octet );
      this.network.push( octet_enable );
      this.network = this.network.concat( octet.network );
    }

  }
  
  get_input_endpoint_at( pos_start_from_lsb ) {
    return this.new_value_inputs[pos_start_from_lsb];
  }

  get_output_endpoints_at( addr ) {
    return this.octets[ addr - this.addr_start ].get_output_endpoints();
  }
}
