// 2023-10-25

function NewComponentArray( count, what, prefix_or_name_loc, ...rest) {
  var res = [];
  for( var i = 0 ; i < count ; i++ ) {
    var args = [];
    for( var j = 0 ; j < rest.length ; j++ ) {
      if( rest[j] && Object.getPrototypeOf(rest[j]) === Object.getPrototypeOf([]) ) {
        args.push( rest[j][i] );
      } else {
        args.push( rest[j] );
      }
    }
    args[prefix_or_name_loc] = rest[prefix_or_name_loc] + "_" + i;
    res.push( new what( ...args ) );
  }
  return res;
}

function Connect( connectors, others, check ) {
  if( check && connectors.length != others.length ) {
    throw `trying to connect two groups of diff endpoints from ${connectors.length} to ${others.length}, but you said it was illegal`;
  }
  for( var i = 0 ; i < connectors.length ; i++ ) {
    if( others[i] ) {
      connectors[i].connect_to( others[i] );
    } else {
      connectors[i].connect_to( SIG_ZERO );
    }
  }
}

function CreateByMask( vals, nvals, mask_str, name ) {
  console.assert( vals.length == nvals.length );
  mask_str = mask_str.replaceAll(' ', '');
  var res = new AndGate( name );
  for( var i = 0 ; i < mask_str.length ; i++ ) {
    if( mask_str[i] == '1' ) res.inputs.push( vals[i] );
    else if ( mask_str[i] == '0' ) res.inputs.push( nvals[i] );
  }
  return res;
}

function CreateAnd( name, ...gates ) {
  var res = new AndGate( name );
  for( var i = 0 ; i < gates.length ; i++ ) {
    res.inputs.push( gates[i] );
  }
  return res;
}

//returns [MultiSource Of Reg Value, Reg Endpoints, ~Reg Endpoints, Reg Enable as a MultiSource]
function CreateNetCrossing( width, name )
{
  var ms_reg = new MultiSource( [], [], width, name + "_ms" );
  var ms_en = new MultiSource( [], [], 1, name + "_en" );
  var reg = NewComponentArray( width, Bit, 2, 
                               ms_en.get_output_endpoints()[0], 
                               ms_reg.get_output_endpoints(),
                               name );
  return [ ms_reg, 
           reg.map( (x)=>x.get_output_endpoint() ), 
           reg.map( (x)=>x.get_n_output_endpoint() ), 
           ms_en ];
}
