/*
  2023-07-03
*/
const S_SIMPLE = "simple";
const S_COMPLEX = "complex";

var __record_component_flag = false;
var __recorded_components = [];
function START_RECORDING_COMPONENT( ) {
  __record_component_flag = true;
  __recorded_components = [];
}

function END_RECORDING_COMPONENT() {
  __record_component_flag = false;
}

function GET_RECORDING_SOFAR() {
  return __recorded_components;
}

var COMPONENT_COUNT = 0;
var ALL_COMPONENTS = [];
function GET_COMPONENT_STAT() {
  var connections = 0;
  for( var i = 0 ; i < ALL_COMPONENTS.length ; i++ ) {
    connections += ALL_COMPONENTS[i].inputs.length;
  }
  return [ALL_COMPONENTS.length, connections, COMPONENT_STAT];
}
const COMPONENT_STAT = {};


class Component {
  constructor( type, inputs, type_name, name ) {
    this.type = type;
    this.inputs = inputs;
    this.type_name = type_name;
    this.signal_determined = []; //[tick_end, signal]
    ALL_COMPONENTS.push( this );
    if( __record_component_flag ) {
      __recorded_components.push( this );
    }

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
    var l = 0;
    var r = this.signal_determined.length - 1;
    var ans = -1;
    while( r - l > 1 ) {
      var m = (r + l) >> 1;
      if( this.signal_determined[m][0] >= tick ) r = m;
      else if( this.signal_determined[m][0] <= tick ) l = m;
    }
    if( this.signal_determined.length > 0 && l >= 0 && this.signal_determined[l][0] >= tick ) ans = l;
    else if( r >= 0 && this.signal_determined[r][0] >= tick ) ans = r;
    if( ans != -1 ) return this.signal_determined[ans][1];
    return -1;
   // var which = 0;
   // while( which < this.signal_determined.length ) {
   //   if( this.signal_determined[which][0] >= tick ) 
   //   {
   //     if( which != ans ) {
   //       console.log( 'bad ans', ans, which, this.signal_determined );
   //     }
   //     return this.signal_determined[which][1];
   //   }
   //   which++;
   // }
   // if( ans != -1 ) console.log( 'bad ans 2', ans, -1, this.signal_determined );
   // return -1;
    
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

  get_last_signal( ) {
    if( this.signal_determined.length > 0 ) {
      return this.signal_determined[this.signal_determined.length-1][1];
    }
    return 0;
  }


}
class Signal extends Component
{
  constructor( value, name ) {
    super( S_SIMPLE, [], "SIGNAL", name );
    this.value = value;
    this.attached = null;
    this.is_const = false;
  }

  set_const( ) {
    this.is_const = true;
  }

  set_value( n_value ) {
    this.value = n_value;
  }

  set_attached( what ) {
    if( this.attached ) { 
      throw this.name + " is already being attached!";
    }
    this.attached = what;
  }

  peek( tick ) {
    var res = this.get_determined_signal( tick );
    if( res >= 0 ) return res;
    this.determine_signal( tick, this.value );
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

  connect_to( other ) {
    if( this.other ) this.inputs.pop();
    this.other = other;
    if( this.other ) this.inputs.push( this.other );
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    if( this.other ) {
      return this.other.peek( tick - this.delay );
    }
    return 0;
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

class XOrGate extends Component {
  constructor( name, a, b ) {
    super( S_COMPLEX, [], "XOR_GATE", name );
    this.a = a;
    this.b = b;
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;

    //try {
    var sig = 1;
    if( this.a.peek( tick - 1 ) == this.b.peek( tick - 1 ) ) sig = 0;
    /*} catch {
      console.warn( this.name + " has error", this.a, this.b );
    }*/

    this.determine_signal( tick, sig );
    return sig;
  }

}

class XAndGate extends Component {
  constructor( name, a, b ) {
    super( S_COMPLEX, [], "XAND_GATE", name );
    this.a = a;
    this.b = b;
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;

    //try {
    var sig = 0;
    if( this.a.peek( tick - 1 ) == this.b.peek( tick - 1 ) ) sig = 1;
    /*} catch {
      console.warn( this.name + " has error", this.a, this.b );
    }*/

    this.determine_signal( tick, sig );
    return sig;
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
    return sig;
  }
}

class NOrGate extends Component {
  constructor( name ) {
    super( S_COMPLEX, [], "NOR_GATE", name );
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;

    var sig = 1;
    for( var i = 0 ; i < this.inputs.length ; i++ ) {
      if( this.inputs[i].peek( tick - 1 ) > 0 ) { 
        sig = 0;
        break;
      }
    }

    this.determine_signal( tick, sig );
    return sig;
  }
}

class AndGate extends Component {
  constructor( name ) {
    super( S_COMPLEX, [], "AND_GATE", name );
  }

  peek( tick ) {
    //try {
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
    return sig;
    /*
    } catch { 
      console.warn( 'error at ' + this.name );
    }
    */
  }
}

class TriStateGate extends Component {
  constructor( control, data, name ) {
    super( S_COMPLEX, [], "TS_GATE", name );
    this.control = control;
    this.data = data;
  }

  peek( tick ) {
    if( tick < 0 ) return 0;
    var sig = this.get_determined_signal( tick );
    if( sig >= 0 ) return sig;

    var sig = 0;
    if( this.control.peek( tick - 1 ) ) sig = this.data.peek( tick - 1 );

    this.determine_signal( tick, sig );
    return sig;
  }
}

const SIG_ZERO = new Signal( 0, "sig_zero" );
SIG_ZERO.set_const();
const SIG_ONE = new Signal( 1, "sig_one" );
SIG_ONE.set_const();


