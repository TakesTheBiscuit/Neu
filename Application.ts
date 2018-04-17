import {AnimClip} from "./PIXIPlugins/AnimClip";
import {O} from "./BaseObjects/O";
import {SM} from "./SM";
import {ResourceManager} from "./ResourceManager";
import {Loader} from "./Loader";
import {Vec2} from "./Math";
import {FRAME_DELAY, MIN_SCR_HEIGHT, MIN_SCR_WIDTH} from "../ClientSettings";
import {Controls} from "./Controls";
import {_, FMath} from "../main";
import {PauseTimer} from "./PauseTimer";
import {Sound} from "./Sound";


declare let window: any;

export let TweenMax = window.TweenMax;
export let TweenLite = window.TweenLite;
export let PIXI = window.PIXI;
export let CustomEase = window.CustomEase;
export let Bounce = window.Bounce;
export let Linear = window.Linear;
export let Quad = window.Quad;
export let Power1 = window.Power1;
export let Power4 = window.Power4;
export let Power3 = window.Power3;
export let Power2 = window.Power2;
export let Sine = window.Sine;
export let Elastic = window.Elastic;
export let SteppedEase = window.SteppedEase;
export let SlowMo = window.SlowMo;
export let Circ = window.Circ;

export let TimelineMax = window.TimelineMax;

export class Application {
    public fMath = new FMath(null);
    public engine: any;

    static One: Application;

    public timer: PauseTimer = new PauseTimer();
    public time: number;
    public rm: ResourceManager;
    public sm: SM;
    public lm: Loader;
    public app: PIXI.Application;
    public screenCenterOffset: Vec2;
    public SCR_WIDTH: number;
    public SCR_HEIGHT: number;
    public appScale = 1;
    public activeTab: boolean = true;
    public onContext: Function;

    public SCR_WIDTH_HALF: number;
    public SCR_HEIGHT_HALF: number;
    public MIN_SCR_HEIGHT: number;
    public MIN_SCR_WIDTH: number;

    private lastLoop: number = 0;
    private country: string;
    private avgFPS: number;
    private avgPing: number;
    public lastNetworkPing: number;

    public controls: Controls;
    public PIXI: any;
    public renderer: any;
    public camera: any;
    public worldSpeed: number = 1;
    public debug: boolean = true;

    public delta: number = 0;
    public deltaSec: number = 0.01;
    public totalFrames: number = 0;
    public totalDelta: number = 0;
    private statsPIXIHook: any;
    private lostFocusAt: number;
    public stats: any;
    public timeScale: number = 1;
    public sound: Sound;
    private random: number;
    public cursorPos: PIXI.Point;
    public globalMouseDown: Function;
    protected isInitialLoading: boolean = true;

    start() {
        document.addEventListener('contextmenu', (event) => {
            if (this.onContext) this.onContext();
            event.preventDefault()
        });

        document.addEventListener('visibilitychange', () => {
            const TRICKYTIMECOEF = 0.75;
            if (_.sm.stage == _.game) {
                const SpeedUpCoef = 50;
                if (document.hidden) {
                    _.lostFocusAt = new Date().getTime();
                } else {
                    let lag = new Date().getTime() - _.lostFocusAt;
                    _.setTimeScale(SpeedUpCoef);
                    _.game.enableInput(false);
                    setTimeout(() => {
                        _.game.enableInput(true);
                        _.setTimeScale(1);
                    }, (lag / SpeedUpCoef) * TRICKYTIMECOEF);
                }

                this.activeTab = !document.hidden;
            }
        });

        this.controls = new Controls();
        this.PIXI = PIXI;

        this.app = new PIXI.Application(this.SCR_WIDTH, this.SCR_HEIGHT, {
            autoStart: false,
            clearBeforeRender: false,
            resolution: this.appScale, antialias: false,
            preserveDrawingBuffer: false, forceFXAA: true, backgroundColor: 0xfffffff,
        });
        document.body.appendChild(this.app.view);

        this.camera = new PIXI.Container();
        this.camera.x = 0;
        this.camera.y = 0;

        this.app.stage = new PIXI.Container();

        this.statsPIXIHook = new GStats.PIXIHooks(this.app);
        this.stats = new GStats.StatsJSAdapter(this.statsPIXIHook);
        document.body.appendChild(this.stats.stats.dom || this.stats.stats.domElement);
        this.stats.stats.domElement.style.position = "absolute";
        this.stats.stats.domElement.style.top = "0px";
        this.sm = new SM();
        this.sm.init();

        this.lm = new Loader();
        this.sm.createCamera();
        this.lastLoop = (new Date()).getTime();
        this.lastNetworkPing = this.lastLoop;

        let bindedProcess = this.process.bind(this);
        TweenMax.ticker.addEventListener("tick", bindedProcess);

        let bindedAnimate = this.animate.bind(this);
        this.app.ticker.add(bindedAnimate);
        this.app.ticker.start();
    }

    killTween(tween: any): null {
        if (tween && tween.totalProgress() != 1)
            tween.totalProgress(1).kill();
        return null
    }

    addFilter(m: PIXI.Container, x: PIXI.Filter<any>) {
        let mm: any = <any>(m);
        if (!mm._filters) mm._filters = [];
        mm._filters.push(x);
    }

    removeFilterByType(main: PIXI.Container, ftype: any) {
        let m = <any>main;
        if (!m._filters) return;
        for (let x = m._filters.length - 1; x >= 0; x--) {
            if (m._filters[x] instanceof ftype) {
                m._filters.splice(x, 1);
            }
        }
    }

    removeFilter(main: PIXI.Container, f: PIXI.Filter<any>) {
        let m = <any>main;
        m._filters.splice(_.sm.main.filters.indexOf(f), 1);
    }

    setTimeScale(x: number) {
        TweenMax.globalTimeScale(x);
        this.timeScale = x;
    }

    animate(): void {
        this.timer.process();
        this.random = Math.random();
        this.time = (new Date()).getTime();
        this.cursorPos = this.app.renderer.plugins.interaction.mouse.global;

        if (this.stats)
            this.stats.update();
    }

    process() {
        this.controls.update();
        if (!this.isInitialLoading) {
            let timeD = (this.time - this.lastLoop);
            this.lastLoop = this.time;
            this.deltaSec = timeD / 1000.;
            this.delta = timeD / FRAME_DELAY;
            this.totalDelta += this.delta;
            this.totalFrames++;
            this.sm.process();
        }
    }

    constructor(MIN_SCR_WIDTH, MIN_SCR_HEIGHT: number) {
        this.MIN_SCR_HEIGHT = MIN_SCR_HEIGHT;
        this.MIN_SCR_WIDTH = MIN_SCR_WIDTH;
        Application.One = this;
    }

    public setScreenRes(baseW: number, baseH: number) {
        this.appScale = baseH / MIN_SCR_HEIGHT;
        if (this.appScale > 1.28) this.appScale = 1.28;
        this.SCR_WIDTH = baseW / this.appScale;
        this.SCR_HEIGHT = baseH / this.appScale;
        this.SCR_WIDTH_HALF = this.SCR_WIDTH * .5;
        this.SCR_HEIGHT_HALF = this.SCR_HEIGHT * .5;
        this.screenCenterOffset = [(this.SCR_WIDTH - MIN_SCR_WIDTH) * .5, (this.SCR_HEIGHT - MIN_SCR_HEIGHT) * .5];
    }


    public cm(s: string, layer: PIXI.Container = null, autoplay: boolean = false, times: number[] = null): AnimClip { //create sprite from frame and add to default layer
        let textures = [];
        let keys: Array<string> = [];
        for (let key in PIXI.utils.TextureCache) {
            if (key.indexOf(s) == 0) {
                keys.push(key);
            }
        }

        let inx = 0;
        for (let key of keys) {
            if (times) {
                textures.push({texture: PIXI.utils.TextureCache[key], time: times[inx] ? times[inx] : 1});
            } else {
                textures.push(PIXI.utils.TextureCache[key]);
            }
            inx++;
        }

        let gfx = new AnimClip(textures);
        gfx.anchor.x = 0.5;
        gfx.anchor.y = 0.5;

        if (layer)
            layer.addChild(gfx);

        if (autoplay) {
            gfx.gotoAndPlay(0)
        }

        return gfx;
    }

    public csproj(s: string, layer: PIXI.Container = null): any {
        let texture = PIXI.Texture.fromFrame(s);
        let gfx = new PIXI.projection.Sprite(texture);
        gfx.anchor.x = .5;
        gfx.anchor.y = .5;
        if (layer)
            layer.addChild(gfx); else {
        }

        return gfx
    }

    public cp(layer: PIXI.Container = null): PIXI.Container {
        let p = new PIXI.Container();
        layer.addChild(p);
        return p;
    }

    public cs(s: string, layer: PIXI.Container = null): PIXI.heaven.Sprite { //create sprite from frame and add to default layer
        if (!PIXI.utils.TextureCache[s]) {
            console.log("@@@@Can't find ", s);
            return null;
        }

        let texture = PIXI.Texture.fromFrame(s);
        texture = texture ? texture : PIXI.Texture.fromFrame(s + '.png');
        if (texture) {
            let gfx = new PIXI.heaven.Sprite(texture);
            gfx.anchor.x = .5;
            gfx.anchor.y = .5;
            if (layer)
                layer.addChild(gfx); else {
            }
            return gfx
        } else {
            console.log("@@@@Can't find ", s);
            return null;
        }

    }

    public _(s: string): O {
        return this.sm.findOne(s)
    }


}