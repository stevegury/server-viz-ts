var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var SPEED = 0.1;
var MoveableEntity = /** @class */ (function () {
    function MoveableEntity(w, h) {
        this.positionX = Math.round(2000 * Math.random()); // TODO
        this.positionY = Math.round(2000 * Math.random());
        this.targetX = this.positionX;
        this.targetY = this.positionY;
        this.w = w;
        this.h = h;
        this.leftAnchorPointX = this.positionX;
        this.leftAnchorPointY = this.positionY;
        this.rightAnchorPointX = this.positionX;
        this.rightAnchorPointY = this.positionY;
    }
    MoveableEntity.prototype.update = function (t) {
        if (this.positionX != this.targetX || this.positionY != this.targetY) {
            this.positionX += (this.targetX - this.positionX) * SPEED;
            this.positionY += (this.targetY - this.positionY) * SPEED;
            if (Math.abs(this.targetX - this.positionX) < 1.5) {
                this.positionX = this.targetX;
            }
            if (Math.abs(this.targetY - this.positionY) < 1.5) {
                this.positionY = this.targetY;
            }
        }
        var offset = 5;
        this.leftAnchorPointX = this.positionX - offset;
        this.leftAnchorPointY = this.positionY + this.h / 2;
        this.rightAnchorPointX = this.positionX + this.w + offset;
        this.rightAnchorPointY = this.positionY + this.h / 2;
    };
    MoveableEntity.prototype.setTarget = function (x, y) {
        this.targetX = x;
        this.targetY = y;
    };
    MoveableEntity.prototype.isInside = function (x, y) {
        return (this.positionX <= x && x <= this.positionX + this.w
            && this.positionY <= y && y <= this.positionY + this.h);
    };
    return MoveableEntity;
}());
var Square = /** @class */ (function (_super) {
    __extends(Square, _super);
    function Square(w, h) {
        return _super.call(this, w, h) || this;
    }
    Square.prototype.draw = function (ctx) {
        var xx = Math.round(this.positionX);
        var yy = Math.round(this.positionY);
        var ww = Math.round(this.w);
        var hh = Math.round(this.h);
        ctx.fillStyle = "#999";
        ctx.fillRect(xx, yy, ww, hh);
        ctx.lineWidth = 1;
        ctx.strokeRect(xx, yy, ww, hh);
    };
    Square.prototype.click = function (x, y, left) {
        console.log((left ? "LEFT" : "RIGHT") + " CLICK ON SQUARE(" + this.positionX + ", " + this.positionY + ")");
        return true;
    };
    return Square;
}(MoveableEntity));
var Gear = /** @class */ (function (_super) {
    __extends(Gear, _super);
    function Gear(radius) {
        var _this = _super.call(this, 2 * radius, 2 * radius) || this;
        _this.radius = radius;
        _this.theta = 0;
        _this.turning = false;
        return _this;
    }
    Gear.prototype.update = function (t) {
        _super.prototype.update.call(this, t);
        if (this.turning) {
            this.theta = t * SPEED / 30;
        }
    };
    Gear.prototype.draw = function (ctx) {
        var xx = Math.round(this.positionX + this.radius);
        var yy = Math.round(this.positionY + this.radius);
        var notches = 11;
        var radiusI = 0.85 * this.radius;
        var taperO = 0.75 * this.radius;
        var taperI = 0.25 * this.radius;
        var angle = 2 * Math.PI / (notches * 2);
        var taperAI = angle * taperI * 0.005;
        var taperAO = angle * taperO * 0.005;
        var xxx = xx + this.radius * Math.cos(this.theta + taperAO);
        var yyy = yy + this.radius * Math.sin(this.theta + taperAO);
        ctx.moveTo(xxx, yyy);
        ctx.beginPath();
        var toggle = false;
        for (var a = angle; a <= 2 * Math.PI; a += angle) {
            if (toggle) {
                ctx.lineTo(xx + radiusI * Math.cos(this.theta + a - taperAI), yy + radiusI * Math.sin(this.theta + a - taperAI));
                ctx.lineTo(xx + this.radius * Math.cos(this.theta + a + taperAO), yy + this.radius * Math.sin(this.theta + a + taperAO));
            }
            else {
                ctx.lineTo(xx + this.radius * Math.cos(this.theta + a - taperAO), // outer line
                yy + this.radius * Math.sin(this.theta + a - taperAO));
                ctx.lineTo(xx + radiusI * Math.cos(this.theta + a + taperAI), // inner line
                yy + radiusI * Math.sin(this.theta + a + taperAI));
            }
            toggle = !toggle;
        }
        // close the final line
        ctx.closePath();
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.globalCompositeOperation = 'destination-out';
        var r0 = this.radius * 0.4;
        ctx.moveTo(this.positionX + this.radius + r0, this.positionY + this.radius);
        ctx.arc(this.positionX + this.radius, this.positionY + this.radius, this.radius * 0.4, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.stroke();
    };
    Gear.prototype.click = function (x, y, left) {
        console.log((left ? "LEFT" : "RIGHT") + " CLICK ON SQUARE(" + this.positionX + ", " + this.positionY + ")");
        return true;
    };
    return Gear;
}(MoveableEntity));
var Server = /** @class */ (function (_super) {
    __extends(Server, _super);
    function Server() {
        var _this = _super.call(this, 75, 75) || this;
        _this.square = new Square(50, 75);
        _this.gear = new Gear(25);
        _this.gear.turning = false;
        return _this;
    }
    Server.prototype.update = function (t) {
        _super.prototype.update.call(this, t);
        this.square.positionX = this.positionX;
        this.square.positionY = this.positionY;
        this.square.targetX = this.targetX;
        this.square.targetY = this.targetY;
        this.gear.positionX = this.positionX + 25;
        this.gear.positionY = this.positionY - 25;
        this.gear.targetX = this.gear.positionX;
        this.gear.targetY = this.gear.positionY;
        this.square.update(t);
        this.gear.update(t);
    };
    Server.prototype.draw = function (ctx) {
        this.gear.draw(ctx);
        this.square.draw(ctx);
    };
    Server.prototype.click = function (x, y, left) {
        console.log("SERVER CLICK");
        return true;
    };
    Server.prototype.isInside = function (x, y) {
        return this.square.isInside(x, y) || this.gear.isInside(x, y);
    };
    return Server;
}(MoveableEntity));
var Connection = /** @class */ (function () {
    function Connection(src, dst) {
        this.positionX = Math.min(src.rightAnchorPointX, dst.leftAnchorPointX);
        this.positionY = Math.min(src.rightAnchorPointY, dst.leftAnchorPointY);
        this.targetX = Math.min(src.rightAnchorPointX, dst.leftAnchorPointX);
        this.targetY = Math.min(src.rightAnchorPointY, dst.leftAnchorPointY);
        this.w = Math.max(src.rightAnchorPointX, dst.leftAnchorPointX) - this.positionX;
        this.h = Math.max(src.rightAnchorPointY, dst.leftAnchorPointY) - this.positionY;
        this.src = src;
        this.dst = dst;
        this.lineW = 0.1;
        this.dropDownMenu = false;
        this.dropDownMenuX = 0;
        this.dropDownMenuY = 0;
    }
    Connection.prototype.draw = function (ctx) {
        ctx.lineWidth = this.lineW;
        ctx.beginPath();
        ctx.moveTo(this.src.rightAnchorPointX, this.src.rightAnchorPointY);
        ctx.lineTo(this.dst.leftAnchorPointX, this.dst.leftAnchorPointY);
        ctx.stroke();
        if (this.dropDownMenu) {
            ctx.fillRect(this.dropDownMenuX, this.dropDownMenuY, 150, 100);
        }
    };
    Connection.prototype.update = function (t) {
        this.positionX = Math.min(this.src.rightAnchorPointX, this.dst.leftAnchorPointX);
        this.positionY = Math.min(this.src.rightAnchorPointY, this.dst.leftAnchorPointY);
        this.targetX = Math.min(this.src.rightAnchorPointX, this.dst.leftAnchorPointX);
        this.targetY = Math.min(this.src.rightAnchorPointY, this.dst.leftAnchorPointY);
        this.w = Math.max(this.src.rightAnchorPointX, this.dst.leftAnchorPointX) - this.positionX;
        this.h = Math.max(this.src.rightAnchorPointY, this.dst.leftAnchorPointY) - this.positionY;
    };
    Connection.prototype.setTarget = function (x, y) { };
    Connection.prototype.click = function (x0, y0, left) {
        var x1 = this.src.rightAnchorPointX;
        var y1 = this.src.rightAnchorPointY;
        var x2 = this.dst.leftAnchorPointX;
        var y2 = this.dst.leftAnchorPointY;
        var numerator = ((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1));
        var denominator2 = ((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        var distSquare = numerator * numerator / denominator2;
        var isClose = distSquare < 5 * 5;
        if (isClose) {
            this.lineW = this.lineW > 0.5 ? 0.1 : 1;
            if (left) {
                this.dropDownMenu = false;
            }
            else {
                this.dropDownMenu = true;
                this.dropDownMenuX = x0;
                this.dropDownMenuY = y0;
            }
        }
        return isClose;
    };
    Connection.prototype.isInside = function (x, y) {
        var offset = 5;
        return (this.positionX - offset <= x && x <= this.positionX + this.w + offset
            && this.positionY - offset <= y && y <= this.positionY + this.h + offset);
    };
    return Connection;
}());
var Layer = /** @class */ (function (_super) {
    __extends(Layer, _super);
    function Layer(canvas, vertical) {
        var _this = _super.call(this, 0, 0) || this;
        _this.entities = new Set();
        _this.positionX = 0;
        _this.positionY = 0;
        _this.targetX = 0;
        _this.targetY = 0;
        _this.w = vertical ? 0 : canvas.width;
        _this.h = vertical ? canvas.height : 0;
        _this.canvas = canvas;
        _this.vertical = vertical;
        return _this;
    }
    Layer.prototype.draw = function (ctx) {
        var e_1, _a;
        try {
            for (var _b = __values(this.entities), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entity = _c.value;
                entity.draw(ctx);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    Layer.prototype.update = function (t) {
        var e_2, _a, e_3, _b, e_4, _c;
        var h_sum = 0;
        var h_max = 0;
        var w_sum = 0;
        var w_max = 0;
        try {
            for (var _d = __values(this.entities), _e = _d.next(); !_e.done; _e = _d.next()) {
                var entity = _e.value;
                h_sum += entity.h;
                h_max = Math.max(h_max, entity.h);
                w_sum += entity.w;
                w_max = Math.max(w_max, entity.w);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d["return"])) _a.call(_d);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.w = this.vertical ? w_max : this.canvas.width;
        this.h = this.vertical ? this.canvas.height : h_max;
        // smooth movement
        _super.prototype.update.call(this, t);
        var dd;
        if (this.vertical) {
            dd = this.h - h_sum;
        }
        else {
            dd = this.w - w_sum;
        }
        var delta = Math.round(dd / (this.entities.size + 1));
        var xx = this.targetX;
        var yy = this.targetY;
        try {
            for (var _f = __values(this.entities), _g = _f.next(); !_g.done; _g = _f.next()) {
                var entity = _g.value;
                if (this.vertical) {
                    yy += delta;
                }
                else {
                    xx += delta;
                }
                entity.setTarget(xx, yy);
                if (this.vertical) {
                    yy += entity.h;
                }
                else {
                    xx += entity.w;
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f["return"])) _b.call(_f);
            }
            finally { if (e_3) throw e_3.error; }
        }
        try {
            for (var _h = __values(this.entities), _j = _h.next(); !_j.done; _j = _h.next()) {
                var entity = _j.value;
                entity.update(t);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_c = _h["return"])) _c.call(_h);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    Layer.prototype.click = function (x, y, left) {
        var e_5, _a;
        var clickConsumned = false;
        try {
            for (var _b = __values(this.entities), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entity = _c.value;
                if (entity.isInside(x, y) && entity.click(x, y, left)) {
                    clickConsumned = true;
                    break;
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return clickConsumned;
    };
    Layer.prototype.add = function (entity) {
        this.entities.add(entity);
    };
    Layer.prototype.remove = function (entity) {
        this.entities["delete"](entity);
    };
    Layer.prototype.pop = function () {
        var e_6, _a;
        var res = undefined;
        try {
            for (var _b = __values(this.entities), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entity = _c.value;
                this.remove(entity);
                res = entity;
                break;
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return res;
    };
    return Layer;
}(MoveableEntity));
var Scene = /** @class */ (function () {
    function Scene(window, canvas) {
        var _this = this;
        this.entities = new Set();
        this.window = window;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mouseX = 0;
        this.mouseY = 0;
        var elemLeft = canvas.offsetLeft + canvas.clientLeft;
        var elemTop = canvas.offsetTop + canvas.clientTop;
        canvas.addEventListener('click', function (event) {
            var x = event.pageX - elemLeft;
            var y = event.pageY - elemTop;
            _this.click(x, y, true);
        }, false);
        canvas.addEventListener('contextmenu', function (event) {
            event.preventDefault();
            var x = event.pageX - elemLeft;
            var y = event.pageY - elemTop;
            _this.click(x, y, false);
        }, false);
        canvas.addEventListener("mousemove", function (event) {
            _this.mouseX = event.pageX - elemLeft;
            _this.mouseY = event.pageY - elemTop;
        }, false);
    }
    Scene.prototype.draw = function (ctx) {
        var e_7, _a;
        try {
            for (var _b = __values(this.entities), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entity = _c.value;
                entity.draw(ctx);
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_7) throw e_7.error; }
        }
    };
    Scene.prototype.update = function (t) {
        var e_8, _a;
        try {
            for (var _b = __values(this.entities), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entity = _c.value;
                entity.update(t);
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
    };
    Scene.prototype.click = function (x, y, left) {
        var e_9, _a;
        try {
            for (var _b = __values(this.entities), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entity = _c.value;
                if (entity.isInside(x, y)) {
                    if (entity.click(x, y, left)) {
                        break;
                    }
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_9) throw e_9.error; }
        }
    };
    Scene.prototype.add = function (entity) {
        this.entities.add(entity);
    };
    Scene.prototype.remove = function (entity) {
        this.entities["delete"](entity);
    };
    Scene.prototype.loop = function () {
        var _this = this;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var t = Date.now();
        this.ctx.clearRect(0, 0, w, h);
        this.update(t);
        this.draw(this.ctx);
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('(' + this.mouseX + ', ' + this.mouseY + ')', 5, 20);
        this.window.requestAnimationFrame(function () { _this.loop(); });
    };
    return Scene;
}());
