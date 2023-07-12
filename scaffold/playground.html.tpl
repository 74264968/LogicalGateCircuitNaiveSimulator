<!DOCTYPE html>
<html>
<head>
  <style>
    button {border:1px solid #338; padding:4px;}
    button:hover {border:1px solid #996;cursor:pointer}
    .active {background-color: #33aa44; color:#eef}
    .inactive {background-color: none;}
  </style>
  <script language="javascript" src="/core/fundamental/gates.js"></script>
  <script language="javascript" src="/core/fundamental/simulating.js"></script>
  <script language="javascript" src="/core/prefabs/stateful.js"></script>
  <script language="javascript" src="/visualization/time-sequence.js"></script>
  <script language="javascript" src="/visualization/input-interfaces.js"></script>
  <script language="javascript" src="/visualization/screen.js"></script>
  <script language="javascript" src="/visualization/dec-display.js"></script>
  <script language="javascript">
  function Onload( ) {
    var clk = new Clock( 1, 50 );
    var sigs = [];
    var simulator = new Simulator( sigs, 0 );
    var tm = new TimeSequenceMonitor( sigs, "timeseq", 768 );
    var screen = new PixelScreen( sigs, "screen", 64, 64, 8 );
    var loop = new MainLoop( simulator, 1, 1000 );
    loop.register_monitor( tm );
    loop.register_monitor( screen );
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

  }
  </script>
</head>
<body onload="javascript:Onload()">
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
</body>
</html>
