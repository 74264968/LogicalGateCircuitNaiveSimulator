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
