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
      for( var n = 0 ; n < octet.network.length ; n++ ) 
      {
        this.network.push( octet.network[n] );
      }
    }

  }
  
  get_input_endpoint_at( pos_start_from_lsb ) {
    return this.new_value_inputs[pos_start_from_lsb];
  }

  get_output_endpoints_at( addr ) {
    return this.octets[ addr - this.addr_start ].get_output_endpoints();
  }
}

class RWMemory {
  /*
  create a memory with capacity of 2^addr_width bytes, will create decoder, bus automatically
  */
  constructor( addr_width, read_width_in_bytes, name ) {
    this.network = [];
    this.name = name;
    this.conn_enable = new Connector( null, 1, name + "_en" ); 
    this.conn_init = new Connector( null, 1, name + "_init" );
    this.addr_decoder = new Decoder( addr_width, name + "_dec" , parseInt(addr_width / 2) );
    this.read_bus = new Bus( this.addr_decoder, read_width_in_bytes * 8, name  + "_rbus" );
    var capacity = 1<<addr_width;
    this.storage = new Storage( this.conn_enable, this.addr_decoder, 0, capacity, name + "_str", this.conn_init );

    //bind the outputs
    for( var i = 0 ; i < capacity ; i++ ) {
      var endpoints = [];
      for( var j = 0 ; i+j < capacity && j < read_width_in_bytes ; j++ ) {
        endpoints = endpoints.concat( this.storage.get_output_endpoints_at( i+j ) );
      }
      this.read_bus.append( i, endpoints );
    }

    this.network.push( this.conn_enable );
    this.network.push( this.conn_init );
    this.network = this.network.concat( this.addr_decoder.network );
    this.network = this.network.concat( this.read_bus.network );
    this.network = this.network.concat( this.storage.network );
  }
  
  get_enable_endpoint( ) {
    return this.conn_enable;
  }

  get_init_endpoint( ) {
    return this.conn_init;
  }

  get_input_endpoints( ) {
    return this.storage.new_value_inputs;
  }

  get_addr_endpoints( ) {
    return this.addr_decoder.inputs;
  }

  get_output_endpoints( ) {
    return this.read_bus.get_output_endpoints();
  }

}
