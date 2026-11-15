import badge from '../assets/sunhacks-badge.webp';

/**
 * The event signatures that hang from the top-right corner of every screen:
 * the sunhacks 9.0 ribbon and the official MLH 2027 season trust badge.
 * The MLH badge is MLH's own hosted image and link, as MLH asks member events to embed it.
 */
export function Signatures() {
  return (
    <div className="sig" aria-label="Event signatures">
      <a className="sig-ribbon sig-sunhacks" href="https://sunhacks.io/" target="_blank" rel="noopener noreferrer" aria-label="sunhacks 9.0, November 14 to 15, 2026, ASU Tempe">
        <img src={badge} alt="" />
        <span className="sig-word">sunhacks</span>
        <span className="sig-band">9.0</span>
        <span className="sig-date">Nov 14–15<br />2026</span>
      </a>
      <a
        id="mlh-trust-badge"
        className="sig-mlh"
        href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2027-season&utm_content=white"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="https://s3.amazonaws.com/logged-assets/trust-badge/2027/mlh-trust-badge-2027-white.svg" alt="Major League Hacking 2027 Hackathon Season" />
      </a>
    </div>
  );
}
