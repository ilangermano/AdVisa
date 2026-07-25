"use client";

import { useEffect, useRef } from "react";
import type { FeatureCollection, Geometry, MultiLineString, MultiPolygon, Polygon, Position } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const WORLD_DATA_URL = "/data/countries-50m.json";
const DEGREES_TO_RADIANS = Math.PI / 180;
const NZ_LONGITUDE = 172.8 * DEGREES_TO_RADIANS;
const NZ_LATITUDE = -41.3 * DEGREES_TO_RADIANS;
const NZ_YAW = -NZ_LONGITUDE;
const NZ_PITCH = NZ_LATITUDE * 0.92;

type Vector3 = [number, number, number];
type Rgb = [number, number, number];

type Particle = {
  v: Vector3;
  sz: number;
  a: number;
  ph: number;
  ox: number;
  oy: number;
};

type Segment = [Position, Position, number];
type CountryProperties = { name?: string };
type WorldTopology = Topology<{ countries: GeometryCollection<CountryProperties> }>;

type ParticleGlobeProps = {
  density?: number;
  nzColor?: string;
  repel?: boolean;
};

const fromLatLon = (lat: number, lon: number): Vector3 => {
  const latitude = lat * DEGREES_TO_RADIANS;
  const longitude = lon * DEGREES_TO_RADIANS;
  const latitudeRadius = Math.cos(latitude);

  return [latitudeRadius * Math.sin(longitude), Math.sin(latitude), latitudeRadius * Math.cos(longitude)];
};

const hexToRgb = (hex: string): Rgb => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [17, 17, 17];

  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export const ParticleGlobe = ({ density = 1, nzColor = "#111111", repel = true }: ParticleGlobeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const particleDensity = Math.min(2, Math.max(0.5, density));
    const nzRgb = hexToRgb(nzColor);
    const controller = new AbortController();

    let width = 440;
    let height = 440;
    let deviceScale = 1;
    let radius = 198;
    let animationFrame = 0;
    let randomParticles: Particle[] = [];
    let worldParticles: Particle[] = [];
    let nzParticles: Particle[] = [];
    let pointerX = -10_000;
    let pointerY = -10_000;
    let parallaxX = 0;
    let parallaxY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let userYaw = 0;
    let userPitch = 0;
    let yawVelocity = 0;
    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let nzBorn = 0;
    const startedAt = performance.now();

    const resize = () => {
      deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || 440;
      height = canvas.clientHeight || 440;
      canvas.width = Math.round(width * deviceScale);
      canvas.height = Math.round(height * deviceScale);
      radius = Math.min(width, height) * 0.45;
    };

    const generateRandomParticles = () => {
      const count = Math.round(3400 * particleDensity);
      const clusterCenters: Vector3[] = [];

      for (let index = 0; index < 45; index += 1) {
        const z = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const radialDistance = Math.sqrt(1 - z * z);
        clusterCenters.push([radialDistance * Math.cos(theta), z, radialDistance * Math.sin(theta)]);
      }

      randomParticles = Array.from({ length: count }, (_, index) => {
        let vector: Vector3;

        if (index % 5 < 2) {
          const z = Math.random() * 2 - 1;
          const theta = Math.random() * Math.PI * 2;
          const radialDistance = Math.sqrt(1 - z * z);
          vector = [radialDistance * Math.cos(theta), z, radialDistance * Math.sin(theta)];
        } else {
          const center = clusterCenters[Math.floor(Math.random() * clusterCenters.length)] ?? [0, 0, 1];
          const offset = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.13;
          const clusteredVector: Vector3 = [center[0] + offset(), center[1] + offset(), center[2] + offset()];
          const length = Math.hypot(...clusteredVector);
          vector = [clusteredVector[0] / length, clusteredVector[1] / length, clusteredVector[2] / length];
        }

        return {
          v: vector,
          sz: 0.8 + Math.random() * 1.1,
          a: 0.22 + Math.random() * 0.5,
          ph: Math.random() * Math.PI * 2,
          ox: 0,
          oy: 0,
        };
      });
    };

    const sampleNewZealand = (geometry: Polygon | MultiPolygon) => {
      const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
      const rings: Position[][] = [];

      for (const polygon of polygons) {
        for (const ring of polygon) {
          let minLongitude = Number.POSITIVE_INFINITY;
          let maxLongitude = Number.NEGATIVE_INFINITY;
          let minLatitude = Number.POSITIVE_INFINITY;
          let maxLatitude = Number.NEGATIVE_INFINITY;

          for (const point of ring) {
            minLongitude = Math.min(minLongitude, point[0]);
            maxLongitude = Math.max(maxLongitude, point[0]);
            minLatitude = Math.min(minLatitude, point[1]);
            maxLatitude = Math.max(maxLatitude, point[1]);
          }

          const centerLongitude = (minLongitude + maxLongitude) / 2;
          const centerLatitude = (minLatitude + maxLatitude) / 2;
          if (centerLongitude >= 165 && centerLongitude <= 179.5 && centerLatitude >= -47.9 && centerLatitude <= -34) {
            rings.push(ring);
          }
        }
      }

      const segments: Segment[] = [];
      let totalLength = 0;

      for (const ring of rings) {
        for (let index = 0; index < ring.length - 1; index += 1) {
          const start = ring[index];
          const end = ring[index + 1];
          const longitudeDelta =
            (end[0] - start[0]) * DEGREES_TO_RADIANS * Math.cos(((start[1] + end[1]) / 2) * DEGREES_TO_RADIANS);
          const latitudeDelta = (end[1] - start[1]) * DEGREES_TO_RADIANS;
          const segmentLength = Math.hypot(longitudeDelta, latitudeDelta);

          if (segmentLength > 0) {
            segments.push([start, end, segmentLength]);
            totalLength += segmentLength;
          }
        }
      }

      const targetCount = Math.round(380 * particleDensity);
      const step = totalLength / targetCount;
      const particles: Particle[] = [];
      let carry = 0;

      for (const [start, end, segmentLength] of segments) {
        let distance = carry;

        while (distance < segmentLength) {
          const progress = distance / segmentLength;
          let longitude = start[0] + (end[0] - start[0]) * progress + (Math.random() - 0.5) * 0.05;
          let latitude = start[1] + (end[1] - start[1]) * progress + (Math.random() - 0.5) * 0.05;

          longitude = 172.8 + (longitude - 172.8) * 1.55;
          latitude = -41.3 + (latitude + 41.3) * 1.55;
          particles.push({
            v: fromLatLon(latitude, longitude),
            sz: 1.5 + Math.random() * 0.9,
            a: 0.4 + Math.random() * 0.18,
            ph: Math.random() * Math.PI * 2,
            ox: 0,
            oy: 0,
          });
          distance += step;
        }

        carry = distance - segmentLength;
      }

      nzParticles = particles;
      nzBorn = performance.now();
    };

    const sampleWorld = (worldMesh: MultiLineString) => {
      const isNearNewZealand = (longitude: number, latitude: number) =>
        longitude >= 161 && longitude <= 180 && latitude >= -52 && latitude <= -30;
      const segments: Segment[] = [];
      let totalLength = 0;

      for (const line of worldMesh.coordinates) {
        for (let index = 0; index < line.length - 1; index += 1) {
          const start = line[index];
          const end = line[index + 1];
          if (isNearNewZealand(start[0], start[1]) || isNearNewZealand(end[0], end[1])) continue;

          const longitudeDelta =
            (end[0] - start[0]) * DEGREES_TO_RADIANS * Math.cos(((start[1] + end[1]) / 2) * DEGREES_TO_RADIANS);
          const latitudeDelta = (end[1] - start[1]) * DEGREES_TO_RADIANS;
          const segmentLength = Math.hypot(longitudeDelta, latitudeDelta);

          if (segmentLength > 0 && segmentLength < 0.3) {
            segments.push([start, end, segmentLength]);
            totalLength += segmentLength;
          }
        }
      }

      const targetCount = Math.round(2600 * particleDensity);
      const step = totalLength / targetCount;
      const particles: Particle[] = [];
      let carry = 0;

      for (const [start, end, segmentLength] of segments) {
        let distance = carry;

        while (distance < segmentLength) {
          const progress = distance / segmentLength;
          const longitude = start[0] + (end[0] - start[0]) * progress + (Math.random() - 0.5) * 0.12;
          const latitude = start[1] + (end[1] - start[1]) * progress + (Math.random() - 0.5) * 0.12;

          particles.push({
            v: fromLatLon(latitude, longitude),
            sz: 0.9 + Math.random() * 0.8,
            a: 0.4 + Math.random() * 0.35,
            ph: Math.random() * Math.PI * 2,
            ox: 0,
            oy: 0,
          });
          distance += step;
        }

        carry = distance - segmentLength;
      }

      worldParticles = particles;
    };

    const loadCoastlines = async () => {
      try {
        const response = await fetch(WORLD_DATA_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Unable to load world geometry (${response.status})`);

        const topology = (await response.json()) as WorldTopology;
        const countries = feature(topology, topology.objects.countries) as FeatureCollection<
          Geometry,
          CountryProperties
        >;
        const newZealand = countries.features.find(
          country => country.properties?.name === "New Zealand" || country.id === "554" || country.id === 554,
        );

        if (!newZealand || (newZealand.geometry.type !== "Polygon" && newZealand.geometry.type !== "MultiPolygon")) {
          return;
        }

        sampleNewZealand(newZealand.geometry);
        sampleWorld(mesh(topology, topology.objects.countries));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // The random dust remains visible if the optional coastline data cannot load.
        }
      }
    };

    const drawParticles = (
      particles: Particle[],
      rgb: Rgb,
      baseAlpha: number,
      backAlpha: number,
      twinkle: boolean,
      now: number,
      cosYaw: number,
      sinYaw: number,
      cosPitch: number,
      sinPitch: number,
    ) => {
      context.fillStyle = `rgb(${rgb.join(",")})`;

      for (const particle of particles) {
        const [x, y, z] = particle.v;
        const rotatedX = x * cosYaw + z * sinYaw;
        const rotatedZ = -x * sinYaw + z * cosYaw;
        const rotatedY = y * cosPitch - rotatedZ * sinPitch;
        const depth = y * sinPitch + rotatedZ * cosPitch;
        const perspective = 1 / (1 - depth * 0.3);
        let screenX = width / 2 + rotatedX * radius * perspective;
        let screenY = height / 2 - rotatedY * radius * perspective;
        let targetOffsetX = 0;
        let targetOffsetY = 0;

        if (repel) {
          const deltaX = screenX - pointerX;
          const deltaY = screenY - pointerY;
          const pointerDistance = Math.hypot(deltaX, deltaY);

          if (pointerDistance < 85 && pointerDistance > 0.01) {
            const force = 1 - pointerDistance / 85;
            const push = force * force * 30;
            targetOffsetX = (deltaX / pointerDistance) * push;
            targetOffsetY = (deltaY / pointerDistance) * push;
          }
        }

        particle.ox += (targetOffsetX - particle.ox) * 0.14;
        particle.oy += (targetOffsetY - particle.oy) * 0.14;
        screenX += particle.ox;
        screenY += particle.oy;

        const edgeFade = Math.min(screenX, screenY, width - screenX, height - screenY) / 42;
        if (edgeFade <= 0) continue;

        const isFront = depth > -0.05;
        let alpha =
          particle.a *
          baseAlpha *
          (isFront ? 1 : backAlpha) *
          (0.55 + (0.45 * (depth + 1)) / 2) *
          Math.min(1, edgeFade);

        if (twinkle) alpha *= 0.86 + 0.14 * Math.sin(now * 0.002 + particle.ph);

        context.globalAlpha = Math.max(0, Math.min(1, alpha));
        const particleSize = particle.sz * perspective;
        context.fillRect(screenX - particleSize / 2, screenY - particleSize / 2, particleSize, particleSize);
      }
    };

    const renderFrame = (now: number) => {
      animationFrame = window.requestAnimationFrame(renderFrame);
      if (!width || !height) return;

      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      context.clearRect(0, 0, width, height);

      const introProgress = Math.min(1, (now - startedAt) / 3600);
      const easedProgress = 1 - (1 - introProgress) ** 3;
      if (!dragging) {
        userYaw += yawVelocity;
        yawVelocity *= 0.94;
      }

      parallaxX += (targetParallaxX - parallaxX) * 0.05;
      parallaxY += (targetParallaxY - parallaxY) * 0.05;
      const sway = easedProgress * 0.045 * Math.sin((now - startedAt) * 0.00028);
      const yaw = NZ_YAW - 2.9 * (1 - easedProgress) + sway + userYaw + parallaxX * 0.22;
      const pitch = Math.max(
        -1.25,
        Math.min(0.4, -0.1 + (NZ_PITCH + 0.1) * easedProgress + userPitch + parallaxY * 0.14),
      );
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const coastlineFade = nzBorn ? Math.min(1, (now - nzBorn) / 1200) : 0;

      drawParticles(randomParticles, [46, 46, 46], 0.9, 0.22, false, now, cosYaw, sinYaw, cosPitch, sinPitch);
      if (coastlineFade > 0) {
        drawParticles(
          worldParticles,
          [46, 46, 46],
          coastlineFade * 0.42,
          0.15,
          false,
          now,
          cosYaw,
          sinYaw,
          cosPitch,
          sinPitch,
        );
        drawParticles(nzParticles, nzRgb, coastlineFade, 0.12, true, now, cosYaw, sinYaw, cosPitch, sinPitch);
      }

      context.globalAlpha = 1;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = event.clientX - bounds.left;
      pointerY = event.clientY - bounds.top;
      targetParallaxX = pointerX / bounds.width - 0.5;
      targetParallaxY = pointerY / bounds.height - 0.5;

      if (dragging) {
        userYaw += (event.clientX - lastPointerX) * 0.005;
        userPitch = Math.max(-0.6, Math.min(0.6, userPitch - (event.clientY - lastPointerY) * 0.004));
        yawVelocity = (event.clientX - lastPointerX) * 0.005;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      dragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      yawVelocity = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const handlePointerEnd = () => {
      dragging = false;
      canvas.style.cursor = "grab";
    };

    const handlePointerLeave = () => {
      pointerX = -10_000;
      pointerY = -10_000;
      targetParallaxX = 0;
      targetParallaxY = 0;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    generateRandomParticles();
    void loadCoastlines();
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerEnd);
    canvas.addEventListener("pointercancel", handlePointerEnd);
    canvas.addEventListener("lostpointercapture", handlePointerEnd);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    animationFrame = window.requestAnimationFrame(renderFrame);

    return () => {
      controller.abort();
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerEnd);
      canvas.removeEventListener("pointercancel", handlePointerEnd);
      canvas.removeEventListener("lostpointercapture", handlePointerEnd);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [density, nzColor, repel]);

  return <canvas ref={canvasRef} className="particle-globe" aria-hidden="true" />;
};
