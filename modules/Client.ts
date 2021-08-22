
// export class Client implements Entity {
//     x: number
//     y: number

//     constructor(x: number, y: number) {
//         this.x = x
//         this.y = y
//     }

//     draw(ctx: any): void {
//         const xx = Math.round(this.x)
//         const yy = Math.round(this.y)

//         ctx.fillStyle = "#900"
//         ctx.beginPath()
//         ctx.arc(xx, yy, 10, 0, Math.PI * 2)
//         ctx.closePath()
//         ctx.fill()
//     }

//     update(t: number): void {
//         const w = 0.005
//         this.x = 20 + 10 * Math.sin(w * t)
//         this.y = 20 + 10 * Math.cos(w * t)
//     }

//     isInside(x: number, y: number): boolean {
//         return false
//     }
// }
