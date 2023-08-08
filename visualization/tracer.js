/*
  2023-08-08
*/

class Tracer { 
  constructor( signals_lsb2msb, parent_dom_id, label_name ) {
    this.signals = signals_lsb2msb;
    this.last_value = -1;
    this.last_tick = -1;
    var p = document.getElementById( parent_dom_id );
    var label = document.createElement("label");
    {
      label.innerHTML = label_name;
      p.appendChild( label );
    }
    this.container = document.createElement("div");
    {
      this.container.setAttribute("style", "max-height:128px;overflow-y:scroll");
      p.appendChild( this.container );
    }
  }

  get_value_of_tick( tick ) {
    var ret = 0;
    for( var i = 0 ; i < this.signals.length ; i++ ) {
      ret += this.signals[i].peek(tick) * (1<<i);
    }
    return ret;
  }

  create_new( tick, value ) { 
    var p = document.createElement( "div" );
    var s = document.createElement( "label" );
    {
      s.setAttribute("class", "lb_tick_start");
      s.setAttribute("style", "display:inline-block;width:128px");
      s.innerHTML = tick;
      p.appendChild( s );
    }
    var e = document.createElement( "label" );
    {
      e.setAttribute("class", "lb_tick_end");
      e.setAttribute("style", "display:inline-block;width:128px");
      p.appendChild( e );
    }
    var v = document.createElement( "label" );
    {
      v.setAttribute("class", "lb_tick_value" );
      v.setAttribute("style", "display:inline-block;width:128px;text-align:right");
      v.innerHTML = value;
      p.appendChild( v );
    }
    this.container.prepend( p );
    return p;
  }

  write_end_tick( which, tick ) {
    which.children[1].innerHTML = tick + "(" + (tick - parseInt( which.children[0].innerHTML ) + 1)  + ")";
  }


  update( tick ) {
    for( var i = this.last_tick + 1 ; i <= tick ; i++ ) {
      var cur_value = this.get_value_of_tick( i );
      var which = null;
      if( cur_value == this.last_value && this.container.children.length > 0 ) { 
        which = this.container.children[0];
      } else {
        which = this.create_new( i, cur_value );
      }
      this.write_end_tick( which, i );
      this.last_value = cur_value;
    }
    this.last_tick = tick;
  }
}

