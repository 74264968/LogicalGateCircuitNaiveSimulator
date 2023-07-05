/*
  2023-07-03
*/
const S_SIMPLE = "simple";
const S_COMPLEX = "complex";

var COMPONENT_COUNT = 0;
const COMPONENT_STAT = {};

class Component {
  constructor( type, inputs, type_name, name ) {
    this.type = type;
    this.inputs = inputs;
    this.type_name = type_name;
    this.signal_determined = []; //[tick_end, signal]

    if( !name ) {
      name = "auto_" + type_name + "_" + (COMPONENT_COUNT++);
    }
    this.name = name;

    if( !COMPONENT_STAT[this.type_name] ) {
      COMPONENT_STAT[ this.type_name ] = {count:0}
    }
    COMPONENT_STAT[ this.type_name ].count += 1;
  }

  get_determined_signal( tick ) {
    //TODO: binary search
    var which = 0;
    while( which < this.signal_determined.length ) {
      if( this.signal_determined[which][0] >= tick ) return this.signal_determined[which][1];
      which++;
    }
    return -1;
    
  }

  determine_signal( tick, sig ) {
    var which = this.signal_determined.length - 1;
    if( which >= 0 && this.signal_determined[which][1] == sig ) {
      this.signal_determined[which][0] = tick;
    }
    else {
      this.signal_determined.push( [tick, sig] );
    }
  }


}
class Signal extends Component
{
  constructor( value, name ) {
    super( S_SIMPLE, [], "SIGNAL", name );
    this.value = value;
  }

  peek( tick ) {
    return this.value;
  }
}

class Clock extends Component
{
  constructor( init_value, cycle, name ) {
    super( S_SIMPLE, [], "CLOCK", name );
    this.init_value = init_value;
    this.cycle = cycle;
  }

  peek( tick ) {
    if( tick < 0 || tick % this.cycle < this.cycle / 2 ) {
      return this.init_value;
    }
    return 1 - this.init_value;
  }
}

class Connector extends Component
{
  constructor( other, delay, name ) {
    if( other ) {
      super( S_SIMPLE, [other], "CONNECTOR", name );
      this.other = other;
    }
    else {
      super( S_SIMPLE, [], "CONNECTOR", name );
    }
    if( delay ) {
      this.delay = delay;
    }
    else this.delay = 0;
  }

  connector_to( other ) {
    if( this.other ) this.inputs.pop();
    this.other = other;
    if( this.other ) this.inputs.push( this.other );
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    if( this.other ) {
      return this.other.peek( tick - this.delay );
    }
    throw( "Connector has no input source" );
  }
}

class NotGate extends Component {
  constructor( name, other ) {
    if( other ) {
      super( S_COMPLEX, [other], "NOT_GATE", name );
    }
    else super( S_COMPLEX, [], "NOT_GATE", name );
  }

  peek( tick ) {
    if( tick < 0 ) return 1;
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;

    var sig = 1;
    for( var i = 0 ; i < this.inputs.length ; i++ ) {
      sig = 1 - this.inputs[i].peek( tick - 1 );
      break;
    }

    this.determine_signal( tick, sig );
  }


}

class OrGate extends Component {
  constructor( name ) {
    super( S_COMPLEX, [], "OR_GATE", name );
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;

    var sig = 0;
    for( var i = 0 ; i < this.inputs.length ; i++ ) {
      if( this.inputs[i].peek( tick - 1 ) > 0 ) { 
        sig = 1;
        break;
      }
    }

    this.determine_signal( tick, sig );
  }
}


class AndGate extends Component {
  constructor( name ) {
    super( S_COMPLEX, [], "AND_GATE", name );
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;

    var sig = this.inputs.length > 0 ? 1 : 0;
    for( var i = 0 ; i < this.inputs.length ; i++ ) {
      if( this.inputs[i].peek( tick - 1 ) < 1 ) { 
        sig = 0;
        break;
      }

    }

    this.determine_signal( tick, sig );
  }
}
