function Add2Simulator( simulator, network ) {
  for( var i = 0 ; i < network.length ; i++ ) {
    simulator.network.push( network[i] );
  }
}
function CreateInputDigits( width, panel, name, simulator, loop ) {
  var sigs = [];
  for( var i = 0 ; i < width ; i++ ) {
    sigs.push( new Signal( 0, name + "_" + i ) );
    simulator.network.push( sigs[i] );
  }

  new InputDigits( sigs, panel, name + ": " );
  //loop.register_monitor( input );

  return sigs;
}


function SetDecimal( decimal, signals_from_lsb2msb ) {
  for( var i = 0 ; i < signals_from_lsb2msb.length ; i++ ) {
    signals_from_lsb2msb[i].set_value( decimal & 1 );
    decimal >>= 1;
  }
}

function GetValue( signals_from_lsb2msb ) {
  var ret = 0;
  for( var i = 0 ; i < signals_from_lsb2msb.length ; i++ ) 
  {
    ret += signals_from_lsb2msb[i].get_last_signal() * (1<<i);
  }
  return ret;
}

function TestTiming( network, outputs_from_lsb2mdb, expect, max_loop, verbose ) {
  var meet = 0;
  for( var tick = 0 ; tick < max_loop ; tick++ ) {
    for( var i = 0 ; i < network.length ; i++ ) {
      network[i].peek( tick );
    }
    var v = GetValue( outputs_from_lsb2mdb );
    if( v == expect ) { meet++; }
    else { meet = 0; }

    if( verbose ) console.log( tick );

    if( meet >= 2048 ) {
      return tick - meet + 1;
    }
  }
  return -1;
}

function TestWhat( width, max_loop, kls, expect ) {
  var m = 0;
  for( var a = (1<<(width-2)) ; a < 1<<(width) ; a++ )
  {
    console.log( m );
    for( var b = 1 ; b < a+2 ; b++ ) {
      //console.log( ">>>", a, b);
      var as = [];
      var bs = [];
      for( var i = 0 ; i < width + 1; i++ ) {
        as.push( new Signal() );
        bs.push( new Signal() );
      }
      var div = new kls( as, bs, "tmp" );
      var network = [];
      network = network.concat( as );
      network = network.concat( bs );
      network = network.concat( div.network );

      SetDecimal( a, as );
      SetDecimal( b, bs );
      var delay = TestTiming( network, div.get_output_endpoints(), expect(a,b), max_loop );
      if( delay < 0 ) {
        throw( "something is wrong when doing " + a + "," +  b );
      }

      if( delay > m ) {
        m = delay;
        console.log('get max delay so far :', m, a, b );
      }
    }
  }
  return m;
}
