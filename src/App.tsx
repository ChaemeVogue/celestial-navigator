import { useNearViewport } from './hooks/useNearViewport'
import SpectralExplorer from './components/SpectralExplorer'
import ImageComparison from './components/ImageComparison'
import Header from './components/Header'
import Divider from './components/Divider'
import TargetBar from './components/TargetBar'
import SkyPlate from './components/SkyPlate'
import PlateCaption from './components/PlateCaption'
import TimelinePanel from './components/TimelinePanel'
import ColourKeyPanel from './components/ColourKeyPanel'
import { useExplorer } from './hooks/useExplorer'
import { usePreloadImages } from './hooks/usePreloadImages'
import { hasBandImages, imageForBand } from './utils/bands'

export default function App() {
  const explorer = useExplorer()
  const [plateRef, plateVisible] = useNearViewport<HTMLDivElement>()
  const passes = explorer.passesData?.passes ?? []
  // The chosen band applies only where single-detector images exist (not simulated targets).
  const bandsAvailable = hasBandImages(passes)
  const band = bandsAvailable
    ? (explorer.colourKey.find((c) => c.band === explorer.band) ?? null)
    : null
  const framesReady = usePreloadImages(
    passes.map((p) => imageForBand(p, band?.band ?? null) ?? ''),
    explorer.passIndex,
    plateVisible,
  )
  const targetsFailed = explorer.targetsStatus === 'error'

  return (
    <div className="page">
      <Header />
      <Divider />
      <main id="chart">
        <h1 className="visually-hidden">Celestial Navigator: SPHEREx blink comparator</h1>
        <TargetBar
          targets={explorer.targets}
          targetsStatus={explorer.targetsStatus}
          selectedTarget={explorer.selectedTarget}
          passes={explorer.passesStatus === 'ready' ? passes : null}
          onSelect={explorer.selectTarget}
          onRetry={explorer.retryTargets}
        />
        <div className="main-row">
          <div className="plate-column" ref={plateRef}>
            <SkyPlate
              target={explorer.selectedTarget}
              passesData={explorer.passesData}
              // No targets means no passes will ever load, so show the error here too.
              passesStatus={targetsFailed ? 'error' : explorer.passesStatus}
              passIndex={explorer.passIndex}
              band={band}
              onRetry={targetsFailed ? explorer.retryTargets : explorer.retryPasses}
            />
            <PlateCaption
              target={explorer.selectedTarget}
              passesData={explorer.passesData}
              passIndex={explorer.passIndex}
              colourKey={explorer.colourKey}
              band={band}
            />
          </div>
          <aside className="side-column" aria-label="Timeframes and colour key">
            <TimelinePanel
              passes={passes}
              passIndex={explorer.passIndex}
              isPlaying={explorer.isPlaying}
              canPlay={framesReady}
              onSelectPass={explorer.setPassIndex}
              onPrev={explorer.prev}
              onNext={explorer.next}
              onTogglePlay={explorer.togglePlay}
            />
            <ColourKeyPanel
              entries={explorer.colourKey}
              band={band?.band ?? null}
              bandsAvailable={bandsAvailable}
              onBandChange={explorer.setBand}
            />
          </aside>
        </div>
        {explorer.selectedTarget && (
          <SpectralExplorer
            key={`chemistry-${explorer.selectedTarget.id}`}
            target={explorer.selectedTarget}
          />
        )}
        {explorer.passesStatus === 'ready' && explorer.passesData && explorer.selectedTarget && (
          <ImageComparison
            key={`comparison-${explorer.selectedTarget.id}`}
            data={explorer.passesData}
            target={explorer.selectedTarget}
          />
        )}
      </main>
    </div>
  )
}
