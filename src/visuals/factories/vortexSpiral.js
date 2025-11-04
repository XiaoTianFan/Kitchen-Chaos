import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const curve = new THREE.CatmullRomCurve3(Array.from({length:50},(_,i)=>{
    const a=i/50*Math.PI*4; const r=10+i*0.3; return new THREE.Vector3(Math.cos(a)*r, Math.sin(a)*r, 0);
  }));
  const geo = new THREE.TubeGeometry(curve, 100, 0.6, 6, false);
  const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0xffccdd, transparent:true, opacity:0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  let x=0,y=0,t=0; let alive=true;
  return { id:`vortex_${Math.random().toString(36).slice(2)}`, object3D: mesh,
    update(){ t+=0.03; mesh.rotation.z += 0.03; mesh.position.set(x,y,0); if (params.lifespanMs){ const life=params.lifespanMs/1000; if (t>life) this.destroy(); } },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;mesh.removeFromParent();}, get alive(){return alive} };
}


