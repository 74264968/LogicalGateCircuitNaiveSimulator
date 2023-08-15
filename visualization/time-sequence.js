/*
  2023-07-04
*/
class TimeSequenceMonitor {
  constructor( signals, canvas_id, width ) {
    this.canvas_id = canvas_id;
    this.width = width;
    if( signals ) this.signals = signals;
    else this.signals = [];

    this.tick_offset = 0;
    this.canvas = document.getElementById( this.canvas_id );
    //TODO: change width and height settings
    this.canvas.width = this.width;
    //this.canvas.height = 256;
  }

  add_signal( signal ) {
    this.signals.push( signal );
  }

  update( tick ) {
    var ctx = this.canvas.getContext("2d");


    const LABEL_PADDING = 12;
    const LABEL_WIDTH_IN_PX = 256;
    const LINE_HEIGHT = 18;
    const TICK_WIDTH = 7;
    const FONT_SIZE = 12;
    const FONT = FONT_SIZE + "px serif";
    const SIGNAL_HEIGHT = LINE_HEIGHT - 8;

    this.canvas.height = LINE_HEIGHT * (this.signals.length + 2);

    ctx.font = FONT;
    ctx.textBaseline = "top";
    //0. clear old
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );
    ctx.restore();
    //1. draw labels
    var xx = LABEL_PADDING;
    var yy = LINE_HEIGHT;
    for( var i = 0 ; i < this.signals.length ; i++ ) {
      ctx.fillText( this.signals[i].name, xx, yy + (LINE_HEIGHT - FONT_SIZE) / 2, LABEL_WIDTH_IN_PX - 2*LABEL_PADDING );
      yy += LINE_HEIGHT;
    }

    //2. draw x-axis and grids
    var range = parseInt((( this.canvas.width - LABEL_WIDTH_IN_PX ) / TICK_WIDTH + 1 ) / 10 ) * 10;
    var tick_start = Math.max( 0, tick - range );
    var tick_end = tick_start + range;
    var step = 10;
    xx = LABEL_WIDTH_IN_PX;
    yy = 0;
    ctx.save();
    ctx.textAlign = "center";
    for( var i = tick_start ; i <= tick_end ; i+= step ) {
      ctx.fillText( "" + i, xx, yy );
      xx += step * TICK_WIDTH;
    }
    ctx.restore();

    // horizontal spliter 
    ctx.save();
    ctx.strokeStyle = "#8f8f8f";
    yy = LINE_HEIGHT;
    for( var i = 0 ; i <= this.signals.length ; i++ ) {
      ctx.beginPath();
      ctx.moveTo( LABEL_PADDING, yy );
      ctx.lineTo( this.canvas.width, yy );
      ctx.closePath();
      ctx.stroke();
      yy += LINE_HEIGHT;
    }
    ctx.restore();
    
    ctx.save();
    ctx.strokeStyle = "#efefef";
    xx = LABEL_WIDTH_IN_PX;
    for( var i = tick_start ; i <= tick_end ; i++ ) {
      ctx.beginPath()
      if( (i - tick_start) % step == 0 ) {
        ctx.save();
        ctx.strokeStyle = "#8f8f8f";
      }
      ctx.moveTo( xx + (i - tick_start ) * TICK_WIDTH, LINE_HEIGHT );
      ctx.lineTo( xx + (i - tick_start ) * TICK_WIDTH, LINE_HEIGHT + LINE_HEIGHT * this.signals.length );
      ctx.closePath();
      ctx.stroke();
      if( (i - tick_start) % step == 0 ) {
        ctx.restore();
      }
    }
    ctx.restore();
    
    //3. draw signals
    ctx.save();
    ctx.strokeStyle = "#ef3344";
    xx = LABEL_WIDTH_IN_PX;
    yy = LINE_HEIGHT;
    for( var i = 0 ; i < this.signals.length ; i++ ) {
      ctx.beginPath();
      var os = this.signals[i].peek( tick_start - 1 );
        ctx.moveTo( xx - TICK_WIDTH / 2, yy + (1-os)*SIGNAL_HEIGHT + (LINE_HEIGHT - SIGNAL_HEIGHT)/2 );
      for( var t = tick_start; t <= tick && t <= tick_end ; t++ ) {
        var s = this.signals[i].peek(t);

        //ctx.fillText( s, xx + (t-tick_start)*TICK_WIDTH , yy );

        ctx.lineTo( xx + (t-tick_start+1) * TICK_WIDTH - TICK_WIDTH / 2, yy + (1-s)*SIGNAL_HEIGHT + (LINE_HEIGHT - SIGNAL_HEIGHT)/2 );
      }
      ctx.stroke();
      yy += LINE_HEIGHT;
    }

    //4. draw signal color
    xx = LABEL_PADDING;
    yy = LINE_HEIGHT;
    for( var i = 0 ; i < this.signals.length ; i++ ) {
      var e = Math.min( tick, tick_end );
      var s = this.signals[i].peek( e );
      if( s ) {
        ctx.save();
        ctx.fillStyle = "green";
        ctx.fillText( this.signals[i].name, xx, yy + (LINE_HEIGHT - FONT_SIZE) / 2, LABEL_WIDTH_IN_PX - 2*LABEL_PADDING );
        ctx.restore();
      }
      yy += LINE_HEIGHT;
    }

  }

}
