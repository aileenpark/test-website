import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/* ══════════════════════════════════════════════════════
   LIQUID ETHER ENGINE
══════════════════════════════════════════════════════ */
function LiquidEther({
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
      init(container){this.container=container;this.pixelRatio=Math.min(window.devicePixelRatio||1,2);this.resize();this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.autoClear=false;this.renderer.setClearColor(new THREE.Color(0x000000),0);this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(this.width,this.height);const el=this.renderer.domElement;el.style.width='100%';el.style.height='100%';el.style.display='block';this.clock=new THREE.Clock();this.clock.start();}
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
    class ExternalForce extends ShaderPass{constructor(s){super({output:s.dst});this.init(s);}init(s){super.init();const mg=new THREE.PlaneGeometry(1,1);const mm=new THREE.RawShaderMaterial({vertexShader:mv,fragmentShader:ef,blending:THREE.AdditiveBlending,depthWrite:false,uniforms:{px:{value:s.cellScale},force:{value:new THREE.Vector2(0,0)},center:{value:new THREE.Vector2(0,0)},scale:{value:new THREE.Vector2(s.cursor_size,s.cursor_size)}}});this.mouse=new THREE.Mesh(mg,mm);this.scene.add(this.mouse);}update(args){const u=this.mouse.material.uniforms;u.force.value.set((Mouse.diff.x/2)*args.mouse_force,(Mouse.diff.y/2)*args.mouse_force);u.center.value.set(Mouse.coords.x,Mouse.coords.y);u.scale.value.set(args.cursor_size,args.cursor_size);super.update();}}
    class Viscous extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:vf,uniforms:{boundarySpace:{value:s.boundarySpace},velocity:{value:s.src.texture},velocity_new:{value:s.dst_.texture},v:{value:s.viscous},px:{value:s.cellScale},dt:{value:s.dt}}},output:s.dst,output0:s.dst_,output1:s.dst});this.init();}update(args){const{iterations,dt}=args;for(let i=0;i<iterations;i++){const fi=i%2===0?this.props.output0:this.props.output1,fo=i%2===0?this.props.output1:this.props.output0;this.uniforms.velocity_new.value=fi.texture;this.props.output=fo;this.uniforms.dt.value=dt;super.update();}return iterations%2===0?this.props.output0:this.props.output1;}}
    class Divergence extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:df,uniforms:{boundarySpace:{value:s.boundarySpace},velocity:{value:s.src.texture},px:{value:s.cellScale},dt:{value:s.dt}}},output:s.dst});this.init();}update(args){if(this.uniforms)this.uniforms.velocity.value=args.vel.texture;super.update();}}
    class Poisson extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:pf,uniforms:{boundarySpace:{value:s.boundarySpace},pressure:{value:s.dst_.texture},divergence:{value:s.src.texture},px:{value:s.cellScale}}},output:s.dst,output0:s.dst_,output1:s.dst});this.init();}update(args){const{iterations}=args;for(let i=0;i<iterations;i++){const pi=i%2===0?this.props.output0:this.props.output1,po=i%2===0?this.props.output1:this.props.output0;this.uniforms.pressure.value=pi.texture;this.props.output=po;super.update();}return iterations%2===0?this.props.output0:this.props.output1;}}
    class Pressure extends ShaderPass{constructor(s){super({material:{vertexShader:fv,fragmentShader:rf,uniforms:{boundarySpace:{value:s.boundarySpace},pressure:{value:s.src_p.texture},velocity:{value:s.src_v.texture},px:{value:s.cellScale},dt:{value:s.dt}}},output:s.dst});this.init();}update(args){this.uniforms.velocity.value=args.vel.texture;this.uniforms.pressure.value=args.pressure.texture;super.update();}}
    class Simulation{constructor(options){this.options={iterations_poisson:32,iterations_viscous:32,mouse_force:20,resolution:0.5,cursor_size:100,viscous:30,isBounce:false,dt:0.014,isViscous:false,BFECC:true,...options};this.fbos={vel_0:null,vel_1:null,vel_viscous0:null,vel_viscous1:null,div:null,pressure_0:null,pressure_1:null};this.fboSize=new THREE.Vector2();this.cellScale=new THREE.Vector2();this.boundarySpace=new THREE.Vector2();this.init();}init(){this.calcSize();this.createAllFBO();this.createShaderPass();}getFloatType(){return/(iPad|iPhone|iPod)/i.test(navigator.userAgent)?THREE.HalfFloatType:THREE.FloatType;}createAllFBO(){const type=this.getFloatType(),opts={type,depthBuffer:false,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping};for(const k in this.fbos)this.fbos[k]=new THREE.WebGLRenderTarget(this.fboSize.x,this.fboSize.y,opts);}createShaderPass(){this.advection=new Advection({cellScale:this.cellScale,fboSize:this.fboSize,dt:this.options.dt,src:this.fbos.vel_0,dst:this.fbos.vel_1});this.externalForce=new ExternalForce({cellScale:this.cellScale,cursor_size:this.options.cursor_size,dst:this.fbos.vel_1});this.viscous=new Viscous({cellScale:this.cellScale,boundarySpace:this.boundarySpace,viscous:this.options.viscous,src:this.fbos.vel_1,dst:this.fbos.vel_viscous1,dst_:this.fbos.vel_viscous0,dt:this.options.dt});this.divergence=new Divergence({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.vel_viscous0,dst:this.fbos.div,dt:this.options.dt});this.poisson=new Poisson({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.div,dst:this.fbos.pressure_1,dst_:this.fbos.pressure_0});this.pressure=new Pressure({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src_p:this.fbos.pressure_0,src_v:this.fbos.vel_viscous0,dst:this.fbos.vel_0,dt:this.options.dt});}calcSize(){const w=Math.max(1,Math.round(this.options.resolution*Common.width)),h=Math.max(1,Math.round(this.options.resolution*Common.height));this.cellScale.set(1/w,1/h);this.fboSize.set(w,h);}resize(){this.calcSize();for(const k in this.fbos)this.fbos[k].setSize(this.fboSize.x,this.fboSize.y);}update(){this.boundarySpace.copy(this.options.isBounce?new THREE.Vector2(0,0):this.cellScale);this.advection.update({dt:this.options.dt,isBounce:this.options.isBounce,BFECC:this.options.BFECC});this.externalForce.update({cursor_size:this.options.cursor_size,mouse_force:this.options.mouse_force,cellScale:this.cellScale});let vel=this.fbos.vel_1;if(this.options.isViscous)vel=this.viscous.update({iterations:this.options.iterations_viscous,dt:this.options.dt});this.divergence.update({vel});const pressure=this.poisson.update({iterations:this.options.iterations_poisson});this.pressure.update({vel,pressure});}}
    class Output{constructor(){this.simulation=new Simulation({mouse_force:mouseForce,cursor_size:cursorSize,resolution,isViscous,viscous,dt,BFECC,isBounce});this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.output=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.RawShaderMaterial({vertexShader:fv,fragmentShader:cf,transparent:true,depthWrite:false,uniforms:{velocity:{value:this.simulation.fbos.vel_0.texture},boundarySpace:{value:new THREE.Vector2()},palette:{value:paletteTex},bgColor:{value:bgVec4}}}));this.scene.add(this.output);}resize(){this.simulation.resize();}render(){if(Common.renderer){Common.renderer.setRenderTarget(null);Common.renderer.render(this.scene,this.camera);}}update(){this.simulation.update();this.render();}}
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
}

/* ══════════════════════════════════════════════════════
   WORK CARD
══════════════════════════════════════════════════════ */
function WorkCard({ tag, title, year, accent, index }) {
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
}

/* ══════════════════════════════════════════════════════
   NP LOGO  — actual uploaded SVG
══════════════════════════════════════════════════════ */
function NPLogo({ color = "#111", size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.5497 4.2002C28.603 4.2002 32.6999 8.29638 32.7001 13.3496C32.7001 18.403 28.6031 22.5 23.5497 22.5C21.3935 22.4999 19.4133 21.7517 17.8495 20.5039V31.7998H14.4003V18.75L6.15027 9L6.29968 31.7998H2.99988V4.34961H7.04968L14.4052 13.1465C14.5134 8.1872 18.5645 4.20037 23.5497 4.2002ZM23.5497 7.5C20.3681 7.50018 17.781 10.0403 17.703 13.2031L17.7001 13.2002V16.7998C17.7001 16.7998 17.7901 16.8925 17.8495 16.9502C18.5139 17.5953 18.9742 17.8803 19.7997 18.2998C20.576 18.6943 21.0466 18.8784 21.9003 19.0498C22.2407 19.1181 22.691 19.1551 23.035 19.1758C23.2046 19.1906 23.3763 19.2002 23.5497 19.2002C26.7805 19.2002 29.4003 16.5805 29.4003 13.3496C29.4001 10.1189 26.7804 7.5 23.5497 7.5Z"
        fill={color}
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   HOLOGRAPHIC CRYSTAL CUBE
   · RoundedBoxGeometry + MeshPhysicalMaterial
   · RGBELoader HDR env map (synthetic Float32 fallback)
   · 6 rainbow PointLights on elliptical orbits
   · Auto-rotation + smooth mouse tilt
   · Inner octahedron for refraction drama
══════════════════════════════════════════════════════ */
function GlassCube() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    let mounted = true;

    /* ── Renderer ────────────────────────────────────── */
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

    /* ── Scene & Camera ──────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;

    /* ── Environment map ─────────────────────────────────
       Builds a Float32 HDR-quality synthetic env map right
       away so the crystal renders on the first frame.
       RGBELoader then loads a real studio HDR in the
       background and swaps it in when ready.            */
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

    /* ── Main crystal cube ───────────────────────────── */
    // RoundedBoxGeometry(width, height, depth, segments, radius)
    const cubeGeo = new RoundedBoxGeometry(2, 2, 2, 8, 0.22);
    const cubeMat = new THREE.MeshPhysicalMaterial({
      color:                     0xffffff,
      transmission:              1,        // fully transmissive glass
      // [수정] 모바일은 굴절 두께 연산을 줄임
      thickness:                 isMobile ? 0.8 : 2, 
      roughness:                 0.05,
      metalness:                 0.1,
      ior:                       1.5,
      iridescence:               isMobile ? 0.4 : 1, // [수정] 모바일은 무지개 효과 연산 줄임
      iridescenceIOR:            1.3,
      iridescenceThicknessRange: [100, 700],
      clearcoat:                 1,
      clearcoatRoughness:        0,
      envMapIntensity:           isMobile ? 1 : 2, // [수정] 환경광 강도 낮춤
      transparent:               true,
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    scene.add(cube);

    /* ── Inner geometry — refraction emphasis ────────────
       A slightly subdivided octahedron sitting inside the
       cube. Different IOR / iridescence settings mean it
       bends light differently and amplifies the rainbow.  */
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

    /* ── Rainbow PointLights ─────────────────────────── */
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

    /* ── Mouse — velocity-based rotation ───────────────────
       Per-frame mouse delta (px) → angular velocity impulse.
       FRICTION decays the velocity every frame → inertia.
       autoBlend fades between user control and idle auto-spin:
         · 1 = full auto-spin  (initial, or mouse outside window)
         · 0 = full user control (mouse actively inside window)  */
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

    /* ── Animation loop ──────────────────────────────── */
    let t = 0, rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.011;

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
    animate();

    /* ── Resize ──────────────────────────────────────── */
    const ro = new ResizeObserver(() => {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    });
    ro.observe(container);

    /* ── Cleanup ─────────────────────────────────────── */
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
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
}

/* ══════════════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════════════ */
function CustomCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
  const cursor = cursorRef.current;
  if (!cursor) return;

  // 1. 모바일 체크 (더 확실한 조건 추가)
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);

  if (isMobile) {
    cursor.style.display = 'none';
    // 모바일이면 여기서 완전히 종료하여 이벤트 리스너가 아예 등록되지 않게 함
    return; 
  }

  // 데스크탑일 때만 아래 로직 실행
  let mouseX = -100, mouseY = -100;
  let curX = -100, curY = -100;
  let curSize = 32;
  let hovering = false;
  let rafId;

  const onMove = (e) => { mouseX = e.clientX; mouseY = e.clientY; };
  const onOver = (e) => { if (e.target.closest('a, button, [role="button"]')) hovering = true; };
  const onOut = (e) => { if (e.target.closest('a, button, [role="button"]')) hovering = false; };

  const loop = () => {
    const k = 0.13;
    curX += (mouseX - curX) * k;
    curY += (mouseY - curY) * k;
    const targetSize = hovering ? 64 : 32;
    curSize += (targetSize - curSize) * k;

    cursor.style.width = `${curSize}px`;
    cursor.style.height = `${curSize}px`;
    cursor.style.transform = `translate3d(${curX - curSize / 2}px, ${curY - curSize / 2}px, 0)`;
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
  window.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseover', onOver);
  document.addEventListener('mouseout', onOut);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mouseout', onOut);
  };
}, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: 32, height: 32,
        borderRadius: '50%',
        background: 'white',
        mixBlendMode: 'difference',
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform, width, height',
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // 0 = logo fully visible, 1 = text fully visible
  const [logoProgress, setLogoProgress] = useState(0);
  const [underConstruction, setUnderConstruction] = useState(false);

  // ─── 여기에 최적화 로직 추가 ───
  // 모바일 여부를 확인합니다. (SSR 대응을 위해 typeof window 체크 포함)
  const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent);
  
  // 기기에 따른 설정값 정의
  const fluidProps = {
    resolution: isMobile ? 0.25 : 0.55, // 모바일에서 해상도를 낮춰 버벅임 해결
    mouseForce: isMobile ? 12 : 22,
    cursorSize: isMobile ? 80 : 150,
    BFECC: !isMobile // 모바일에서는 무거운 연산인 BFECC 끄기
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
    <div style={{ minHeight: "100vh", background: "#fdf8ff", fontFamily: "'Space Grotesk',sans-serif" }}>
      <CustomCursor />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; cursor: none !important; }
        html { scroll-behavior: smooth; }

        /* Marquee */
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .marquee-inner { display:flex; animation:marquee 22s linear infinite; will-change:transform; }
        .marquee-inner:hover { animation-play-state:paused; }

        /* Entrance */
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        .su1 { animation:slideUp .95s cubic-bezier(.22,1,.36,1) .1s both; }
        .su2 { animation:slideUp .95s cubic-bezier(.22,1,.36,1) .3s both; }
        .su3 { animation:slideUp .95s cubic-bezier(.22,1,.36,1) .48s both; }

        /* Nav links — Figma: Inter Medium 20px, line-height 140%, letter-spacing 0%, #121212 */
        .navlink {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 20px;
          line-height: 1.4;
          letter-spacing: 0;
          color: #121212;
          text-decoration: none;
          position: relative;
          padding-bottom: 3px;
        }
        .navlink::after { content:''; position:absolute; bottom:0; left:0; width:0; height:1.5px; background:#a855f7; transition:width .3s cubic-bezier(.22,1,.36,1); }
        .navlink:hover::after { width:100%; }

        /* Responsive */
        @media (max-width:767px) {
          .desktop-nav { display:none!important; }
          .mob-btn { display:flex!important; }
        }
        @media (min-width:768px) {
          .mob-btn { display:none!important; }
          .mob-overlay { display:none!important; }
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:#fdf8ff; }
        ::-webkit-scrollbar-thumb { background:#e9d5ff; border-radius:999px; }
      `}</style>

      {/* ─── HEADER ─────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 64,
        background: scrolled ? "rgba(253,248,255,.82)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(168,85,247,.1)" : "1px solid transparent",
        transition: "background .4s, backdrop-filter .4s, border-color .4s",
      }}>
        <div style={{
          maxWidth: 1440, margin: "0 auto",
          padding: "0 clamp(20px,5vw,60px)",
          height: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* ── Logo → "Nayun Park" animated transition ── */}
          <a href="#" style={{
            textDecoration: "none", lineHeight: 1,
            display: "block",
            position: "relative",
            // width morphs from logo size → text width naturally
            height: 32,
            // min-width prevents layout jump during transition
            minWidth: 32,
          }}>
            {/* SVG logo — fades + scales out as user scrolls */}
            <span style={{
              position: "absolute", top: "50%", left: 0,
              transform: `translateY(-50%) scale(${1 - logoProgress * 0.15})`,
              opacity: 1 - logoProgress,
              transition: "none", // driven by scroll directly (smooth already)
              transformOrigin: "left center",
              pointerEvents: logoProgress > 0.5 ? "none" : "auto",
              display: "flex", alignItems: "center",
            }}>
              <NPLogo color="#121212" size={32} />
            </span>

            {/* "Nayun Park" text — fades + slides in from below */}
            <span style={{
              position: "absolute", top: "50%", left: 0,
              transform: `translateY(calc(-50% + ${(1 - logoProgress) * 10}px))`,
              opacity: logoProgress,
              pointerEvents: logoProgress < 0.5 ? "none" : "auto",
              whiteSpace: "nowrap",
              // Figma spec: Helvetica Neue Bold 24px, line-height 130%, #121212
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 700,
              fontSize: 24,
              lineHeight: 1.3,
              letterSpacing: 0,
              color: "#121212",
            }}>
              Nayun Park
            </span>

            {/* Invisible spacer so the <a> keeps enough width for the text */}
            <span style={{
              visibility: "hidden", whiteSpace: "nowrap",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 700, fontSize: 24, lineHeight: 1.3,
            }}>
              Nayun Park
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="desktop-nav" style={{ display: "flex", gap: "clamp(28px,5vw,68px)" }}>
            {["Works","About","Résumé"].map(l => (
              l === "Résumé"
                ? <a key={l} href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="navlink">{l}</a>
                : <a key={l} href="#" className="navlink" onClick={e => { e.preventDefault(); setUnderConstruction(true); }}>{l}</a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="mob-btn"
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display:"none", alignItems:"center", justifyContent:"center",
              background:"none", border:"none", cursor:"pointer", padding:8, zIndex:200,
            }}
          >
            <svg width="22" height="16" viewBox="0 0 22 16">
              <rect y="0" width="22" height="2" rx="1" fill="#111"
                style={{ transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none", transformOrigin:"center", transition:"all .25s" }} />
              <rect y="7" width="22" height="2" rx="1" fill="#111"
                style={{ opacity: menuOpen ? 0 : 1, transition:"opacity .2s" }} />
              <rect y="14" width="22" height="2" rx="1" fill="#111"
                style={{ transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none", transformOrigin:"center", transition:"all .25s" }} />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── MOBILE OVERLAY ─────────────────────────── */}
      <div
        className="mob-overlay"
        style={{
          position: "fixed", inset: 0, zIndex: 90,
          background: "rgba(253,248,255,.97)", backdropFilter: "blur(28px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 44,
          opacity: menuOpen ? 1 : 0, visibility: menuOpen ? "visible" : "hidden",
          transition: "opacity .3s, visibility .3s",
        }}
      >
        {["Works","About","Résumé"].map(l => (
          <a
            key={l}
            href={l === "Résumé" ? "/resume.pdf" : "#"}
            target={l === "Résumé" ? "_blank" : undefined}
            rel={l === "Résumé" ? "noopener noreferrer" : undefined}
            onClick={e => {
              if (l !== "Résumé") { e.preventDefault(); setUnderConstruction(true); }
              setMenuOpen(false);
            }}
            style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
              fontSize: 40, letterSpacing: "-.025em", color: "#111", textDecoration: "none",
            }}
          >{l}</a>
        ))}
      </div>

      {/* ─── UNDER CONSTRUCTION OVERLAY ─────────────── */}
      {underConstruction && (
        <div
          onClick={() => setUnderConstruction(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(10,10,10,.45)", backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16,
              padding: "clamp(32px,5vw,52px) clamp(28px,5vw,52px)",
              boxShadow: "0 24px 80px rgba(0,0,0,.18)",
              textAlign: "center", maxWidth: 420, width: "90%",
            }}
          >
            <p style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
              fontSize: "clamp(18px,2.5vw,24px)", color: "#121212",
              letterSpacing: "-.02em", lineHeight: 1.4,
            }}>
              This page is still under construction. 🛠️
            </p>
            <button
              onClick={() => setUnderConstruction(false)}
              style={{
                marginTop: 24, fontFamily: "'Space Mono',monospace",
                fontSize: 11, letterSpacing: ".08em", color: "#a855f7",
                background: "none", border: "1px solid rgba(168,85,247,.35)",
                borderRadius: 999, padding: "8px 22px", cursor: "pointer",
              }}
            >Close</button>
          </div>
        </div>
      )}

      {/* ─── HERO ───────────────────────────────────── */}
      <section style={{
        position: "relative",
        minHeight: "100vh",
        background: "#ffffff",
        overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        {/* Fluid layer — fills entire hero */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "all" }}>
          <LiquidEther
            colors={["#a855f7","#ec4899","#f9a8d4"]}
            mouseForce={isMobile ? 12 : 22} // 모바일은 힘을 줄여서 연산 최소화
            cursorSize={isMobile ? 80 : 150} // 커서 크기도 축소
            autoDemo={true}
            autoSpeed={0.42}
            // 핵심 최적화: 모바일 해상도를 0.2~0.3 수준으로 대폭 낮춤 (버벅임 해결의 핵심)
            resolution={isMobile ? 0.25 : 0.55} 
            BFECC={!isMobile} // BFECC는 고품질 옵션이므로 모바일에서는 끄기
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Bottom gradient so text reads cleanly */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1,
          height: "55%", pointerEvents: "none",
          background: "linear-gradient(to top, rgba(253,248,255,.72) 0%, transparent 100%)",
        }} />

        {/* ── Glass Cube ── */}
        <GlassCube />

        {/* ── DESIGNED TO FUNCTION — SVG, 뷰포트 세로 중앙 (헤더 64px 보정) ── */}
        <div className="su1" style={{
          position: "absolute",
          top: "calc(50% + 32px)",
          left: 0,
          right: 0,
          transform: "translateY(-50%)",
          zIndex: 2,
          pointerEvents: "none",
          overflow: "hidden",
        }}>
            {/* viewBox="0 0 1920 103" — preserveAspectRatio로 가로 100% 맞춤 */}
            <svg
              viewBox="0 0 1920 103"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
              aria-label="DESIGNED TO FUNCTION"
            >
              <path d="M1825.67 2.33203H1850.08L1896.69 68.0598H1897.01V2.33203H1920V100.306H1895.44L1848.98 34.7156H1848.67V100.306H1825.67V2.33203Z" fill="#121212"/>
              <path d="M1723.63 51.7315C1723.63 55.848 1724.15 59.8731 1725.19 63.8067C1726.34 67.6488 1728.11 71.125 1730.51 74.2353C1732.91 77.3456 1736.04 79.8613 1739.9 81.7824C1743.76 83.6119 1748.45 84.5267 1753.98 84.5267C1759.5 84.5267 1764.2 83.6119 1768.06 81.7824C1771.91 79.8613 1775.04 77.3456 1777.44 74.2353C1779.84 71.125 1781.56 67.6488 1782.6 63.8067C1783.75 59.8731 1784.32 55.848 1784.32 51.7315C1784.32 47.4319 1783.75 43.2696 1782.6 39.2445C1781.56 35.2195 1779.84 31.6518 1777.44 28.5415C1775.04 25.3397 1771.91 22.824 1768.06 20.9945C1764.2 19.0734 1759.5 18.1129 1753.98 18.1129C1748.45 18.1129 1743.76 19.0734 1739.9 20.9945C1736.04 22.824 1732.91 25.3397 1730.51 28.5415C1728.11 31.6518 1726.34 35.2195 1725.19 39.2445C1724.15 43.2696 1723.63 47.4319 1723.63 51.7315ZM1699.07 51.7315C1699.07 44.4131 1700.32 37.6437 1702.82 31.4231C1705.33 25.111 1708.93 19.6223 1713.62 14.9568C1718.31 10.2914 1724.05 6.63223 1730.83 3.97934C1737.71 1.32645 1745.43 0 1753.98 0C1762.63 0 1770.35 1.32645 1777.13 3.97934C1783.91 6.63223 1789.64 10.2914 1794.34 14.9568C1799.03 19.6223 1802.63 25.111 1805.13 31.4231C1807.63 37.6437 1808.88 44.4131 1808.88 51.7315C1808.88 58.8668 1807.63 65.5448 1805.13 71.7654C1802.63 77.8945 1799.03 83.246 1794.34 87.82C1789.64 92.3939 1783.91 96.0074 1777.13 98.6603C1770.35 101.222 1762.63 102.502 1753.98 102.502C1745.43 102.502 1737.71 101.222 1730.83 98.6603C1724.05 96.0074 1718.31 92.3939 1713.62 87.82C1708.93 83.246 1705.33 77.8945 1702.82 71.7654C1700.32 65.5448 1699.07 58.8668 1699.07 51.7315Z" fill="#121212"/>
              <path d="M1657.79 2.33203H1682.34V100.306H1657.79V2.33203Z" fill="#121212"/>
              <path d="M1586.87 20.4449H1553.4V2.33203H1644.91V20.4449H1611.43V100.306H1586.87V20.4449Z" fill="#121212"/>
              <path d="M1520.67 35.2652C1520.25 32.7953 1519.31 30.554 1517.85 28.5415C1516.39 26.4375 1514.57 24.6079 1512.38 23.0527C1510.19 21.4976 1507.68 20.3084 1504.87 19.4851C1502.16 18.5703 1499.29 18.1129 1496.26 18.1129C1490.74 18.1129 1486.04 19.0734 1482.19 20.9945C1478.33 22.824 1475.2 25.3397 1472.8 28.5415C1470.4 31.6518 1468.63 35.2195 1467.48 39.2445C1466.44 43.2696 1465.92 47.4319 1465.92 51.7315C1465.92 55.848 1466.44 59.8731 1467.48 63.8067C1468.63 67.6488 1470.4 71.125 1472.8 74.2353C1475.2 77.3456 1478.33 79.8613 1482.19 81.7824C1486.04 83.6119 1490.74 84.5267 1496.26 84.5267C1503.77 84.5267 1509.61 82.5142 1513.78 78.4891C1518.06 74.464 1520.67 69.1582 1521.61 62.5717H1545.38C1544.76 68.7008 1543.14 74.2353 1540.53 79.1752C1537.93 84.1151 1534.49 88.3231 1530.21 91.7993C1525.93 95.2755 1520.93 97.9284 1515.19 99.758C1509.46 101.588 1503.15 102.502 1496.26 102.502C1487.71 102.502 1480 101.222 1473.11 98.6603C1466.33 96.0074 1460.6 92.3939 1455.91 87.82C1451.21 83.246 1447.61 77.8945 1445.11 71.7654C1442.61 65.5448 1441.36 58.8668 1441.36 51.7315C1441.36 44.4131 1442.61 37.6437 1445.11 31.4231C1447.61 25.111 1451.21 19.6223 1455.91 14.9568C1460.6 10.2914 1466.33 6.63223 1473.11 3.97934C1480 1.32645 1487.71 0 1496.26 0C1502.42 0 1508.2 0.777571 1513.63 2.33271C1519.15 3.88786 1524.06 6.17484 1528.33 9.19365C1532.71 12.121 1536.31 15.7801 1539.13 20.1711C1541.94 24.5621 1543.71 29.5935 1544.44 35.2652H1520.67Z" fill="#121212"/>
              <path d="M1330.26 2.33203H1354.66L1401.28 68.0598H1401.59V2.33203H1424.59V100.306H1400.03L1353.57 34.7156H1353.26V100.306H1330.26V2.33203Z" fill="#121212"/>
              <path d="M1309.11 63.2572C1309.11 76.5216 1304.89 86.4014 1296.44 92.8964C1287.99 99.2999 1276.31 102.502 1261.4 102.502C1246.28 102.502 1234.54 99.2999 1226.2 92.8964C1217.96 86.4928 1213.84 76.6131 1213.84 63.2572V2.33203H1238.4V63.2572C1238.4 65.91 1238.66 68.5172 1239.19 71.0786C1239.71 73.64 1240.8 75.927 1242.47 77.9396C1244.14 79.8606 1246.43 81.4615 1249.35 82.7422C1252.38 83.9314 1256.39 84.526 1261.4 84.526C1270.16 84.526 1276.21 82.8337 1279.54 79.449C1282.88 75.9727 1284.55 70.5755 1284.55 63.2572V2.33203H1309.11V63.2572Z" fill="#121212"/>
              <path d="M1121.59 2.33203H1200.12V20.4449H1146.15V43.086H1192.92V59.8267H1146.15V100.306H1121.59V2.33203Z" fill="#121212"/>
              <path d="M976.005 51.7315C976.005 55.848 976.526 59.8731 977.569 63.8067C978.716 67.6488 980.489 71.125 982.888 74.2353C985.286 77.3456 988.415 79.8613 992.273 81.7824C996.132 83.6119 1000.82 84.5267 1006.35 84.5267C1011.88 84.5267 1016.57 83.6119 1020.43 81.7824C1024.29 79.8613 1027.42 77.3456 1029.82 74.2353C1032.22 71.125 1033.94 67.6488 1034.98 63.8067C1036.13 59.8731 1036.7 55.848 1036.7 51.7315C1036.7 47.4319 1036.13 43.2696 1034.98 39.2445C1033.94 35.2195 1032.22 31.6518 1029.82 28.5415C1027.42 25.3397 1024.29 22.824 1020.43 20.9945C1016.57 19.0734 1011.88 18.1129 1006.35 18.1129C1000.82 18.1129 996.132 19.0734 992.273 20.9945C988.415 22.824 985.286 25.3397 982.888 28.5415C980.489 31.6518 978.716 35.2195 977.569 39.2445C976.526 43.2696 976.005 47.4319 976.005 51.7315ZM951.445 51.7315C951.445 44.4131 952.697 37.6437 955.2 31.4231C957.702 25.111 961.3 19.6223 965.993 14.9568C970.686 10.2914 976.422 6.63223 983.201 3.97934C990.083 1.32645 997.801 0 1006.35 0C1015.01 0 1022.73 1.32645 1029.5 3.97934C1036.28 6.63223 1042.02 10.2914 1046.71 14.9568C1051.4 19.6223 1055 25.111 1057.5 31.4231C1060.01 37.6437 1061.26 44.4131 1061.26 51.7315C1061.26 58.8668 1060.01 65.5448 1057.5 71.7654C1055 77.8945 1051.4 83.246 1046.71 87.82C1042.02 92.3939 1036.28 96.0074 1029.5 98.6603C1022.73 101.222 1015.01 102.502 1006.35 102.502C997.801 102.502 990.083 101.222 983.201 98.6603C976.422 96.0074 970.686 92.3939 965.993 87.82C961.3 83.246 957.702 77.8945 955.2 71.7654C952.697 65.5448 951.445 58.8668 951.445 51.7315Z" fill="#121212"/>
              <path d="M885.382 20.4449H851.906V2.33203H943.417V20.4449H909.942V100.306H885.382V20.4449Z" fill="#121212"/>
              <path d="M725.743 82.1933H747.643C751.189 82.1933 754.63 81.6902 757.967 80.6839C761.305 79.6777 764.277 78.031 766.884 75.744C769.491 73.3656 771.577 70.301 773.141 66.5504C774.705 62.7998 775.488 58.2258 775.488 52.8285C775.488 47.8887 774.914 43.4519 773.767 39.5183C772.724 35.4932 770.951 32.0628 768.448 29.2269C765.945 26.3911 762.608 24.2413 758.437 22.7776C754.37 21.2225 749.312 20.4449 743.263 20.4449H725.743V82.1933ZM701.184 2.33203H749.364C756.56 2.33203 763.234 3.3383 769.387 5.35085C775.644 7.36339 781.015 10.3822 785.499 14.4073C790.088 18.4324 793.633 23.4637 796.136 29.5013C798.743 35.539 800.047 42.6286 800.047 50.7702C800.047 57.9056 799.004 64.4921 796.918 70.5297C794.833 76.5674 791.652 81.7817 787.376 86.1727C783.205 90.5637 777.938 94.0399 771.577 96.6013C765.32 99.0712 757.915 100.306 749.364 100.306H701.184V2.33203Z" fill="#121212"/>
              <path d="M599.748 2.33203H683.281V20.4449H624.307V41.4394H678.432V58.1801H624.307V82.1933H684.533V100.306H599.748V2.33203Z" fill="#121212"/>
              <path d="M483.801 2.33203H508.204L554.82 68.0598H555.133V2.33203H578.128V100.306H553.568L507.109 34.7156H506.796V100.306H483.801V2.33203Z" fill="#121212"/>
              <path d="M445.821 89.1922C441.441 94.132 436.591 97.6083 431.273 99.6208C425.954 101.542 420.584 102.502 415.161 102.502C406.609 102.502 398.892 101.222 392.009 98.6603C385.23 96.0074 379.495 92.3939 374.802 87.82C370.109 83.246 366.511 77.8945 364.008 71.7654C361.505 65.5448 360.254 58.8668 360.254 51.7315C360.254 44.4131 361.505 37.6437 364.008 31.4231C366.511 25.111 370.109 19.6223 374.802 14.9568C379.495 10.2914 385.23 6.63223 392.009 3.97934C398.892 1.32645 406.609 0 415.161 0C420.896 0 426.424 0.777571 431.742 2.33271C437.165 3.79638 442.014 5.99188 446.29 8.91922C450.67 11.8465 454.268 15.46 457.084 19.7595C459.899 24.059 461.62 28.9989 462.246 34.5791H438.781C437.321 29.0904 434.506 24.9738 430.334 22.2294C426.163 19.4851 421.105 18.1129 415.161 18.1129C409.633 18.1129 404.941 19.0734 401.082 20.9945C397.223 22.824 394.095 25.3397 391.696 28.5415C389.298 31.6518 387.525 35.2195 386.378 39.2445C385.335 43.2696 384.813 47.4319 384.813 51.7315C384.813 55.848 385.335 59.8731 386.378 63.8067C387.525 67.6488 389.298 71.125 391.696 74.2353C394.095 77.3456 397.223 79.8613 401.082 81.7824C404.941 83.6119 409.633 84.5267 415.161 84.5267C423.295 84.5267 429.552 82.7429 433.932 79.1752C438.416 75.516 441.024 70.256 441.754 63.395H417.038V47.3405H463.967V100.307H448.324L445.821 89.1922Z" fill="#121212"/>
              <path d="M318.971 2.33203H343.53V100.306H318.971V2.33203Z" fill="#121212"/>
              <path d="M234.119 67.786C234.119 71.0793 234.797 73.8694 236.153 76.1564C237.509 78.4434 239.281 80.3187 241.471 81.7824C243.766 83.1545 246.425 84.2066 249.449 84.9384C252.474 85.5787 255.602 85.8989 258.835 85.8989C261.025 85.8989 263.372 85.7617 265.874 85.4873C268.377 85.1213 270.724 84.481 272.914 83.5662C275.104 82.6514 276.929 81.4164 278.389 79.8613C279.849 78.2147 280.579 76.1564 280.579 73.6865C280.579 71.0336 279.588 68.8838 277.607 67.2372C275.729 65.5905 273.227 64.2184 270.098 63.1206C266.969 62.0229 263.424 61.0623 259.461 60.239C255.498 59.4157 251.483 58.5009 247.416 57.4946C243.244 56.5798 239.177 55.4821 235.214 54.2014C231.251 52.8292 227.706 51.0911 224.577 48.9871C221.448 46.8831 218.893 44.2759 216.912 41.1656C215.035 37.9638 214.096 34.1217 214.096 29.6392C214.096 24.6079 215.296 20.2626 217.694 16.6035C220.197 12.8528 223.43 9.74253 227.393 7.27259C231.356 4.80265 235.84 2.97307 240.846 1.78384C245.851 0.594612 250.857 0 255.863 0C261.703 0 267.282 0.594612 272.601 1.78384C278.024 2.88159 282.821 4.71117 286.992 7.27259C291.164 9.834 294.449 13.1273 296.847 17.1523C299.35 21.0859 300.602 25.8886 300.602 31.5603H276.824C276.616 28.633 275.886 26.2088 274.634 24.2877C273.487 22.3666 271.923 20.8572 269.942 19.7595C267.96 18.6617 265.666 17.8842 263.059 17.4268C260.556 16.9694 257.792 16.7407 254.768 16.7407C252.786 16.7407 250.805 16.9236 248.824 17.2896C246.842 17.6555 245.017 18.2958 243.349 19.2106C241.784 20.1254 240.481 21.2689 239.438 22.6411C238.395 24.0133 237.874 25.7514 237.874 27.8554C237.874 29.7765 238.291 31.3316 239.125 32.5208C239.959 33.7101 241.576 34.8078 243.974 35.8141C246.477 36.8204 249.866 37.8266 254.142 38.8329C258.522 39.8392 264.206 41.1199 271.193 42.675C273.279 43.0409 276.147 43.727 279.797 44.7333C283.551 45.6481 287.253 47.1575 290.903 49.2615C294.553 51.3655 297.682 54.2014 300.289 57.7691C303 61.2453 304.356 65.7278 304.356 71.2165C304.356 75.699 303.365 79.8613 301.384 83.7034C299.402 87.5455 296.43 90.8845 292.467 93.7204C288.609 96.4648 283.76 98.6145 277.919 100.17C272.184 101.725 265.509 102.502 257.897 102.502C251.744 102.502 245.747 101.816 239.907 100.444C234.171 99.1634 229.061 97.1051 224.577 94.2693C220.197 91.4334 216.703 87.82 214.096 83.429C211.489 79.038 210.238 73.8237 210.342 67.786H234.119Z" fill="#121212"/>
              <path d="M115.947 2.33203H199.481V20.4449H140.507V41.4394H194.631V58.1801H140.507V82.1933H200.732V100.306H115.947V2.33203Z" fill="#121212"/>
              <path d="M24.5594 82.1933H46.4595C50.0053 82.1933 53.4467 81.6902 56.7839 80.6839C60.1211 79.6777 63.0932 78.031 65.7004 75.744C68.3075 73.3656 70.3933 70.301 71.9575 66.5504C73.5218 62.7998 74.304 58.2258 74.304 52.8285C74.304 47.8887 73.7304 43.4519 72.5833 39.5183C71.5404 35.4932 69.7675 32.0628 67.2647 29.2269C64.7618 26.3911 61.4246 24.2413 57.2532 22.7776C53.186 21.2225 48.1281 20.4449 42.0795 20.4449H24.5594V82.1933ZM0 2.33203H48.1803C55.376 2.33203 62.0503 3.3383 68.2032 5.35085C74.4604 7.36339 79.8312 10.3822 84.3155 14.4073C88.9041 18.4324 92.4498 23.4637 94.9527 29.5013C97.5598 35.539 98.8634 42.6286 98.8634 50.7702C98.8634 57.9056 97.8206 64.4921 95.7348 70.5297C93.6491 76.5674 90.4684 81.7817 86.1926 86.1727C82.0212 90.5637 76.7547 94.0399 70.3933 96.6013C64.1361 99.0712 56.7317 100.306 48.1803 100.306H0V2.33203Z" fill="#121212"/>
            </svg>
          </div>

        {/* Content at bottom */}
        <div style={{
          position: "relative", zIndex: 2,
          width: "100%",
          paddingBottom: "clamp(52px,8vh,88px)",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>

          {/* ── Intro copy — Apercu Mono Pro Regular 52px, 140%, -4%, #121212 ── */}
          <div className="su2" style={{ padding: "0 clamp(20px,5vw,60px)", width: "100%" }}>
            <p style={{
              fontFamily: "'Apercu Mono Pro', 'Courier New', 'Courier', monospace",
              fontWeight: 400,
              fontSize: "clamp(20px, 4.2vw, 52px)",
              lineHeight: 1.4,
              letterSpacing: "-0.04em",
              color: "#121212",
              maxWidth: "none",
            }}>
              I'm Nayun Park<br />
              — A product designer connects<br />
              systems, stories, and creative energy.
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="su3" style={{
          position: "absolute", right: "clamp(20px,4vw,56px)", bottom: 32,
          zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: 9,
            letterSpacing: ".18em", color: "rgba(10,10,10,.35)",
            writingMode: "vertical-rl", textTransform: "uppercase",
          }}>scroll</span>
          <div style={{
            width: 1, height: 44,
            background: "linear-gradient(to bottom, rgba(168,85,247,.5), transparent)",
          }} />
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────── */}
      <footer style={{
        background:"#0a0a0a", borderTop:"1px solid rgba(255,255,255,.06)",
        padding:"clamp(20px,3vh,32px) clamp(20px,5vw,60px)",
      }}>
        <div style={{
          maxWidth:1440, margin:"0 auto",
          display:"flex", flexWrap:"wrap",
          alignItems:"center", justifyContent:"space-between", gap:16,
        }}>
          <NPLogo color="rgba(255,255,255,.4)" size={26} />
          <p style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"rgba(255,255,255,.28)", letterSpacing:".06em" }}>
            © 2025 Nayun Park — All rights reserved
          </p>
          <div style={{ display:"flex", gap:18 }}>
            {["LinkedIn","Behance","Email"].map(s => (
              <a key={s} href="#" style={{
                fontFamily:"'Space Mono',monospace", fontSize:10,
                color:"rgba(255,255,255,.32)", textDecoration:"none", letterSpacing:".07em",
                transition:"color .2s",
              }}
              onMouseEnter={e=>e.currentTarget.style.color="#a855f7"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.32)"}>{s}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}