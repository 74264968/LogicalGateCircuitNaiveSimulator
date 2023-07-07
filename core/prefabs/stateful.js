/*
  2023-07-07
*/
class Bit {
  /*
    based on SRLatch
  */
  constructor( active_input, new_value_input, prefix ) {
    this.val = new NOrGate( prefix + "_val" );
    this.nval = new NOrGate( prefix + "_nval" );

    var and_active_new_value = new AndGate( prefix + "_inner_&_a_v" );
    {
      and_active_new_value.inputs.push( active_input );
      and_active_new_value.inputs.push( new_value_input );
    }
    var n_new_value = new NotGate( prefix + "_inner_nv", new_value_input );
    var and_active_n_new_value = new AndGate( prefix + "_inner_&_a_nv" );
    {
      and_active_n_new_value.inputs.push( active_input );
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
}

class Octet {
  constructor( active_input, new_value_inputs, prefix ) {
    if( new_value_inputs.length != 8 ) throw "An Octet should be 8 bit width";
    this.bits = [];
    this.network = [];
    for( var i = 0 ; i < new_value_inputs.length ; i++ ) {
      var bit = new Bit( active_input, new_value_inputs[i], prefix + "_b" + i );
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
class RWBlock {
  constructor( 
}
*/
