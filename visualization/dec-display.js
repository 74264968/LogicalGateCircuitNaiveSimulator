/*
  2023-07-07
*/
class DecimalDisplay {
  constructor( signals_lsb2msb, signed, parent_dom_id, label_name, as_hex ) {
    var label = document.createElement("label");
    {
      label.innerHTML = label_name;
    }
    var textbox = document.createElement("input");
    {
      //textbox.setAttribute("type", "number");
      textbox.setAttribute("readonly", "true");
    }
    var container = document.createElement("div");
    {
      container.setAttribute("class", "labeled-value");
      container.appendChild( label );
      container.appendChild( textbox );
    }
    var p = document.getElementById( parent_dom_id );
    p.appendChild( container );

    this.signals = signals_lsb2msb;
    this.signed = signed;
    this.textbox = textbox;
    this.as_hex = as_hex;
  }

  update( tick ) {
    var dec_v = 0;
    var base = 1;
    var hex = '';
    var ALPHABET = '0123456789ABCDEF';
    if( this.as_hex ) {
      for( var i = 0 ; i < this.signals.length ; i+= 8 ) {
        var values = parseInt(this.signals.slice(i,i+8).map( (x) => x.peek(tick) ).reverse().join(''),2);
        hex += ALPHABET[Math.floor(values / 16)] + ALPHABET[values%16];
      }
      this.textbox.value = '0x' + hex + '';
    }
    else if( this.signed && this.signals[this.signals.length-1].peek(tick) ) {
      for( var i = 0 ; i < this.signals.length - 1; i++ ) {
        dec_v += (1 - this.signals[i].peek(tick)) * base;
        base *= 2;
      }
      dec_v += 1;
      dec_v = -dec_v;
      this.textbox.value = dec_v;
    } else {
      for( var i = 0 ; i < this.signals.length ; i++ ) {
        dec_v += this.signals[i].peek(tick) * base;
        base *= 2;
      }
      this.textbox.value = dec_v;
    }
  }
}
