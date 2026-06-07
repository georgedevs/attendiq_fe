'use client'

export interface DeviceFingerprint {
  canvasSignature: string
  webglVendor: string
  webglRenderer: string
  hardwareConcurrency: number
  deviceMemory: number | null
  audioOscillatorCurve: string
  userAgent: string
  screenResolution: string
  languages: string
  timezone: string
}

async function getCanvasSignature(): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.font = '11pt Arial'
    ctx.fillText('AttendIQ 🎓', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.font = '18pt Arial'
    ctx.fillText('AttendIQ 🎓', 4, 45)
    return canvas.toDataURL().slice(-64)
  } catch {
    return 'canvas-error'
  }
}

function getWebGL(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null
    if (!gl) return { vendor: 'no-webgl', renderer: 'no-webgl' }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return { vendor: 'no-ext', renderer: 'no-ext' }
    return {
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string,
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string,
    }
  } catch {
    return { vendor: 'webgl-error', renderer: 'webgl-error' }
  }
}

async function getAudioSignature(): Promise<string> {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return 'no-audio'
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const analyser = ctx.createAnalyser()
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(analyser)
    analyser.connect(gain)
    gain.connect(ctx.destination)
    osc.start(0)
    const data = new Float32Array(analyser.frequencyBinCount)
    analyser.getFloatFrequencyData(data)
    osc.stop()
    await ctx.close()
    const sum = data.slice(0, 16).reduce((a, b) => a + b, 0)
    return sum.toFixed(6)
  } catch {
    return 'audio-error'
  }
}

export async function collectFingerprint(): Promise<DeviceFingerprint> {
  const [canvasSignature, audioOscillatorCurve, { vendor, renderer }] =
    await Promise.all([getCanvasSignature(), getAudioSignature(), Promise.resolve(getWebGL())])

  return {
    canvasSignature,
    webglVendor: vendor,
    webglRenderer: renderer,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    audioOscillatorCurve,
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    languages: navigator.languages?.join(',') || navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}
