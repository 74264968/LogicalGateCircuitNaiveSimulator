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
