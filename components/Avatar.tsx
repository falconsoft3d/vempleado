export default function Avatar({ name, image, size }: { name: string; image: string | null; size: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={`data:image/png;base64,${image}`} alt={name} width={size} height={size} />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className="avatar avatar-initials" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}
