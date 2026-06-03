interface MoonrakerStatus {
  online: boolean
  temperature?: {
    nozzle: number
    bed: number
  }
  print?: {
    state: string
    filename: string
    progress: number
    estimatedTime: number
    printedTime: number
  }
}

export async function queryMoonraker(ip: string, port: number = 7125, timeout: number = 3000): Promise<MoonrakerStatus> {
  const baseUrl = `http://${ip}:${port}`

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const [printerRes, statusRes] = await Promise.all([
      fetch(`${baseUrl}/api/printer`, { signal: controller.signal }),
      fetch(`${baseUrl}/api/printer/objects/query?extruder&heater_bed&print_stats&virtual_sdcard`, { signal: controller.signal }),
    ])

    clearTimeout(id)

    if (!printerRes.ok || !statusRes.ok) {
      return { online: false }
    }

    const printerData = await printerRes.json()
    const statusData = await statusRes.json()

    const extruder = statusData.result?.status?.extruder
    const heaterBed = statusData.result?.status?.heater_bed
    const printStats = statusData.result?.status?.print_stats
    const virtualSd = statusData.result?.status?.virtual_sdcard

    return {
      online: true,
      temperature: {
        nozzle: extruder?.temperature || 0,
        bed: heaterBed?.temperature || 0,
      },
      print: {
        state: printStats?.state || 'standby',
        filename: printStats?.filename || '',
        progress: virtualSd?.progress || 0,
        estimatedTime: printStats?.total_duration || 0,
        printedTime: printStats?.print_duration || 0,
      },
    }
  } catch {
    clearTimeout(id)
    return { online: false }
  }
}
