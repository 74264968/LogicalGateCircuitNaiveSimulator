/*
  2023-09-18
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


/*
  a 0 0 0 0 1 1 1 1
  b 0 0 1 1 0 0 1 1
  c 0 1 0 1 0 1 0 1
-------------------
out 0 1 1 0 1 0 0 1
 nc 0 0 0 1 0 1 1 1
*/
class Adder {
  constructor( a_from_lsb2msb, b_from_lsb2msb, prefix ) {
    this.network = [];
    this.outputs = [];
    this.carrys = [];

    for( var i = 0 ; i < a_from_lsb2msb.length && i < b_from_lsb2msb.length ; i++ ) {
      var o;
      var xor_ab = new XOrGate( prefix + "_xor_ab_" + i, a_from_lsb2msb[i], b_from_lsb2msb[i] );
      if( i > 0 ) {
        o = new XOrGate( prefix + "_o" + i, xor_ab, this.carrys[i-1] );
        this.network.push( xor_ab );
      } else {
        o = xor_ab;
      }
      this.outputs.push( o );
      this.network.push( o );

      var c;
      var and_ab = new AndGate( prefix + "_and_ab_" + i );
      {
        and_ab.inputs.push( a_from_lsb2msb[i] );
        and_ab.inputs.push( b_from_lsb2msb[i] );
      }
      if( i > 0 ) {
        var and_ac = new AndGate( prefix + "_and_ab_" + i);
        {
          and_ac.inputs.push( a_from_lsb2msb[i] );
          and_ac.inputs.push( this.carrys[i-1] );
        }
        var and_bc = new AndGate( prefix + "_and_bc_" + i);
        {
          and_bc.inputs.push( b_from_lsb2msb[i] );
          and_bc.inputs.push( this.carrys[i-1] );
        }
        c = new OrGate( prefix + "_c" + i );
        {
          c.inputs.push( and_ab );
          c.inputs.push( and_ac );
          c.inputs.push( and_bc );
        }
        this.network.push( and_ab );
        this.network.push( and_ac );
        this.network.push( and_bc );
      } else {
        c = and_ab;
      }

      this.carrys.push( c );
      this.network.push( c );
    }
  }

  get_output_endpoints( ) {
    return this.outputs;
  }

  get_carry_endpoint( ) {
    return this.carrys[ this.carrys.length - 1 ];
  }
}

class Multiplier {
  constructor( a_from_lsb2msb, b_from_lsb2msb, prefix ) {
    this.outputs = [];
    this.network = [];

    this.intermediates = [];
    var BIT_WIDTH = a_from_lsb2msb.length;
    //console.log( BIT_WIDTH );
    for( var i_a = 0 ; i_a < BIT_WIDTH ; i_a++ ) {
      var row = [];
      var carrys = [];
      for( var i_b = 0 ; i_b < b_from_lsb2msb.length ; i_b++ ) {
        // (b << x) & a[x]
        var and_shift_b_a = new AndGate( prefix + "_bls" + i_a + "_and_a" + i_a );
        {
          and_shift_b_a.inputs.push( a_from_lsb2msb[i_a] );
          and_shift_b_a.inputs.push( b_from_lsb2msb[i_b] );
          this.network.push( and_shift_b_a );
        }
        row.push( and_shift_b_a );
      }

      // row + intermediates[i_a-1] => intermediates[i_a]
      if( i_a == 0 ) {
        row.push( new Signal( 0 ) );
        this.intermediates.push( row );
      } else {
        this.intermediates.push( [] );
        for( var i_b = 0 ; i_b < b_from_lsb2msb.length ; i_b++ ) {
          var bit_inter = this.intermediates[i_a-1][i_b+1];
          var bit_b = row[i_b];
          //console.log( (i_a-1), (i_b+1), bit_inter, bit_b );
          var o;
          var xor_inter_b = new XOrGate( prefix + "_xor_imm" + (i_a-1) + "." + (i_b+1) + "_b." + i_b, bit_inter, bit_b );
          this.network.push( xor_inter_b );
          if( i_b > 0 ) {
            o = new XOrGate( prefix + "_imm" + i_a + "." + i_b, xor_inter_b, carrys[i_b-1] );
            //console.log( o.name, i_b-1, xor_inter_b, carrys[i_b-1] );
            this.network.push( o );
          } else {
            o = xor_inter_b;
          }
          this.intermediates[i_a].push( o );

          var c;
          if( i_b > 0 ) {
            c = new OrGate( prefix + "_c" + i_a + "." + i_b );
            {
              this.network.push( c );
              var and_imm_b = new AndGate( prefix + "_and_imm" + (i_a-1) + "." + (i_b+1) + "_b" + i_b );
              {
                this.network.push( and_imm_b );
                and_imm_b.inputs.push( bit_inter );
                and_imm_b.inputs.push( bit_b );
              }
              var and_imm_c = new AndGate( prefix + "_and_imm" + (i_a-1) + "." + (i_b+1) + "_c" + (i_b - 1) );
              {
                this.network.push( and_imm_c );
                and_imm_c.inputs.push( bit_inter );
                and_imm_c.inputs.push( carrys[i_b-1] );
              }
              var and_b_c = new AndGate( prefix + "_and_b" + (i_b) + "_c" + (i_b - 1) );
              {
                this.network.push( and_b_c );
                and_b_c.inputs.push( bit_b );
                and_b_c.inputs.push( carrys[i_b-1] );
              }
              c.inputs.push( and_imm_b );
              c.inputs.push( and_imm_c );
              c.inputs.push( and_b_c );
            }
          } else {
            c = new AndGate( prefix + "_c" + i_a + "." + i_b );
            {
              this.network.push( c );
              c.inputs.push( this.intermediates[i_a-1][i_b+1] );
              c.inputs.push( row[i_b] );
            }
          }
          carrys.push( c );

          if( i_b + 1 == b_from_lsb2msb.length ) {
            this.intermediates[i_a].push( c );
          }
        }
      }
    }

    for( var i = 0 ; i < BIT_WIDTH - 1; i++ ) {
      this.outputs.push( this.intermediates[i][0] );
    }
    for( var i = 0 ; i <= b_from_lsb2msb.length ; i++ ) {
      this.outputs.push( this.intermediates[BIT_WIDTH-1][i] );
    }

  }

  get_output_endpoints() {
    return this.outputs;
  }
}
