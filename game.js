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

function Animation(spriteSheet, startX, startY, frameWidth, frameHeight, frameDuration, frames, loop, reverse) {
    this.spriteSheet = spriteSheet;
    this.startX = startX;
    this.startY = startY;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight = frameHeight;
    this.frames = frames;
    this.totalTime = frameDuration*frames;
    this.elapsedTime = 0;
    this.loop = loop;
    this.reverse = reverse;
}

Animation.prototype.drawFrame = function (tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    var index = this.reverse ? this.frames - this.currentFrame() - 1 : this.currentFrame();
    var vindex = 0;
    if ((index+1) * this.frameWidth + this.startX > this.spriteSheet.width) {
        index -= Math.floor((this.spriteSheet.width - this.startX) / this.frameWidth);
        vindex++;
    }
    while ((index + 1) * this.frameWidth > this.spriteSheet.width) {
        index -= Math.floor(this.spriteSheet.width / this.frameWidth);
        vindex++;
    }

    var locX = x;
    var locY = y;
    var offset = vindex === 0 ? this.startX : 0;
    ctx.drawImage(this.spriteSheet,
                  index * this.frameWidth + offset, vindex*this.frameHeight + this.startY,  // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth * scaleBy,
                  this.frameHeight * scaleBy);
}

Animation.prototype.currentFrame = function () {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function () {
    return (this.elapsedTime >= this.totalTime);
}

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;

    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
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
    this.timer = new Timer();
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
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top;

        if (x < 1024) {
            x = Math.floor(x / 32);
            y = Math.floor(y / 32);
        }

        return { x: x, y: y };
    }

    var that = this;

    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener("mouseleave", function (e) {
        that.mouse = null;
    }, false);

    this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
        e.preventDefault();
    }, false);

    this.ctx.canvas.addEventListener("keydown", function (e) {
        if (String.fromCharCode(e.which) === ' ') that.space = true;
        e.preventDefault();
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
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.space = null;
    this.click = null;
    this.wheel = null;
    this.over = null;
}

GameEngine.prototype.reset = function () {
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].reset();
    }
}

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {
}

Entity.prototype.reset = function () {
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

function BoundingBox(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.left = x;
    this.top = y;
    this.right = this.left + width;
    this.bottom = this.top + height;
}

BoundingBox.prototype.collide = function (oth) {
    if (this.right > oth.left && this.left < oth.right && this.top < oth.bottom && this.bottom > oth.top) return true;
    return false;
}

function PlayGame(game, x, y) {
    Entity.call(this, game, x, y);
}

PlayGame.prototype = new Entity();
PlayGame.prototype.constructor = PlayGame;

PlayGame.prototype.reset = function () {
    this.game.running = false;
}
PlayGame.prototype.update = function () {
    if (this.game.click && this.game.unicorn.lives > 0) this.game.running = true;
}

PlayGame.prototype.draw = function (ctx) {
    if (!this.game.running) {
        ctx.font = "24pt Impact";
        ctx.fillStyle = "purple";
        if (this.game.mouse) { ctx.fillStyle = "pink"; }
        if (this.game.unicorn.lives > 0) {
            ctx.fillText("Click to Play!", this.x, this.y);
        }
        else {
            ctx.fillText("Game Over Man!", this.x-30, this.y);
        }
    }
}

function Platform(game, x, y, width, height) {
    this.width = width;
    this.height = height;
    this.startX = x;
    this.startY = y;
    this.boundingbox = new BoundingBox(x, y, width, height);
    Entity.call(this, game, x, y);
}

Platform.prototype = new Entity();
Platform.prototype.constructor = Platform;

Platform.prototype.reset = function () {
    this.x = this.startX;
    this.y = this.startY;
}
Platform.prototype.update = function () {
    if (!this.game.running) return;
    this.x -= 400 * this.game.clockTick;
    if (this.x + this.width < 0) this.x += 3200;
    this.boundingbox = new BoundingBox(this.x, this.y, this.width, this.height);
    Entity.prototype.update.call(this);
}

Platform.prototype.draw = function (ctx) {
    var grad;
    var offset = 0;

    grad = ctx.createLinearGradient(0, this.y, 0, this.y + this.height);
    grad.addColorStop(0, 'red');
    grad.addColorStop(1 / 6, 'orange');
    grad.addColorStop(2 / 6, 'yellow');
    grad.addColorStop(3 / 6, 'green')
    grad.addColorStop(4 / 6, 'aqua');
    grad.addColorStop(5 / 6, 'blue');
    grad.addColorStop(1, 'purple');
    ctx.fillStyle = grad;


    ctx.fillRect(this.x, this.y, this.width, this.height);
}

function Unicorn(game) {
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/RobotUnicorn.png"), 0, 0, 206, 110, 0.02, 30, true, true);
    this.jumpAnimation = new Animation(ASSET_MANAGER.getAsset("./img/RobotUnicorn.png"), 618, 333, 174, 138, 0.02, 40, false, true);
    this.fallAnimation = new Animation(ASSET_MANAGER.getAsset("./img/RobotUnicorn.png"), 618, 333, 174, 138, 0.02, 15, true, true);
    this.jumping = false;
    this.lives = 3;
    game.lives.innerHTML = "Lives: " + this.lives;
    this.falling = false;
    this.boxes = false;
    this.lastY = this.y;
    this.platform = game.platforms[0];
    this.jumpHeight = 200;

    this.boundingbox = new BoundingBox(this.x + 25, this.y, this.animation.frameWidth - 40, this.animation.frameHeight - 20);

    Entity.call(this, game, 0, 400);
}

Unicorn.prototype = new Entity();
Unicorn.prototype.constructor = Unicorn;

Unicorn.prototype.reset = function () {
    this.jumping = false;
    this.falling = false;
    this.dead = false;
    this.lives--;
    if (this.lives < 0) this.lives = 0;
    this.game.lives.innerHTML = "Lives: " + this.lives;
    this.x = 0;
    this.y = 400;
    this.platform = this.game.platforms[0];
    this.boundingbox = new BoundingBox(this.x + 25, this.y, this.animation.frameWidth - 40, this.animation.frameHeight - 20);
}

Unicorn.prototype.update = function () {
    if (this.game.running) {
        if (this.dead) {
            this.game.reset();
            return;
        }
        if (this.game.space && !this.jumping && !this.falling) {
            this.jumping = true;
            this.base = this.y;
        }
        if (this.jumping) {
            var height = 0;
            var duration = this.jumpAnimation.elapsedTime + this.game.clockTick;
            if (duration > this.jumpAnimation.totalTime / 2) duration = this.jumpAnimation.totalTime - duration;
            duration = duration / this.jumpAnimation.totalTime;

            // quadratic jump
            height = (4 * duration - 4 * duration * duration) * this.jumpHeight;
            this.lastBottom = this.boundingbox.bottom;
            this.y = this.base - height;
            this.boundingbox = new BoundingBox(this.x + 32, this.y - 32, this.jumpAnimation.frameWidth - 20, this.jumpAnimation.frameHeight - 5);

            for (var i = 0; i < this.game.platforms.length; i++) {
                var pf = this.game.platforms[i];
                if (this.boundingbox.collide(pf.boundingbox) && this.lastBottom < pf.boundingbox.top) {
                    this.jumping = false;
                    this.y = pf.boundingbox.top - this.animation.frameHeight + 10;
                    this.platform = pf;
                    this.jumpAnimation.elapsedTime = 0;
                }
            }
        }
        if (this.falling) {
            this.lastBottom = this.boundingbox.bottom;
            this.y += this.game.clockTick / this.jumpAnimation.totalTime * 4 * this.jumpHeight;
            this.boundingbox = new BoundingBox(this.x + 32, this.y - 32, this.jumpAnimation.frameWidth - 20, this.jumpAnimation.frameHeight - 5);

            for (var i = 0; i < this.game.platforms.length; i++) {
                var pf = this.game.platforms[i];
                if (this.boundingbox.collide(pf.boundingbox) && this.lastBottom < pf.boundingbox.top) {
                    this.falling = false;
                    this.y = pf.boundingbox.top - this.animation.frameHeight + 10;
                    this.platform = pf;
                    this.fallAnimation.elapsedTime = 0;
                }
            }

        }
        if (!this.jumping && !this.falling) {
            this.boundingbox = new BoundingBox(this.x + 25, this.y + 10, this.animation.frameWidth - 40, this.animation.frameHeight - 20);
            if (this.boundingbox.left > this.platform.boundingbox.right) this.falling = true;
        }
        for (var i = 0; i < this.game.platforms.length; i++) {
            var pf = this.game.platforms[i];
            if (this.boundingbox.collide(pf.boundingbox)) {
                this.dead = true;
            }
        }
        if (this.y > this.game.ctx.canvas.height) this.dead = true;
    }
    Entity.prototype.update.call(this);
}

Unicorn.prototype.draw = function (ctx) {
    if (this.dead || !this.game.running) return;
    if (this.jumping) {
        if (this.boxes) {
            ctx.strokeStyle = "red";
            ctx.strokeRect(this.x + 32, this.y - 32, this.jumpAnimation.frameWidth, this.jumpAnimation.frameHeight);
            ctx.strokeStyle = "green";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.jumpAnimation.drawFrame(this.game.clockTick, ctx, this.x + 32, this.y - 32);
        if (this.jumpAnimation.isDone()) {
            this.jumpAnimation.elapsedTime = 0;
            this.jumping = false;
            this.falling = true;
        }
    }
    else if (this.falling) {
        if (this.boxes) {
            ctx.strokeStyle = "red";
            ctx.strokeRect(this.x + 32, this.y - 32, this.fallAnimation.frameWidth, this.fallAnimation.frameHeight);
            ctx.strokeStyle = "green";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.fallAnimation.drawFrame(this.game.clockTick, ctx, this.x + 32, this.y - 32);
    }
    else {
        if (this.boxes) {
            ctx.strokeStyle = "red";
            ctx.strokeRect(this.x, this.y, this.animation.frameWidth, this.animation.frameHeight);
            ctx.strokeStyle = "green";
            ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
    }
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./img/RobotUnicorn.png");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var lives = document.getElementById('lives');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine();
    var platforms = [];
    var pf = new Platform(gameEngine, 0, 500, 1800, 100);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new Platform(gameEngine, 1200, 350, 600, 100);
    gameEngine.addEntity(pf);
    platforms.push(pf);
    pf = new Platform(gameEngine, 2050, 250, 1800, 100);
    gameEngine.addEntity(pf);
    platforms.push(pf);

    gameEngine.lives = lives;
    gameEngine.platforms = platforms;
    gameEngine.running = false;

    var unicorn = new Unicorn(gameEngine);
    var pg = new PlayGame(gameEngine, 320, 350);

    gameEngine.addEntity(unicorn);
    gameEngine.addEntity(pg);

    gameEngine.unicorn = unicorn;

    gameEngine.init(ctx);
    gameEngine.start();
});
