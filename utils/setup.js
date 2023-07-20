function initP5(show = false, webgl = false, ratio) {
    if (ratio){
        if (windowWidth < windowHeight * ratio) {
        p5Canvas = createCanvas(windowWidth, windowWidth / ratio, webgl ? WEBGL : null)
        } else {
        p5Canvas = createCanvas(windowHeight * ratio, windowHeight, webgl ? WEBGL : null)
        }
    } else {
        p5Canvas = createCanvas(windowWidth, windowHeight, webgl ? 'webgl' : 'p2d');
    }
    PS = width / 650
    noiseSeed(round_random(1000))
    angleMode(DEGREES)
    if (!show) p5Canvas.elt.style.display = 'none'
    V = createVector
}

function initPaper(show = false) {
    paperCanvas = document.createElement('canvas');
    paperCanvas.width = width || windowWidth;
    paperCanvas.height = height || windowHeight
    width = width || windowWidth
    height = height || windowHeight
    paper.setup(paperCanvas);

    
    // document.body.appendChild(paperCanvas);
    document.querySelector('main').appendChild(paperCanvas);

    paperCanvas.style.display = 'block';
    if (!show) paperCanvas.style.display = 'none';

    window.Path = paper.Path,
    window.Circle = paper.Path.Circle,
    window.Rectangle = paper.Path.Rectangle,
    window.Point = paper.Point,
    window.Color = paper.Color,
    window.Group = paper.Group,
    window.CompoundPath = paper.CompoundPath,
    window.Segment = paper.Segment,
    window.Size = paper.Size
}


function initMatter() {
    Matter.use('matter-attractors');

    window.Engine = Matter.Engine,
    window.Render = Matter.Render,
    window.Runner = Matter.Runner,
    window.Bodies = Matter.Bodies,
    window.Composite = Matter.Composite,
    window.Constraint = Matter.Constraint,
    window.Query = Matter.Query

    engine = Engine.create();
    engine.gravity.y = 0
    world = engine.world
    window.Runner.run(engine);

    Matter.Common.setDecomp(decomp);
}

p5.RendererGL.prototype._initContext = function () {
    try {
        this.drawingContext =
            this.canvas.getContext('webgl2', this._pInst._glAttributes) ||
            this.canvas.getContext('webgl', this._pInst._glAttributes) ||
            this.canvas.getContext('experimental-webgl', this._pInst._glAttributes);
        if (this.drawingContext === null) {
            throw new Error('Error creating webgl context');
        } else {
            const gl = this.drawingContext;
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            this._viewport = this.drawingContext.getParameter(
                this.drawingContext.VIEWPORT
            );
        }
    } catch (er) {
        throw er;
    }
};

// async function keyPressed(){
//     // keyCode 89 is Y
//     if (keyCode == 89) {
//         if (p5Canvas.elt.style.display == 'none') {
//             p5Canvas.elt.style.display = 'block';
//             paperCanvas.style.display = 'none';
//         } else {
//             p5Canvas.elt.style.display = 'none';
//             paperCanvas.style.display = 'block';
//         }
//     }
//     // keyCode 83 is S
//     if (keyCode == 83) {
//         console.log('save1')
//         paper.project.activeLayer.children.forEach(child => {
//             if (!child.strokeColor == 'red') child.remove()
//         });
//         console.log('save2')
//         const svg = paper.project.exportSVG({asString:true})
//         console.log('save3')
//         const url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
//         console.log('save4')
//         const link = document.createElement("a");
//         link.download = "drawing.svg";
//         console.log('save5') 
//         link.href = url;
//         console.log('save7')
//         link.click();
//         console.log('save8')
//     }
// }