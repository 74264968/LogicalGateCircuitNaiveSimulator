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

    for( var i = 0 ; i < a_from_lsb2msb.length || i < b_from_lsb2msb.length ; i++ ) {
      var aa = SIG_ZERO;
      var bb = SIG_ZERO;
      if( i < a_from_lsb2msb.length ) aa = a_from_lsb2msb[i];
      if( i < b_from_lsb2msb.length ) bb = b_from_lsb2msb[i];
      var o;
      var xor_ab = new XOrGate( prefix + "_xor_ab." + i, aa, bb );
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
        and_ab.inputs.push( aa );
        and_ab.inputs.push( bb );
      }
      if( i > 0 ) {
        var and_ac = new AndGate( prefix + "_and_ab_" + i);
        {
          and_ac.inputs.push( aa );
          and_ac.inputs.push( this.carrys[i-1] );
        }
        var and_bc = new AndGate( prefix + "_and_bc_" + i);
        {
          and_bc.inputs.push( bb );
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
        row.push( SIG_ZERO );
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

/*
  a   0 0 0 0 1 1 1 1
  b   0 0 1 1 0 0 1 1
  bo  0 1 0 1 0 1 0 1
---------------------
  out 0 1 1 0 1 0 0 1 
  nbo 0 1 1 1 0 0 0 1

  out = a xor b xor bo
  nbo = ((not a) and (b or bo)) or (b and bo)
      = (not a and b) or (not a and bo) or (b and bo)
*/
class Subtractor {
  constructor( a_from_lsb2msb, b_from_lsb2msb, prefix ) {
    this.network = [];
    this.outputs = [];
    this.borrows = [];

    for( var i = 0 ; i < a_from_lsb2msb.length || i < b_from_lsb2msb.length ; i++ ) {
      // slower but less code
      var aa = SIG_ZERO;
      var bb = SIG_ZERO;
      var bo = SIG_ZERO;
      if( i < a_from_lsb2msb.length ) aa = a_from_lsb2msb[i];
      if( i < b_from_lsb2msb.length ) bb = b_from_lsb2msb[i];
      if( i > 0 ) bo = this.borrows[i-1];

      
      var xor_ab = new XOrGate( prefix + "_xor_ab." + i, aa, bb );
      var o = new XOrGate( prefix + "_o" + i, xor_ab, bo );
      this.outputs.push( o );
      this.network.push( xor_ab );
      this.network.push( o );

      var nbo = new OrGate( prefix + "_bo" + i );
      {
        var not_a = new NotGate( prefix + "_not_a" + i, aa );
        this.network.push( not_a );
        var and_not_a_b = new AndGate( prefix + "_and_not_a_b" + i );
        {
          and_not_a_b.inputs.push( not_a );
          and_not_a_b.inputs.push( bb );
        }
        this.network.push( and_not_a_b );

        var and_not_a_bo = new AndGate( prefix + "_and_not_a_bo" + i );
        {
          and_not_a_bo.inputs.push( not_a );
          and_not_a_bo.inputs.push( bo );
        }
        this.network.push( and_not_a_bo );

        var and_b_bo = new AndGate( prefix + "_and_b_bo" + i );
        {
          and_b_bo.inputs.push( bb );
          and_b_bo.inputs.push( bo );
        }
        this.network.push( and_b_bo );

        nbo.inputs.push( and_not_a_b );
        nbo.inputs.push( and_not_a_bo );
        nbo.inputs.push( and_b_bo );

      }
      this.borrows.push( nbo );
      this.network.push( nbo );

    }
  }

  get_output_endpoints() {
    return this.outputs;
  }

  get_borrow_endpoint() {
    return this.borrows[this.borrows.length-1];
  }
}

/*
  a   0 0 1 1
  b   0 1 0 1
----------------------
  out r 0 1 r

  out[n] = ((a xand b) and r[n-1]) or (a and (not b))
  r[-1] = 0 if not equal else 1
*/

class GreaterComparator {
  constructor( a_from_lsb2msb, b_from_lsb2msb, prefix, with_equal ) {
    this.network = [];
    this.rs = [];
    for( var i = 0 ; i < a_from_lsb2msb.length || i < b_from_lsb2msb.length ; i++ ) {
      var aa = SIG_ZERO;
      if( i < a_from_lsb2msb.length ) aa = a_from_lsb2msb[i];
      var bb = SIG_ZERO;
      if( i < b_from_lsb2msb.length ) bb = b_from_lsb2msb[i];
      var prev_r = with_equal ? SIG_ONE : SIG_ZERO;
      if( i > 0 ) prev_r = this.rs[i-1];

      var rr = new OrGate( prefix + "_r" + i );
      {
        var and_xab_r = new AndGate( prefix + "_and_xab_r_" + i );
        {
          var xand_ab = new XAndGate( prefix + "_xand_ab." + i, aa, bb );
          this.network.push( xand_ab );
          and_xab_r.inputs.push( xand_ab );
          and_xab_r.inputs.push( prev_r );
          this.network.push( and_xab_r );
        }
        
        var and_a_not_b = new AndGate( prefix + "_and_a_not_b_" + i );
        {
          var not_b = new NotGate( prefix + "_not_b" + i, bb );
          this.network.push( not_b );
          and_a_not_b.inputs.push( aa );
          and_a_not_b.inputs.push( not_b );
          this.network.push( and_a_not_b );
        }

        rr.inputs.push( and_xab_r );
        rr.inputs.push( and_a_not_b );
        this.rs.push( rr );
        this.network.push( rr );
      }
    }
    //console.log( 'rs length', this.rs.length );
  }

  get_output_endpoint() {
    return this.rs[this.rs.length-1];
  }
}

class LessComparator extends GreaterComparator {
  constructor( a_from_lsb2msb, b_from_lsb2msb, prefix ) {
    super( b_from_lsb2msb, a_from_lsb2msb, prefix );
  }
}

class EqualComparator {
  constructor( a_from_lsb2msb, b_from_lsb2msb, prefix ) {
    this.network = [];
    this.output = new AndGate( prefix + "_o" );
    for( var i = 0 ; i < a_from_lsb2msb.length || i < b_from_lsb2msb.length ; i++ ) {
      var aa = SIG_ZERO;
      if( i < a_from_lsb2msb.length ) aa = a_from_lsb2msb[i];
      var bb = SIG_ZERO;
      if( i < b_from_lsb2msb.length ) bb = b_from_lsb2msb[i];

      var xand_ab = new XAndGate( prefix + "_xand_ab." + i, aa, bb );
      this.output.inputs.push( xand_ab );
      this.network.push( xand_ab );
    }
    this.network.push( this.output );
  }

  get_output_endpoint() {
    return this.output;
  }
}

class Divider { 
  constructor( dividend_from_lsb2msb, divider_from_lsb2msb, prefix ) {
    const W = dividend_from_lsb2msb.length;
    /*
      n: W-1 ~ 0
      remain[W] = dividend_from_lsb2msb
      Bit[n] = remain[n+1] >= (divider_from_lsb2msb << n) ? 1 : 0
      remain[n] = remain[n+1] - Bit[n] * (divider_from_lsb2msb << n)
    */

    this.remains = [];
    this.outputs = [];
    this.network = [];


    this.divider_from_lsb2msb_shift_Wsub1 = [];
    {
      for( var i = 0 ; i < W - 1 ; i++ ) {
        this.divider_from_lsb2msb_shift_Wsub1.push( SIG_ZERO );
      }
      this.divider_from_lsb2msb_shift_Wsub1 = this.divider_from_lsb2msb_shift_Wsub1.concat( divider_from_lsb2msb );
    }

    for( var i = 0 ; i < W ; i++ )
    {
      this.remains.push( null ); //placeholder
      this.outputs.push( null );
    }
    this.remains.push( dividend_from_lsb2msb );

    for( var n = W - 1 ; n >= 0 ; n-- ) {
      var div_lshift_n = this.divider_from_lsb2msb_shift_Wsub1.slice( W - 1 - n );
      var greater = new GreaterComparator( this.remains[n+1], div_lshift_n, prefix + "_geeq_div<<" + n, true );
      /*
      var equal = new EqualComparator( this.remains[n+1], div_lshift_n, prefix + "_eq_div<<" + n );
      var comp = new OrGate( prefix + "_o" + n );
      {
        comp.inputs.push( greater.get_output_endpoint() );
        comp.inputs.push( equal.get_output_endpoint() );
      }
      */
      this.network = this.network.concat( greater.network );
      //this.network = this.network.concat( equal.network );
      var comp = greater.get_output_endpoint();
      this.network.push( comp );
      this.outputs[n] = comp;

      var mul = new Multiplier( [comp], div_lshift_n );
      this.network = this.network.concat( mul.network );

      var subtractor = new Subtractor( this.remains[n+1], mul.get_output_endpoints(), prefix + "_remain_" + n );
      this.network = this.network.concat( subtractor.network );
      this.remains[n] = subtractor.get_output_endpoints();
    }

  }

  get_output_endpoints() {
    return this.outputs;
  }

  get_remain_output_endpoints() {
    return this.remains[0];
  }

}
