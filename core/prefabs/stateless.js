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
