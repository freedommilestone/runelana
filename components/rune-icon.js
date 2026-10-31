import './rune-icon.css';

// Original Old School RuneScape item artwork; sources recorded with the assets.
export default function RuneIcon({id,className=''}) {
  return <img className={`rune-icon ${className}`} src={`/assets/runes/${id}.gif`} width="96" height="96" alt="" aria-hidden="true" draggable="false"/>;
}
