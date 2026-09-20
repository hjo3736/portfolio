import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { content } from './sections';
import { canAutoRotate, IDLE_DELAY } from './motion';

export default function Polyhedron({ front, onFront, onSelect, focusRequest, blocked }) {
  const stageRef = useRef(null);
  const nodeRefs = useRef([]);
  const engine = useRef(null);
  const callbacks = useRef({ onFront, onSelect });
  callbacks.current = { onFront, onSelect };
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const stage = stageRef.current;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const state = { paused: media.matches, dragging: false, blocked: false, target: null, resumeAt: 0 };
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { setFailed(true); return; }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const group = new THREE.Group();
    group.rotation.set(0.23, -0.48, 0.08);
    scene.add(group);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(renderer.domElement);
    const geometry = new THREE.IcosahedronGeometry(2.25, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8392ca, transparent: true, opacity: 0.65 });
    group.add(new THREE.LineSegments(edges, lineMaterial));
    const vertices = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i);
      if (!vertices.some(v => v.distanceTo(vertex) < 0.01)) vertices.push(vertex);
    }
    const dotGeometry = new THREE.SphereGeometry(0.022, 8, 6);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x7587c8 });
    vertices.forEach(vertex => {
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.copy(vertex);
      group.add(dot);
    });
    const chosen = [0, 8, 16, 24, 32].map(i => vertices[i]);
    let width = 1, height = 1, previousTime = 0, raf = 0, nearestPrevious = -1, pointer = null;
    const touch = () => { state.resumeAt = performance.now() + IDLE_DELAY; };
    const resize = () => {
      width = stage.clientWidth;
      height = stage.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      camera.position.z = 2.25 / Math.sin(Math.atan(Math.tan(halfFov) * Math.min(camera.aspect, 1))) * 1.12;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    const down = event => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
      state.dragging = true;
      state.target = null;
      stage.setPointerCapture(event.pointerId);
      touch();
    };
    const move = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (event.clientY - pointer.y) * 0.006, (event.clientX - pointer.x) * 0.006, 0,
      ));
      group.quaternion.premultiply(rotation);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      touch();
    };
    const end = () => { pointer = null; state.dragging = false; touch(); };
    const mediaChange = () => { state.paused = media.matches; setPaused(media.matches); touch(); };
    const contextLost = event => { event.preventDefault(); setFailed(true); };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('lostpointercapture', end);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    media.addEventListener('change', mediaChange);
    engine.current = {
      state,
      focus(index) {
        state.target = new THREE.Quaternion().setFromUnitVectors(chosen[index].clone().normalize(), new THREE.Vector3(0, 0, 1));
        if (media.matches) { group.quaternion.copy(state.target); state.target = null; }
        touch();
      },
      touch,
    };
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      if (document.hidden) return;
      if (state.target) {
        group.quaternion.slerp(state.target, 1 - Math.exp(-7 * dt));
        if (group.quaternion.angleTo(state.target) < 0.002) state.target = null;
      } else if (canAutoRotate(state, now)) {
        group.rotation.y += dt * 0.14;
        group.rotation.x += dt * 0.025;
      }
      group.updateMatrixWorld();
      let nearest = 0, best = -Infinity;
      chosen.forEach((vertex, index) => {
        const world = vertex.clone().applyQuaternion(group.quaternion);
        if (world.z > best) { best = world.z; nearest = index; }
        const projected = world.clone().project(camera);
        const button = nodeRefs.current[index];
        if (!button) return;
        button.style.left = `${(projected.x * 0.5 + 0.5) * width + stage.offsetLeft}px`;
        button.style.top = `${(-projected.y * 0.5 + 0.5) * height + stage.offsetTop}px`;
        button.style.opacity = world.z < 0 ? '0.4' : '1';
      });
      if (!state.target && nearest !== nearestPrevious) {
        nearestPrevious = nearest;
        callbacks.current.onFront(nearest);
      }
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', end);
      stage.removeEventListener('pointercancel', end);
      stage.removeEventListener('lostpointercapture', end);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      media.removeEventListener('change', mediaChange);
      geometry.dispose(); edges.dispose(); lineMaterial.dispose(); dotGeometry.dispose(); dotMaterial.dispose();
      renderer.dispose(); renderer.domElement.remove(); engine.current = null;
    };
  }, []);

  useEffect(() => { if (focusRequest) engine.current?.focus(focusRequest.id); }, [focusRequest]);
  useEffect(() => {
    if (engine.current) { engine.current.state.blocked = blocked; if (!blocked) engine.current.touch(); }
  }, [blocked]);
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    if (engine.current) { engine.current.state.paused = next; engine.current.state.resumeAt = 0; }
  };
  const active = content[front];
  return <section className="visual" aria-label="회전하는 포트폴리오 다면체">
    <div className="orbit" aria-hidden="true" />
    <div id="stage" ref={stageRef}>{failed && <p id="fallback">이 환경에서는 3D 화면을 표시할 수 없어요. 메뉴에서 모든 내용을 확인할 수 있습니다.</p>}</div>
    {!failed && <div id="nodes">{content.map((item, index) => <button key={item.en} ref={el => { nodeRefs.current[index] = el; }}
      className={`node ${front === index ? 'front' : ''}`} aria-label={`${item.name} 열기`} onClick={() => onSelect(index)}><span>{item.name}</span></button>)}</div>}
    <div id="preview"><span className="eyebrow">0{front + 1} / {active.en}</span>
      <button id="preview-open" onClick={() => onSelect(front)}>{active.title} ↗</button><p id="preview-copy">{active.copy}</p></div>
    <div className="visual-bottom"><span>드래그하여 둘러보기</span>{!failed && <button id="motion" onClick={toggle} aria-pressed={paused}>{paused ? '▷ 회전 시작' : 'Ⅱ 회전 멈춤'}</button>}</div>
  </section>;
}
