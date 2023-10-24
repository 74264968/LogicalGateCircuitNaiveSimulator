class FakeComponent extends Component {
  constructor( father_faker, name ) {
    super( "FAKE", [], "FAKE", name );
    this.name = name;
    this.father_faker = father_faker;
  }

  set_value( tick, value ) {
    this.determine_signal( tick, value );
  }

  peek( tick ) {
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;
    this.father_faker.simulate( tick );
    return this.get_determined_signal( tick );
  }
}

class FakeRWMemory {
  constructor( addr_width, read_width_in_bytes, name, initial_bytes ) {
    this.network = [];
    this.values = {};

    this.capacity = 1<<addr_width;
    this.simulated_so_far = -1;
    this.read_width_in_bytes = read_width_in_bytes;

    this.conn_enable = new Connector( null, 1, name + "_en" )
    this.conn_init = new Connector( null, 1, name + "_init" );
    this.conn_new_value_inputs = NewComponentArray( 8, Connector, 2, null, 1, name + "_inval" );
    this.conn_addr = NewComponentArray( addr_width, Connector, 2, null, 1, name + "_addr" );
    this.outputs = NewComponentArray( read_width_in_bytes * 8, FakeComponent, 1, this, name + "_val" );

    this.network.push( this.conn_enable );
    this.network.push( this.conn_init );
    this.network = this.network.concat( this.conn_new_value_inputs );
    this.network = this.network.concat( this.conn_addr );
    this.network = this.network.concat( this.outputs );
  }

  get_value_at( addr ) {
    if( this.values.hasOwnProperty( addr ) ) {
      return this.values[addr];
    }
    return 0;
  }

  simulate( tick ) {
    if( this.simulated_so_far >= tick ) return;
    var addr = 0;
    for( var i = 0 ; i < this.conn_addr.length ; i++ ) {
      addr += this.conn_addr[i].peek(tick) << i;
    }
    for( var i = 0 ; i < this.read_width_in_bytes ; i++ ) {
      for( var j = 0 ; j < 8 ; j++ ) {
        this.outputs[ i*8+j ].set_value( tick, (this.get_value_at( addr + i ) & (1<<j))>>j );
      }
    }

    if( this.conn_enable.peek( tick ) ) {
      if( this.conn_init.peek( tick ) ) {
        this.values = {};
      } else {
        var new_value = 0;
        for( var j = 0 ; j < 8 ; j++ ) {
          new_value += this.conn_new_value_inputs[j].peek( tick ) << j;
        }
        this.values[addr] = new_value;
      }

    } 
    this.simulated_so_far = tick;
  }

  get_enable_endpoint( ) {
    return this.conn_enable;
  }
  get_init_endpoint( ) {
    return this.conn_init;
  }
  get_input_endpoints( ) {
    return this.conn_new_value_inputs;
  }
  get_addr_endpoints( ) {
    return this.conn_addr;
  }
  get_output_endpoints( ) {
    return this.outputs;
  }
}
