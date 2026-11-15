import type { ColourKeyEntry, PassesResponse, Target } from '../api/types'
import { formatDec, formatRA } from '../utils/coords'
import './PlateCaption.css'

type Props = {
  target: Target | null
  passesData: PassesResponse | null
  passIndex: number
  colourKey: ColourKeyEntry[]
  band: ColourKeyEntry | null // null = colour composite
}

// "a face-on spiral galaxy", "an open star cluster"
const withArticle = (phrase: string) => `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`

// "Pass II" -> "pass II" (keeps the numeral), "Short visit" -> "short visit"
const lowerFirst = (label: string) => label.charAt(0).toLowerCase() + label.slice(1)

// "the Pinwheel Galaxy", "the Pleiades", but plain "Barnard’s Star" or "R Draconis":
// only galaxies, nebulae, clusters and the two plural names take an article
const withThe = (name: string) =>
  /(Galaxy|Nebula|Cluster)$|^(Pleiades|Pillars)/.test(name) ? `the ${name}` : name

export default function PlateCaption({ target, passesData, passIndex, colourKey, band }: Props) {
  const pass = passesData?.passes[passIndex]

  if (!target || !passesData || !pass) {
    return (
      <div className="plate-caption plate-caption--empty" aria-hidden="true">
        <p className="plate-caption__text">&nbsp;</p>
        <p className="plate-caption__data">&nbsp;</p>
      </div>
    )
  }

  const total = passesData.passes.length
  const bands = colourKey.map((c) => c.wavelength).join(' / ')

  return (
    <div className="plate-caption">
      <p className="plate-caption__text">
        Plate {passIndex + 1}. The field around {withThe(target.name)} ({target.messier}),{' '}
        {withArticle(target.kind)}, shown at {lowerFirst(pass.label)} ({passIndex + 1} of {total}).
        Distant stars and galaxies stay fixed; anything nearer that moves will shift between passes.
        {band && ` Showing detector ${band.band} alone (${band.wavelength}), in greyscale.`}
        {passesData.simulated && ' These are simulated placeholder images, not SPHEREx data yet.'}
      </p>
      <p className="plate-caption__data">
        <span>RA {formatRA(target.ra)}</span>
        <span>DEC {formatDec(target.dec)}</span>
        <span>DATE {pass.date.slice(0, 10)}</span>
        <span>FIELD {passesData.fieldSizeDeg}°</span>
        {band ? (
          <span>
            BAND {band.band} {band.wavelength}
          </span>
        ) : (
          bands && <span>BANDS {bands}</span>
        )}
      </p>
    </div>
  )
}
