//2023-07-18

class EdgeDetector {
  constructor( input, last, prefix ) {
    this.network = [];
    var not_input = new NotGate( prefix + "_ni", input );
    var edge_detect = new AndGate( prefix + "_ed" );
    edge_detect.inputs.push( not_input );
    edge_detect.inputs.push( input );
    this.output = new OrGate( prefix + "_o" );
    this.output.inputs.push( edge_detect );
    for( var i = 0 ; i < last ; i++ ) {
      var conn = new Connector( edge_detect, i, prefix + "_d" + i );
      this.output.inputs.push( conn );
      this.network.push( conn );
    }
    this.network.push( not_input );
    this.network.push( edge_detect );
    this.network.push( this.output );

  }

  get_output_endpoint() {
    return this.output;
  }
}

class Smooth {
  constructor( input, prefix ) {
    this.d2 = new Connector( input, 2, "_sm_d2" );
    this.d1 = new Connector( input, 1, "_sm_d1" );
    this.__x = new AndGate( prefix + "_sm_11x" );
    {
      this.__x.inputs.push( this.d2 );
      this.__x.inputs.push( this.d1 );
    }
    this._x_ = new AndGate( prefix + "_sm_1x1" );
    {
      this._x_.inputs.push( this.d2 );
      this._x_.inputs.push( input );
    }
    this.x__ = new AndGate( prefix + "_sm_x11" );
    {
      this.x__.inputs.push( this.d1 );
      this.x__.inputs.push( input );
    }
    this.output = new OrGate( prefix + "_sm_out" );
    {
      this.output.inputs.push( this.__x );
      this.output.inputs.push( this._x_ );
      this.output.inputs.push( this.x__ );
    }

    this.network = [ 
      this.d2, 
      this.d1, 
      this.__x, 
      this._x_, 
      this.x__,
      this.output,
      ];
  }

  get_output_endpoint( ) {
    return this.output;
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



class Bus { 
  constructor( addr_decoder, data_width, prefix ) {
    this.network = [];
    this.data_width = data_width;
    this.outputs = [];
    this.occupied = {};
    this.decoder = addr_decoder;
    this.data_width = data_width;
    this.name = prefix;
    for( var i = 0 ; i < this.data_width; i++ ) {
      var tmp = new OrGate( prefix + "_o." + i );
      this.outputs.push( tmp );
      this.network.push( tmp );
    }
  }

  append( address, endpoints ) {
    if( this.occupied.hasOwnProperty( address ) ) {
      console.warn( `${this.name} address of ${address} has already bound to endpoints` );
      return false;
    }

    if( endpoints.length != this.data_width ) {
      console.warn( `${this.name} has different data width of ${this.data_width} from endpoints when binding address ${address}` );
      return false;
    }

    for( var i = 0 ; i < this.data_width ; i++ ) {
      var tri = new TriStateGate( this.decoder.get_output_endpoint_at( address ), endpoints[i], this.name + "_tr[" + address + "].i" );
      this.network.push( tri );
      this.outputs[i].inputs.push( tri );
    }

    return true;
  }

  get_output_endpoints( ) {
    return this.outputs;
  }
}

// actually, a selector
class MultiSource {
  constructor( valids, inputs, data_width, prefix, with_priority ) {
    this.network = [];
    this.data_width = data_width;
    this.outputs = [];
    this.prefix = prefix;
    this.with_priority = with_priority;
    this.n_valids = [];
    for( var i = 0 ; i < data_width ; i++ ) {
      this.outputs.push( new OrGate( prefix + "_o" + i ) );
      this.network.push( this.outputs[i] );
    }

    for( var i = 0 ; i < valids.length && i < inputs.length; i++ ) {
      this.append( valids[i], inputs[i] );
    }
  }

  append( valid, input ) {
    var idx = this.outputs[0].length;
    var what = valid;
    if( this.with_priority ) {
      var new_valid = new AndGate( this.prefix + "_new_v" + (this.n_valids.length + 1) );
      for( var i = 0 ; i < this.n_valids.length ; i++ ) {
        new_valid.inputs.push( this.n_valids[i] );
      }
      new_valid.inputs.push( valid );
      what = new_valid;

      var n_valid = new NotGate( this.prefix + "_not_v" + this.n_valids.length );
      n_valid.inputs.push( valid );
      this.n_valids.push( n_valid );
    }

    for( var i = 0 ; i < this.data_width ; i++ ) {
      var v = new AndGate( this.prefix + "_o" + i + "." + idx );
      {
        v.inputs.push( what );
        v.inputs.push( input[i] || SIG_ZERO );
      }
      this.outputs[i].inputs.push(v);
      this.network.push( v );
    }
  }

  get_output_endpoints( ) {
    return this.outputs;
  }
}
