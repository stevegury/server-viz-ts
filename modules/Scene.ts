const SPEED = 0.1

interface Drawable {
    draw(ctx: any): void
    update(t: number): void
}

interface Entity extends Drawable {
    positionX: number
    positionY: number
    targetX: number
    targetY: number
    w: number
    h: number

    draw(ctx: any): void
    update(t: number): void
    setTarget(x: number, y: number)

    click(x: number, y: number, left: boolean): boolean
    isInside(x: number, y: number): boolean
}

abstract class MoveableEntity implements Entity {
    positionX: number
    positionY: number
    targetX: number
    targetY: number
    w: number
    h: number
    leftAnchorPointX: number
    leftAnchorPointY: number
    rightAnchorPointX: number
    rightAnchorPointY: number

    constructor(w: number, h: number) {
        this.positionX = Math.round(2000 * Math.random()) // TODO
        this.positionY = Math.round(2000 * Math.random()) 
        this.targetX = this.positionX
        this.targetY = this.positionY
        this.w = w
        this.h = h
        this.leftAnchorPointX = this.positionX
        this.leftAnchorPointY = this.positionY
        this.rightAnchorPointX = this.positionX
        this.rightAnchorPointY = this.positionY
    }

    abstract draw(ctx: any): void
    abstract click(x: number, y: number, left: boolean): boolean

    update(t: number): void {
        if (this.positionX != this.targetX || this.positionY != this.targetY) {
            this.positionX += (this.targetX - this.positionX) * SPEED
            this.positionY += (this.targetY - this.positionY) * SPEED
            if (Math.abs(this.targetX - this.positionX) < 1.5) {
                this.positionX = this.targetX
            }
            if (Math.abs(this.targetY - this.positionY) < 1.5) {
                this.positionY = this.targetY
            }
        }
        const offset = 5
        this.leftAnchorPointX = this.positionX - offset
        this.leftAnchorPointY = this.positionY + this.h / 2
        this.rightAnchorPointX = this.positionX + this.w + offset
        this.rightAnchorPointY = this.positionY + this.h / 2
    }

    setTarget(x: number, y: number) {
        this.targetX = x
        this.targetY = y
    }

    isInside(x: number, y: number): boolean {
        return (this.positionX <= x && x <= this.positionX + this.w 
            && this.positionY <= y && y <= this.positionY + this.h)
    }
}

class Square extends MoveableEntity {
    positionX: number
    positionY: number
    targetX: number
    targetY: number
    w: number
    h: number

    constructor(w: number, h: number) {
        super(w, h)
    }

    draw(ctx: any): void {
        const xx = Math.round(this.positionX)
        const yy = Math.round(this.positionY)
        const ww = Math.round(this.w)
        const hh = Math.round(this.h)

        ctx.fillStyle = "#999"
        ctx.fillRect(xx, yy, ww, hh);
        ctx.lineWidth = 1;
        ctx.strokeRect(xx, yy, ww, hh);
    }

    click(x: number, y: number, left: boolean): boolean {
        console.log((left ? "LEFT" : "RIGHT") + " CLICK ON SQUARE(" + this.positionX + ", " + this.positionY + ")")
        return true
    }
}

class Gear extends MoveableEntity {
    positionX: number
    positionY: number
    targetX: number
    targetY: number
    w: number
    h: number
    radius: number
    theta: number
    turning: boolean

    constructor(radius: number) {
        super(2 * radius, 2 * radius)
        this.radius = radius
        this.theta = 0
        this.turning = false
    }

    update(t: number): void {
        super.update(t)
        if (this.turning) {
            this.theta = t * SPEED/30
        }
    }

    draw(ctx: any): void {
        const xx = Math.round(this.positionX + this.radius)
        const yy = Math.round(this.positionY + this.radius)

        const notches = 11
        
        const radiusI = 0.85 * this.radius
        const taperO  = 0.75 * this.radius
        const taperI  = 0.25 * this.radius
        
        const angle = 2 * Math.PI / (notches * 2)
        const taperAI = angle * taperI * 0.005
        const taperAO = angle * taperO * 0.005
        
        const xxx = xx + this.radius * Math.cos(this.theta + taperAO)
        const yyy = yy + this.radius * Math.sin(this.theta + taperAO)
        ctx.moveTo(xxx, yyy);
        ctx.beginPath();
        
        let toggle = false
        for (let a=angle; a <= 2 * Math.PI; a += angle) {
            if (toggle) {
                ctx.lineTo(xx + radiusI * Math.cos(this.theta + a - taperAI),
                        yy + radiusI * Math.sin(this.theta + a - taperAI));
                ctx.lineTo(xx + this.radius * Math.cos(this.theta + a + taperAO),
                        yy + this.radius * Math.sin(this.theta + a + taperAO));
            } else {
                ctx.lineTo(xx + this.radius * Math.cos(this.theta + a - taperAO),  // outer line
                        yy + this.radius * Math.sin(this.theta + a - taperAO));
                ctx.lineTo(xx + radiusI * Math.cos(this.theta + a + taperAI),  // inner line
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
        const r0 = this.radius * 0.4
        ctx.moveTo(this.positionX + this.radius + r0, this.positionY + this.radius);
        ctx.arc(this.positionX + this.radius, this.positionY + this.radius, this.radius * 0.4, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.stroke();
    }

    click(x: number, y: number, left: boolean): boolean {
        console.log((left ? "LEFT" : "RIGHT") + " CLICK ON SQUARE(" + this.positionX + ", " + this.positionY + ")")
        return true
    }
}


class Server extends MoveableEntity {
    positionX: number
    positionY: number
    targetX: number
    targetY: number
    w: number
    h: number

    square: Square
    gear: Gear

    constructor() {
        super(75, 75)
        this.square = new Square(50, 75)
        this.gear = new Gear(25)
        this.gear.turning = false
    }

    update(t: number): void {
        super.update(t)

        this.square.positionX = this.positionX
        this.square.positionY = this.positionY
        this.square.targetX = this.targetX
        this.square.targetY = this.targetY
        this.gear.positionX = this.positionX + 25
        this.gear.positionY = this.positionY - 25
        this.gear.targetX = this.gear.positionX
        this.gear.targetY = this.gear.positionY

        this.square.update(t)
        this.gear.update(t)
    }

    draw(ctx: any): void {
        this.gear.draw(ctx)
        this.square.draw(ctx)
    }
    
    click(x: number, y: number, left: boolean): boolean {
        console.log("SERVER CLICK")
        return true
    }

    isInside(x: number, y: number): boolean {
        return this.square.isInside(x, y) || this.gear.isInside(x, y)
    }
}

class Connection implements Entity {
    positionX: number
    positionY: number
    targetX: number
    targetY: number
    w: number
    h: number

    src: MoveableEntity
    dst: MoveableEntity
    lineW: number

    dropDownMenu: boolean
    dropDownMenuX: number
    dropDownMenuY: number

    constructor(src: MoveableEntity, dst: MoveableEntity) {
        this.positionX = Math.min(src.rightAnchorPointX, dst.leftAnchorPointX)
        this.positionY = Math.min(src.rightAnchorPointY, dst.leftAnchorPointY)
        this.targetX = Math.min(src.rightAnchorPointX, dst.leftAnchorPointX)
        this.targetY = Math.min(src.rightAnchorPointY, dst.leftAnchorPointY)
        this.w = Math.max(src.rightAnchorPointX, dst.leftAnchorPointX) - this.positionX
        this.h = Math.max(src.rightAnchorPointY, dst.leftAnchorPointY) - this.positionY
        this.src = src
        this.dst = dst
        this.lineW = 0.1
        this.dropDownMenu = false
        this.dropDownMenuX = 0
        this.dropDownMenuY = 0
    }

    draw(ctx: any): void {
        ctx.lineWidth = this.lineW
        ctx.beginPath()
        ctx.moveTo(this.src.rightAnchorPointX, this.src.rightAnchorPointY)
        ctx.lineTo(this.dst.leftAnchorPointX, this.dst.leftAnchorPointY)
        ctx.stroke()

        if (this.dropDownMenu) {
            ctx.fillRect(this.dropDownMenuX, this.dropDownMenuY, 150, 100);
        }
    }

    update(t: number): void {
        this.positionX = Math.min(this.src.rightAnchorPointX, this.dst.leftAnchorPointX)
        this.positionY = Math.min(this.src.rightAnchorPointY, this.dst.leftAnchorPointY)
        this.targetX = Math.min(this.src.rightAnchorPointX, this.dst.leftAnchorPointX)
        this.targetY = Math.min(this.src.rightAnchorPointY, this.dst.leftAnchorPointY)
        this.w = Math.max(this.src.rightAnchorPointX, this.dst.leftAnchorPointX) - this.positionX
        this.h = Math.max(this.src.rightAnchorPointY, this.dst.leftAnchorPointY) - this.positionY
    }

    setTarget(x: number, y: number) {}

    click(x0: number, y0: number, left: boolean): boolean {
        const x1 = this.src.rightAnchorPointX
        const y1 = this.src.rightAnchorPointY
        const x2 = this.dst.leftAnchorPointX
        const y2 = this.dst.leftAnchorPointY

        const numerator = ((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1))
        const denominator2 = ((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
        const distSquare = numerator * numerator / denominator2
        const isClose = distSquare < 5 * 5

        if (isClose) {
                this.lineW = this.lineW > 0.5 ? 0.1 : 1
                if (left) {
                    this.dropDownMenu = false
                } else {
                    this.dropDownMenu = true
                    this.dropDownMenuX = x0
                    this.dropDownMenuY = y0
                }
        }
        return isClose
    }

    isInside(x: number, y: number): boolean {
        const offset = 5
        return (this.positionX - offset <= x && x <= this.positionX + this.w + offset 
            && this.positionY - offset <= y && y <= this.positionY + this.h + offset)
    }
}

class Layer extends MoveableEntity {
    positionX: number
    positionY: number
    targetX: number
    targetY: number
    w: number
    h: number
    vertical: boolean
    canvas: any
    entities: Set<Entity> = new Set()

    constructor(canvas: any, vertical: boolean) {
        super(0, 0)
        this.positionX = 0
        this.positionY = 0
        this.targetX = 0
        this.targetY = 0
        this.w = vertical ? 0 : canvas.width
        this.h = vertical ? canvas.height : 0
        this.canvas = canvas
        this.vertical = vertical
    }

    draw(ctx: any): void {
        for (let entity of this.entities) {
            entity.draw(ctx)
        }
    }

    update(t: number): void {
        let h_sum = 0
        let h_max = 0
        let w_sum = 0
        let w_max = 0
        for (let entity of this.entities) {
            h_sum += entity.h
            h_max = Math.max(h_max, entity.h)
            w_sum += entity.w
            w_max = Math.max(w_max, entity.w)
        }

        this.w = this.vertical ? w_max : this.canvas.width
        this.h = this.vertical ? this.canvas.height : h_max

        // smooth movement
        super.update(t)

        let dd: number
        if (this.vertical) {
            dd = this.h - h_sum
        } else {
            dd = this.w - w_sum
        }
        const delta = Math.round(dd / (this.entities.size + 1))

        let xx = this.targetX
        let yy = this.targetY
        for (let entity of this.entities) {
            if (this.vertical) {
                yy += delta
            } else {
                xx += delta
            }
            entity.setTarget(xx, yy);
            if (this.vertical) {
                yy += entity.h
            } else {
                xx += entity.w
            }
        }

        for (let entity of this.entities) {
            entity.update(t)
        }
    }

    click(x: number, y: number, left: boolean): boolean {
        let clickConsumned = false
        for (let entity of this.entities) {
            if (entity.isInside(x, y) && entity.click(x, y, left)) {
                clickConsumned = true
                break
            }
        }
        return clickConsumned
    }

    add(entity: Entity): void {
        this.entities.add(entity)
    }

    remove(entity: Entity): void {
        this.entities.delete(entity)
    }

    pop(): Entity | undefined {
        let res = undefined
        for (let entity of this.entities) {
            this.remove(entity)
            res = entity
            break
        }
        return res
    }
}


class Histogram {
    constructor() {
        
    }
}

class WindowHistogram extends MoveableEntity {
    histograms: []

    constructor(w: number, h: number) {
        super(w, h)
        // super(scene, opts.position.x, opts.position.y);
        // histogramFactory, count, windowMs, position, dimension, clock
        this.histograms = [];
        const count = 10
        for (let i = 0; i < count; i++) {
            this.histograms.push(new Histogram());
        }
        this.windowMs = opts.windowMs;
        this.clock = opts.clock || Date.now;
        this.count = count;
        this.lastIndex = Math.floor(this.clock() / this.windowMs);
        this.position = opts.position;
        this.dimension = opts.dimension;
        this.p99 = 0;
    }
    add(x: number) {
        if (isNaN(x)) {
            return;
        }
        const t = this.clock();
        const index = Math.floor(t / this.windowMs)
        const n = this.histograms.length;
        if (index !== this.lastIndex) {
            for (let j=this.lastIndex + 1; j<=index; j++) {
                const h = this.histograms[j % n];
                h.clear();
            }
            this.lastIndex = index;
        }
        const i = (index % n) >> 0;
        this.histograms[i].add(x);
    }
    maxIndividualCount() {
        let count = 0;
        for (let i = 0; i < this.histograms.length; i++) {
            count = Math.max(count, this.histograms[i].maxCount);
        }
        return count;
    }
    maxCount() {
        let count = 0;
        for (let i = 0; i < this.histograms[0].buffer.length; i++) {
            count = Math.max(count, this.buffer(i) || 0);
        }
        return count || 0;
    }
    maxValue() {
        let value = 0;
        for (let i = 0; i < this.histograms.length; i++) {
            value = Math.max(value, this.histograms[i].maxValue);
        }
        return value;
    }
    clear() {
        for (let i = 0; i < this.histograms.length; i++) {
            this.histograms[i].clear();
        }
    }
    buffer(index) {
        let count = 0;
        for (let i = 0; i < this.histograms.length; i++) {
            const histo = this.histograms[i];
            count = count + histo.buffer[index];
        }

        return count;
    }
    data() {
        const n = this.maxValue() + 1;
        let result = new Array(n);
        for (let i = 0; i < result.length; i++) {
            result[i] = this.buffer(i);
        }

        return result;
    }
    scaleX(data, width, minWidth) {
        const n = Math.floor(width / minWidth);
        const scaledData = new Array(n);
        const targetCredit = data.length / n;

        let j=0, i = 0;
        let credit = 0;
        let sum = 0;
        while (i < data.length) {
            credit++;
            if (credit >= targetCredit) {
                while (credit >= targetCredit) {
                    credit = credit - targetCredit;

                    if (targetCredit < 1 - credit) {
                        scaledData[j] = sum + targetCredit * data[i];
                    } else {
                        scaledData[j] = sum + (1 - credit) * data[i];
                        sum = credit * data[i];
                    }
                    j++;
                }
            } else {
                sum = sum + data[i];
            }
            i++;
            if (i === data.length) {
                scaledData[j] = sum;
                if (scaledData[j] < 0) {
                    debugger;
                }
            }
        }

        return scaledData;
    }
    scaleY(data, height) {
        const maxCount = _.max(data);
        const hFactor = height / maxCount;
        return _.map(data, x => { return x * hFactor; });
    }
    scale(data, dimension) {
        const scaledXData = this.scaleX(data, dimension.x, 15);
        const scaledXYData = this.scaleY(scaledXData, dimension.y);
        return _.map(scaledXYData, Math.round);
    }
    draw(ctx) {
        ctx.fillStyle = "#EEEEEE";
        const delta = 25;
        for (let i=1; i<this.dimension.y/delta; i++) {
            ctx.fillRect(this.position.x, this.position.y - delta*i, this.dimension.x, 1);
        }

        const rawData = this.data();
        if (rawData.length > 0) {
            const data = this.scale(rawData, this.dimension);
            const scalingFactor = rawData.length / data.length;
            const barWidth = Math.max(1, Math.floor(this.dimension.x / data.length));

            ctx.fillStyle = "#696969";
            for (let i = 0; i < data.length; i++) {
                const count = data[i];
                ctx.fillRect(this.position.x + 5 + barWidth * i, this.position.y - count, barWidth, count);
            }
        }

        ctx.fillStyle = "#000";

        // Y Axes
        ctx.fillRect(this.position.x, this.position.y, this.dimension.x, 1);
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y - this.dimension.y);
        ctx.lineTo(this.position.x - 5, this.position.y - this.dimension.y);
        ctx.lineTo(this.position.x, this.position.y - this.dimension.y - 10);
        ctx.lineTo(this.position.x + 5, this.position.y - this.dimension.y);
        ctx.lineTo(this.position.x, this.position.y - this.dimension.y);
        ctx.closePath();
        ctx.fill();

        // X Axis
        ctx.fillRect(this.position.x, this.position.y - this.dimension.y, 1, this.dimension.y);
        ctx.beginPath();
        ctx.moveTo(this.position.x + this.dimension.x, this.position.y);
        ctx.lineTo(this.position.x + this.dimension.x, this.position.y - 5);
        ctx.lineTo(this.position.x + this.dimension.x + 10, this.position.y);
        ctx.lineTo(this.position.x + this.dimension.x, this.position.y + 5);
        ctx.lineTo(this.position.x + this.dimension.x, this.position.y);
        ctx.closePath();
        ctx.fill();

        // numbers below the x-axis
        const maxValue = this.maxValue();
        let tx = this.maxValue() / 3
        const nbOfDigits = Math.ceil(Math.log(tx + 1)/Math.log(10));
        const r = Math.pow(10, nbOfDigits - 1);
        tx = Math.round(tx / r) * r;
        for (let i=0; i < maxValue / tx; i++) {
            const displayedValue = i * tx;
            const valueX = displayedValue / maxValue * this.dimension.x;
            ctx.fillRect(this.position.x + valueX, this.position.y, 1, 3);
            ctx.fillText(Math.round(displayedValue), this.position.x + valueX, this.position.y + 12);
        }

        const bucketSize = this.histograms[0].bucketSize;
        const p10 = this.percentiles(rawData, 0.1) * bucketSize;
        const p50 = this.percentiles(rawData, 0.5) * bucketSize;
        const p75 = this.percentiles(rawData, 0.75) * bucketSize;
        const p90 = this.percentiles(rawData, 0.9) * bucketSize;
        const p99 = this.percentiles(rawData, 0.99) * bucketSize;
        ctx.fillText('p10: ' + p10.toFixed(1), this.position.x + this.dimension.x + 10, this.position.y - this.dimension.y);
        ctx.fillText('p50: ' + p50.toFixed(1), this.position.x + this.dimension.x + 10, this.position.y - this.dimension.y + 20);
        ctx.fillText('p75: ' + p75.toFixed(1), this.position.x + this.dimension.x + 10, this.position.y - this.dimension.y + 2*20);
        ctx.fillText('p90: ' + p90.toFixed(1), this.position.x + this.dimension.x + 10, this.position.y - this.dimension.y + 3*20);
        ctx.fillText('p99: ' + p99.toFixed(1), this.position.x + this.dimension.x + 10, this.position.y - this.dimension.y + 4*20);
    }
    update(t) {
        const index = Math.floor(t / this.windowMs)
        const n = this.histograms.length;
        if (index !== this.lastIndex) {
            for (let j=this.lastIndex + 1; j<=index; j++) {
                const h = this.histograms[j % n];
                h.clear();
            }
            this.lastIndex = index;
        }
    }
    percentiles(data, q) {
        const target = _.sum(data) * q;
        let sum = 0;
        for (let i=0; i<data.length; i++) {
            sum = sum + data[i];
            if (sum > target) {
                const delta = (sum - target) / data[i]
                return i + delta;
            }
        }
        return data.length - 1;
    }
}

class Scene implements Drawable {
    entities: Set<Entity> = new Set()
    window: any
    canvas: any
    ctx: any
    graph: Drawable

    mouseX: number
    mouseY: number

    constructor(window: any, canvas: any) {
        this.window = window
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.mouseX = 0
        this.mouseY = 0

        const elemLeft = canvas.offsetLeft + canvas.clientLeft
        const elemTop = canvas.offsetTop + canvas.clientTop
    
        canvas.addEventListener('click', (event: { pageX: number; pageY: number }) => {
            const x = event.pageX - elemLeft;
            const y = event.pageY - elemTop;

            this.click(x, y, true);
        }, false);

        canvas.addEventListener('contextmenu', (event: { preventDefault: () => void; pageX: number; pageY: number }) => {
            event.preventDefault();
            const x = event.pageX - elemLeft;
            const y = event.pageY - elemTop;

            this.click(x, y, false);
        }, false);

        canvas.addEventListener("mousemove", (event: { pageX: number; pageY: number }) => {
            this.mouseX = event.pageX - elemLeft
            this.mouseY = event.pageY - elemTop
        }, false);
    }

    draw(ctx: any): void {
        for (let entity of this.entities) {
            entity.draw(ctx)
        }
    }

    update(t: number): void {
        for (let entity of this.entities) {
            entity.update(t)
        }
    }

    click(x: number, y: number, left: boolean): void {
        for (let entity of this.entities) {
            if (entity.isInside(x, y)) {
                if (entity.click(x, y, left)) {
                    break
                }
            }
        }
    }

    add(entity: Entity): void {
        this.entities.add(entity)
    }

    remove(entity: Entity): void {
        this.entities.delete(entity)
    }

    loop(): void {
        const w = this.canvas.width
        const h = this.canvas.height
        const t = Date.now()
        this.ctx.clearRect(0, 0, w, h)
        this.update(t)
        this.graph.update(t)
        this.draw(this.ctx)
        this.graph.draw(this.ctx)
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('(' + this.mouseX + ', ' + this.mouseY + ')', 5, 20);
        this.window.requestAnimationFrame(() => { this.loop() })
    }
}
