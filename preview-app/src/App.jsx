import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/* ══════════════════════════════════════════════════════
   LIQUID ETHER ENGINE
══════════════════════════════════════════════════════ */
/*function LiquidEther({
  colors = ["#a855f7","#ec4899","#f9a8d4"],
  mouseForce = 20, cursorSize = 100, isViscous = false, viscous = 30,
  iterationsViscous = 32, iterationsPoisson = 32, dt = 0.014, BFECC = true,
  resolution = 0.5, isBounce = false, style = {}, className = "",
  autoDemo = true, autoSpeed = 0.5, autoIntensity = 2.2,
  takeoverDuration = 0.25, autoResumeDelay = 1000, autoRampDuration = 0.6
}) {
  const mountRef = useRef(null);
  const webglRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rafRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const isVisibleRef = useRef(true);
  const resizeRafRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    function makePaletteTexture(stops) {
      let arr = Array.isArray(stops) && stops.length > 0 ? (stops.length === 1 ? [stops[0], stops[0]] : stops) : ["#ffffff","#ffffff"];
      const w = arr.length, data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i*4]=Math.round(c.r*255); data[i*4+1]=Math.round(c.g*255); data[i*4+2]=Math.round(c.b*255); data[i*4+3]=255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearFilter;
      tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping; tex.generateMipmaps=false; tex.needsUpdate=true;
      return tex;
    }
    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0,0,0,0);
    class CommonClass {
      width=0;height=0;aspect=1;pixelRatio=1;time=0;delta=0;container=null;renderer=null;clock=null;
      init(container){this.container=container;const _isMob=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)||navigator.maxTouchPoints>0;this.pixelRatio=_isMob?1:Math.min(window.devicePixelRatio||1,2);this.resize();this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.autoClear=false;this.renderer.setClearColor(new THREE.Color(0x000000),0);this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(this.width,this.height);const el=this.renderer.domElement;el.style.width='100%';el.style.height='100%';el.style.display='block';this.clock=new THREE.Clock();this.clock.start();}
      resize(){if(!this.container)return;const rect=this.container.getBoundingClientRect();this.width=Math.max(1,Math.floor(rect.width));this.height=Math.max(1,Math.floor(rect.height));this.aspect=this.width/this.height;if(this.renderer)this.renderer.setSize(this.width,this.height,false);}
      update(){if(!this.clock)return;this.delta=this.clock.getDelta();this.time+=this.delta;}
    }
    const Common=new CommonClass();
    class MouseClass {
      mouseMoved=false;coords=new THREE.Vector2();coords_old=new THREE.Vector2();diff=new THREE.Vector2();timer=null;container=null;docTarget=null;listenerTarget=null;isHoverInside=false;hasUserControl=false;isAutoActive=false;autoIntensity=2.0;takeoverActive=false;takeoverStartTime=0;takeoverDuration=0.25;takeoverFrom=new THREE.Vector2();takeoverTo=new THREE.Vector2();onInteract=null;
      _onMouseMove=this.onDocumentMouseMove.bind(this);_onTouchStart=this.onDocumentTouchStart.bind(this);_onTouchMove=this.onDocumentTouchMove.bind(this);_onTouchEnd=this.onTouchEnd.bind(this);_onDocumentLeave=this.onDocumentLeave.bind(this);
      init(container){this.container=container;this.docTarget=container.ownerDocument||null;const dv=this.docTarget?.defaultView||(typeof window!=='undefined'?window:null);if(!dv)return;this.listenerTarget=dv;dv.addEventListener('mousemove',this._onMouseMove);dv.addEventListener('touchstart',this._onTouchStart,{passive:true});dv.addEventListener('touchmove',this._onTouchMove,{passive:true});dv.addEventListener('touchend',this._onTouchEnd);this.docTarget?.addEventListener('mouseleave',this._onDocumentLeave);}
      dispose(){if(this.listenerTarget){this.listenerTarget.removeEventListener('mousemove',this._onMouseMove);this.listenerTarget.removeEventListener('touchstart',this._onTouchStart);this.listenerTarget.removeEventListener('touchmove',this._onTouchMove);this.listenerTarget.removeEventListener('touchend',this._onTouchEnd);}if(this.docTarget)this.docTarget.removeEventListener('mouseleave',this._onDocumentLeave);this.listenerTarget=null;this.docTarget=null;this.container=null;}
      isPointInside(cx,cy){if(!this.container)return false;const r=this.container.getBoundingClientRect();return cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom;}
      updateHoverState(cx,cy){this.isHoverInside=this.isPointInside(cx,cy);return this.isHoverInside;}
      setCoords(x,y){if(!this.container)return;if(this.timer)window.clearTimeout(this.timer);const r=this.container.getBoundingClientRect();if(r.width===0||r.height===0)return;const nx=(x-r.left)/r.width,ny=(y-r.top)/r.height;this.coords.set(nx*2-1,-(ny*2-1));this.mouseMoved=true;this.timer=window.setTimeout(()=>{this.mouseMoved=false;},100);}
      setNormalized(nx,ny){this.coords.set(nx,ny);this.mouseMoved=true;}
      onDocumentMouseMove(e){if(!this.updateHoverState(e.clientX,e.clientY))return;if(this.onInteract)this.onInteract();if(this.isAutoActive&&!this.hasUserControl&&!this.takeoverActive){if(!this.container)return;const r=this.container.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width,ny=(e.clientY-r.top)/r.height;this.takeoverFrom.copy(this.coords);this.takeoverTo.set(nx*2-1,-(ny*2-1));this.takeoverStartTime=performance.now();this.takeoverActive=true;this.hasUserControl=true;this.isAutoActive=false;return;}this.setCoords(e.clientX,e.clientY);this.hasUserControl=true;}
      onDocumentTouchStart(e){if(e.touches.length!==1)return;const t=e.touches[0];if(!this.updateHoverState(t.clientX,t.clientY))return;if(this.onInteract)this.onInteract();this.setCoords(t.clientX,t.clientY);this.hasUserControl=true;}
      onDocumentTouchMove(e){if(e.touches.length!==1)return;const t=e.touches[0];if(!this.updateHoverState(t.clientX,t.clientY))return;if(this.onInteract)this.onInteract();this.setCoords(t.clientX,t.clientY);}
      onTouchEnd(){this.isHoverInside=false;}onDocumentLeave(){this.isHoverInside=false;}
      update(){if(this.takeoverActive){const t=(performance.now()-this.takeoverStartTime)/(this.takeoverDuration*1000);if(t>=1){this.takeoverActive=false;this.coords.copy(this.takeoverTo);this.coords_old.copy(this.coords);this.diff.set(0,0);}else{const k=t*t*(3-2*t);this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo,k);}}this.diff.subVectors(this.coords,this.coords_old);this.coords_old.copy(this.coords);if(this.coords_old.x===0&&this.coords_old.y===0)this.diff.set(0,0);if(this.isAutoActive&&!this.takeoverActive)this.diff.multiplyScalar(this.autoIntensity);}
    }
    const Mouse=new MouseClass();
    class AutoDriver {
      constructor(mouse,manager,opts){this.mouse=mouse;this.manager=manager;this.enabled=opts.enabled;this.speed=opts.speed;this.resumeDelay=opts.resumeDelay||3000;this.rampDurationMs=(opts.rampDuration||0)*1000;this.active=false;this.current=new THREE.Vector2(0,0);this.target=new THREE.Vector2();this.lastTime=performance.now();this.activationTime=0;this.margin=0.2;this._tmpDir=new THREE.Vector2();this.pickNewTarget();}
      pickNewTarget(){const r=Math.random;this.target.set((r()*2-1)*(1-this.margin),(r()*2-1)*(1-this.margin));}
      forceStop(){this.active=false;this.mouse.isAutoActive=false;}
      update(){if(!this.enabled)return;const now=performance.now(),idle=now-this.manager.lastUserInteraction;if(idle<this.resumeDelay||this.mouse.isHoverInside){if(this.active)this.forceStop();return;}if(!this.active){this.active=true;this.current.copy(this.mouse.coords);this.lastTime=now;this.activationTime=now;}if(!this.active)return;this.mouse.isAutoActive=true;let dtSec=(now-this.lastTime)/1000;this.lastTime=now;if(dtSec>0.2)dtSec=0.016;const dir=this._tmpDir.subVectors(this.target,this.current),dist=dir.length();if(dist<0.01){this.pickNewTarget();return;}dir.normalize();let ramp=1;if(this.rampDurationMs>0){const t=Math.min(1,(now-this.activationTime)/this.rampDurationMs);ramp=t*t*(3-2*t);}const step=this.speed*dtSec*ramp,move=Math.min(step,dist);this.current.addScaledVector(dir,move);this.mouse.setNormalized(this.current.x,this.current.y);}
    }
    const fv=`attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
    const lv=`attribute vec3 position;uniform vec2 px;precision highp float;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}`;
    const mv=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
    const af=`precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 newVel=texture2D(velocity,uv2).xy;gl_FragColor=vec4(newVel,0.0,0.0);}else{vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;vec2 newVel2=texture2D(velocity,spot_old2).xy;gl_FragColor=vec4(newVel2,0.0,0.0);}}`;
    const cf=`precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
    const df=`precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float divergence=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(divergence/dt);}`;
    const ef=`precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
    const pf=`precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;float newP=(p0+p1+p2+p3)/4.0-div;gl_FragColor=vec4(newP);}`;
    const rf=`precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float step=1.0;float p0=texture2D(pressure,uv+vec2(px.x*step,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*step,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*step)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*step)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gradP=vec2(p0-p1,p2-p3)*0.5;v=v-gradP*dt;gl_FragColor=vec4(v,0.0,1.0);}`;
    const vf=`precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 new0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 new1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 new2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 new3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 newv=4.0*old+v*dt*(new0+new1+new2+new3);newv/=4.0*(1.0+v*dt);gl_FragColor=vec4(newv,0.0,0.0);}`;
    class ShaderPass{constructor(props){this.props=props||{};this.uniforms=this.props.material?.uniforms;}init(){this.scene=new THREE.Scene();this.camera=new THREE.Camera();if(this.uniforms){this.material=new THREE.RawShaderMaterial(this.props.material);this.geometry=new THREE.PlaneGeometry(2,2);this.plane=new THREE.Mesh(this.geometry,this.material);this.scene.add(this.plane);}}update(){if(!Common.renderer||!this.scene||!this.camera)return;Common.renderer.setRenderTarget(this.props.output||null);Common.renderer.render(this.scene,this.camera);Common.renderer.setRenderTarget(null);}}
    class Advection extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:af,uniforms:{boundarySpace:{value:s.cellScale},px:{value:s.cellScale},fboSize:{value:s.fboSize},velocity:{value:s.src.texture},dt:{value:s.dt},isBFECC:{value:true}}},output:s.dst});this.init();}init(){super.init();const bg=new THREE.BufferGeometry();const v=new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]);bg.setAttribute('position',new THREE.BufferAttribute(v,3));const bm=new THREE.RawShaderMaterial({vertexShader:lv,fragmentShader:af,uniforms:this.uniforms});this.line=new THREE.LineSegments(bg,bm);this.scene.add(this.line);}update(args){if(!this.uniforms)return;this.uniforms.dt.value=args.dt;this.line.visible=args.isBounce;this.uniforms.isBFECC.value=args.BFECC;super.update();}}
    class ExternalForce extends ShaderPass{constructor(s){super({output:s.dst});this.init(s);}init(s){super.init();const mg=new THREE.PlaneGeometry(1,1);const mm=new THREE.RawShaderMaterial({vertexShader:mv,fragmentShader:ef,blending:THREE.NoBlending,depthWrite:false,uniforms:{px:{value:s.cellScale},force:{value:new THREE.Vector2(0,0)},center:{value:new THREE.Vector2(0,0)},scale:{value:new THREE.Vector2(s.cursor_size,s.cursor_size)}}});this.mouse=new THREE.Mesh(mg,mm);this.scene.add(this.mouse);}update(args){const u=this.mouse.material.uniforms;u.force.value.set((Mouse.diff.x/2)*args.mouse_force,(Mouse.diff.y/2)*args.mouse_force);u.center.value.set(Mouse.coords.x,Mouse.coords.y);u.scale.value.set(args.cursor_size,args.cursor_size);super.update();}}
    class Viscous extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:vf,uniforms:{boundarySpace:{value:s.boundarySpace},velocity:{value:s.src.texture},velocity_new:{value:s.dst_.texture},v:{value:s.viscous},px:{value:s.cellScale},dt:{value:s.dt}}},output:s.dst,output0:s.dst_,output1:s.dst});this.init();}update(args){const{iterations,dt}=args;for(let i=0;i<iterations;i++){const fi=i%2===0?this.props.output0:this.props.output1,fo=i%2===0?this.props.output1:this.props.output0;this.uniforms.velocity_new.value=fi.texture;this.props.output=fo;this.uniforms.dt.value=dt;super.update();}return iterations%2===0?this.props.output0:this.props.output1;}}
    class Divergence extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:df,uniforms:{boundarySpace:{value:s.boundarySpace},velocity:{value:s.src.texture},px:{value:s.cellScale},dt:{value:s.dt}}},output:s.dst});this.init();}update(args){if(this.uniforms)this.uniforms.velocity.value=args.vel.texture;super.update();}}
    class Poisson extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:pf,uniforms:{boundarySpace:{value:s.boundarySpace},pressure:{value:s.dst_.texture},divergence:{value:s.src.texture},px:{value:s.cellScale}}},output:s.dst,output0:s.dst_,output1:s.dst});this.init();}update(args){const{iterations}=args;for(let i=0;i<iterations;i++){const pi=i%2===0?this.props.output0:this.props.output1,po=i%2===0?this.props.output1:this.props.output0;this.uniforms.pressure.value=pi.texture;this.props.output=po;super.update();}return iterations%2===0?this.props.output0:this.props.output1;}}
    class Pressure extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:rf,uniforms:{boundarySpace:{value:s.boundarySpace},pressure:{value:s.src_p.texture},velocity:{value:s.src_v.texture},px:{value:s.cellScale},dt:{value:s.dt}}},output:s.dst});this.init();}update(args){this.uniforms.velocity.value=args.vel.texture;this.uniforms.pressure.value=args.pressure.texture;super.update();}}
    class Simulation{
      constructor(options){
        this.options={
          iterations_poisson:32,
          iterations_viscous:32,
          mouse_force:20,
          resolution:0.5,
          cursor_size:100,
          viscous:30,
          isBounce:false,
          dt:0.014,
          isViscous:false,
          BFECC:true,...options};
          this.fbos={
            vel_0:null,
            vel_1:null,
            vel_viscous0:null,
            vel_viscous1:null,
            div:null,
            pressure_0:null,
            pressure_1:null};
            this.fboSize=new THREE.Vector2();
            this.cellScale=new THREE.Vector2();
            this.boundarySpace=new THREE.Vector2();
            this.init();}init(){this.calcSize();
            this.createAllFBO();
            this.createShaderPass();
          }ggetFloatType(){
            return THREE.HalfFloatType;
          }
createAllFBO(){
            const type=this.getFloatType(),
            opts={type,depthBuffer:false,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping};for(const k in this.fbos)this.fbos[k]=new THREE.WebGLRenderTarget(this.fboSize.x,this.fboSize.y,opts);}createShaderPass(){this.advection=new Advection({cellScale:this.cellScale,fboSize:this.fboSize,dt:this.options.dt,src:this.fbos.vel_0,dst:this.fbos.vel_1});this.externalForce=new ExternalForce({cellScale:this.cellScale,cursor_size:this.options.cursor_size,dst:this.fbos.vel_1});this.viscous=new Viscous({cellScale:this.cellScale,boundarySpace:this.boundarySpace,viscous:this.options.viscous,src:this.fbos.vel_1,dst:this.fbos.vel_viscous1,dst_:this.fbos.vel_viscous0,dt:this.options.dt});this.divergence=new Divergence({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.vel_viscous0,dst:this.fbos.div,dt:this.options.dt});this.poisson=new Poisson({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.div,dst:this.fbos.pressure_1,dst_:this.fbos.pressure_0});this.pressure=new Pressure({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src_p:this.fbos.pressure_0,src_v:this.fbos.vel_viscous0,dst:this.fbos.vel_0,dt:this.options.dt});}calcSize(){const w=Math.max(1,Math.round(this.options.resolution*Common.width)),h=Math.max(1,Math.round(this.options.resolution*Common.height));this.cellScale.set(1/w,1/h);this.fboSize.set(w,h);}resize(){this.calcSize();for(const k in this.fbos)this.fbos[k].setSize(this.fboSize.x,this.fboSize.y);}update(){this.boundarySpace.copy(this.options.isBounce?new THREE.Vector2(0,0):this.cellScale);this.advection.update({dt:this.options.dt,isBounce:this.options.isBounce,BFECC:this.options.BFECC});this.externalForce.update({cursor_size:this.options.cursor_size,mouse_force:this.options.mouse_force,cellScale:this.cellScale});let vel=this.fbos.vel_1;if(this.options.isViscous)vel=this.viscous.update({iterations:this.options.iterations_viscous,dt:this.options.dt});this.divergence.update({vel});const pressure=this.poisson.update({iterations:this.options.iterations_poisson});this.pressure.update({vel,pressure});}}
    class Output{
      constructor(){t
      his.simulation=new Simulation({
        mouse_force:mouseForce,
        cursor_size:cursorSize,
        resolution,
        isViscous,
        viscous,
        dt,
        BFECC,
        isBounce,
        // 아래 두 줄을 추가하여 props가 Simulation까지 전달되게 합니다.
        iterations_poisson: iterationsPoisson,
        iterations_viscous: iterationsViscous
      });
      this.scene=new THREE.Scene();
      this.camera=new THREE.Camera();
      this.output=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.RawShaderMaterial({vertexShader:fv,fragmentShader:cf,transparent:true,depthWrite:false,uniforms:{velocity:{value:this.simulation.fbos.vel_0.texture},boundarySpace:{value:new THREE.Vector2()},palette:{value:paletteTex},bgColor:{value:bgVec4}}}));this.scene.add(this.output);}resize(){this.simulation.resize();}render(){if(Common.renderer){Common.renderer.setRenderTarget(null);Common.renderer.render(this.scene,this.camera);}}update(){this.simulation.update();this.render();}}
    class WebGLManager{constructor(props){this.props=props;this.lastUserInteraction=performance.now();this.running=false;this._loop=this.loop.bind(this);this._resize=this.resize.bind(this);Common.init(props.$wrapper);Mouse.init(props.$wrapper);Mouse.autoIntensity=props.autoIntensity;Mouse.takeoverDuration=props.takeoverDuration;Mouse.onInteract=()=>{this.lastUserInteraction=performance.now();if(this.autoDriver)this.autoDriver.forceStop();};this.autoDriver=new AutoDriver(Mouse,this,{enabled:props.autoDemo,speed:props.autoSpeed,resumeDelay:props.autoResumeDelay,rampDuration:props.autoRampDuration});this.init();window.addEventListener('resize',this._resize);this._onVisibility=()=>{if(document.hidden)this.pause();else if(isVisibleRef.current)this.start();};document.addEventListener('visibilitychange',this._onVisibility);}init(){if(Common.renderer){this.props.$wrapper.prepend(Common.renderer.domElement);this.output=new Output();}}resize(){Common.resize();this.output.resize();}render(){if(this.autoDriver)this.autoDriver.update();Mouse.update();Common.update();this.output.update();}loop(){if(this.running){this.render();rafRef.current=requestAnimationFrame(this._loop);}}start(){if(!this.running){this.running=true;this._loop();}}pause(){this.running=false;if(rafRef.current)cancelAnimationFrame(rafRef.current);rafRef.current=null;}dispose(){window.removeEventListener('resize',this._resize);if(this._onVisibility)document.removeEventListener('visibilitychange',this._onVisibility);Mouse.dispose();if(Common.renderer){const c=Common.renderer.domElement;if(c.parentNode)c.parentNode.removeChild(c);Common.renderer.dispose();}}}
    const webgl=new WebGLManager({$wrapper:mountRef.current,autoDemo,autoSpeed,autoIntensity,takeoverDuration,autoResumeDelay,autoRampDuration});
    webglRef.current=webgl;webgl.start();
    const io = new IntersectionObserver(entries => {
    // 1. 관찰 대상이 있는지 확인
    if (!entries[0]) return;
    
    const v = entries[0].isIntersecting;
    isVisibleRef.current = v;

    // 2. Ref가 현재 값을 가지고 있는지 안전하게 체크
    const engine = webglRef.current;
    if (engine && typeof engine.start === 'function' && typeof engine.pause === 'function') {
      if (v && !document.hidden) {
        engine.start();
      } else {
        engine.pause();
      }
    }
  }, { 
    threshold: 0.01 // 1%라도 보이면 작동, 아예 안 보이면 즉시 정지
  });
    io.observe(mountRef.current);intersectionObserverRef.current=io;
    const ro=new ResizeObserver(()=>{if(resizeRafRef.current)cancelAnimationFrame(resizeRafRef.current);resizeRafRef.current=requestAnimationFrame(()=>webglRef.current?.resize());});
    ro.observe(mountRef.current);resizeObserverRef.current=ro;
    return()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);resizeObserverRef.current?.disconnect();intersectionObserverRef.current?.disconnect();webglRef.current?.dispose();webglRef.current=null;};
  }, [colors,autoDemo,autoSpeed,autoIntensity,takeoverDuration,autoResumeDelay,autoRampDuration]);

  return <div ref={mountRef} className={`w-full h-full relative overflow-hidden pointer-events-none touch-none ${className}`} style={style}/>;
}*/

/* ══════════════════════════════════════════════════════
   WORK CARD
══════════════════════════════════════════════════════ */
/*function WorkCard({ tag, title, year, accent, index }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.55)",
        border: `1px solid ${hov ? accent+"55" : "rgba(168,85,247,.14)"}`,
        borderRadius: 20, padding: "clamp(22px,3vw,36px)",
        cursor: "pointer", backdropFilter: "blur(20px)",
        transition: "all .28s cubic-bezier(.22,1,.36,1)",
        transform: hov ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hov ? `0 20px 56px rgba(168,85,247,.14)` : "0 2px 10px rgba(168,85,247,.05)",
        display: "flex", flexDirection: "column", gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontFamily: "'Space Mono',monospace", fontSize: 10,
          letterSpacing: ".14em", textTransform: "uppercase",
          color: accent, background: `${accent}14`, borderRadius: 999, padding: "4px 12px",
        }}>{tag}</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#aaa", letterSpacing: ".06em" }}>{year}</span>
      </div>
      <div style={{
        height: "clamp(110px,16vw,180px)", borderRadius: 12,
        background: `linear-gradient(135deg, ${accent}1a 0%, ${accent}08 100%)`,
        border: `1px dashed ${accent}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: `${accent}70`, letterSpacing: ".1em" }}>
          Case Study {String(index+1).padStart(2,"0")}
        </span>
      </div>
      <p style={{
        fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500,
        fontSize: "clamp(14px,1.4vw,17px)", color: "#111", lineHeight: 1.55, letterSpacing: "-.01em",
      }}>{title}</p>
      <div style={{
        display: "flex", alignItems: "center", gap: hov ? 10 : 6,
        fontFamily: "'Space Mono',monospace", fontSize: 11,
        color: accent, letterSpacing: ".08em", transition: "gap .2s",
      }}>
        View Case Study <span style={{ fontSize: 13 }}>→</span>
      </div>
    </div>
  );
}*/

/* ══════════════════════════════════════════════════════
   NP LOGO  — actual uploaded SVG
══════════════════════════════════════════════════════ */
/*function NPLogo({ color = "#111", size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.5497 4.2002C28.603 4.2002 32.6999 8.29638 32.7001 13.3496C32.7001 18.403 28.6031 22.5 23.5497 22.5C21.3935 22.4999 19.4133 21.7517 17.8495 20.5039V31.7998H14.4003V18.75L6.15027 9L6.29968 31.7998H2.99988V4.34961H7.04968L14.4052 13.1465C14.5134 8.1872 18.5645 4.20037 23.5497 4.2002ZM23.5497 7.5C20.3681 7.50018 17.781 10.0403 17.703 13.2031L17.7001 13.2002V16.7998C17.7001 16.7998 17.7901 16.8925 17.8495 16.9502C18.5139 17.5953 18.9742 17.8803 19.7997 18.2998C20.576 18.6943 21.0466 18.8784 21.9003 19.0498C22.2407 19.1181 22.691 19.1551 23.035 19.1758C23.2046 19.1906 23.3763 19.2002 23.5497 19.2002C26.7805 19.2002 29.4003 16.5805 29.4003 13.3496C29.4001 10.1189 26.7804 7.5 23.5497 7.5Z"
        fill={color}
      />
    </svg>
  );
}
*/

/* ══════════════════════════════════════════════════════
   HOLOGRAPHIC CRYSTAL CUBE
   · RoundedBoxGeometry + MeshPhysicalMaterial
   · RGBELoader HDR env map (synthetic Float32 fallback)
   · 6 rainbow PointLights on elliptical orbits
   · Auto-rotation + smooth mouse tilt
   · Inner octahedron for refraction drama
══════════════════════════════════════════════════════ */
/*function GlassCube() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    let mounted = true;

    // ── Renderer ────────────────────────────────────── 
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    Object.assign(renderer.domElement.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
    });
    container.appendChild(renderer.domElement);

    // ── Scene & Camera ──────────────────────────────── 
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;

    // ── Environment map ─────────────────────────────────
    //   Builds a Float32 HDR-quality synthetic env map right
    //   away so the crystal renders on the first frame.
    //   RGBELoader then loads a real studio HDR in the
    //   background and swaps it in when ready.            
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    // ① Immediate: synthetic Float32 HDR (values > 1 = HDR bright spots)
    {
      const W = 256, H = 128;
      const f = new Float32Array(W * H * 4);
      // [u, v, R, G, B, radius]  — all HDR luminances
      const SPOTS = [
        [0.22, 0.12,  14,  12, 10, 0.06],   // warm white key
        [0.68, 0.28,   2,   5, 16, 0.10],   // deep cyan
        [0.42, 0.72,  10,   2, 18, 0.09],   // violet
        [0.82, 0.56,  12,   2,  6, 0.08],   // rose
        [0.10, 0.45,   2,  12,  5, 0.08],   // teal
        [0.55, 0.18,   8,   6, 14, 0.07],   // indigo
      ];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const u = x / W, v = y / H;
          const sky = 1 - v * 0.55;
          let r = sky * 0.65, g = sky * 0.55, b = sky * 0.95; // cool lavender base
          for (const [su, sv, sr, sg, sb, rad] of SPOTS) {
            const d = Math.sqrt((u - su) ** 2 + (v - sv) ** 2);
            const k = Math.max(0, 1 - d / rad) ** 3;
            r += sr * k; g += sg * k; b += sb * k;
          }
          f[i] = r; f[i+1] = g; f[i+2] = b; f[i+3] = 1;
        }
      }
      const synth = new THREE.DataTexture(f, W, H, THREE.RGBAFormat, THREE.FloatType);
      synth.mapping    = THREE.EquirectangularReflectionMapping;
      synth.colorSpace = THREE.LinearSRGBColorSpace;
      synth.needsUpdate = true;
      scene.environment = pmrem.fromEquirectangular(synth).texture;
      synth.dispose();
    }

    // ② Async: upgrade to a real studio HDR via RGBELoader
    new RGBELoader()
      .loadAsync('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr')
      .then(hdrTex => {
        if (!mounted) { hdrTex.dispose(); pmrem.dispose(); return; }
        hdrTex.mapping = THREE.EquirectangularReflectionMapping;
        const next = pmrem.fromEquirectangular(hdrTex).texture;
        const prev = scene.environment;
        scene.environment = next;
        prev?.dispose();
        hdrTex.dispose();
        pmrem.dispose();
      })
      .catch(() => { if (mounted) pmrem.dispose(); });

    // ── Main crystal cube ───────────────────────────── 
    // RoundedBoxGeometry(width, height, depth, segments, radius)
    const cubeGeo = new RoundedBoxGeometry(2, 2, 2, 8, 0.22);
    const cubeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      // [핵심] 모바일에서는 투과(transmission) 연산을 포기하고 불투명/반사형으로 전환
      transmission: isMobile ? 0 : 1, 
      metalness: isMobile ? 0.9 : 0.1, // 투과 대신 금속성 반사로 고급스러움 유지
      roughness: isMobile ? 0.1 : 0.05,
      thickness: isMobile ? 0 : 2,
      ior: 1.5,
      iridescence: isMobile ? 0.3 : 1,
      envMapIntensity: isMobile ? 1.5 : 2,
      transparent: !isMobile,
      opacity: isMobile ? 0.8 : 1, // 약간의 투명도만 부여
    });

    // 내부의 옥타헤드론(inner)은 모바일에서 아예 안 보이게 하거나 매우 단순화
    if (isMobile) {
      inner.visible = false; 
    }
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    scene.add(cube);

    // ── Inner geometry — refraction emphasis ────────────
    //   A slightly subdivided octahedron sitting inside the
    //   cube. Different IOR / iridescence settings mean it
    //   bends light differently and amplifies the rainbow.  
    const innerGeo = new THREE.OctahedronGeometry(0.52, 2);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color:                     0xddc8ff,
      transmission:              0.7,
      thickness:                 1,
      roughness:                 0.06,
      metalness:                 0.0,
      ior:                       1.8,      // higher IOR = more refraction
      iridescence:               1,
      iridescenceIOR:            1.6,
      iridescenceThicknessRange: [200, 900],
      clearcoat:                 0.8,
      clearcoatRoughness:        0,
      envMapIntensity:           2.5,
      transparent:               true,
      opacity:                   0.9,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    scene.add(inner);

    // ── Rainbow PointLights ─────────────────────────── 
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const LIGHT_DEFS = [
      { color: 0xff2244, intensity: 25 },  // red
      { color: 0xff8800, intensity: 18 },  // orange
      { color: 0x00ddff, intensity: 22 },  // cyan
      { color: 0x9922ff, intensity: 24 },  // violet
      { color: 0xff00bb, intensity: 16 },  // rose
      { color: 0x00ff99, intensity: 14 },  // green
    ];
    const lights = LIGHT_DEFS.map(({ color, intensity }) => {
      const l = new THREE.PointLight(color, intensity, 14);
      scene.add(l);
      return l;
    });

    // ── Mouse — velocity-based rotation ───────────────────
     //  Per-frame mouse delta (px) → angular velocity impulse.
    //  FRICTION decays the velocity every frame → inertia.
     //  autoBlend fades between user control and idle auto-spin:
     //    · 1 = full auto-spin  (initial, or mouse outside window)
     //    · 0 = full user control (mouse actively inside window)  
    let mouseX = 0, mouseY = 0;
    let prevMouseX = 0, prevMouseY = 0;
    let velX = 0, velY = 0;   // angular velocity (rad / frame)
    let rotX = 0.18, rotY = 0; // cumulative rotation (rad)
    let autoBlend  = 1;        // start in auto-spin; drops on first mouse interaction
    let isInWindow = false;    // set true on first mousemove

    const SENS      = 0.00024; // sensitivity: rad per pixel moved per frame
    const FRICTION  = 0.94;    // velocity multiplier per frame  (inertia)
    const AUTO_VEL  = 0.004;   // rad/frame  idle auto-spin speed
    const BLEND_IN  = 0.012;   // auto-blend rate when mouse is outside (~1.4 s)
    const BLEND_OUT = 0.05;    // auto-blend rate when mouse is inside (~0.3 s)

    const onMove  = e => { mouseX = e.clientX; mouseY = e.clientY; isInWindow = true; };
    const onLeave = () => { isInWindow = false; };
    window.addEventListener('mousemove',    onMove);
    document.addEventListener('mouseleave', onLeave);

    // ── Animation loop ──────────────────────────────── 
    let t = 0, rafId;

    const animate = () => {
      // [추가] 브라우저 탭이 비활성이거나 화면에 안 보이면 연산 중단
      if (document.hidden) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      rafId = requestAnimationFrame(animate);
      // [최적화] 모바일에서는 매 프레임 light 위치 계산 등을 건너뛰거나 단순화
      t += isMobile ? 0.005 : 0.011;

      // ① Per-frame mouse displacement (pixels since last rAF)
      const dX = mouseX - prevMouseX;
      const dY = mouseY - prevMouseY;
      prevMouseX = mouseX;
      prevMouseY = mouseY;

      // ② Mouse delta → angular velocity impulse
      //    right/left → Y-axis rotation,  up/down → X-axis rotation
      velY += dX * SENS;
      velX += -dY * SENS * 0.7;        // slightly reduced sensitivity on X

      // ③ Hard cap — prevents runaway spin on rapid swipes
      velY = Math.max(-0.12, Math.min(0.12, velY));
      velX = Math.max(-0.08, Math.min(0.08, velX));

      // ④ Friction (applied every frame) → natural deceleration / inertia
      velY *= FRICTION;
      velX *= FRICTION;

      // ⑤ autoBlend: blend toward auto-spin outside window, toward user control inside
      if (isInWindow) {
        autoBlend = Math.max(0, autoBlend - BLEND_OUT);
      } else {
        autoBlend = Math.min(1, autoBlend + BLEND_IN);
      }

      // ⑥ Accumulate rotation: user velocity fades out as auto-spin fades in
      rotY += velY * (1 - autoBlend) + AUTO_VEL * autoBlend;
      rotX += velX * (1 - autoBlend);

      cube.rotation.y = rotY;
      cube.rotation.x = rotX;

      // Inner octahedron: partially coupled, adds refraction angle variation
      inner.rotation.y =  rotY * 0.70;
      inner.rotation.x = -rotX * 0.65;
      inner.rotation.z =  t * 0.22;

      // Six lights orbit on distinct elliptical paths
      lights[0].position.set( Math.cos(t * 0.70) * 4.5,  Math.sin(t * 0.42) * 3.0,  3.5);
      lights[1].position.set(-3.5,  Math.cos(t * 0.55) * 4.2,  Math.sin(t * 0.38) * 3.0);
      lights[2].position.set( Math.sin(t * 0.62) * 4.5, -2.0,  Math.cos(t * 0.78) * 4.5);
      lights[3].position.set( Math.cos(t * 0.42 + 2.0) * 4.0,  Math.sin(t * 0.90) * 4.5, 2.5);
      lights[4].position.set(-2.5,  Math.sin(t * 0.73 + 1.2) * 3.5,  Math.cos(t * 0.48 + 1.0) * -4.0);
      lights[5].position.set( Math.sin(t * 0.30) * 3.5, -2.5,  Math.cos(t * 0.60 + 2.1) * -3.5);

      renderer.render(scene, camera);
    };
    
    // ── 2. 가시성 관찰자 (성능 최적화용) ── 
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        cancelAnimationFrame(rafId); 
        animate();
      } else {
        cancelAnimationFrame(rafId);
      }
    }, { threshold: 0.01 });
    obs.observe(container);

    // ── Resize ──────────────────────────────────────── 
    const ro = new ResizeObserver(() => {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    });
    ro.observe(container);

    // ── Cleanup ─────────────────────────────────────── 
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      obs.disconnect(); // obs 해제
      ro.disconnect();  // ro 해제
      window.removeEventListener('mousemove',    onMove);
      document.removeEventListener('mouseleave', onLeave);
      lights.forEach(l => { scene.remove(l); l.dispose(); });
      [cubeGeo, cubeMat, innerGeo, innerMat].forEach(o => o.dispose());
      if (scene.environment) scene.environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        top: 'calc(50% + 32px)', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        pointerEvents: 'none',
        width: 560, height: 560,
      }}
    />
  );
}*/

/* ══════════════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
const isFinePointer = typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export default function App() {
  const isMobile =
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px)").matches;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // 0 = logo fully visible, 1 = text fully visible
  const [logoProgress, setLogoProgress] = useState(0);
  const [underConstruction, setUnderConstruction] = useState(false);

  const hasFinePointer =
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // 기기에 따른 설정값 정의
  const fluidProps = {
    resolution:        isMobile ? 0.12 : 0.55,
    mouseForce:        isMobile ? 8    : 22,
    cursorSize:        isMobile ? 50   : 150,
    BFECC:             !isMobile,
    iterationsPoisson: isMobile ? 4    : 32,
    iterationsViscous: isMobile ? 4    : 32,
    isViscous:         false,
    dt:                isMobile ? 0.025 : 0.014,
    autoDemo:          true,
    autoSpeed:         isMobile ? 0.15 : 0.5,
    autoResumeDelay:   isMobile ? 500  : 1000,
  };
  // ──────────────────────────────

  useEffect(() => {
    const SCROLL_START = 40;
    const SCROLL_END   = 160;
    const fn = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      const p = Math.min(1, Math.max(0, (y - SCROLL_START) / (SCROLL_END - SCROLL_START)));
      setLogoProgress(p);
    };
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
  <div style={{ padding: 40 }}>
    MOBILE TEST
  </div>
);
}