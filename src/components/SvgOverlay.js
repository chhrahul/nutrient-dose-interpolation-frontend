import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Define only once globally or at the top of this component
if (!L.ImageOverlay.svg) {
  L.ImageOverlay.svg = function (svgText, bounds, options) {
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    return new L.ImageOverlay(url, bounds, options);
  };
}

export default function SvgOverlay({ svgUrl, bounds }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !bounds || !svgUrl) return;

    let overlay;

    const addOverlay = async () => {
      try {
        const res = await fetch(svgUrl);
        const svgText = await res.text();
        overlay = L.ImageOverlay.svg(svgText, bounds);
        if (overlay) {
          overlay.addTo(map);
        }
      } catch (err) {
        console.error("Error loading SVG overlay:", err);
      }
    };

    addOverlay();

    return () => {
      if (overlay && map.hasLayer(overlay)) {
        map.removeLayer(overlay);
      }
    };
  }, [svgUrl, bounds, map]);

  return null;
}
