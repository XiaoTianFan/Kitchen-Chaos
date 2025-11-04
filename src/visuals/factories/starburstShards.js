import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const n = 10;
  for (let i=0;i<n;i++){
    const geo = new THREE.PlaneGeometry(2, 10);
    const mat = new THREE.MeshBasicMaterial({ color: params.colorA||0xcfe8ff, transparent:true, opacity:1 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.z = (i/n)*Math.PI*2;
    group.add(m);
  }
  let x=0,y=0,t=0; const life=(params.lifespanMs||0.7*1000)/1000; let alive=true;
  return { id:`star_${Math.random().toString(36).slice(2)}`, object3D: group,
    update(){ t+=1/60; const k=Math.min(1,t/life); group.scale.setScalar(1+2*k); group.children.forEach(c=>{ c.material.opacity=1-k; }); group.position.set(x,y,0); if(t>=life)this.destroy(); },
    setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return {x,y}}, destroy(){alive=false;group.removeFromParent();}, get alive(){return alive} };
}


