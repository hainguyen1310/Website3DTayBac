import * as THREE from "three";

/** Độ sáng & độ bão hòa trung bình của lớp vải xanh rêu gốc trên texture hộp. */
const BASE_LIGHTNESS = 0.14;
const BASE_SATURATION = 0.45;
/** Vải bọc trầm hơn màu mẫu một chút, giống hộp thật dưới ánh sáng. */
const FABRIC_DEPTH = 0.72;
/** Dải sắc độ xanh (0–1) được thay màu; phần chữ, viền vàng giữ nguyên. */
const GREEN_HUE: [number, number] = [70 / 360, 200 / 360];

const cache = new Map<string, THREE.Texture>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hueToRgb(p: number, q: number, t: number) {
  const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Thay lớp vải xanh của vỏ hộp bằng màu khác, giữ vân vải và độ sáng tương đối. */
export function tintedTexture(source: THREE.Texture, hex: string): THREE.Texture {
  const key = `${source.uuid}:${hex}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const image = source.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return source;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  const target = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(target, THREE.SRGBColorSpace);
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    if (h < GREEN_HUE[0] || h > GREEN_HUE[1] || s < 0.12) continue;
    const [r, g, b] = hslToRgb(target.h, clamp(target.s * (s / BASE_SATURATION)), clamp(l * ((target.l * FABRIC_DEPTH) / BASE_LIGHTNESS), 0, 0.92));
    data[i] = r * 255;
    data[i + 1] = g * 255;
    data[i + 2] = b * 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = source.flipY;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = source.wrapS;
  texture.wrapT = source.wrapT;
  texture.channel = source.channel;
  texture.anisotropy = source.anisotropy;
  cache.set(key, texture);
  return texture;
}
