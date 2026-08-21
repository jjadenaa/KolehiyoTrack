import React from "react";

interface UniversityLogoProps {
  universityId: string;
  className?: string;
  alt?: string;
}

export function UniversityLogo({ universityId, className = "h-12 w-12 object-contain", alt }: UniversityLogoProps) {
  const id = (universityId || "").toLowerCase();
  const baseUrl = import.meta.env.BASE_URL || "/";

  if (id === "upcat" || id === "up") {
    return (
      <img
        src={`${baseUrl}up-logo.png`}
        alt={alt || "UP Logo"}
        className={className}
      />
    );
  }

  if (id === "bu" || id === "bucet") {
    return (
      <img
        src={`${baseUrl}bu-logo.png`}
        alt={alt || "BU Logo"}
        className={className}
      />
    );
  }

  if (id === "ateneo" || id === "admu" || id === "acet") {
    return (
      <img
        src={`${baseUrl}ateneo-logo.svg`}
        alt={alt || "Ateneo Logo"}
        className={className}
      />
    );
  }

  if (id === "dlsu" || id === "dcat") {
    return (
      <img
        src={`${baseUrl}dlsu-logo.svg`}
        alt={alt || "DLSU Logo"}
        className={className}
      />
    );
  }

  return (
    <div className={`rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary ${className}`}>
      {id.slice(0, 2).toUpperCase()}
    </div>
  );
}
