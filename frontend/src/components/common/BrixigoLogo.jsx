import logo from "../assets/images/logo_brixigo3.png";

export default function BrixigoLogo({
  src = logo,
  height,
  alt = "Brixigo",
  hoverScale = 1,
  style,
  ...rest
}) {
  return (
    <img
      src={src}
      alt={alt}
      height={height}
      style={{
        width: "auto",
        maxHeight: height,
        objectFit: "contain",
        transformOrigin: "left center",
        transition: hoverScale !== 1 ? "transform 0.2s ease" : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverScale !== 1) e.currentTarget.style.transform = `scale(${hoverScale})`;
      }}
      onMouseLeave={(e) => {
        if (hoverScale !== 1) e.currentTarget.style.transform = "scale(1)";
      }}
      {...rest}
    />
  );
}
