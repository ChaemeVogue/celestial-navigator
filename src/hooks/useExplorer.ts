import { useCallback, useEffect, useState } from 'react'
import { getColourKey, getPasses, getTargets } from '../api/client'
import type { ColourKeyEntry, PassesResponse, Target } from '../api/types'

export type LoadStatus = 'loading' | 'ready' | 'error'

const PLAY_INTERVAL_MS = 800

// Owns all app state (plan.md section 6). Components only read from it.
export function useExplorer() {
  const [targets, setTargets] = useState<Target[]>([])
  const [targetsStatus, setTargetsStatus] = useState<LoadStatus>('loading')
  const [targetsAttempt, setTargetsAttempt] = useState(0)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [passesData, setPassesData] = useState<PassesResponse | null>(null)
  const [passesStatus, setPassesStatus] = useState<LoadStatus>('loading')
  const [passesAttempt, setPassesAttempt] = useState(0)

  const [passIndex, setPassIndexState] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [colourKey, setColourKey] = useState<ColourKeyEntry[]>([])
  // null = colour composite; otherwise a detector id ("D6"). Kept across target changes.
  const [band, setBand] = useState<string | null>(null)

  const selectedTarget = targets.find((t) => t.id === selectedId) ?? null
  const passCount = passesData?.passes.length ?? 0

  // Load targets on mount (and on retry). Nothing is selected until the user picks a star.
  useEffect(() => {
    let cancelled = false
    getTargets()
      .then((list) => {
        if (cancelled) return
        setTargets(list)
        setTargetsStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setTargetsStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [targetsAttempt])

  useEffect(() => {
    let cancelled = false
    getColourKey()
      .then((entries) => {
        if (!cancelled) setColourKey(entries)
      })
      .catch(() => {
        // The legend is supplementary; the page still works without it.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch passes whenever the target changes (or on retry). Stale responses are ignored.
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    getPasses(selectedId)
      .then((data) => {
        if (cancelled) return
        setPassesData(data)
        setPassesStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setPassesStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, passesAttempt])

  // Playback: advance every 800ms and loop. Cleared on pause, target change and unmount.
  useEffect(() => {
    if (!isPlaying || passCount < 2) return
    const timer = setInterval(() => {
      setPassIndexState((i) => (i + 1) % passCount)
    }, PLAY_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isPlaying, passCount, selectedId])

  const selectTarget = useCallback((id: string) => {
    setIsPlaying(false)
    setPassIndexState(0)
    setPassesData(null)
    setPassesStatus('loading')
    setSelectedId(id)
  }, [])

  // Manual steps pause playback.
  const setPassIndex = useCallback(
    (i: number) => {
      setIsPlaying(false)
      if (passCount > 0) setPassIndexState(((i % passCount) + passCount) % passCount)
    },
    [passCount],
  )
  const next = useCallback(() => setPassIndex(passIndex + 1), [setPassIndex, passIndex])
  const prev = useCallback(() => setPassIndex(passIndex - 1), [setPassIndex, passIndex])

  const play = useCallback(() => setIsPlaying(true), [])
  const pause = useCallback(() => setIsPlaying(false), [])
  const togglePlay = useCallback(() => setIsPlaying((p) => !p), [])

  const retryTargets = useCallback(() => {
    setTargetsStatus('loading')
    setTargetsAttempt((n) => n + 1)
  }, [])
  const retryPasses = useCallback(() => {
    setPassesStatus('loading')
    setPassesAttempt((n) => n + 1)
  }, [])

  return {
    targets,
    targetsStatus,
    retryTargets,
    selectedTarget,
    selectTarget,
    passesData,
    passesStatus,
    retryPasses,
    passIndex,
    setPassIndex,
    next,
    prev,
    isPlaying,
    play,
    pause,
    togglePlay,
    colourKey,
    band,
    setBand,
  }
}

export type Explorer = ReturnType<typeof useExplorer>
