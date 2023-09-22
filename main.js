// color palette 
// https://colorhunt.co/palette/1d5b79468b97ef6262f3aa60
// 1D5B79
// 468B97
// EF6262
// F3AA60

let config = {
    networkSpeedMs: 500,
    tau: 5000,
    serverProcessingLatencyMs: 200,
    clientRps: 5,
    clientRpsDistribution: 'fixed',
    loadBalancingAlgo: 'random',
    animationDuration: 1000,
    realWorld: false
}

class EventEmitter {
    constructor() {
        this.listeners = {};
    }
    emit(what, data) {
        const listeners = this.listeners[what];
        if (listeners) {
            for (const fn of listeners) {
                fn(data);
            }
        }
    }
    on(what, fn) {
        if (!this.listeners[what]) {
            this.listeners[what] = [];
        }
        this.listeners[what].push(fn);
    }
}

class Drawable extends EventEmitter {
    constructor(scene) {
        super();
        this.scene = scene;
        this.positionX = 0;
        this.positionY = 0;
        this.dimensionX = 0;
        this.dimensionY = 0;
        this.lastTimestamp = Date.now();
        this.targetX = 0;
        this.targetY = 0;
        this.targetTimestamp = this.lastTimestamp + config.animationDuration; // end of animation
        scene.register(this);
    }
    draw(ctx) {}
    update(t) {
        const now = Date.now()
        const dt = now - this.lastTimestamp;
        this.lastTimestamp = now;

        // if (now > this.targetTimestamp) {
        //     this.targetTimestamp = 0;
        //     this.positionX = this.targetX;
        //     this.positionY = this.targetY;
        // }

        if (this.targetX != this.positionX || this.targetY != this.positionY) {
            if (this.targetTimestamp == 0) {
                this.targetTimestamp = now + config.animationDuration;
            }
            let dx = 1.5 * (this.targetX - this.positionX) / config.animationDuration;
            let dy = 1.5 * (this.targetY - this.positionY) / config.animationDuration;
            // let ds = Math.sqrt(dx*dx + dy*dy)
            // const deltaX = dy / config.animationDuration;
            // const deltaY = dx / config.animationDuration;

            const closeEnough = 10;
            if (Math.abs(this.positionX - this.targetX) < closeEnough) {
                this.positionX = this.targetX;
            } else {
                this.positionX += dx * dt;
            }
            if (Math.abs(this.positionY - this.targetY) < closeEnough) {
                this.positionY = this.targetY;
            } else {
                this.positionY += dy * dt;
            }
        }
    }
    click() {}
    isInside(x, y) {
        const inX = this.positionX <= x && x <= this.positionX + this.dimensionX;
        const inY = this.positionY - this.dimensionY <= y && y <= this.positionY;
        return inX && inY;
    }
}


class Ewma {
    constructor(halfLife, initialValue) {
        this.tau = halfLife * Math.LN2 || 5000;
        this.ewma = initialValue || 0;
        this.previousTime = Date.now();
    }
    add(x) {
        const now = Date.now();
        const dt = now - this.previousTime;
        const w = Math.exp(-dt/this.tau);
        this.ewma = this.ewma * w + (1 - w) * x;
        this.previousTime = now;
    }
    estimate() {
        return this.ewma;
    }
}

class Rate {
    constructor(halfLife) {
        this.ewma = new Ewma(halfLife, config.tau / 1000);
        this.lastArrivalTime = 0;
    }
    tick() {
        const now = Date.now();
        if (this.lastArrivalTime === 0) {
            this.lastArrivalTime = now;
        } else {
            const delta = now - this.lastArrivalTime;
            this.lastArrivalTime = now;
            this.ewma.add(delta);
        }
    }
    rate() {
        return 1 / this.ewma.estimate();
    }
}

class Histogram {
    constructor(bucketSize, maxValue) {
        this.bucketSize = bucketSize;
        const size = Math.floor(maxValue / bucketSize);
        this.max = size * bucketSize;
        this.buffer = new Array(size);
        for (let i = 0; i < size; i++) {
            this.buffer[i] = 0;
        }
        this.maxCount = 0;
        this.maxValue = 0;
    }
    add(x) {
        if (x > this.max) {
            return;
        }
        const i = Math.floor(x / this.bucketSize);
        this.buffer[i] = this.buffer[i] + 1;
        this.maxCount = Math.max(this.maxCount, this.buffer[i]);
        this.maxValue = Math.max(this.maxValue, i);
    }
    clear() {
        for (let i = 0; i < this.buffer.length; i++) {
            this.buffer[i] = 0;
        }
        this.maxCount = 0;
        this.maxValue = 0;
    }
    merge(other) {
        const result = new Histogram(this.bucketSize, this.max);
        for (let i=0; i<result.buffer.length; i++) {
            result.buffer[i] = this.buffer[i] + other.buffer[i];
        }
        return result;
    }
}


class WindowHistogram extends Drawable {
    constructor(scene, opts) {
        super(scene, opts.position.x, opts.position.y);
        // histogramFactory, count, windowMs, position, dimension, clock
        this.histograms = [];
        const factory = () => new Histogram(10, opts.windowMs);
        for (let i = 0; i < opts.count; i++) {
            this.histograms.push(factory());
        }
        this.windowMs = opts.windowMs;
        this.clock = opts.clock || Date.now;
        this.count = opts.count;
        this.lastIndex = Math.floor(this.clock() / this.windowMs);
        this.position = opts.position;
        this.dimension = opts.dimension;
        this.p99 = 0;
    }
    add(x) {
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
            const displayedValue = i * 10 * tx;
            const valueX = displayedValue / maxValue * this.dimension.x;
            ctx.fillRect(this.position.x + valueX, this.position.y, 1, 3);
            ctx.fillText(Math.round(displayedValue), this.position.x + valueX, this.position.y + 16);
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

class Graph extends Drawable {
    constructor(scene, windowMs, positionX, positionY, dimensionX, dimensionY) {
        super(scene, positionX, positionY)
        this.windowMs = windowMs;
        this.positionX = positionX;
        this.positionY = positionY;
        this.dimensionX = dimensionX;
        this.dimensionY = dimensionY;
        this.markType = 'cross'
        this.buffer = [];
        this.epoch = Date.now() - this.windowMs;
    }
    add(x, color) {
        if (x == undefined) {
            return;
        }
        const now = Date.now() - this.epoch;
        this.buffer.push({
            t: now,
            value: x,
            color: color
        });
    }
    click() {
        this.showNameSince = Date.now();
    }
    draw(ctx) {
        const self = this;
        const now = Date.now() - this.epoch;
        ctx.fillStyle = "#000";

        // Y Axes
        ctx.fillRect(this.positionX, this.positionY, this.dimensionX, 1);
        ctx.beginPath();
        ctx.moveTo(this.positionX, this.positionY - this.dimensionY);
        ctx.lineTo(this.positionX - 5, this.positionY - this.dimensionY);
        ctx.lineTo(this.positionX, this.positionY - this.dimensionY - 10);
        ctx.lineTo(this.positionX + 5, this.positionY - this.dimensionY);
        ctx.lineTo(this.positionX, this.positionY - this.dimensionY);
        ctx.closePath();
        ctx.fill();

        // X Axis
        ctx.fillRect(this.positionX, this.positionY - this.dimensionY, 1, this.dimensionY);
        ctx.beginPath();
        ctx.moveTo(this.positionX + this.dimensionX, this.positionY);
        ctx.lineTo(this.positionX + this.dimensionX, this.positionY - 5);
        ctx.lineTo(this.positionX + this.dimensionX + 10, this.positionY);
        ctx.lineTo(this.positionX + this.dimensionX, this.positionY + 5);
        ctx.lineTo(this.positionX + this.dimensionX, this.positionY);
        ctx.closePath();
        ctx.fill();

        // numbers below the x axis
        const t0 = now - this.windowMs;
        const tx = 15000;
        for (let i=0; i < this.windowMs / tx; i++) {
            const displayedValue = (Math.ceil(t0 / tx) + i ) * tx;
            const valueX = (displayedValue - t0) / this.windowMs * this.dimensionX;
            ctx.fillRect(this.positionX + valueX, this.positionY, 1, 3);
            ctx.fillText(Math.round((displayedValue)/ 1000), this.positionX + valueX, this.positionY + 16);
        }

        if (this.name && this.showNameSince && this.showNameSince + 2000 > Date.now()) {
            const oldFont = ctx.font;
            const oldFillStyle = ctx.fillStyle;
            ctx.fillStyle = "#CCC";
            ctx.font = "30px Arial";
            ctx.fillText(this.name, this.positionX, this.positionY - this.dimensionY / 3);
            ctx.font = oldFont;
            ctx.fillStyle = oldFillStyle;
        }

        // early exit
        const n = this.buffer.length;
        if (n == 0) {
            return;
        }

        // x,y range computation
        const first = this.buffer[0];
        let maxValue = 1; // if maxValue < 1, then maxValue == 1 (for y-axis numbering reasons)
        let minValue = 0;
        for (let i = 0; i < this.buffer.length; i++) {
            maxValue = Math.max(this.buffer[i].value, maxValue);
            minValue = Math.min(this.buffer[i].value, minValue);
        }
        let valueRange = maxValue - minValue;
        if (!valueRange) {
            valueRange = 1;
        }

        // number on the y-axis
        const nbOfDigits = Math.ceil(Math.log(maxValue + 1)/Math.log(10));
        if (nbOfDigits === 0) {
            ctx.fillRect(this.positionX - 3, this.positionY - this.dimensionY + 5, 3, 1);
            ctx.fillText('1', this.positionX - 10, this.positionY - this.dimensionY + 5);
        } else {
            let r = Math.pow(10, nbOfDigits - 1);
            if ((maxValue + 1) / r < 1.4) {
                r /= 10;
            }
            for (let i=1; i<(maxValue+1)/r; i++) {
                const value = i * r;
                const valueY = (value - minValue) / maxValue * this.dimensionY;
                if (valueY <= this.dimensionY) {
                    ctx.fillRect(this.positionX - 3, this.positionY - valueY, 3, 1);
                    ctx.fillText(Math.round(value), this.positionX - 10 - nbOfDigits * 5, this.positionY - valueY);
                }
            }

        }

        for (let i = 0; i < this.buffer.length; i++) {
            const datapoint = this.buffer[i];
            const dx = (datapoint.t - t0) / this.windowMs;
            const xOffset = this.dimensionX * dx;
            const x = Math.round(this.positionX + xOffset);

            const dy = (datapoint.value - minValue) / valueRange;
            let yOffset = dy * self.dimensionY;
            const y = Math.round(this.positionY - yOffset);
            this.drawMark(ctx, datapoint, x, y);
        }
    }
    drawMark(ctx, datapoint, x, y) {
        ctx.fillStyle = datapoint.color || "#000";
        switch (this.markType) {
            case 'dot':
                ctx.fillRect(x, y, 1, 1);
                break;
            case 'cross':
            default:
                ctx.fillRect(x - 2, y, 6, 2);
                ctx.fillRect(x, y - 2, 2, 6);
        }
    }
    update(t) {
        const cutoff = t - this.epoch - this.windowMs;
        let i = 0;
        for (i = 0; i<this.buffer.length; i++) {
            if (this.buffer[i].t > cutoff) {
                break;
            }
        }
        this.buffer.splice(0, i);
    }
}

class Scene extends EventEmitter {
    constructor(window, canvas) {
        super();
        const self = this;
        this.drawables = new Set();
        this.window = window;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mouseX = 0;
        this.mouseY = 0;

        canvas.addEventListener('mousedown', function (e) {
            self.click(e.x, e.y);
        });

        const elemLeft = canvas.offsetLeft + canvas.clientLeft
        const elemTop = canvas.offsetTop + canvas.clientTop
        canvas.addEventListener("mousemove", (event) => {
            this.mouseX = event.pageX - elemLeft
            this.mouseY = event.pageY - elemTop
        }, false);

    }
    register(drawable) {
        this.drawables.add(drawable);
    }
    unregister(drawable) {
        this.drawables.delete(drawable);
    }
    draw() {
        const self = this;
        for (let drawable of self.drawables) {
            drawable.draw(self.ctx);
        }
        this.emit('draw');
    }
    update(t) {
        const self = this;
        for (let drawable of self.drawables) {
            drawable.update(t);
        }
        this.emit('update');
    }
    click(x, y) {
        for (let drawable of this.drawables) {
            if (drawable.isInside(x, y)) {
                drawable.click();
                break;
            }
        }
    }
    loop() {
        const self = this;
        const w = self.canvas.width;
        const h = self.canvas.height;
        self.ctx.clearRect(0, 0, w, h);
        self.update(Date.now());
        self.draw();
        this.ctx.fillStyle = "#444";
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('(' + this.mouseX + ', ' + this.mouseY + ')', 5, 20);

        this.ctx.fillText('load-balancing: ' + config.loadBalancingAlgo, 5, 40);
        this.ctx.fillText('client(s) RPS: ' + config.clientRps, 5, 60);
        this.ctx.fillText('client(s) arrival distribution: ' + config.clientRpsDistribution, 5, 80);
        this.ctx.fillText('server(s) RPS capacity: ' + (1000 / config.serverProcessingLatencyMs), 5, 100);

        self.window.requestAnimationFrame(() => { self.loop() });
    }
}

class AdmissionControl {
    constructor(halfLife, useIntegral) {
        this.halfLife = halfLife;
        this.outgoingRate = new Rate(halfLife);
        this.useIntegral = useIntegral;
        this.integral = 0;
        this.integralStartTime = 0;
        this.queue = 0;
        this.admissionFactor = new Ewma(halfLife * 5, 1);
    }
    admit() {
        const now = Date.now();
        const beta = this.outgoingRate.rate()
        const limit = Math.max(5, this.halfLife * beta);
        if (this.queue > limit) {
            return this.reject();
        }
        if (!this.useIntegral) {
            return this.accept();
        }

        // Custom integral treatment
        const maxIntegral = this.halfLife * this.halfLife * beta;
        const dt = now - this.integralStartTime;
        if (this.queue <= 1) {
            this.integral = Math.max(this.integral - dt, 0);
        }
        this.integralStartTime = now;
        this.integral += this.queue * dt;

        // anti Integral-Windup
        this.integral = Math.min(this.integral, maxIntegral);

        const probaRejection = this.integral / maxIntegral;
        const a = 100;
        const p = (Math.pow(a, probaRejection) - 1) / (a - 1);
        if (this.queue > 0 && probaRejection > this.admissionFactor.estimate()) {
            return this.reject();
        }
        this.queue += 1;
        return this.accept();
    }
    response() {
        this.queue -= 1;
        this.outgoingRate.tick();
    }
    reject() {
        this.admissionFactor.add(0);
        return false;
    }
    accept() {
        this.admissionFactor.add(1);
        return true;
    }
}

class Server extends Drawable {
    constructor(scene) {
        super(scene);
        this.queue = [];
        this.admissionControls = {};
        this.globalAdmissionControl = new AdmissionControl(2 * config.tau, false);
        this.latencyMs = null;

        this.priorities = {
            'client1': {
                priority: 1,
                index: 0
            },
            'client2': {
                priority: 1,
                index: 0
            },
            'client3': {
                priority: 1,
                index: 0
            },
            '*': {
                priority: 0,
                index: 0
            }
        };
        // TODO: gcd of priorities
    }
    click() {
        console.log("Click on server");
    }
    admit(clientId) {
        return this.queue.length < 10;
        
        if (!this.admissionControls[clientId]) {
            this.admissionControls[clientId] = new AdmissionControl(config.tau, true);
        }

        // global admission control
        if (!this.globalAdmissionControl.admit()) {
            this.admissionControls[clientId].admissionFactor.add(0);
            return false;
        }

        // per-client-id admission control
        const accepted = this.admissionControls[clientId].admit();
        if (!accepted) {
            this.globalAdmissionControl.queue -= 1;
        }
        return accepted;
    }
    response(clientId) {
        this.globalAdmissionControl.response();
        if (!this.admissionControls[clientId]) {
            this.admissionControls[clientId] = new AdmissionControl(config.tau, true);
        }
        this.admissionControls[clientId].response();
    }
    receive(request) {
        const self = this;
        const clientId = this.getClientId(request);
        // console.log(request.clientId + ' -> ' + clientId);
        if (!this.admit(clientId)) {
            this.reply(request, 'Error');
            return;
        }
        self.queue.push(request);
        if (self.queue.length === 1) {
            setTimeout(() => { self.process() }, this.latency())
        }
    }
    getClientId(request) {
        const clientId = request.clientId || '*';
        const priorityStruct = this.getPriorityStruct(clientId);
        priorityStruct.index = (priorityStruct.index + 1) % priorityStruct.priority;
        const index = priorityStruct.index
        return 'BUCKET_' + clientId + '_' + index;
    }
    getPriorityStruct(clientId) {
        if (this.priorities[clientId]) {
            return this.priorities[clientId];
        } else {
            return this.priorities['*'];
        }
    }
    normalRandom() {
        var u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
        var v = 1 - Math.random();
        let x = (5 + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)) / 10;
        x = Math.max(0.0, x);
        x = Math.min(x, 1.0);
        return x;
    }
    process() {
        const self = this;
        const request = self.queue.splice(0, 1)[0];
        const clientId = this.getClientId(request);
        this.response(clientId);
        this.reply(request, 'Response');

        if (self.queue.length > 0) {
            setTimeout(() => { self.process() }, this.latency())
        }
    }
    latency() {
        // return 2 * this.normalRandom() * (this.latencyMs || config.serverProcessingLatencyMs);
        let k = 1;
        if (config.realWorld) {
            k = 2 * this.normalRandom();
        }
        return k * (this.latencyMs || config.serverProcessingLatencyMs);
    }
    reply(request, type) {
        let response = new Packet(this.scene, this, request.source, type, request.seqId, request.clientId, request.content);
        response.serverId = request.serverId;
        scene.register(response);
    }
    draw(ctx) {
        const x = Math.round(this.positionX);
        const y = Math.round(this.positionY);
        const circleSize = 20;
        const greenLength = 6;

        ctx.fillStyle = this.color || "#1D5B79";
        const q = this.queue.length;

        const queueItemWidth = 10;
        const size = 50;
        for (let i = 0; i < q - 1; i++) {
            ctx.fillRect(x, y - 4 * i, queueItemWidth, 3)
        }
        ctx.fillRect(x + queueItemWidth + 2, y - size / 2, size, size);

        ctx.fillStyle = "#FF0";
        if (q > 0) {
            ctx.fillRect(x + size, y - 2, queueItemWidth, 3)
        }
        ctx.fillStyle = "#FFF";
        ctx.fillText('CPU', x + size - 16, y + 12);
    }
}

class Client extends Drawable {
    constructor(scene, destinations) {
        super(scene);
        this.circleSize = 20;
        this.destinations = destinations;
        this.seqId = 1;
        this.clientId = "ClientId"
        this.outgoingMap = {};
        this.listeners = {};
        this.successRate = new Ewma(3*config.tau, 1);
        this.pendings = [];
        for (let i=0; i<destinations.length; i++) {
            this.pendings.push(0);
        }
    }
    isInside(x, y) {
        const dx = x - this.positionX;
        const dy = y - this.positionY;
        const r2 = dx*dx + dy*dy;
        return r2 <= this.circleSize * this.circleSize;
    }
    click() {
        this.send();
    }
    send() {
        if (config.loadBalancingAlgo == 'roundrobin') {
            this.roundRobinSend();
        } else if (config.loadBalancingAlgo == 'leastloaded') {
            this.leastLoadedSend();
        } else {
            this.randomSend();
        }
    }
    roundRobinSend() {
        this.rrIndex = ((this.rrIndex || 0) + 1) % this.destinations.length;
        const i = this.rrIndex;
        this.sendToServer(i)
    }
    randomSend() {
        const i = Math.floor(Math.random() * this.destinations.length);
        this.sendToServer(i)
    }
    leastLoadedSend() {
        const n = this.destinations.length
        if (this.pendings.length < this.destinations.length) {
            for (let i=0; i<this.destinations.length - this.pendings.length; i++) {
                this.pendings.push(0);
            }
        }
        for (let i=0; i<this.pendings.length; i++) {
            if (isNaN(this.pendings[i])) {
                this.pendings[i] = 0;
            }
        }

        let minIndices = [0];
        let minValue = this.pendings[0];
      
        for (let i=1; i<n; i++) {
          if (this.pendings[i] < minValue) {
            minValue = this.pendings[i];
            minIndices = [i];
          } else if (this.pendings[i] === minValue) {
            minIndices.push(i);
          }
        }
      
        const i = Math.floor(Math.random() * minIndices.length);
        this.sendToServer(minIndices[i])
    }
    sendToServer(i) {
        const destination = this.destinations[i];
        let req = new Packet(this.scene, this, destination, 'Request', this.seqId, this.clientId, "HELLO");
        this.outgoingMap[this.seqId] = Date.now();
        this.seqId += 1;
        req.serverId = i;
        if (!this.pendings[i]) {
            this.pendings[i] = 0;
        }
        this.pendings[i]++;
        scene.register(req);
    }
    receive(msg) {
        const t0 = this.outgoingMap[msg.seqId];
        delete this.outgoingMap[msg.seqId];
        msg.latency = Date.now() - t0;
        this.pendings[msg.serverId] = Math.max(0, this.pendings[msg.serverId] - 1);

        switch (msg.type) {
            case 'Error':
                this.successRate.add(0);
                break;
            default:
                this.successRate.add(1);
        }
        this.emit('response', msg);
    }
    draw(ctx) {
        const x = Math.round(this.positionX);
        const y = Math.round(this.positionY);
        const greenLength = 6;

        ctx.fillStyle = this.color || "#468B97";
        ctx.beginPath();
        ctx.arc(x, y, this.circleSize, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        if (config.loadBalancingAlgo == 'leastloaded' && this.pendings) {
            for (let i=0; i<this.pendings.length; i++) {
                const pending = this.pendings[i] || 0
                ctx.fillText(pending, x - this.circleSize - 20, y + i * 18);
            }
        }
        // ctx.fillText((100 * this.successRate.estimate()).toFixed(1), x - this.circleSize - 28, y);
    }
}

class Packet extends Drawable {
    constructor(scene, source, destination, type, seqId, clientId, content) {
        super(scene);
        this.source = source;
        this.destination = destination;
        this.type = type;
        this.seqId = seqId;
        this.clientId = clientId;
        this.content = content || "<NO CONTENT>";
        this.positionX = source.positionX;
        this.positionY = source.positionY;
        this.t0 = 0;
    }
    draw(ctx) {
        switch (this.type) {
            case 'Error':
                ctx.fillStyle = "#F00";
                break;
            default:
                ctx.fillStyle = "#88F";
        }
        const particleSize = 7;
        ctx.fillRect(this.positionX, this.positionY, particleSize, particleSize);
    }
    update(t) {
        if (this.t0 === 0) {
            this.t0 = t;
        }
        const elapsed = t - this.t0;
        if (elapsed > config.networkSpeedMs) {
            this.destination.receive(this);
            this.scene.unregister(this);
        } else {
            const speed = 1;
            const dx = this.destination.positionX - this.source.positionX;
            const dy = this.destination.positionY - this.source.positionY;
            const k = speed * elapsed / config.networkSpeedMs;
            this.positionX = this.source.positionX + k * dx;
            this.positionY = this.source.positionY + k * dy;
        }
    }
}

class Source {
    // call the `fn` function at a rate specified by `rps`
    // the distribution of the calls is specified by the string `type`
    // and can be 'poisson` (default), 'normal' or 'fixed'
    constructor(type, rps, fn) {
        this.type = type;
        this.rps = rps;
        this.fn = fn;
        this.id = 0;
        this.start(Math.random() * 1000 / this.rps);
    }
    start(jitter) {
        const self = this;
        if (this.rps == 0) {
            return
        }
        const targetDeltaTime = 1000 / this.rps;

        let sleepTime = 0;
        switch (this.type) {
            case 'poisson':
                sleepTime = -Math.log(Math.random()) * targetDeltaTime;
                break;
            case 'normal':
                sleepTime = Math.round(2 * self.normalRandom() * targetDeltaTime);
                break;
            case 'fixed':
            default:
                sleepTime = targetDeltaTime;
        }

        this.id = setTimeout(() => {
            this.fn();
            self.start();
        }, sleepTime + (jitter || 0));
    }
    stop() {
        clearTimeout(this.id);
        this.id = 0;
    }
    normalRandom() {
        var u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
        var v = 1 - Math.random();
        let x = (5 + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)) / 10;
        x = Math.max(0.0, x);
        x = Math.min(x, 1.0);
        return x;
    }
}

let servers = [];
let clients = [];
let sources = [];
let hist;
const bottomBannerHeight = 400;

function changeRps(rps, distribution) {
    config.clientRps = rps;
    config.clientRpsDistribution = distribution;

    for (let src of sources) {
        src.stop()
    }
    sources = []
    for (let client of clients) {
        let src = new Source(distribution || 'fixed', rps || 1, () => {
            client.send();
        })
        sources.push(src);
    }
}

function rebalanceServers() {
    const delta = (h - bottomBannerHeight) / (servers.length + 1)
    for (let i=0; i<servers.length; i++) {
        const server = servers[i];
        server.targetX = 4 * (w / 5);
        server.targetY = delta * (i+1);
    }
}

function rebalanceClients() {
    const delta = (h - bottomBannerHeight) / (clients.length + 1)
    for (let i=0; i<clients.length; i++) {
        const client = clients[i];
        client.targetX = w / 5;
        client.targetY = delta * (i+1);
    }
}

function addServer() {
    let server = new Server(scene);
    server.positionX = w / 2;
    server.positionY = h / 2;
    servers.push(server);
    
    rebalanceServers();
}

function removeServer() {
    const server = servers.pop();
    scene.unregister(server);
    
    rebalanceServers();
}

function addClient() {
    let client = new Client(scene, servers);
    client.positionX = w / 2;
    client.positionY = h / 2;
    clients.push(client);
    
    rebalanceClients();
    changeRps(config.clientRps, config.clientRpsDistribution);
}

function removeClient() {
    const client = clients.pop();
    scene.unregister(client);
    const src = sources.pop();
    src.stop();
    
    rebalanceClients();
}

function setup(scene, number_of_clients, number_of_servers) {
    const windowDurationMs = 15000;        
    const border = 80;
    const graph = new Graph(scene, windowDurationMs, border, h - border, w / 2 - 2 * border, bottomBannerHeight);
    hist = new WindowHistogram(scene, {
        position: {x: w / 2 + border, y: (h - border)},
        windowMs: windowDurationMs,
        count: 3,
        dimension: {x: w / 2 - 2 * border, y: bottomBannerHeight}
    });

    const delta = (h - bottomBannerHeight) / (number_of_servers + 1)
    for (let i=1; i <= number_of_servers; i++) {
        let server = new Server(scene);
        server.targetX = 4 * (w / 5);
        server.targetY = delta * i;
        server.positionX = server.targetX;
        server.positionY = server.targetY;
        servers.push(server);
    }

    const deltaClient = (h - bottomBannerHeight) / (number_of_clients + 1)
    for (let i=1; i<=number_of_clients; i++) {
        let client = new Client(scene, servers);
        client.targetX = w / 5;
        client.targetY = deltaClient * i;
        client.positionX = client.targetX;
        client.positionY = client.targetY;
        client.on('response', (msg) => {
            if (msg.type != 'Error') {
                const serverLatency = msg.latency - config.networkSpeedMs * 2;
                hist.add(serverLatency);
                graph.add(serverLatency);
            }
        });
        clients.push(client);
    }

    changeRps(config.clientRps, config.clientRpsDistribution);
}