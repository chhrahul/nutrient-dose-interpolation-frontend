import { useMap } from "react-leaflet";
import React, { useEffect } from "react";


function FitBounds({ bounds }) {
    const map = useMap();

    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds);
        }
    }, [bounds, map]);

    return null;
}

export default FitBounds