async function setup() {
    initP5(true)
    _pd = pixelDensity()
    the_canvas = p5Canvas;
    the_canvas_context = drawingContext

    initPaper(false)

    await makeImage()
}

async function makeImage() {
    attractors = []
    border = width / 5
    const cellSize = width / 100
    for (let x = border; x < width - border; x += cellSize) {
        for (let y = border; y < height - border; y += cellSize) {
            if (noise(x / border * .8, y / border * .8) < 0.2) attractors.push(p(x, y))
        }
    }
    // for (let i=0;i<150;i++){
    //     const y = random(100,height-100)
    //     const x = width/2 + random(-1,1) * map(y, 100, height-100, width/2, 0)
    //     attractors.push(p(x, y))
    // }
    // attractors = Array(50).fill(0).map(_ => (p(width * random(.1, .9), height * random(.1, .9))))
    if (attractors.length < 10)
        attractors = Array(360).fill(0).map((_, i) => p(width / 2 + cos(i) * 200, height / 2 + sin(i) * 200))
    // attractors.push(p(0,0))
    // attractors.push(p(width,0))
    // attractors.push(p(0,height))
    // attractors.push(p(width,height))
    attractors = attractors.map(p => ({ pos: p }))

    attractorTree = new HashGrid(width, height, 50)
    attractors.forEach(a => attractorTree.add(a))


    nodes = []

    listener = document.addEventListener('mousedown', e => {
        print('click')
        const pos = p(e.clientX, e.clientY)
        document.removeEventListener('mousedown', listener)
        nodes.push(new Node(pos))
        start()
    })
}



running = false
async function start(){
    if (running) return
    running = true


    nodeTree = new HashGrid(width, height, 50)
    nodes.forEach(n => nodeTree.add(n))


    background(255)

    // noStroke()
    // fill(0,50)
    // attractors.forEach(a => circle(a.pos.x, a.pos.y, 5))

    stroke(0)
    strokeWeight(2)


    for (let i = 0; i < 2500; i++) {
        newNodes = []
        removeAttractors = []

        nodes.forEach(n => n.attractors = [])
        attractors.forEach(a => a.nodes = [])

        attractors.forEach(a => {
            const closest = nodeTree.knn(a, 1)
            closest.forEach(n => n.attractors.push(a))
        })

        nodes.forEach(n => {
            if (n.attractors.length == 0) {
                if (n.connections.length == 1) {
                    const newNode = n.grow()
                    newNodes.push(newNode)
                    const neighbors = nodeTree.query(newNode, 3)
                        .filter(n2 => n2 != n)
                        .filter(n2 => n2.pos.getDistance(newNode.pos) < 2)
                        .filter(n2 => n2.branch != n.branch || abs(n2.numInBranch - n.numInBranch) > 10)
                    if (neighbors.length > 1) newNode.connect(neighbors[0])
                }
                return
            }

            const dirs = n.attractors.map(a => a.pos.subtract(n.pos).normalize())
            const dir = dirs.reduce((a, b) => a.add(b)).normalize()
            const newNode = n.grow(dir)
            newNodes.push(newNode)
            n.attractors.forEach(a => a.nodes.push(newNode))

            n.attractors.forEach(a => {
                if (a.pos.getDistance(n.pos) < 4) removeAttractors.push(a)
            })
        })

        // attractors.forEach(a => {
        //     if (a.nodes.length == 0) return
        //     if (a.nodes.every(n => n.pos.getDistance(a.pos) < 10)) removeAttractors.push(a)
        // })

        attractors = attractors.filter(a => !removeAttractors.includes(a))
        attractorTree = new HashGrid(width, height, 50)
        attractors.forEach(a => attractorTree.add(a))


        newNodes = newNodes.filter(n => n.pos.x > 0 && n.pos.x < width && n.pos.y > 0 && n.pos.y < height)

        newNodes.forEach(n => {
            // if (n.pos.x < 100 || n.pos.x > width - 100 || n.pos.y < 100 || n.pos.y > height - 100) return
            nodes.push(n)
            nodeTree.add(n)
        })


        if (newNodes.length == 0) {
            for (let t = 0; t < 100; t++) {
                let newNode = null
                const fakeNode = { pos: p(random(width),random(height)) }
                const closest = nodeTree.knn(fakeNode, 1)[0]
                const d = closest.pos.getDistance(fakeNode.pos)
                if (d > 10 && d < 30) {
                    newNode = new Node(fakeNode.pos)
                    newNode2 = newNode.grow()
                    nodes.push(newNode)
                    nodeTree.add(newNode)
                    nodes.push(newNode2)
                    nodeTree.add(newNode2)
                    print('new node')
                    break;
                }
            }
        }

        await timeout()
    }

    // filler = new SpanFill()
    // loadPixels()
    // for (let x=0;x<width;x+=40){
    //     for (let y=0;y<height;y+=40){
    //         const clr = getPixel(x,y)
    //         if (clr[0] == 255 && clr[1] == 255 && clr[2] == 255){
    //             colorMode(HSB)
    //             const newClr = color(random(100), 70, 70)
    //             filler.fill(x,y,[red(newClr),green(newClr),blue(newClr)])
    //         }
    //     }
    // }

    // document.querySelector('main').style.display = 'none'


    branches = Array(currBranchID).fill(0).map(_ => [])
    nodes.forEach(n => branches[n.branch].push(n))
    branches.forEach(branch => {
        const last = branch[branch.length - 1]
        if (last.connections.length == 2) branch.push(last.connections[1])
    })

    svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgElement.setAttribute('width', width)
    svgElement.setAttribute('height', height)
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svgInner = ''
    branches.forEach(branch => {
        if (branch.length < 10) return
        svgInner += `<path d="M ${branch[0].pos.x} ${branch[0].pos.y} ${branch.map(n => `L ${n.pos.x} ${n.pos.y}`).join(' ')}" stroke="black" fill="none" />`
    })
    svgElement.innerHTML = svgInner
    document.body.appendChild(svgElement)

    document.addEventListener('keydown', e => {
        if (e.key == 's') {
            // save svg as svg
            const svg = document.querySelector('svg')
            const svgData = new XMLSerializer().serializeToString(svg)
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
            const svgUrl = URL.createObjectURL(svgBlob)
            const downloadLink = document.createElement('a')
            downloadLink.href = svgUrl
            downloadLink.download = 'svg.svg'
            document.body.appendChild(downloadLink)
            downloadLink.click()
            document.body.removeChild(downloadLink)
        }
    })
}

let currBranchID = 0
const getNextBranchID = () => currBranchID++

function Node(pos, parent) {
    this.pos = pos
    this.connections = []
    this.dir = p(0, -1)
    if (parent) {
        this.connections.push(parent)
        this.dir = this.pos.subtract(parent.pos).normalize()
        parent.connections.push(this)
    }
    if (!parent) {
        this.branch = getNextBranchID()
        this.numInBranch = 0
    }
    else {
        this.branch = parent.connections.length == 2 ? parent.branch : getNextBranchID()
        this.numInBranch = parent.connections.length == 2 ? parent.numInBranch + 1 : 0
    }

    this.grow = (dir) => {
        let thisAngle = (this.dir.angle + 360) % 360
        let dirAngle = dir ? (dir.angle + 360) % 360 : thisAngle

        if (abs(thisAngle - dirAngle) > 180) thisAngle = 360 - thisAngle
        let newAngle = lerp(thisAngle, dirAngle, .5)
        newAngle += (noise(this.pos.x / 230, this.pos.y / 230) - 0.5) * 100 + 25
        // if (!dir) newAngle += 10
        this.dir = p(cos(newAngle), sin(newAngle))
        const newPos = this.pos.add(this.dir.multiply(1))
        line(this.pos.x, this.pos.y, newPos.x, newPos.y)
        const newNode = new Node(newPos, this)
        return newNode
    }

    this.connect = (other) => {
        this.connections.push(other)
        other.connections.push(this)
        line(this.pos.x, this.pos.y, other.pos.x, other.pos.y)
    }
}










class SpanFill {
    fill(x, y, targetColor) {
        loadPixels()
        this.startColor = getPixel(x, y)
        this.stack = [{ x, y }];

        while (this.stack.length > 0) {
            // print(this.stack.length)
            let { x, y } = this.stack.pop();
            let lx = x;

            while (this.shouldFill(lx, y, this.startColor)) {
                setPixel(lx, y, targetColor)
                lx = lx - 1;
            }

            let rx = x + 1;
            while (this.shouldFill(rx, y, this.startColor)) {
                setPixel(rx, y, targetColor)
                rx = rx + 1;
            }
            this.scan(lx, rx - 1, y + 1);
            this.scan(lx, rx - 1, y - 1)
        }
        updatePixels()
    }

    scan(lx, rx, y) {
        for (let i = lx; i < rx; i++) {
            if (this.shouldFill(i, y, this.startColor)) {
                this.stack.push({ x: i, y: y });
            }
        }
    }

    shouldFill(x, y, clr) {
        if (x < 0 || x > width || y < 0 || y > height) return false
        const pixelClr = getPixel(x, y)
        return Math.abs(pixelClr[0] - clr[0]) +
            Math.abs(pixelClr[1] - clr[1]) +
            Math.abs(pixelClr[2] - clr[2]) < 10
    }
}

const xy2i = (x, y) => 4 * (x * _pd + y * _pd * width * _pd)
function getPixel(x, y) {
    const i = xy2i(x, y)
    return [pixels[i], pixels[i + 1], pixels[i + 2]]
}
function setPixel(x, y, clr) {
    const i = xy2i(x, y)
    for (let d = 0; d < _pd; d++) {
        pixels[i + d * 4 + 0] = clr[0]
        pixels[i + d * 4 + 1] = clr[1]
        pixels[i + d * 4 + 2] = clr[2]

        pixels[i + d * width * 4 * 2 + 0] = clr[0]
        pixels[i + d * width * 4 * 2 + 1] = clr[1]
        pixels[i + d * width * 4 * 2 + 2] = clr[2]

        pixels[i + d * width * 4 * 2 + d * 4 + 0] = clr[0]
        pixels[i + d * width * 4 * 2 + d * 4 + 1] = clr[1]
        pixels[i + d * width * 4 * 2 + d * 4 + 2] = clr[2]
    }
}