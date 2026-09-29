import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { canAutoRotate } from './motion';

export default function Polyhedron({ onSelect, blocked }) {
  const stageRef = useRef(null);
  const markerRef = useRef(null);
  const lineRef = useRef(null);
  const labelRef = useRef(null);
  const reading = useRef(false);
  const hovered = useRef(new Set());
  const keyboardFocus = useRef(false);
  const calloutRef = useRef(null);
  const closeTimer = useRef(null);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const [expanded, setExpanded] = useState(false);
  const engine = useRef(null);

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const state = { blocked: false, target: null };
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
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xc9b65e, transparent: true, opacity: 0.65 });
    group.add(new THREE.LineSegments(edges, lineMaterial));
    const vertices = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i);
      if (!vertices.some(v => v.distanceTo(vertex) < 0.01)) vertices.push(vertex);
    }
    const dotGeometry = new THREE.SphereGeometry(0.022, 8, 6);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xf2d34f });
    vertices.forEach(vertex => {
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.copy(vertex);
      group.add(dot);
    });
    // Per-project extension lengths remain stable while the globe rotates.
    const projectMarkers = [{ vertex: 16, extension: 0.85 }];
    const chosen = projectMarkers.map(project => vertices[project.vertex]);
    const rotationAxis = new THREE.Vector3();
    const rotationStep = new THREE.Quaternion();
    let rotationTime = 0;
    let width = 1, height = 1, previousTime = 0, raf = 0, nearestPrevious = -1, pointer = null;
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
      state.target = null;
      stage.setPointerCapture(event.pointerId);
    };
    const move = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (event.clientY - pointer.y) * 0.006, (event.clientX - pointer.x) * 0.006, 0,
      ));
      group.quaternion.premultiply(rotation);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const end = () => { pointer = null; };
    const contextLost = event => { event.preventDefault(); setFailed(true); };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('lostpointercapture', end);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    engine.current = {
      state,
      focus(index) {
        state.target = new THREE.Quaternion().setFromUnitVectors(chosen[index].clone().normalize(), new THREE.Vector3(0, 0, 1));
        if (media.matches) { group.quaternion.copy(state.target); state.target = null; }
        },
    };
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      if (document.hidden) return;
      if (state.target) {
        group.quaternion.slerp(state.target, 1 - Math.exp(-7 * dt));
        if (group.quaternion.angleTo(state.target) < 0.002) state.target = null;
      } else if (canAutoRotate(state) && !reading.current) {
        rotationTime += dt;
        rotationAxis.set(
          Math.sin(rotationTime * 0.19 + 0.6) * 0.85,
          Math.cos(rotationTime * 0.13) * 0.9,
          Math.sin(rotationTime * 0.17 - 0.8) * 0.65,
        ).normalize();
        const speed = 0.14 + Math.sin(rotationTime * 0.23) * 0.025;
        rotationStep.setFromAxisAngle(rotationAxis, dt * speed);
        group.quaternion.premultiply(rotationStep);
      }
      group.updateMatrixWorld();
      const world = chosen[0].clone().applyQuaternion(group.quaternion);
      const projected = world.clone().project(camera);
      const extended = world.clone().multiplyScalar(1 + projectMarkers[0].extension / world.length()).project(camera);
      const x = (projected.x * 0.5 + 0.5) * width + stage.offsetLeft;
      const y = (-projected.y * 0.5 + 0.5) * height + stage.offsetTop;
      const endX = (extended.x * 0.5 + 0.5) * width + stage.offsetLeft;
      const endY = (-extended.y * 0.5 + 0.5) * height + stage.offsetTop;
      if (markerRef.current && labelRef.current && lineRef.current) {
        markerRef.current.style.left = x + 'px'; markerRef.current.style.top = y + 'px';
        const label = labelRef.current;
        const labelLeft = endX - label.offsetWidth / 2;
        label.style.left = `${Math.max(8, Math.min(labelLeft, stage.parentElement.clientWidth - label.offsetWidth - 8))}px`;
        label.style.top = `${Math.max(8, Math.min(endY + (endY < y ? -44 : 0), stage.parentElement.clientHeight - 52))}px`;

        lineRef.current.setAttribute('points', `${x},${y} ${endX},${endY}`);
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
      geometry.dispose(); edges.dispose(); lineMaterial.dispose(); dotGeometry.dispose(); dotMaterial.dispose();
      renderer.dispose(); renderer.domElement.remove(); engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (engine.current) engine.current.state.blocked = blocked;
  }, [blocked]);
  const open = () => { clearTimeout(closeTimer.current); reading.current = true; setExpanded(true); };
  const close = () => { clearTimeout(closeTimer.current); reading.current = false; setExpanded(false); };
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!hovered.current.size && !keyboardFocus.current) close();
    }, 350);
  };
  const hoverHandlers = {
    onPointerEnter: event => {
      if (event.pointerType === 'touch') return;
      hovered.current.add(event.currentTarget); open();
    },
    onPointerLeave: event => {
      hovered.current.delete(event.currentTarget); scheduleClose();
    },
  };
  useEffect(() => {
    if (blocked) { hovered.current.clear(); keyboardFocus.current = false; close(); }
  }, [blocked]);
  useEffect(() => {
    const outside = event => {
      if (!event.target.closest('.project-pin, .project-label, .project-details')) {
        hovered.current.clear(); keyboardFocus.current = false; close();
      }
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('blur', close);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('blur', close); };
  }, []);
  return <section className="visual project-globe" aria-label="프로젝트를 탐색하는 다면체">
    <div className="orbit" aria-hidden="true" />
    <div id="stage" ref={stageRef}>{failed && <p id="fallback">3D 화면을 표시할 수 없습니다. 아래에서 프로젝트를 확인해 주세요.</p>}</div>
    <div ref={calloutRef} className={expanded ? 'project-callout expanded' : 'project-callout'} onFocus={event => { if (event.target.matches(':focus-visible')) { keyboardFocus.current = true; open(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { keyboardFocus.current = false; scheduleClose(); } }} onPointerDown={() => { keyboardFocus.current = false; }} onKeyDown={event => { if (event.key === 'Escape') { keyboardFocus.current = false; close(); } }}>
      {!failed && <><svg className="project-leader" aria-hidden="true"><polyline ref={lineRef} /></svg><button className="project-pin" {...hoverHandlers} ref={markerRef} aria-label="현재진행형 프로젝트 정보" onClick={open} /></>}
      <article ref={labelRef} className="project-label" {...hoverHandlers}><button className="project-name" aria-expanded={expanded} onClick={event => { if (matchMedia('(hover: none)').matches || event.detail === 0) { open(); } else onSelect(); }}>현재진행형 <span aria-hidden="true">↗</span></button>
      </article>
        {expanded && <div className="project-details" {...hoverHandlers}><h2>현재진행형</h2><p className="project-period">2026.09 — 진행 중</p><p>회전하는 다면체로 작업을 탐색하는 개인 포트폴리오. 개발 기록과 방문자의 이야기를 함께 담습니다.</p><a href="/projects" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); onSelect(); } }}>프로젝트 자세히 보기 ↗</a></div>}
    </div>
  </section>;
}
