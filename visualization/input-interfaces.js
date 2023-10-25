class InputSwitch {
  constructor( which_signal, parent_dom_id, active_class, inactive_class, initial_value ) {
    var parent_dom_id = document.getElementById( parent_dom_id );
    var btn = document.createElement("button");
    this.initial_value = initial_value;
    this.active_class = active_class;
    this.inactive_class = inactive_class;
    this.signal = which_signal;
    this.btn = btn;
    var that = this;
    which_signal.set_value( initial_value );
    which_signal.set_attached( btn );
    this.fix_class();
    btn.innerHTML = which_signal.name;
    btn.addEventListener( 'click', function() {
      that.signal.set_value( 1 - that.signal.value );
      that.fix_class();
    } )
    parent_dom_id.appendChild( btn );
  }

  fix_class( ) {
    var arr = (this.btn.getAttribute("class") || "").split(" ");
    arr.push( this.active_class );
    arr.push( this.inactive_class );
    var n;
    if( this.signal.value ) {
      n = arr.filter( (x) => x != this.inactive_class ).join( " " )
    }
    else {
      n = arr.filter( (x) => x != this.active_class ).join( " " )
    }
    this.btn.setAttribute("class", n )
  }
}

class InputDigits {
  constructor( signals_lsb2msb, parent_dom_id, label_name ) {
    this.signals = signals_lsb2msb;
    var that = this;
    var textbox = document.createElement("input");
    {
      textbox.setAttribute("type", "number");
      textbox.value = "0";
      textbox.addEventListener('change', function() {
        var v = parseInt(textbox.value);
        for( var i = 0 ; i < that.signals.length ; i++ ) {
          if( v & (1<<i) ) that.signals[i].set_value( 1 );
          else that.signals[i].set_value( 0 );
        }
      } );
    }
    var label = document.createElement("label");
    {
      label.innerHTML = label_name;
    }
    var container = document.createElement("div");
    {
      container.setAttribute("class", "labeled-value");
      container.appendChild( label );
      container.appendChild( textbox );
    }
    var parent_dom = document.getElementById(parent_dom_id);
    parent_dom.appendChild( container );

    for( var i = 0 ; i < signals_lsb2msb.length ; i++ ) {
      signals_lsb2msb[i].set_attached( textbox );
    }
  }
}
