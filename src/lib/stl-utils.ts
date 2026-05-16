import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export interface STLMetadata {
  name: string;
  size: number;
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  volume: number; // mm³
  volumeCm3: number;
  weightGrams: {
    pla: number;
    petg: number;
    tpu: number;
  };
}

/**
 * Parsea un archivo STL (Binario o ASCII) y extrae sus dimensiones y volumen.
 * El cálculo del volumen asume que la malla es cerrada (watertight).
 */
export async function parseSTL(file: File): Promise<STLMetadata> {
  const arrayBuffer = await file.arrayBuffer();
  const loader = new STLLoader();
  const geometry = loader.parse(arrayBuffer);

  // Calcular dimensiones (Bounding Box)
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const dimensions = {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  };

  // Calcular volumen
  const volume = calculateVolume(geometry);
  const volumeCm3 = volume / 1000; // de mm³ a cm³

  // Densidades estándar (g/cm³)
  const densities = {
    pla: 1.24,
    petg: 1.27,
    tpu: 1.21,
  };

  return {
    name: file.name,
    size: file.size,
    dimensions,
    volume,
    volumeCm3,
    weightGrams: {
      pla: volumeCm3 * densities.pla,
      petg: volumeCm3 * densities.petg,
      tpu: volumeCm3 * densities.tpu,
    },
  };
}

/**
 * Calcula el volumen de un BufferGeometry sumando el volumen de los tetraedros
 * formados por cada triángulo y el origen.
 */
function calculateVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  let totalVolume = 0;
  
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 3) {
    vA.fromBufferAttribute(position, i);
    vB.fromBufferAttribute(position, i + 1);
    vC.fromBufferAttribute(position, i + 2);
    
    // El volumen de un tetraedro es (1/6) * |dot(A, cross(B, C))|
    totalVolume += vA.dot(vB.cross(vC)) / 6.0;
  }

  return Math.abs(totalVolume);
}
