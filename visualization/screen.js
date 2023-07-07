class PixelScreen {
  constructor( signals, canvas_id, width, height, pixel_size ) {
      this.canvas = document.getElementById( canvas_id );
      this.canvas.width = width;
      this.canvas.height = height;

      this.signals = signals.flatMap( (x) => x );
      this.pixel_size = pixel_size;
      this.screen_width = parseInt(width / pixel_size);
      this.old_v = {};
    }

  update( tick ) {
    var ctx = this.canvas.getContext("2d");
    for( var i = 0 ; i < this.signals.length ; i++ ) {
      var v = this.signals[i].peek( tick );
      if( v == this.old_v[i] ) continue;
      this.old_v[i] = v;
      ctx.fillStyle = v == 1 ? "#777777" : "#ffffff";
      var xx = (i % this.screen_width) * this.pixel_size;
      var yy = parseInt(i / this.screen_width) * this.pixel_size;
      ctx.fillRect( xx, yy, this.pixel_size, this.pixel_size );
    }
  }
}

