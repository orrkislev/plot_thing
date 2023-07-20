const Path = paper.Path
const Point = paper.Point
const Segment = paper.Segment
const Group = paper.Group
const CompoundPath = paper.CompoundPath
const CurveLocation = paper.CurveLocation

const DIRS = { UP: new Point(0, -1), DOWN: new Point(0, 1), LEFT: new Point(-1, 0), RIGHT: new Point(1, 0) }
const P = (x, y) => new Point(x, y)
const randomPoint = (s=1) => new Point(random(-1, 1), random(-1, 1)).normalize(s)
const pointFromAngle = (angle,s=1) => new Point(1, 0).rotate(angle).multiply(s)
const positiveAngle = (angle) => angle > 0 ? angle : angle + 360
const pointLerp = (p1, p2, t) => p(lerp(p1.x, p2.x, t), lerp(p1.y, p2.y, t))

class WaterColorPath{
    constructor(path) {
        this.path = path
        this.waterColorPaths = new Group()
    }
    waterColor(clr){
        this.path.waterColor(clr,this)
    }
}

paper.Color.prototype.lerp = function (color, t) {
    const r = lerp(this.red, color.red, t)
    const g = lerp(this.green, color.green, t)
    const b = lerp(this.blue, color.blue, t)
    return new paper.Color(r, g, b)
}

paper.Path.prototype.getDistance = function (point) {
    return this.getNearestLocation(point).distance
}

paper.Path.prototype.getSection = function (from, to) {
    if (typeof from === 'number') from = this.getPointAt(from)
    else if (from instanceof Point) from = this.getNearestPoint(from)
    else if (from instanceof CurveLocation) from = this.getNearestPoint(from.point)
    if (!from) from = from = this.getPointAt(0)

    if (typeof to === 'number') to = this.getPointAt(to)
    else if (to instanceof Point) to = this.getNearestPoint(to)
    else if (to instanceof CurveLocation) to = this.getNearestPoint(to.point)
    if (!to) to = this.getPointAt(this.length)

    if (from.equals(to)) return

    const newPath = this.clone()
    const newPath2 = newPath.splitAt(newPath.getNearestLocation(from).offset)
    const keepPath = pointOnWhichPath(to, newPath, newPath2)
    const keepPath2 = keepPath.splitAt(keepPath.getNearestLocation(to).offset)
    // const result = pointOnWhichPath(from, keepPath, keepPath2).clone()
    const result = keepPath.length < keepPath2.length ? keepPath.clone() : keepPath2.clone()
    if (newPath) newPath.remove()
    if (newPath2) newPath2.remove()
    if (keepPath) keepPath.remove()
    if (keepPath2) keepPath2.remove()
    return result
}

function pointOnWhichPath(point, path1, path2) {
    if (!path1) return path2
    if (!path2) return path1
    if (path1.getLocationOf(point)) return path1
    if (path2.getLocationOf(point)) return path2
    const pointOnPath1 = path1.getNearestPoint(point)
    const pointOnPath2 = path2.getNearestPoint(point)
    return pointOnPath1.getDistance(point) < pointOnPath2.getDistance(point) ? path1 : path2
}

paper.CompoundPath.prototype.offset = function (offset) {
    return new CompoundPath(this.children.map(child => child.offset(offset)))
}

paper.Path.prototype.offset = function (offset) {
    const res = new Path()
    this.segments.forEach(seg => {
        const newSeg = seg.clone()
        newSeg.point = newSeg.point.add(seg.location.normal.multiply(offset))
        res.add(newSeg)
    })
    if (this.closed) res.closePath()
    return res
}
paper.Path.prototype.getBorder = function(offset){
    const offset1 = this.offset(offset/2)
    const offset2 = this.offset(-offset/2)

    if (this.closed){
        const res = offset1.subtract(offset2)
        offset1.remove()
        offset2.remove()
        return res
    } else {
        offset2.reverse()
        offset1.join(offset2)
        offset1.closePath()
        offset2.remove()
        return offset1
    }
}





paper.Path.prototype.wonky = function (minVal = -20, maxVal = 20) {
    // this.simplify()
    // const pos = this.position.clone()
    // this.translate(-pos.x, -pos.y)
    this.segments.forEach(seg => {
        // const r = random(-45,45)
        // seg.handleIn = seg.handleIn.rotate(r).multiply(random(2))
        // seg.handleOut = seg.handleOut.rotate(r).multiply(random(2))
        const offset = seg.location.normal.multiply(random(minVal, maxVal))
        seg.point = seg.point.add(offset)
    })
    // this.translate(pos.x, pos.y)
    return this
}
paper.Path.prototype.blocky = function (minVal=.3, maxVal=1) {
    for (let i = 0; i < this.length; i += random(20, 100)) {
        this.divideAt(i)
    }
    this.segments.forEach(p => p.handleIn = p.handleIn.multiply(random(minVal, maxVal)))
    this.segments.forEach(p => p.handleOut = p.handleOut.multiply(random(minVal, maxVal)))
    return this
}


paper.CompoundPath.prototype.waterColor = function (clr, parentPath) {
    for (let i = 0; i < this.children.length; i++) this.children[i].waterColor(clr, parentPath)
}

let otherPaintPaths
paper.Path.prototype.waterColor = function (clr, parentPath, paintGroup) {
    const waterColorClr = new paper.Color(clr)
    waterColorClr.alpha = 0.04

    const thisWidth = this.bounds.width
    const thisHeight = this.bounds.height


    if (!paintGroup) paintGroup = new Group()

    for (let j = 0; j < 5; j++) {
        // const base = this.rebuild(10).wonky()
        const base = this.clone().wonky()
        base.fillColor = null
        base.strokeColor = null
        for (let i = 0; i < 6; i++) {
            let newShape = base.clone().deform(2)
            if (parentPath) {
                const newnewShape = newShape.intersect(parentPath)
                newShape.remove()
                newShape = newnewShape
            }
            const otherColor = new paper.Color(clr)
            otherColor.alpha = 0.03
            otherColor.brightness = otherColor.brightness + .4
            otherColor.saturation = otherColor.saturation - .5
            const origin = P(this.bounds.topLeft).add(random(thisWidth), random(thisHeight))
            newShape.fillColor = {
                gradient: {
                    stops: [[waterColorClr, random(.6, .8)], [otherColor, 1]],
                    radial: true
                },
                origin,
                destination: origin.add(random(thisWidth * 2), random(thisHeight * 2))
            }
            
            paintGroup.insertChild(round_random(paintGroup.children.length), newShape)
        }

        base.remove()
    }

    return paintGroup
}

paper.Path.prototype.rebuild = function (numPoints) {
    const newSegs = []
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const offset = this.length * t
        const loc = this.getLocationAt(offset)
        if (!loc) continue
        // const seg = loc.segment
        // if (loc.point.getDistance(seg.point) < 5) newSegs.push(seg)
        // else{
            const newSeg = this.divideAt(this.length * i / numPoints)
            newSegs.push(newSeg)
        // }
    }
    for (let i=this.segments.length-2; i>=1; i--){
        if (!newSegs.includes(this.segments[i])) this.removeSegment(i)
    }
    this.smooth()
    return this

    // numPoints = Math.max(numPoints, this.segments.length)
    // const newPath = new paper.Path()
    // newPath.strokeColor = this.strokeColor
    // newPath.strokeWidth = this.strokeWidth
    // newPath.strokeCap = this.strokeCap
    // newPath.strokeJoin = this.strokeJoin
    // newPath.closed = this.closed
    // newPath.fillColor = this.fillColor
    // for (let i = 0; i < numPoints; i++) {
    //     const point = this.getPointAt(i / numPoints * this.length)
    //     newPath.add(point)
    // }
    // newPath.smooth()
    // return newPath
}

paper.Path.prototype.deform = function (numTimes = 1) {
    const deformed = this.clone()
    for (let deformTimes = 0; deformTimes < numTimes; deformTimes++) {
        for (let i = 0; i < deformed.segments.length; i++) {
            const seg1 = deformed.segments[i]
            const seg2 = deformed.segments[(i + 1) % deformed.segments.length]
            const dist = seg1.point.getDistance(seg2.point)
            if (dist < 1) continue
            const offset1 = seg1.location.offset
            const offset2 = seg2.location.offset
            const middleOffset = offset2 > offset1 ? (offset1 + offset2) / 2 : ((offset2 + deformed.length + offset1) / 2) % deformed.length
            const newSeg = deformed.divideAt(middleOffset)
            if (newSeg) {
                const noiseVal = noise(newSeg.point.x / 200, newSeg.point.y / 200) * 8
                const moveOffset = P(0, 1).rotate(random(360)).multiply(dist / noiseVal)
                newSeg.point = newSeg.point.add(moveOffset)
            }
            i++
        }
    }
    return deformed
}

paper.Path.prototype.distort = function (val = 0.2, withEnds = false){
    const startSegI = withEnds ? 0 : 1
    const endSegI = withEnds ? this.segments.length - 1 : this.segments.length - 2
    const maxOffset = val * this.length/this.segments.length
    for (let segI = startSegI; segI <= endSegI; segI++) {
        const seg = this.segments[segI]
        const normal = seg.location.normal
        seg.point = seg.point.add(normal.multiply(random(-maxOffset,maxOffset)))
    }
    return this
}


function getOrderedIntersections(path,paths){
    if (!paths) paths = paper.project.activeLayer.children
    let intersections = []
    paths.forEach(p => {
        if (p instanceof Path || p instanceof CompoundPath)
            intersections.push(path.getIntersections(p, intersection => intersection.offset > 3 && intersection.offset < path.length - 3))
    })
    intersections = intersections.flat()
    intersections.sort((a, b) => a.offset - b.offset)
    return intersections
}

paper.Path.prototype.connect = function (path, tolerance = 30){
    const s1 = this.firstSegment.point
    const e1 = this.lastSegment.point
    const s2 = path.firstSegment.point
    const e2 = path.lastSegment.point

    const s1s2 = s1.getDistance(s2)
    const s1e2 = s1.getDistance(e2)
    const e1s2 = e1.getDistance(s2)
    const e1e2 = e1.getDistance(e2)
    const shortest = Math.min(s1s2, s1e2, e1s2, e1e2)
    const domi = this.length > path.length ? this : path
    const merge = shortest < tolerance

    const segs1 = this.segments
    const segs2 = path.segments
    let res = null
    if (shortest == s1s2){
        if (domi == this) res = segs2.reverse().concat(segs1)
        else res = segs1.reverse().concat(segs2)
    } else if (shortest == s1e2){
        res = segs2.concat(segs1)
    } else if (shortest == e1s2){
        res = segs1.concat(segs2)
    } else if (shortest == e1e2){
        if (domi == this) res = segs1.concat(segs2.reverse())
        else res = segs2.concat(segs1.reverse())
    }
    return new Path(res)
}