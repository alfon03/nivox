import Link from "next/link";
import type { Game } from "@/lib/data";
import { MaterialIcon } from "@/components/MaterialIcon";

export function GameCard({ game }: { game: Game }) {
  return (
    <Link href={`/juegos/${game.slug}`} className={`gameCard game-${game.accent}`}>
      <div className={`gameArt ${game.cover_url ? "hasCover" : ""}`}>
        {game.cover_url ? (
          <img src={game.cover_url} alt={`Portada de ${game.title}`} loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="gameArtFallback">
            <span className="gameArtBrand">NIVOX</span>
            <strong>{game.title}</strong>
            <small>{game.genre}</small>
          </div>
        )}
      </div>
      <div className="gameCardBody">
        <h3>{game.title}</h3>
        <p>{game.genre}</p>
        <div className="gameMeta"><span className="inlineIconText"><MaterialIcon name="star" size={16} filled />{game.score || "—"}</span><span>{game.platform}</span></div>
      </div>
    </Link>
  );
}
