<!DOCTYPE html>
<html>
<head>
  <style>
  </style>
  <script language="javascript" src="/core/fundamental/gates.js"></script>
  <script language="javascript" src="/core/fundamental/simulating.js"></script>
  <script language="javascript" src="/core/prefabs/stateful.js"></script>
  <script language="javascript" src="/core/prefabs/stateless.js"></script>
  <script language="javascript" src="/core/prefabs/alu.js"></script>
  <script language="javascript" src="/visualization/time-sequence.js"></script>
  <script language="javascript" src="/visualization/input-interfaces.js"></script>
  <script language="javascript" src="/visualization/screen.js"></script>
  <script language="javascript" src="/visualization/dec-display.js"></script>
  <script language="javascript" src="/visualization/tracer.js"></script>
  <script language="javascript" src="/scaffold/helpers.js"></script>
  <script language="javascript">
  const SCREEN_PIXEL_SIZE = 4;
  const SCREEN_WIDTH_IN_PX = 160 * SCREEN_PIXEL_SIZE;
  const SCREEN_HEIGHT_IN_PX = 80 * SCREEN_PIXEL_SIZE;
  //write the network here
  class Impl {
    constructor( clock ) {
      this.clock = clock;
    }

    get_network( ) {
      return [this.clock];
    }

    get_switches( ) {
      return [[new Signal(1,"hello"), 1]];
    }
    
    get_variables( ) {
      return [
        ["var", [new Signal(1,"a var")]]
      ];
    }

    get_watch_sigs( ) {
      return [new Signal(1, "1")];
    }

    get_watch_values( ) {
      return [
        [[new Signal(1, "yet another var")], false, "another var", true],
      ]
    }

    
    get_screen_sigs( ) {
      return [this.clock];
    }

  }

  function Onload( ) {
    var clk = new Clock( 1, 50 );
    var impl = new Impl( clk );
    var mon_sigs = [clk].concat(impl.get_watch_sigs());
    var screen_sigs = impl.get_screen_sigs();
    var network = [clk].concat( impl.get_network() );
    var switches = impl.get_switches();
    var input_vars = impl.get_variables();
    var watch_vars = impl.get_watch_values();
    var simulator = new Simulator( network, 0 );
    var tm = new TimeSequenceMonitor( mon_sigs, "timeseq", 768 );
    var screen = new PixelScreen( screen_sigs, "screen", SCREEN_WIDTH_IN_PX, SCREEN_HEIGHT_IN_PX, SCREEN_PIXEL_SIZE );
    var loop = new MainLoop( simulator, 1, 5 );
    loop.register_monitor( tm );
    loop.register_monitor( screen );

    switches.map( (x) => {
      new InputSwitch( x[0], "op_top", "active", "inactive", x[1] );
    } );

    input_vars.map( (x) => {
      new InputDigits( x[1], "vars", x[0] );
    } );

    watch_vars.map( (x) => {
      var tmp = new DecimalDisplay( x[0], x[1], "watching", x[2], x[3] )
      loop.register_monitor( tmp );
    } );

    function update( )
    {
      loop.update();
    }
    setInterval( update, loop.frame_in_ms );

    loop.start();

    var btnResume = document.getElementById("btnResume");
    btnResume.onclick = function() { loop.resume(); }

    var btnStop = document.getElementById("btnStop");
    btnStop.onclick = function() { loop.pause(); }

    var btnStep = document.getElementById("btnStep");
    btnStep.onclick = function() { loop.step(); }
    var btnStep_10 = document.getElementById("btnStep_10");
    btnStep_10.onclick = function() { loop.step(10); }
  }

  </script>
  <style>
    body {margin:0;padding:0;font-size:0}
    .container {display: flex;flex-direction: column; height:100vh;}
    .top {width:100%;height:28px;font-size:12px;border-bottom:1px solid #aa3;background-color:#eeb;padding:4px;overflow-x:scroll;}
    .middle{display: flex; flex-direction: row; width: 100vw; flex: 1;margin-bottom:0;overflow-y:scroll;}
    .start {width:200px; background-color:#eeb;padding:8px;border-right:1px solid #aa3;overflow-y:scroll;}
    .main{flex: 1;padding:4px;flex-direction:column;overflow-y:scroll;}
    .bottom{height:28px;padding: 8px;background-color:#dd8;text-align:center;border-top:1px solid #bb3;}
    .labeled-value {display:flex;flex-direction:row;height:25px;}
    .labeled-value label{font-size:10px;width:100px;text-align:left;height:14px;margin-right:4px;text-overflow:ellipsis;overflow:hidden}
    .labeled-value input {height: 14px; font-size: 10px;background-color:#eea;border:1px solid #aaa;}
    #screen{border:1px solid #eee}
    h3 {font-size:16px;}
    button {border:1px solid #338; padding:4px;margin-right:4px;}
    button:hover {border:1px solid #996;cursor:pointer}
    .active {background-color: #33aa44; color:#eef}
    .inactive {background-color: none;}
  </style>
</head>
<body onload="javascript:Onload()">
  <div class="container">
    <div class="top" id="op_top">
    </div>
    <div class="middle">
      <div class="start">
        <h3>Variables</h3>
        <div id="vars"></div>
        <hr />
        <h3>Watching</h3>
        <div id="watching"></div>
      </div>
      <div class="main">
        <canvas id="screen"></canvas>
        <div style="height:10px"></div>
        <canvas id="timeseq"></canvas>
      </div>
    </div>
    <div class="bottom">
      <button id="btnResume"> resume </button>
      <button id="btnStop"> stop </button>
      <button id="btnStep"> step </button>
      <button id="btnStep_10"> step 10 </button>
    </div>
  </div>
  <!--
  <div>
  <button id="btnResume">resume</button>
  <button id="btnStop">stop</button>
  </div>
  <div id="signalPanel" style="padding: 20px"></div>
  <div id="digitPanel" style="padding: 20px"></div>
  <div>
  <canvas id="screen"></canvas>
  </div>
  <div>
  <canvas id="timeseq"></canvas>
  </div>
  -->
</body>
</html>
