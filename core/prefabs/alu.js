/*
  2023-09-18
*/

/*
  a[0]
*/
class Incrementer {
  constructor( inputs_from_lsb2msb, prefix ) {
    this.network = [];
    this.outputs = [];
    this.carrys = [];

    for( var i = 0 ; i < inputs_from_lsb2msb.length ; i++ ) {
      var c = new AndGate( prefix + "_c" + i ); 
      c.inputs.push( inputs_from_lsb2msb[i] );
      if( i > 0 ) {
        c.inputs.push( this.carrys[i-1] );
      }
      this.carrys.push( c );
      this.network.push( c );

      var o;
      if( i == 0 ) {
        o = new NotGate( prefix + "_o" + i, inputs_from_lsb2msb[i] );
      } else {
        o = new XOrGate( prefix + "_o" + i, inputs_from_lsb2msb[i], this.carrys[i-1] );
      }

      this.outputs.push( o );
      this.network.push( o );

    }

  }

  get_output_endpoints( ) {
    return this.outputs;
  }

  get_carry_endpoint( ) {
    return this.carrys[ this.carrys.length - 1 ];
  }
}
