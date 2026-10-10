interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "small" | "medium" | "large";
  className?: string;
}

const colors = ["#2F4B3C", "#6E4B2A", "#3B4C6B", "#7A2E2E", "#4B4B4B"];

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = name.charCodeAt(index) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const sizes = {
  small: "h-[30px] w-[30px] text-[10px]",
  medium: "h-9 w-9 text-[11px]",
  large: "h-[42px] w-[42px] text-[13px]",
};

export default function ProfileAvatar({ name, avatarUrl, size = "medium", className = "" }: ProfileAvatarProps) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-full ${sizes[size]} ${className}`} aria-label={`${name}'s profile picture`}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-medium tracking-wide text-white" style={{ backgroundColor: getAvatarColor(name) }}>
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}
