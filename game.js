// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = [];
    this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function (path) {
    console.log(path.toString());
    this.downloadQueue.push(path);
}

AssetManager.prototype.isDone = function () {
    return (this.downloadQueue.length == this.successCount + this.errorCount);
}
AssetManager.prototype.downloadAll = function (callback) {
    if (this.downloadQueue.length === 0) window.setTimeout(callback, 100);
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function () {
            console.log("dun: " + this.src.toString());
            that.successCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.addEventListener("error", function () {
            that.errorCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.src = path;
        this.cache[path] = img;
    }
}

AssetManager.prototype.getAsset = function(path){
    //console.log(path.toString());
    return this.cache[path];
}


function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();

    console.log('game initialized');
}

GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}

GameEngine.prototype.startInput = function () {
    console.log('Starting input');

    var getXandY = function (e) {
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left - 23.5;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top - 23.5;

        x = Math.floor(x / 39.55);
        y = Math.floor(y / 39.55);
 
        if (x < 0 || x > 18 || y < 0 || y > 18) return null;

        return { x: x, y: y };
    }

    var that = this;

    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
    }, false);

    console.log('Input started');
}

GameEngine.prototype.addEntity = function (entity) {
    console.log('added entity');
    this.entities.push(entity);
}

GameEngine.prototype.draw = function (drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
}

GameEngine.prototype.update = function () {
    var entitiesCount = this.entities.length;

    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];

        if (!entity.removeFromWorld) {
            entity.update();
        }
    }

    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

GameEngine.prototype.loop = function () {
    this.update();
    this.draw();
    this.click = null;
    this.wheel = null;
}

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {
}

Entity.prototype.draw = function (ctx) {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

Entity.prototype.rotateAndCache = function (image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(angle);
    offscreenCtx.translate(0, 0);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));
    offscreenCtx.restore();
    //offscreenCtx.strokeStyle = "red";
    //offscreenCtx.strokeRect(0,0,size,size);
    return offscreenCanvas;
}

// GameBoard code below

function GameBoard(game) {
    Entity.call(this, game, 20, 20);
    this.grid = false;
    this.black = true;
    this.board = [];
    for (var i = 0; i < 19; i++) {
        this.board.push([]);
        for (var j = 0; j < 19; j++) {
            this.board[i].push(0);
        }
    }
}

GameBoard.prototype = new Entity();
GameBoard.prototype.constructor = GameBoard;

GameBoard.prototype.cloneBoard = function () {
    var b = [];
    for (var i = 0; i < 19; i++) {
        b.push([]);
        for (var j = 0; j < 19; j++) {
            b[i].push(this.board[i][j]);
        }
    }
    return b;
}

GameBoard.prototype.update = function () {
    if (this.game.click) {
        var x = this.game.click.x;
        var y = this.game.click.y;
        if (this.board[x][y] === 0) {
            var color = this.black ? 1 : 2;
            var oldState = this.cloneBoard();
            this.board[x][y] = color;
            this.black = !this.black;

            var that = this;
            function checkCapture(dir) {
                if (that.board[dir.x][dir.y] === 0) return;
                if (that.board[dir.x][dir.y] === color) return;
                //check for capture
                var grp = [];
                var libs = [];
                that.countLiberties(dir.x, dir.y, grp, libs);
                if (libs.length === 0) {
                    for (var i = 0; i < grp.length; i++) {
                        that.board[grp[i].x][grp[i].y] = 0;
                    }
                }
            }

            if (x - 1 >= 0) {
                checkCapture({ x: x - 1, y: y });
            }
            if (y - 1 >= 0) {
                checkCapture({ x: x, y: y - 1 });
            }
            if (x + 1 <= 18) {
                checkCapture({ x: x + 1, y: y });
            }
            if (y + 1 <= 18) {
                checkCapture({ x: x, y: y + 1 });
            }

            var l = [];
            this.countLiberties(x, y, [], l);
            if (l.length === 0) {
                this.board = oldState;
                this.black = !this.black;
            }
        }
    }
    Entity.prototype.update.call(this);
}

GameBoard.prototype.draw = function (ctx) {
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/960px-Blank_Go_board.png"), this.x, this.y, 760, 760);
    for (var i = 0; i < 19; i++) {
        for (var j = 0; j < 19; j++) {
            if (this.grid) {
                ctx.strokeStyle = "green";
                ctx.strokeRect(23.5 + i * 39.55, 23.5 + j * 39.55, 39.55, 39.55);
            }
            if (this.board[i][j] === 1) {
                //black stone
                ctx.drawImage(ASSET_MANAGER.getAsset("./img/black.png"), i * 39.55 + 23.5, j * 39.55 + 23.5, 39.55, 39.55);
            }
            else if (this.board[i][j] === 2) {
                //white stone
                ctx.drawImage(ASSET_MANAGER.getAsset("./img/white.png"), i * 39.55 + 23.5, j * 39.55 + 23.5, 39.55, 39.55);
            }
       }
    }

    // draw mouse shadow
    if (this.game.mouse && this.board[this.game.mouse.x][this.game.mouse.y] === 0) {
        var mouse = this.game.mouse;
        ctx.save();
        ctx.globalAlpha = 0.5;
        if (this.black) {
            ctx.drawImage(ASSET_MANAGER.getAsset("./img/black.png"), mouse.x * 39.55 + 23.5, mouse.y * 39.55 + 23.5, 39.55, 39.55);
        } else {
            ctx.drawImage(ASSET_MANAGER.getAsset("./img/white.png"), mouse.x * 39.55 + 23.5, mouse.y * 39.55 + 23.5, 39.55, 39.55);
        }
        ctx.restore();
    }
}

GameBoard.prototype.countLiberties = function (x, y, grp, libs) {
    var color = this.board[x][y];
    if (color === 0) return;
    grp.push({ x: x, y: y });
    var that = this;

    function contains(lst, itm) {
        for (var i = 0; i < lst.length; i++) {
            if (lst[i].x === itm.x && lst[i].y === itm.y) return true;
        }
        return false;
    }

    function checkStone(dir) {
        var stone = that.board[dir.x][dir.y];
        if (stone === 0) {
            if (!contains(libs,{ x: dir.x , y: dir.y })) {
                libs.push({ x: dir.x, y: dir.y });
            }
        } else if (stone === color) {
            if (!contains(grp,{ x: dir.x, y: dir.y })) {
                that.countLiberties(dir.x, dir.y, grp, libs);
            }
        }
    }
    // four directions
    // west
    if (x - 1 >= 0) {
        checkStone({ x: x - 1, y: y });
    }
    // north
    if (y - 1 >= 0) {
        checkStone({ x: x, y: y - 1 });
    }
    // east
    if (x + 1 <= 18) {
        checkStone({ x: x + 1, y: y });
    }
    // south
    if (y + 1 <= 18) {
        checkStone({ x: x, y: y + 1 });
    }
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload("./img/960px-Blank_Go_board.png");
ASSET_MANAGER.queueDownload("./img/black.png");
ASSET_MANAGER.queueDownload("./img/white.png");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine();
    var gameboard = new GameBoard(gameEngine);
    gameEngine.addEntity(gameboard);
 
    gameEngine.init(ctx);
    gameEngine.start();
});
