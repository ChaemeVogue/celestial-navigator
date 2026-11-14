import { useEffect } from 'react'
import DomeHero from './components/DomeHero'
import Divider from './components/Divider'
import TargetBar from './components/TargetBar'
import SkyPlate from './components/SkyPlate'
import PlateCaption from './components/PlateCaption'
import TimelinePanel from './components/TimelinePanel'
import ColourKeyPanel from './components/ColourKeyPanel'
import ObservationLog from './components/ObservationLog'
import StorySection from './components/StorySection'
import UnchartedSpot from './components/UnchartedSpot'
import { nearestTarget, useExplorer } from './hooks/useExplorer'
import { usePreloadImages } from './hooks/usePreloadImages'
import { useUrlState } from './hooks/useUrlState'
import { hasBandImages, imageForBand } from './utils/bands'
import { scrollToSection } from './utils/scroll'

// One page in three parts: the dome (pick a star), the instrument (once a star is picked),
// and the story (how blinking finds moving worlds).
export default function App() {
  const explorer = useExplorer()
  const takeOpenedFromUrl = useUrlState(explorer)
  const selected = explorer.selectedTarget
  const spot = explorer.customSpot
  const passes = explorer.passesData?.passes ?? []
  // The chosen band applies only where single-detector images exist (not simulated targets).
  const bandsAvailable = hasBandImages(passes)
  const band = bandsAvailable
    ? (explorer.colourKey.find((c) => c.band === explorer.band) ?? null)
    : null
  const framesReady = usePreloadImages(
    passes.map((p) => imageForBand(p, band?.band ?? null)).filter((url) => url !== null),
  )

  // Picking a star, or entering coordinates, takes you down to the plate.
  const selectedId = selected?.id
  useEffect(() => {
    if (!selectedId && !spot) return
    scrollToSection('instrument', takeOpenedFromUrl())
  }, [selectedId, spot, takeOpenedFromUrl])

  return (
    <div className="page">
      <DomeHero
        targets={explorer.targets}
        targetsStatus={explorer.targetsStatus}
        selectedTarget={selected}
        customSpot={spot}
        onSelect={explorer.selectTarget}
        onGoTo={explorer.goToCoordinates}
        onRetry={explorer.retryTargets}
        onContinue={() => scrollToSection(selected || spot ? 'instrument' : 'story')}
      />

      <main>
        {spot && (
          <div className="instrument" id="instrument">
            <UnchartedSpot
              spot={spot}
              nearest={nearestTarget(explorer.targets, spot)}
              onSelect={explorer.selectTarget}
              onBackToSky={() => scrollToSection('dome')}
            />
          </div>
        )}
        {selected && (
          <div className="instrument" id="instrument">
            <TargetBar
              targets={explorer.targets}
              selectedTarget={selected}
              passes={explorer.passesStatus === 'ready' ? passes : null}
              onSelect={explorer.selectTarget}
              onBackToSky={() => scrollToSection('dome')}
            />
            <div className="main-row">
              <div className="plate-column">
                <SkyPlate
                  target={selected}
                  passesData={explorer.passesData}
                  passesStatus={explorer.passesStatus}
                  passIndex={explorer.passIndex}
                  band={band}
                  onRetry={explorer.retryPasses}
                />
                <PlateCaption
                  target={selected}
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
            <ObservationLog target={selected} passesData={explorer.passesData} />
          </div>
        )}

        <Divider />
        <StorySection onChooseStar={() => scrollToSection('dome')} />
      </main>
    </div>
  )
}
