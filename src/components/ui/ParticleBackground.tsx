'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = window.innerWidth
    const height = window.innerHeight

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 30

    // Renderer
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch (e) {
      console.warn('WebGL is not supported in this environment, particle background disabled.', e)
      return
    }
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // --- Particle System 1: Star field ---
    const starsGeometry = new THREE.BufferGeometry()
    const starsCount = 2000
    const starsPositions = new Float32Array(starsCount * 3)
    const starsColors = new Float32Array(starsCount * 3)
    const starsSizes = new Float32Array(starsCount)

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3
      const radius = 50 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      starsPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      starsPositions[i3 + 2] = radius * Math.cos(phi)

      const colorChoice = Math.random()
      if (colorChoice < 0.33) {
        starsColors[i3] = 1; starsColors[i3 + 1] = 0.5; starsColors[i3 + 2] = 0 // orange
      } else if (colorChoice < 0.66) {
        starsColors[i3] = 0; starsColors[i3 + 1] = 0.95; starsColors[i3 + 2] = 1 // cyan
      } else {
        starsColors[i3] = 1; starsColors[i3 + 1] = 1; starsColors[i3 + 2] = 1 // white
      }

      starsSizes[i] = 0.5 + Math.random() * 1.5
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3))
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3))
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1))

    const starMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const stars = new THREE.Points(starsGeometry, starMaterial)
    scene.add(stars)

    // --- Particle System 2: Floating orbs ---
    const orbsGeometry = new THREE.BufferGeometry()
    const orbsCount = 80
    const orbsPositions = new Float32Array(orbsCount * 3)
    const orbsColors = new Float32Array(orbsCount * 3)
    const orbsSizes = new Float32Array(orbsCount)
    const orbsData: { vx: number; vy: number; phase: number }[] = []

    for (let i = 0; i < orbsCount; i++) {
      const i3 = i * 3
      orbsPositions[i3] = (Math.random() - 0.5) * 60
      orbsPositions[i3 + 1] = (Math.random() - 0.5) * 40
      orbsPositions[i3 + 2] = (Math.random() - 0.5) * 30 - 10

      const isOrange = Math.random() > 0.5
      orbsColors[i3] = isOrange ? 1 : 0
      orbsColors[i3 + 1] = isOrange ? 0.4 : 0.6
      orbsColors[i3 + 2] = isOrange ? 0 : 1

      orbsSizes[i] = 0.8 + Math.random() * 2.5
      orbsData.push({
        vx: (Math.random() - 0.5) * 0.01,
        vy: (Math.random() - 0.5) * 0.01,
        phase: Math.random() * Math.PI * 2,
      })
    }

    orbsGeometry.setAttribute('position', new THREE.BufferAttribute(orbsPositions, 3))
    orbsGeometry.setAttribute('color', new THREE.BufferAttribute(orbsColors, 3))
    orbsGeometry.setAttribute('size', new THREE.BufferAttribute(orbsSizes, 1))

    const orbsMaterial = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const orbs = new THREE.Points(orbsGeometry, orbsMaterial)
    scene.add(orbs)

    // Mouse interaction
    const mouse = { x: 0, y: 0 }
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / width - 0.5) * 2
      mouse.y = (e.clientY / height - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Animation loop
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.0005

      stars.rotation.y += 0.00025
      stars.rotation.x = Math.sin(time * 0.05) * 0.05
      orbs.rotation.y += 0.0005
      orbs.rotation.x += 0.00025

      // Subtle mouse parallax
      stars.rotation.y += mouse.x * 0.0001
      stars.rotation.x += mouse.y * 0.00005

      // Animate orbs positions
      const positions = orbs.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < orbsCount; i++) {
        const i3 = i * 3
        positions[i3] += orbsData[i].vx
        positions[i3 + 1] += orbsData[i].vy

        // Bounce off boundaries
        if (Math.abs(positions[i3]) > 30) orbsData[i].vx *= -1
        if (Math.abs(positions[i3 + 1]) > 20) orbsData[i].vy *= -1
      }
      orbs.geometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.25 }}
    />
  )
}
