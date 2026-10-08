import type { IconType } from "react-icons";
import { FaBattleNet, FaDiscord, FaPlaystation, FaSteam, FaTwitch, FaXbox } from "react-icons/fa";
import { SiEpicgames, SiRiotgames } from "react-icons/si";
import { MaterialIcon } from "@/components/MaterialIcon";

const brandIcons: Record<string, IconType> = {
  psn: FaPlaystation,
  xbox: FaXbox,
  steam: FaSteam,
  epic: SiEpicgames,
  discord: FaDiscord,
  riot: SiRiotgames,
  battlenet: FaBattleNet,
  twitch: FaTwitch,
};

const brandLabels: Record<string, string> = {
  psn: "PlayStation Network",
  xbox: "Xbox",
  steam: "Steam",
  nintendo: "Nintendo Switch",
  epic: "Epic Games",
  discord: "Discord",
  riot: "Riot Games",
  battlenet: "Battle.net",
  twitch: "Twitch",
};

const accessibleBrandColors: Record<string, string> = {
  psn: "#4c8dff",
  xbox: "#58b957",
  steam: "#66c0f4",
  nintendo: "#ff5b66",
  epic: "#f5f7fb",
  discord: "#8b91ff",
  riot: "#ef5b61",
  battlenet: "#45a4ff",
  twitch: "#b07cff",
};

type Props = {
  platform: string;
  size?: number;
  className?: string;
};

function NintendoSwitchMark({ size, className = "" }: { size: number; className?: string }) {
  const label = brandLabels.nintendo;
  const color = accessibleBrandColors.nintendo;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`brandSvg brandSvg-nintendo ${className}`.trim()}
      role="img"
      aria-label={label}
      style={{ color }}
    >
      <title>{label}</title>
      <path
        d="M9.2 2.4H6.7A4.7 4.7 0 0 0 2 7.1v9.8a4.7 4.7 0 0 0 4.7 4.7h2.5V2.4Zm-1.6 2.1v15H6.7a2.6 2.6 0 0 1-2.6-2.6V7.1a2.6 2.6 0 0 1 2.6-2.6h.9Zm9.7-2.1h-5.1v19.2h5.1a4.7 4.7 0 0 0 4.7-4.7V7.1a4.7 4.7 0 0 0-4.7-4.7Zm0 2.1a2.6 2.6 0 0 1 2.6 2.6v9.8a2.6 2.6 0 0 1-2.6 2.6h-3v-15h3Z"
        fill="currentColor"
      />
      <circle cx="6.1" cy="8.2" r="1.45" fill="currentColor" />
      <circle cx="16.8" cy="15.2" r="1.65" fill="currentColor" />
    </svg>
  );
}

export function BrandIcon({ platform, size = 22, className = "" }: Props) {
  if (platform === "nintendo") {
    return <NintendoSwitchMark size={size} className={className} />;
  }

  const Icon = brandIcons[platform];
  if (!Icon) return <MaterialIcon name="sports_esports" size={size} className={className} />;

  return (
    <Icon
      className={`brandSvg brandSvg-${platform} ${className}`.trim()}
      size={size}
      aria-label={brandLabels[platform] ?? platform}
      title={brandLabels[platform] ?? platform}
      style={{ color: accessibleBrandColors[platform] ?? "#eaf0ff" }}
    />
  );
}
