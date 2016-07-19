(function() {
    var gui = require('nw.gui');
    var win = gui.Window.get();

    //Window controls for min, max, and close
    document.getElementById('windowControlMinimize').onclick = function(e) {
        e.preventDefault();
        win.minimize();
    };

    // Close
    document.getElementById('windowControlClose').onclick = function(e) {
        e.preventDefault();
        win.close();
    };

    // Max
    document.getElementById('windowControlMaximize').onclick = function(e) {
        e.preventDefault();
        if (win.isMaximized)
            win.unmaximize();
        else
            win.maximize();
    };

    win.on('maximize', function() {
        win.isMaximized = true;
    });

    win.on('unmaximize', function() {
        win.isMaximized = false;
    });
})();
